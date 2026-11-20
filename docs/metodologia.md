# Metodología de "Leer al rival"

Reporte de scouting y hoja de llamadas para el coach defensivo. "Rival" es el equipo que ataca (`possessionTeam`). "Nosotros" es la defensa (`defensiveTeam`).

Todas las cifras de este documento salen de código ejecutado sobre `data/` (solo lectura). Semilla fija: `numpy.random.default_rng(42)`. Los archivos están en `data/nfl-big-data-bowl-regional-event-data-main/nfl-big-data-bowl-regional-event-data-main/data/`.

---

## 0. Universo de jugadas y reglas comunes

| Conjunto | Regla | n |
|---|---|---|
| `plays.csv` completo | — | 8,557 |
| **Base** | excluye `down == 0` (las 35 son conversiones de dos puntos: las 35 dicen "two-point" en `playDescription`) | **8,522** |
| **Set de tendencias** | = Base. Incluye jugadas con penalización, porque la llamada ofensiva sí ocurrió | 8,522 |
| **Set de resultado** | Base menos jugadas anuladas: `playDescription` contiene "no play" o "nullified" (sin distinguir mayúsculas) | **8,033** (489 excluidas) |

Reglas comunes:

- **Solo pases.** `plays.csv` solo trae dropbacks (`passResult` siempre es C, I, S, IN o R). El reporte habla de "jugadas de pase", nunca de carreras.
- **Yardas de resultado** = `prePenaltyPlayResult` (yardas netas antes de la penalización). Nunca `playResult`.
- **Penalizaciones no anuladas** (por ejemplo "declined" u "offsetting"): se quedan en el set de resultado con sus yardas previas a la penalización. En la base hay 735 jugadas con `foulName1`; 258 no están anuladas.
- **Muestra pequeña**: cualquier estimación con n < 30 lleva la etiqueta "muestra pequeña".
- **Intervalos**: credibilidad del 90% para el modelo Beta-Binomial (métricas 3 y 8); bootstrap del 95% con 1,000 remuestreos para eficacia, matriz y balance (métricas 5, 6 y 7).

---

## 1. Situación

| Campo | Definición | Columnas | Nulos |
|---|---|---|---|
| **Cuarto** | `Q1`…`Q4`; `quarter == 5` → "Tiempo extra" | `quarter` | 0% |
| **Yardas a la end zone que defiendo** (`faltan`, 0 a 100) | si `yardlineSide == possessionTeam` → `100 - yardlineNumber`; si es el otro equipo → `yardlineNumber`; si `yardlineSide` es nulo → `yardlineNumber` (siempre 50) | `yardlineSide`, `yardlineNumber`, `possessionTeam` | `yardlineSide` nulo en 125 jugadas, todas en la yarda 50 |
| **Zona** (bloques de 20) | Z1 81-99 (lejos, rival en su propio campo), Z2 61-80, Z3 41-60, Z4 21-40, Z5 1-20 = **red zone** | `faltan` | — |
| **Down y distancia** | corta 1-3, media 4-7, larga 8+ | `down`, `yardsToGo` | 0% (`yardsToGo` mínimo es 1) |
| **Grupo de situación** (6) | G1 1er down; G2 2do y 1-6; G3 2do y 7+; G4 3er/4to y 1-3; G5 3er/4to y 4-6; G6 3er/4to y 7+ | `down`, `yardsToGo` | 0% |
| **Marcador del rival** | `dif` = puntos del rival − puntos del otro, antes del snap. `dif > 0` ganando, `= 0` empatado, `< 0` perdiendo. El rival es local si `possessionTeam == homeTeamAbbr` (de `games.csv`) | `preSnapHomeScore`, `preSnapVisitorScore`, `homeTeamAbbr` | 0% |
| **Filtro red zone** | `faltan <= 20` | `faltan` | — |
| **Filtro two-minute drill** | `quarter` en {2, 4} y `gameClock` ≤ 2:00 (`gameClock` viene como `MM:SS`) | `quarter`, `gameClock` | 0% |

Los grupos de situación son la unidad de análisis. Red zone y two-minute son filtros aparte: se aplican encima de un grupo, no son un grupo más. Las categorías de distancia corta/media/larga se conservan como etiqueta descriptiva; los cortes de los grupos (1-6, 7+, 1-3, 4-6) son los que se usan para calcular.

