# Reglas del proyecto

## Stack
- Stack fijo del evento: Python 3.12 con FastAPI, pandas y numpy en backend/; React + Vite + TypeScript + Tailwind + Recharts en dashboard/. Pruebas con pytest.
- No agregues librerías que no estén ya instaladas (nada de scipy, sklearn, statsmodels ni streamlit). Toda la estadística se implementa a mano con numpy/pandas; para muestreos aleatorios usa numpy con semilla fija.
- Respeta la estructura que ya trae la plantilla en backend/ y dashboard/.

## Datos
- Los datos están en data/ y son de solo lectura: nunca los modifiques, muevas ni copies.
- Nunca inventes columnas, valores ni significados. Si no sabes qué significa una columna, escribe "sin confirmar" y propón cómo verificarlo con código.
- Toda cifra que aparezca en la app o en el README debe salir de código ejecutado sobre los datos, nunca de tu memoria.
- Toda estimación se muestra con su n y su intervalo (de credibilidad o bootstrap). Si n < 30, se marca como "muestra pequeña".

## Enfoque
- El proyecto es defensivo: el usuario es el coach defensivo que se prepara contra un rival. "Rival" = el equipo que ataca (possessionTeam o equivalente).

## Seguridad
- Nunca escribas llaves, tokens ni contraseñas en el código. Las credenciales se leen de variables de entorno o de un archivo .env que debe estar en .gitignore.

## Estilo
- Código simple, funciones pequeñas, comentarios en español.
- Antes de hacer algo grande, dime en 2 líneas qué vas a hacer y espera mi confirmación.
- Al terminar cada tarea, dime qué archivos creaste o cambiaste y cómo probarlo.
