"""Cálculos de cada endpoint. Se cachean por combinación de filtros."""
from functools import lru_cache

import numpy as np
import pandas as pd

from backend import metricas as m
from backend.datos import FORMACIONES, GRUPOS, cargar

TOP_PERSONAL = 5  # categorías de personnelO que se reportan; el resto va a "OTRO"


def jugadas() -> pd.DataFrame:
    return cargar()["jugadas"]


def equipos_validos() -> list:
    return sorted(jugadas()["possessionTeam"].unique())


def filtrar(df: pd.DataFrame, cuarto=None, grupo=None, redzone=None, two_minute=None) -> pd.DataFrame:
    """Aplica los filtros de situación (todos opcionales)."""
    if cuarto is not None:
        df = df[df["cuarto"] == cuarto]
    if grupo is not None:
        df = df[df["grupo"] == grupo]
    if redzone is not None:
        df = df[df["redzone"] == redzone]
    if two_minute is not None:
        df = df[df["dos_min"] == two_minute]
    return df


def redondear(obj, d: int = 4):
    """Convierte numpy a tipos JSON y redondea floats."""
    if isinstance(obj, dict):
        return {k: redondear(v, d) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [redondear(v, d) for v in obj]
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (float, np.floating)):
        return None if np.isnan(obj) else round(float(obj), d)
    if isinstance(obj, np.bool_):
        return bool(obj)
    return obj


# ---------- Predictibilidad ----------

def _codigos(df: pd.DataFrame) -> np.ndarray:
    return pd.Categorical(df["formacion"].dropna(), categories=FORMACIONES).codes


def predictibilidad(df: pd.DataFrame) -> dict:
    """Entropía de formaciones promediada por grupo (ponderada por n), con IC 95%."""
    df = df[df["formacion"].notna()]
    por_grupo = [(g, _codigos(df[df["grupo"] == g])) for g in GRUPOS]
    total = sum(len(c) for _, c in por_grupo)
    if total == 0:
        return {"valor": None, "ic95": [None, None], "n": 0}
    valor = sum(m.entropia_normalizada(np.bincount(c, minlength=len(FORMACIONES))) * len(c) / total
                for _, c in por_grupo if len(c))
    ic = m.bootstrap_entropia([c for _, c in por_grupo], len(FORMACIONES))
    return {"valor": valor, "ic95": ic, "n": total}


@lru_cache(maxsize=256)
def calc_equipos(cuarto, grupo, redzone, two_minute) -> dict:
    df = filtrar(jugadas(), cuarto, grupo, redzone, two_minute)
    filas = []
    for eq in equipos_validos():
        sub = df[df["possessionTeam"] == eq]
        pred = predictibilidad(sub)
        filas.append({"equipo": eq, "n": len(sub), "muestra_pequena": len(sub) < m.N_PEQUENA,
                      "predictibilidad": pred})
    liga = predictibilidad(df)
    return redondear({"n_total": len(df), "liga_predictibilidad": liga, "equipos": filas})


# ---------- Tendencias (Beta-Binomial) ----------

def _tendencia(liga: pd.DataFrame, indicador: pd.Series, rival: str) -> dict:
    """x, n, tasa bruta, media posterior e IC 90% del rival, con la tasa de la liga."""
    equipos = equipos_validos()
    x = indicador.groupby(liga["possessionTeam"]).sum().reindex(equipos, fill_value=0)
    n = liga.groupby("possessionTeam").size().reindex(equipos, fill_value=0)
    prior = m.prior_beta(x.values, n.values)
    xr, nr = int(x[rival]), int(n[rival])
    post = m.posterior_beta(prior["a"], prior["b"], xr, nr)
    return {"x": xr, "n": nr, "bruta": xr / nr if nr else None, "media": post["media"], "ic90": post["ic"],
            "liga": prior["m"], "muestra_pequena": nr < m.N_PEQUENA}


def _personal_top() -> list:
    return list(jugadas()["personnelO"].value_counts().head(TOP_PERSONAL).index)