**Conteos en la base (8,522):**

- Cuarto: Q1 1,735 · Q2 2,439 · Q3 1,831 · Q4 2,419 · Tiempo extra 98.
- Zona: Z1 659 · Z2 2,954 · Z3 2,202 · Z4 1,560 · Z5 (red zone) 1,147.
- Grupo: G1 3,071 · G2 834 · G3 1,992 · G4 568 · G5 751 · G6 1,306.
- Marcador: perdiendo 4,590 · ganando 2,377 · empatado 1,555.
- Two-minute drill: 1,274.

**Ejemplo real** (juego 2021102100, jugada 1205): DEN ataca en Q2 con 09:29 en el reloj, 3ro y 9 en su propia yarda 14. `faltan` = 100 − 14 = 86 → Z1. Grupo G6 (3er/4to y 7+). DEN es visitante (local CLE), marcador 10-0 → `dif` = −10 → "perdiendo". No es red zone ni two-minute.

Contraejemplo de campo rival (2021100304 / 844): MIA ataca en la yarda 31 de IND → `faltan` = 31 → Z4.

**Validación con tracking:** comparé `faltan` con la posición `x` del balón en el evento `ball_snap` (`110 − x` si `playDirection == right`, `x − 10` si `left`). De 8,497 jugadas de la base con snap, 8,359 difieren 2 yardas o menos y 138 difieren más de 2. Esas 138 se conservan (ver Limitaciones).

---

## 2. Tendencias del rival

Para un rival R y un grupo G (opcionalmente con filtro red zone o two-minute):

- **% formación f** = jugadas de R en G con `offenseFormation == f` / jugadas de R en G con `offenseFormation` no nula.
  - Categorías: SHOTGUN, EMPTY, SINGLEBACK, I_FORM, PISTOL, OTRA (OTRA = JUMBO 30 + WILDCAT 2, por ser raras).
  - Nulos: 7 jugadas sin formación (0.08%) quedan fuera del denominador de esta métrica, pero sí cuentan en las demás.
- **% play action** = jugadas con `pff_playAction == 1` / jugadas de R en G. Nulos: 0%.
- **% pase profundo**: **no se calcula.** No existe columna de profundidad ni de dirección del pase (fuera de alcance; ver Limitaciones).
- Otras columnas descriptivas disponibles: `personnelO` (0.01% nulos, 30 valores) y `dropBackType` (6.17% nulos).

Se usa el **set de tendencias** (incluye jugadas con penalización). Cada proporción se reporta con su x, su n, y el ajuste Beta-Binomial de la métrica 3.

**Ejemplo real:** New Orleans (NO) en G4 (3er/4to y 1-3), n = 11: SHOTGUN 6, SINGLEBACK 2, EMPTY 1, I_FORM 1, OTRA 1 → SHOTGUN bruto 6/11 = 54.5%. Play action 3/11 = 27.3%. Las dos son "muestra pequeña".

---

## 3. Modelo Beta-Binomial para tendencias

Corrige las proporciones de rivales con pocas jugadas, acercándolas a la tasa de la liga en la misma situación.

**Datos:** para una tendencia (por ejemplo "SHOTGUN en G4"), cada uno de los 32 equipos i aporta xᵢ (jugadas con la característica) y nᵢ (jugadas en la situación).

**Prior por método de momentos** (calculado por separado para cada tendencia × grupo):

1. N = Σnᵢ; tasa de la liga m = Σxᵢ / N.
2. Varianza observada ponderada: v_obs = Σ nᵢ (xᵢ/nᵢ − m)² / N.
3. Ruido binomial esperado: ruido = K · m (1 − m) / N, con K = número de equipos con nᵢ > 0.
4. Varianza real entre equipos: v = v_obs − ruido.
5. Fuerza del prior: s = m (1 − m) / v − 1; a = m · s; b = (1 − m) · s.
6. Salvaguardas: si v ≤ 0 (sin diferencia real entre equipos) se usa s = 400; s se recorta al rango [2, 400]. En los 12 priors calculados (SHOTGUN y play action × 6 grupos) no se activó ninguna.

**Posterior del rival R:**

- Media posterior = (a + x) / (a + b + n).
- Intervalo de credibilidad del 90%: percentiles 5 y 95 de 10,000 muestras `rng.beta(a + x, b + n − x)` con `rng = numpy.random.default_rng(42)`.

