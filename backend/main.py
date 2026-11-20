"""API de "Leer al rival". Ejecuta: .venv/bin/uvicorn backend.main:app --reload"""
from contextlib import asynccontextmanager
from typing import Literal, Optional

from fastapi import FastAPI, HTTPException, Query

from backend import analisis as an

Cuarto = Optional[Literal["Q1", "Q2", "Q3", "Q4", "Tiempo extra"]]
Grupo = Literal["G1", "G2", "G3", "G4", "G5", "G6"]


@asynccontextmanager
async def ciclo(_app: FastAPI):
    # Carga los CSV y precalcula las consultas sin filtros una sola vez al arrancar
    an.precalcular()
    yield


app = FastAPI(title="Leer al rival", lifespan=ciclo)


def validar_rival(rival: Optional[str]) -> Optional[str]:
    """Normaliza y comprueba que el rival exista."""
    if rival is None:
        return None
    rival = rival.upper()
    if rival not in an.equipos_validos():
        raise HTTPException(404, f"Rival desconocido: {rival}")
    return rival


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/api/equipos")
def equipos(cuarto: Cuarto = None, grupo: Optional[Grupo] = None,
            redzone: Optional[bool] = None, two_minute: Optional[bool] = None,
            rival: Optional[str] = None) -> dict:
    """Rivales con n y predictibilidad (entropía de formaciones)."""
    rival = validar_rival(rival)
    datos = an.calc_equipos(cuarto, grupo, redzone, two_minute)
    if rival:
        datos = {**datos, "equipos": [e for e in datos["equipos"] if e["equipo"] == rival]}
    return datos


@app.get("/api/tendencias")
def tendencias(rival: str = Query(...), cuarto: Cuarto = None, grupo: Optional[Grupo] = None,
               redzone: Optional[bool] = None, two_minute: Optional[bool] = None) -> dict:
    """Tendencias del rival por grupo con media posterior Beta-Binomial e IC 90%."""
    return an.calc_tendencias(validar_rival(rival), cuarto, grupo, redzone, two_minute)


@app.get("/api/eficacia")
def eficacia(cuarto: Cuarto = None, grupo: Optional[Grupo] = None,
             redzone: Optional[bool] = None, two_minute: Optional[bool] = None) -> dict:
    """Eficacia por cobertura x grupo con toda la liga (no depende del rival)."""
    return an.calc_eficacia(cuarto, grupo, redzone, two_minute)


@app.get("/api/presion")
def presion(cuarto: Cuarto = None, grupo: Optional[Grupo] = None,
            redzone: Optional[bool] = None, two_minute: Optional[bool] = None) -> dict:
    """Balance de la presión (5+ rushers vs estándar) por grupo, con toda la liga."""
    return an.calc_presion(cuarto, grupo, redzone, two_minute)


@app.get("/api/campo")
def campo(rival: str = Query(...), cuarto: Cuarto = None, two_minute: Optional[bool] = None) -> dict:
    """% de éxito del rival por zona del campo, comparado con la liga."""
    return an.calc_campo(validar_rival(rival), cuarto, two_minute)


@app.get("/api/llamada")
def llamada(rival: str = Query(...), grupo: Grupo = Query(...), cuarto: Cuarto = None,
            redzone: Optional[bool] = None, two_minute: Optional[bool] = None) -> dict:
    """Qué esperar del rival y qué cobertura llamar en una situación."""
    return an.calc_llamada(validar_rival(rival), grupo, cuarto, redzone, two_minute)