def tendencias_grupo(df: pd.DataFrame, rival: str) -> dict:
    """Formación, personal y play action del rival dentro de un subconjunto de la liga."""
    con_form = df[df["formacion"].notna()]
    formaciones = {f: _tendencia(con_form, con_form["formacion"] == f, rival) for f in FORMACIONES}
    con_pers = df[df["personnelO"].notna()]
    top = _personal_top()
    pers = con_pers["personnelO"].where(con_pers["personnelO"].isin(top), "OTRO")
    personal = {c: _tendencia(con_pers, pers == c, rival) for c in top + ["OTRO"]}
    play_action = _tendencia(df, df["pff_playAction"] == 1, rival)
    n = int((df["possessionTeam"] == rival).sum())
    return {"n": n, "muestra_pequena": n < m.N_PEQUENA, "formacion": formaciones,
            "personal": personal, "play_action": play_action}


@lru_cache(maxsize=512)
def calc_tendencias(rival, cuarto, grupo, redzone, two_minute) -> dict:
    df = filtrar(jugadas(), cuarto, None, redzone, two_minute)
    grupos = [grupo] if grupo else list(GRUPOS)
    salida = {g: {"etiqueta": GRUPOS[g], **tendencias_grupo(df[df["grupo"] == g], rival)} for g in grupos}
    # Total del rival en todas las situaciones (prior con toda la liga bajo los mismos filtros)
    return redondear({"rival": rival, "grupos": salida, "total": tendencias_grupo(df, rival)})


# ---------- Eficacia y presión (toda la liga, set de resultado) ----------

def resultado() -> pd.DataFrame:
    return jugadas()[~jugadas()["anulada"]]


@lru_cache(maxsize=256)
def calc_eficacia(cuarto, grupo, redzone, two_minute) -> dict:
    df = filtrar(resultado(), cuarto, grupo, redzone, two_minute)
    filas = []
    for (cob, g), sub in df.groupby(["pff_passCoverage", "grupo"]):
        filas.append({"cobertura": cob, "grupo": g, "tipo": sub["pff_passCoverageType"].mode().iat[0],
                      **m.eficacia_defensiva(sub)})
    return redondear({"n_total": len(df), "liga": m.eficacia_defensiva(df), "celdas": filas})


@lru_cache(maxsize=256)
def calc_presion(cuarto, grupo, redzone, two_minute) -> dict:
    df = filtrar(resultado(), cuarto, grupo, redzone, two_minute)
    grupos = [grupo] if grupo else list(GRUPOS)
    por_grupo = {}
    for g in grupos:
        sub = df[df["grupo"] == g]
        cinco, std = sub[sub["presion"] == "5+"], sub[sub["presion"] != "5+"]
        por_grupo[g] = {
            "etiqueta": GRUPOS[g],
            "tasas": {
                "5+": {"n": len(cinco), "sack_int": _tasa(cinco, "gana_def"), "explosivas": _tasa(cinco, "explosiva")},
                "estandar": {"n": len(std), "sack_int": _tasa(std, "gana_def"), "explosivas": _tasa(std, "explosiva")},
            },
            "balance": m.balance_presion(sub, [g]),
        }
    return redondear({"ajustado_por_grupo": m.balance_presion(df, grupos), "grupos": por_grupo})


def _tasa(df: pd.DataFrame, col: str) -> dict:
    """% con IC 95% bootstrap."""
    if len(df) == 0:
        return {"valor": None, "ic95": [None, None]}
    lo, hi = m.bootstrap_ic(df[col].to_numpy(float))
    return {"valor": df[col].mean() * 100, "ic95": [lo * 100, hi * 100]}


# ---------- Hoja de llamadas ----------

COBERTURAS_RED_ZONE = ["Red Zone", "Goal Line"]
MIN_N_RIVAL = 8  # jugadas mínimas del rival contra una cobertura para compararla