**Ejemplo real: NO en G4 (3er/4to y 1-3), su grupo con menos jugadas (n = 11)**

| Tendencia | x / n (bruta) | Liga m | a | b | s | Media posterior | IC 90% |
|---|---|---|---|---|---|---|---|
| SHOTGUN | 6 / 11 = 0.545 | 0.646 | 14.170 | 7.761 | 21.93 | (14.170 + 6) / (21.93 + 11) = **0.613** | 0.469 – 0.748 |
| Play action | 3 / 11 = 0.273 | 0.160 | 22.833 | 119.687 | 142.52 | (22.833 + 3) / (142.52 + 11) = **0.168** | 0.121 – 0.221 |

Lectura: con 11 jugadas, el 27% de play action de NO es casi todo ruido. Los equipos de la liga casi no difieren en play action en 3er/4to y corto (s = 142 es un prior fuerte), así que la estimación queda en 16.8%.

Contraste con Kansas City (KC) en el mismo grupo, n = 15: SHOTGUN 13/15 = 0.867 → posterior 0.736 (IC 90%: 0.610 – 0.848).

Priors de SHOTGUN por grupo (m / s): G1 0.550 / 15.4 · G2 0.603 / 13.5 · G3 0.636 / 21.5 · G4 0.646 / 21.9 · G5 0.763 / 17.4 · G6 0.817 / 13.9.

Priors de play action por grupo (m / s): G1 0.402 / 59.1 · G2 0.309 / 75.3 · G3 0.204 / 33.1 · G4 0.160 / 142.5 · G5 0.027 / 53.5 · G6 0.012 / 23.7.

---

## 4. Índice de predictibilidad

Entropía de Shannon normalizada de la distribución de formaciones del rival en una situación:

H = −Σ pₖ ln pₖ / ln 6

- pₖ = proporción de cada una de las 6 categorías de formación de la métrica 2 (las categorías con 0 jugadas no suman).
- 0 = siempre la misma formación (predecible); 1 = las 6 formaciones por igual (impredecible).
- Columnas: `offenseFormation`. Set de tendencias, sin las 7 jugadas con formación nula.
- Intervalo: bootstrap del 95% con 1,000 remuestreos de las jugadas del rival en esa situación (semilla 42).
- Referencia: la entropía de la liga completa en el mismo grupo.
- Advertencia: con n pequeño la entropía muestral tiende a subestimarse (las formaciones raras no aparecen). Por eso n < 30 siempre lleva "muestra pequeña". En la tabla equipo × grupo, 81 de 192 celdas tienen n < 30.

**Ejemplos reales:**

| Rival | Grupo | n | Conteos | H | IC 95% | Liga en ese grupo |
|---|---|---|---|---|---|---|
| KC | G1 1er down | 134 | SHOTGUN 94, SINGLEBACK 18, EMPTY 13, I_FORM 8, PISTOL 1 | 0.530 | 0.429 – 0.611 | 0.676 |
| KC | G4 3er/4to y 1-3 | 15 | SHOTGUN 13, SINGLEBACK 1, OTRA 1 | 0.271 (muestra pequeña) | 0.000 – 0.481 | 0.594 |
| NO | G4 3er/4to y 1-3 | 11 | SHOTGUN 6, SINGLEBACK 2, EMPTY 1, I_FORM 1, OTRA 1 | 0.723 (muestra pequeña) | 0.265 – 0.846 | 0.594 |

Lectura: en 1er down, KC es más predecible que la liga (0.53 contra 0.68), y el intervalo no llega a 0.68.

Entropía de la liga por grupo: G1 0.676 · G2 0.627 · G3 0.581 · G4 0.594 · G5 0.364 · G6 0.292.

---

## 5. Eficacia defensiva por cobertura y por nivel de presión

Se mide con **toda la liga**, en el **set de resultado** (8,033 jugadas), por cobertura × grupo de situación y por nivel de presión. No se calcula eficacia por rival.

**Dimensiones:**

