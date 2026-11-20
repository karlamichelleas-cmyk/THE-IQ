"""Pruebas mínimas de métricas y API."""
import numpy as np
import pytest
from fastapi.testclient import TestClient

from backend import metricas as m
from backend.main import app


def test_entropia_uniforme_es_uno():
    assert m.entropia_normalizada([5, 5, 5, 5, 5, 5]) == pytest.approx(1.0)


def test_entropia_constante_es_cero():
    assert m.entropia_normalizada([10, 0, 0, 0, 0, 0]) == pytest.approx(0.0)


def test_posterior_a_mano():
    # Beta(2, 8) con 3 de 10: media = (2 + 3) / (2 + 8 + 10) = 0.25
    post = m.posterior_beta(2, 8, 3, 10)
    assert post["media"] == pytest.approx(0.25)
    assert post["ic"][0] < 0.25 < post["ic"][1]


def test_prior_recupera_tasa_de_liga():
    prior = m.prior_beta(np.array([30, 50, 70]), np.array([100, 100, 100]))
    assert prior["m"] == pytest.approx(0.5)
    assert prior["a"] / (prior["a"] + prior["b"]) == pytest.approx(0.5)


@pytest.fixture(scope="module")
def cliente():
    with TestClient(app) as c:
        yield c


def test_equipos_suma_8522(cliente):
    datos = cliente.get("/api/equipos").json()
    assert len(datos["equipos"]) == 32
    assert sum(e["n"] for e in datos["equipos"]) == 8522


def test_llamada_responde(cliente):
    r = cliente.get("/api/llamada", params={"rival": "KC", "grupo": "G6"})
    assert r.status_code == 200
    assert r.json()["que_llamar"]["veredicto"]


def test_llamada_criterio_vs_liga(cliente):
    ll = cliente.get("/api/llamada", params={"rival": "KC", "grupo": "G1"}).json()["que_llamar"]
    rec, liga = ll["recomendada"], ll["liga"]["exito"]["valor"]
    assert ll["etiqueta"] in ("Recomendada", "Ventaja ligera (no significativa)")
    if ll["etiqueta"] == "Recomendada":
        assert rec["exito"]["ic95"][1] < liga
    assert ll["evitar"]["cobertura"] != rec["cobertura"]
    assert ll["evitar"]["n"] >= 30


def test_rival_desconocido(cliente):
    assert cliente.get("/api/tendencias", params={"rival": "XXX"}).status_code == 404