def _cobertura_rival(sub: pd.DataFrame, rival: str) -> dict:
    """Éxito del rival contra una cobertura, ajustado con un prior Beta = eficacia de la liga (método de momentos)."""
    equipos = equipos_validos()
    x = sub.groupby("possessionTeam")["exito"].sum().reindex(equipos, fill_value=0)
    n = sub.groupby("possessionTeam").size().reindex(equipos, fill_value=0)
    prior = m.prior_beta(x.values, n.values)
    xr, nr = int(x[rival]), int(n[rival])
    post = m.posterior_beta(prior["a"], prior["b"], xr, nr)
    return {
        "x": xr, "n": nr, "bruta": xr / nr * 100 if nr else None,
        "media": post["media"] * 100, "ic90": [v * 100 for v in post["ic"]],
        "liga": prior["m"] * 100, "n_liga": len(sub), "s": prior["s"], "muestra_pequena": nr < m.N_PEQUENA,
    }


def que_llamar(res: pd.DataFrame, rival: str, redzone) -> dict:
    """Recomendada / ventaja ligera / evitar con el éxito posterior del rival contra cada cobertura."""
    # Red Zone y Goal Line solo cuentan con el filtro red zone activo
    excluidas = [] if redzone is True else COBERTURAS_RED_ZONE
    df = res[~res["pff_passCoverage"].isin(excluidas)]
    promedio_liga = df["exito"].mean() * 100 if len(df) else None
    # Solo coberturas con n >= 30 en la liga, para que el prior sea estable
    filas = [{"cobertura": cob, **_cobertura_rival(sub, rival)}
             for cob, sub in df.groupby("pff_passCoverage") if len(sub) >= m.N_PEQUENA]
    filas.sort(key=lambda f: f["media"])
    # Solo se comparan coberturas que el rival haya enfrentado al menos MIN_N_RIVAL veces
    elegibles = [f for f in filas if f["n"] >= MIN_N_RIVAL]
    recomendada, etiqueta, evitar, fuente = None, None, None, None
    if elegibles:
        recomendada, fuente = elegibles[0], "rival"
        etiqueta = "Recomendada" if recomendada["ic90"][1] < promedio_liga else "Ventaja ligera"
        evitar = elegibles[-1] if len(elegibles) >= 2 else None
    elif filas:
        # Sin datos suficientes del rival: la mejor cobertura de la liga en este grupo
        recomendada, fuente = min(filas, key=lambda f: f["liga"]), "liga"
        etiqueta = "Según la liga (pocos datos del rival)"
    veredicto = f"{etiqueta}: {recomendada['cobertura']}" if recomendada else "sin datos suficientes (ninguna cobertura con n >= 30 en la liga)"
    return {
        "criterio": f"éxito posterior del rival contra cada cobertura con n >= {MIN_N_RIVAL} del rival (Beta-Binomial, prior = liga en la misma cobertura y grupo); IC 90%",
        "liga": {"exito": promedio_liga, "n": len(df)}, "excluidas": excluidas, "min_n_rival": MIN_N_RIVAL,
        "veredicto": veredicto, "etiqueta": etiqueta, "fuente": fuente,
        "recomendada": recomendada, "evitar": evitar, "coberturas": filas,
    }


@lru_cache(maxsize=512)
def calc_llamada(rival, grupo, cuarto, redzone, two_minute) -> dict:
    # Qué esperar: tendencias del rival con el modelo Beta-Binomial
    tend = calc_tendencias(rival, cuarto, grupo, redzone, two_minute)["grupos"][grupo]
    formaciones = sorted(tend["formacion"].items(), key=lambda kv: kv[1]["media"], reverse=True)
    esperar = {
        "n": tend["n"], "muestra_pequena": tend["muestra_pequena"],
        "formacion_mas_probable": {"formacion": formaciones[0][0], **formaciones[0][1]},
        "segunda_formacion": {"formacion": formaciones[1][0], **formaciones[1][1]},
        "play_action": tend["play_action"],
    }
    # Qué llamar: éxito del rival contra cada cobertura en esta situación, ajustado con la liga
    res = filtrar(resultado(), cuarto, grupo, redzone, two_minute)
    llamar = que_llamar(res, rival, redzone)
    return redondear({"rival": rival, "grupo": grupo, "etiqueta": GRUPOS[grupo],
                      "que_esperar": esperar, "que_llamar": llamar})


def precalcular() -> None:
    """Calienta la caché con las consultas sin filtros."""
    calc_equipos(None, None, None, None)
    calc_eficacia(None, None, None, None)
    calc_presion(None, None, None, None)