- **Cobertura**: `pff_passCoverage` (12 nombres) y `pff_passCoverageType` (Man / Zone / Other). Nulos: 0%.
- **Presión**: número de filas con `pff_role == "Pass Rush"` en `pffScoutingData.csv` para esa jugada. "Estándar" ≤ 4 rushers (6,069 jugadas), "5+ rushers" ≥ 5 (1,964 jugadas). Si una jugada no tiene ningún pass rusher (hay 1 en las 8,557 de `plays.csv`), cuenta como estándar con 0.

**Métricas por jugada** (todas en el set de resultado, con yardas = `prePenaltyPlayResult`):

| Métrica | Definición |
|---|---|
| Yardas permitidas por jugada | media de `prePenaltyPlayResult` (los sacks cuentan con sus yardas negativas) |
| % éxito permitido | jugada exitosa para el ataque si yardas ≥ 40% de `yardsToGo` en 1er down, ≥ 60% en 2do, ≥ 100% en 3er y 4to |
| % explosivas permitidas | yardas ≥ 20 |
| % ganadas por la defensa | `passResult` en {S (sack), IN (intercepción)} |

**Intervalo:** bootstrap del 95% (percentiles 2.5 y 97.5) con 1,000 remuestreos con reemplazo de las jugadas de la celda, semilla 42.

**Cobertura de la muestra:** existen 66 de las 72 combinaciones cobertura × grupo; 23 tienen n < 30 y 43 tienen n ≥ 30. Las coberturas raras (Bracket 41, Prevent 32, Goal Line 24, Miscellaneous 8) casi siempre quedan como "muestra pequeña".

**Ejemplo real: Cover-3 en G6 (3er/4to y 7+)**, n = 320 (18 jugadas anuladas excluidas):

| Métrica | Cálculo | Valor | IC 95% |
|---|---|---|---|
| Yardas por jugada | 2,129 / 320 | 6.65 | 5.55 – 7.81 |
| % éxito permitido | 92 / 320 | 28.75% | 24.06 – 33.75 |
| % explosivas | 24 / 320 | 7.50% | 4.69 – 10.31 |
| % ganadas por la defensa | 52 / 320 | 16.25% | 12.19 – 20.31 |

Referencia de la liga completa (n = 8,033): 6.71 yardas (IC 6.49 – 6.95), éxito 48.39%, explosivas 9.50%, ganadas por la defensa 8.65%.

---

## 6. Matriz de enfrentamientos

Tabla formación ofensiva (6 categorías de la métrica 2) × cobertura defensiva (`pff_passCoverage`, 12 valores), con toda la liga y el set de resultado. Cada celda muestra:

- yardas permitidas por jugada (`prePenaltyPlayResult`) con IC bootstrap del 95% (1,000 remuestreos, semilla 42);
- n;
- la marca "muestra pequeña" si n < 30.

Nulos: la única jugada del set de resultado sin formación queda fuera de la matriz. Celdas con 0 jugadas se muestran vacías, no como cero.

Cobertura: existen 55 de las 72 celdas; 29 tienen n < 30 y 26 tienen n ≥ 30.

**Ejemplos reales:**

| Formación × cobertura | n | Yardas por jugada | IC 95% |
|---|---|---|---|
| SHOTGUN × Cover-3 | 1,470 | 6.61 | 6.15 – 7.10 |
| SINGLEBACK × Cover-0 | 27 (muestra pequeña) | 6.85 | 3.00 – 11.52 |

---

## 7. Balance de la presión

Compara 5+ rushers contra presión estándar (definiciones de la métrica 5), en el set de resultado y con toda la liga.

- **Δ ganadas** = % de jugadas con sack o intercepción con 5+ rushers − % con estándar. Se lee como "sacks o intercepciones extra por cada 100 jugadas".
- **Δ explosivas** = % de jugadas de 20+ yardas con 5+ rushers − % con estándar. Se lee como "jugadas explosivas extra permitidas por cada 100 jugadas".
- **Ajuste por situación** (cifra principal): los equipos mandan 5+ en situaciones distintas, así que la diferencia se calcula dentro de cada uno de los 6 grupos y se promedia con el peso de las jugadas 5+ de cada grupo (G1 645, G2 207, G3 381, G4 171, G5 195, G6 365).
- **Intervalo**: bootstrap del 95% con 1,000 remuestreos dentro de cada grupo y para cada nivel de presión por separado (semilla 42). La diferencia cruda se reporta como referencia.

**Ejemplo real** (5+ rushers n = 1,964; estándar n = 6,069):

