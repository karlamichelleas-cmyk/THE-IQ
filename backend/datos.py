"""Carga de datos y columnas derivadas (ver docs/metodologia.md).

Lee solo plays.csv, games.csv, players.csv y pffScoutingData.csv. No lee tracking.
Los archivos de data/ son de solo lectura: aquí solo se leen.
"""
from functools import lru_cache
from pathlib import Path

import numpy as np
import pandas as pd

RAIZ = Path(__file__).resolve().parent.parent

# Categorías fijas de formación (JUMBO y WILDCAT van a OTRA)
FORMACIONES = ["SHOTGUN", "EMPTY", "SINGLEBACK", "I_FORM", "PISTOL", "OTRA"]
CUARTOS = ["Q1", "Q2", "Q3", "Q4", "Tiempo extra"]
GRUPOS = {
    "G1": "1er down",
    "G2": "2do y corta-media (1-6)",
    "G3": "2do y larga (7+)",
    "G4": "3er/4to y corta (1-3)",
    "G5": "3er/4to y media (4-6)",
    "G6": "3er/4to y larga (7+)",
}


def carpeta_datos() -> Path:
    """Busca la carpeta que contiene plays.csv dentro de data/."""
    encontrados = sorted((RAIZ / "data").rglob("plays.csv"))
    if not encontrados:
        raise FileNotFoundError("No se encontró plays.csv dentro de data/")
    return encontrados[0].parent


def _yardas_a_end_zone(df: pd.DataFrame) -> pd.Series:
    """Yardas que le faltan al rival para llegar a la end zone que defendemos."""
    propio = df["yardlineSide"] == df["possessionTeam"]
    faltan = np.where(propio, 100 - df["yardlineNumber"], df["yardlineNumber"])
    # yardlineSide nulo = yarda 50
    return pd.Series(faltan, index=df.index).where(df["yardlineSide"].notna(), df["yardlineNumber"]).astype(float)


def _grupo(down: pd.Series, ytg: pd.Series) -> pd.Series:
    """Grupo de situación G1-G6."""
    condiciones = [
        down == 1,
        (down == 2) & (ytg <= 6),
        down == 2,
        (down >= 3) & (ytg <= 3),
        (down >= 3) & (ytg <= 6),
    ]
    return pd.Series(np.select(condiciones, ["G1", "G2", "G3", "G4", "G5"], default="G6"), index=down.index)


def _marcador(df: pd.DataFrame) -> pd.Series:
    """ganando / empatado / perdiendo desde el punto de vista del rival (ataque)."""
    local = df["possessionTeam"] == df["homeTeamAbbr"]
    dif = np.where(local, df["preSnapHomeScore"] - df["preSnapVisitorScore"],
                   df["preSnapVisitorScore"] - df["preSnapHomeScore"])
    return pd.Series(np.select([dif > 0, dif == 0], ["ganando", "empatado"], default="perdiendo"), index=df.index)


def _segundos(reloj: pd.Series) -> pd.Series:
    """Convierte 'MM:SS' a segundos."""
    partes = reloj.str.split(":", expand=True).astype(int)
    return partes[0] * 60 + partes[1]


def construir_jugadas(plays: pd.DataFrame, games: pd.DataFrame, pff: pd.DataFrame) -> pd.DataFrame:
    """Tabla base de jugadas (sin down = 0) con todas las columnas derivadas."""
    p = plays[plays["down"] > 0].merge(games[["gameId", "homeTeamAbbr", "visitorTeamAbbr"]], on="gameId", how="left")
    p["cuarto"] = np.where(p["quarter"] == 5, "Tiempo extra", "Q" + p["quarter"].astype(str))
    p["faltan"] = _yardas_a_end_zone(p)
    p["zona"] = pd.cut(p["faltan"], [0, 20, 40, 60, 80, 100],
                       labels=["Z5 1-20", "Z4 21-40", "Z3 41-60", "Z2 61-80", "Z1 81-99"]).astype(str)
    p["distancia"] = pd.cut(p["yardsToGo"], [0, 3, 7, np.inf], labels=["corta", "media", "larga"]).astype(str)
    p["grupo"] = _grupo(p["down"], p["yardsToGo"])
    p["marcador"] = _marcador(p)
    p["redzone"] = p["faltan"] <= 20
    p["dos_min"] = p["quarter"].isin([2, 4]) & (_segundos(p["gameClock"]) <= 120)
    texto = p["playDescription"].fillna("").str.lower()
    p["anulada"] = texto.str.contains("no play", regex=False) | texto.str.contains("nullified", regex=False)
    p["formacion"] = p["offenseFormation"].replace({"JUMBO": "OTRA", "WILDCAT": "OTRA"})
    # Rushers por jugada desde PFF
    rushers = pff[pff["pff_role"] == "Pass Rush"].groupby(["gameId", "playId"]).size().rename("rushers")
    p = p.merge(rushers, on=["gameId", "playId"], how="left")
    p["rushers"] = p["rushers"].fillna(0).astype(int)
    p["presion"] = np.where(p["rushers"] >= 5, "5+", "estandar")
    # Resultado (solo tiene sentido en jugadas no anuladas)
    p["yds"] = p["prePenaltyPlayResult"].astype(float)
    umbral = np.select([p["down"] == 1, p["down"] == 2], [0.4, 0.6], default=1.0)
    p["exito"] = (p["yds"] >= umbral * p["yardsToGo"]).astype(float)
    p["explosiva"] = (p["yds"] >= 20).astype(float)
    p["gana_def"] = p["passResult"].isin(["S", "IN"]).astype(float)
    return p


@lru_cache(maxsize=1)
def cargar() -> dict:
    """Lee los CSV una sola vez y devuelve las tablas listas."""
    base = carpeta_datos()
    plays = pd.read_csv(base / "plays.csv")
    games = pd.read_csv(base / "games.csv")
    players = pd.read_csv(base / "players.csv")
    pff = pd.read_csv(base / "pffScoutingData.csv")
    return {"jugadas": construir_jugadas(plays, games, pff), "players": players}
