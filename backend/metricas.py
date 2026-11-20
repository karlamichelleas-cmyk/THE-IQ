"""Funciones estadísticas implementadas a mano con numpy (ver docs/metodologia.md)."""
import numpy as np
import pandas as pd

SEMILLA = 42
B_BOOTSTRAP = 1000
MUESTRAS_BETA = 10000
S_MIN, S_MAX = 2.0, 400.0
N_PEQUENA = 30


def prior_beta(x, n) -> dict:
    """Prior Beta(a, b) por método de momentos, restando el ruido binomial esperado."""
    x = np.asarray(x, float)
    n = np.asarray(n, float)
    hay = n > 0
    x, n = x[hay], n[hay]
    total = n.sum()
    if total == 0:
        return {"a": 1.0, "b": 1.0, "m": float("nan"), "s": 2.0, "aviso": "sin datos"}
    m = x.sum() / total
    if m in (0.0, 1.0):
        # Sin variación posible: prior fuerte en la tasa de la liga
        return {"a": m * S_MAX + 1e-3, "b": (1 - m) * S_MAX + 1e-3, "m": m, "s": S_MAX, "aviso": "tasa de liga 0 o 1"}
    v_obs = (n * (x / n - m) ** 2).sum() / total
    ruido = len(n) * m * (1 - m) / total
    v = v_obs - ruido
    aviso = ""
    if v <= 0:
        s, aviso = S_MAX, "sin heterogeneidad: s = s_max"
    else:
        s = m * (1 - m) / v - 1
        if s > S_MAX:
            s, aviso = S_MAX, "s recortado a s_max"
        elif s < S_MIN:
            s, aviso = S_MIN, "s recortado a s_min"
    return {"a": m * s, "b": (1 - m) * s, "m": m, "s": s, "aviso": aviso}


def posterior_beta(a: float, b: float, x: int, n: int, nivel: float = 0.90) -> dict:
    """Media posterior (a + x) / (a + b + n) e intervalo de credibilidad por muestreo."""
    media = (a + x) / (a + b + n)
    rng = np.random.default_rng(SEMILLA)
    muestras = rng.beta(a + x, b + n - x, MUESTRAS_BETA)
    cola = (1 - nivel) / 2 * 100
    lo, hi = np.percentile(muestras, [cola, 100 - cola])
    return {"media": float(media), "ic": [float(lo), float(hi)]}


def entropia_normalizada(conteos) -> float:
    """Entropía de Shannon / ln(K). K = número de categorías posibles (largo de conteos)."""
    c = np.asarray(conteos, float)
    total = c.sum()
    if total == 0 or len(c) < 2:
        return float("nan")
    p = c[c > 0] / total
    return float(-(p * np.log(p)).sum() / np.log(len(c)))


def _entropia_filas(conteos: np.ndarray) -> np.ndarray:
    """Entropía normalizada para cada fila de una matriz de conteos (B x K)."""
    total = conteos.sum(axis=1, keepdims=True)
    p = np.divide(conteos, total, out=np.zeros_like(conteos, dtype=float), where=total > 0)
    logp = np.log(p, out=np.zeros_like(p), where=p > 0)
    return -(p * logp).sum(axis=1) / np.log(conteos.shape[1])


def bootstrap_entropia(codigos_por_grupo: list, k: int) -> list:
    """IC 95% bootstrap de la entropía promedio ponderada por n de cada grupo."""
    rng = np.random.default_rng(SEMILLA)
    total = sum(len(c) for c in codigos_por_grupo)
    if total == 0:
        return [float("nan"), float("nan")]
    acumulado = np.zeros(B_BOOTSTRAP)
    for codigos in codigos_por_grupo:
        n = len(codigos)
        if n == 0:
            continue
        muestra = codigos[rng.integers(0, n, (B_BOOTSTRAP, n))]
        conteos = np.stack([(muestra == j).sum(axis=1) for j in range(k)], axis=1)
        acumulado += _entropia_filas(conteos) * n / total
    lo, hi = np.percentile(acumulado, [2.5, 97.5])
    return [float(lo), float(hi)]


def bootstrap_ic(valores, rng=None) -> list:
    """IC 95% bootstrap de la media (1,000 remuestreos, semilla 42)."""
    v = np.asarray(valores, float)
    if len(v) == 0:
        return [float("nan"), float("nan")]
    rng = rng or np.random.default_rng(SEMILLA)
    medias = v[rng.integers(0, len(v), (B_BOOTSTRAP, len(v)), dtype=np.int32)].mean(axis=1)
    lo, hi = np.percentile(medias, [2.5, 97.5])
    return [float(lo), float(hi)]


def _medias_bootstrap(v: np.ndarray, rng) -> np.ndarray:
    """1,000 medias bootstrap de un vector."""
    return v[rng.integers(0, len(v), (B_BOOTSTRAP, len(v)), dtype=np.int32)].mean(axis=1)


METRICAS_RESULTADO = {"yardas": "yds", "exito": "exito", "explosivas": "explosiva", "sack_int": "gana_def"}


def eficacia_defensiva(df: pd.DataFrame) -> dict:
    """Yardas, % éxito, % explosivas y % sack/INT permitidos, con IC 95% y n."""
    n = len(df)
    salida = {"n": n, "muestra_pequena": n < N_PEQUENA}
    for nombre, col in METRICAS_RESULTADO.items():
        rng = np.random.default_rng(SEMILLA)  # semilla nueva por métrica (igual que la metodología)
        v = df[col].to_numpy(float)
        escala = 1 if nombre == "yardas" else 100
        if n == 0:
            salida[nombre] = {"valor": None, "ic95": [None, None]}
            continue
        lo, hi = np.percentile(_medias_bootstrap(v, rng), [2.5, 97.5])
        salida[nombre] = {"valor": v.mean() * escala, "ic95": [lo * escala, hi * escala]}
    return salida


def balance_presion(df: pd.DataFrame, grupos: list) -> dict:
    """Diferencia 5+ rushers - estándar por cada 100 jugadas, ajustada por grupo de situación."""
    cinco = df[df["presion"] == "5+"]
    pesos = cinco.groupby("grupo").size()
    pesos = pesos[[g for g in grupos if g in pesos.index]]
    salida = {"n_5mas": len(cinco), "n_estandar": int((df["presion"] != "5+").sum())}
    for nombre, col in [("sack_int", "gana_def"), ("explosivas", "explosiva")]:
        rng = np.random.default_rng(SEMILLA)
        est, boot, usados = 0.0, np.zeros(B_BOOTSTRAP), 0
        for g in pesos.index:
            a = df[(df["grupo"] == g) & (df["presion"] == "5+")][col].to_numpy(float)
            b = df[(df["grupo"] == g) & (df["presion"] != "5+")][col].to_numpy(float)
            if len(a) == 0 or len(b) == 0:
                continue
            w = pesos[g]
            usados += w
            est += w * (a.mean() - b.mean())
            boot += w * (_medias_bootstrap(a, rng) - _medias_bootstrap(b, rng))
        if usados == 0:
            salida[nombre] = {"dif_por_100": None, "ic95": [None, None]}
            continue
        lo, hi = np.percentile(boot / usados * 100, [2.5, 97.5])
        salida[nombre] = {"dif_por_100": est / usados * 100, "ic95": [float(lo), float(hi)]}
    salida["muestra_pequena"] = min(salida["n_5mas"], salida["n_estandar"]) < N_PEQUENA
    return salida