| Medida | 5+ rushers | Estándar | Δ cruda por 100 jugadas (IC 95%) | **Δ ajustada por situación (IC 95%)** |
|---|---|---|---|---|
| Sacks + intercepciones | 10.69% | 7.99% | +2.70 (1.16 – 4.20) | **+2.21 (0.69 – 3.88)** |
| Explosivas permitidas | 10.85% | 9.06% | +1.78 (0.39 – 3.31) | **+1.84 (0.21 – 3.43)** |

Lectura: por cada 100 pases, mandar 5+ genera unas 2.2 jugadas más ganadas por la defensa y permite unas 1.8 explosivas más. Las dos diferencias son pequeñas y sus intervalos son anchos en relación con su tamaño.

---

## 8. Defensores: tasa de presión de cada pass rusher

- **Unidad:** fila de `pffScoutingData.csv` con `pff_role == "Pass Rush"`, en jugadas del set de resultado (34,100 filas de 36,362).
- **Presión del jugador en la jugada:** 1 si `pff_hurry + pff_hit + pff_sack ≥ 1`. Las tres marcas nunca coinciden en la misma fila (0 filas con más de una), así que la suma equivale a contar cada marca.
- **Nulos:** 0% en las tres columnas dentro de las filas Pass Rush (el 50% de nulos del archivo corresponde a jugadores que no son defensores).
- **Tasa bruta** = x / n (jugadas con presión / jugadas en las que presionó).
- **Ajuste Beta-Binomial:** el mismo procedimiento de la métrica 3, con el prior estimado con los 346 jugadores que tienen n ≥ 20 (el resto se excluye solo del cálculo del prior, para que su ruido no infle la varianza). La media posterior y el IC 90% se calculan para todos los jugadores (694).
- **Prior obtenido:** K = 346, N = 31,983, m = 0.1100, v_obs = 0.00233, ruido = 0.00106, v = 0.00127, s = 75.86 → a = 8.344, b = 67.513.
- Nombre y posición: `displayName` y `officialPosition` de `players.csv` por `nflId`.

**Ejemplo real:** Myles Garrett (DE), x = 42, n = 186 → bruta 0.226. Posterior = (8.344 + 42) / (75.857 + 186) = **0.192**, IC 90%: 0.153 – 0.233.

Contraste con muestra pequeña: Jevon Holland (FS), x = 6, n = 13 → bruta 0.462 (la mayor de la liga entre jugadores con 10 a 29 jugadas). Posterior **0.161**, IC 90%: 0.102 – 0.230, con marca "muestra pequeña". El modelo evita que un safety con 13 blitzes aparezca por encima de Garrett.

Top 5 por media posterior (n ≥ 20): Myles Garrett 0.192 · Maxx Crosby 0.184 · Matt Judon 0.179 · Randy Gregory 0.176 · Trey Hendrickson 0.175.

---

## Limitaciones

1. **Solo jugadas de pase.** No hay carreras, despejes ni goles de campo. El reporte no describe el ataque completo del rival.
2. **Profundidad y dirección del pase**: fuera de alcance. No existen como columna y no se derivaron del tracking. No hay métrica de "pase profundo".
3. **Estructura de safeties** (uno o dos profundos antes del snap): fuera de alcance, aunque el tracking lo permitiría.
4. **Yardas a la end zone:** 138 jugadas de la base difieren más de 2 yardas entre la fórmula y el tracking en el snap. Se conservan; la causa queda sin confirmar. Además, 25 jugadas no tienen evento `ball_snap` y no se pudieron validar.
5. **Jugadas anuladas:** se detectan por texto ("no play" / "nullified" en `playDescription`). No se verificó que el texto capture todas las anuladas.
6. **Eficacia de la defensa:** es asociación, no causa. Las coberturas y la presión se eligen según la situación y el rival. El ajuste por grupo de la métrica 7 reduce ese sesgo, pero no lo elimina.
7. **Calendario:** algunos equipos tienen 7 partidos y otros 8 en `games.csv` (semanas 1-8). Sin confirmar si es por semana de descanso.
8. **Sacks:** `pff_sack` suma 602 y `passResult == "S"` son 543 jugadas. La diferencia (posibles sacks compartidos) está sin confirmar. Para "ganadas por la defensa" se usa `passResult`.
