# Comparación de ventanas Ethereum — 27/10/2026

Estudio exploratorio; no modifica el modelo publicado. La prueba histórica ya había sido observada.

| Horizonte | Ventana elegida por validación | F1 validación (semillas/periodos) | F1 prueba del ensamble | F1 prueba control 30 días |
| --- | --- | --- | --- | --- |
| 1 días | 30 | 0.3111 | 0.3742 | 0.3742 |
| 7 días | 30 | 0.2906 | 0.3223 | 0.3223 |

Regímenes definidos con el rendimiento de los 30 días ANTERIORES al origen: alcista >5%, bajista <-5%, lateral en otro caso. No se usan rendimientos futuros para clasificarlos.

Se comparan los mismos orígenes de pronóstico, tres semillas (42/17/73), tres ventanas (14/30/60) y tres particiones cronológicas por horizonte. El escalador y el early stopping solo usan el entrenamiento interno. Cada frontera excluye objetivos que alcanzan el periodo siguiente.

El ganador es una ventana, no la semilla con mejor prueba. Para superar al control se exige ganancia media de F1 >=0.01 y mejoras en al menos dos particiones y dos semillas. La evaluación del ensamble promedia las probabilidades de las tres semillas; no se interpreta como confianza calibrada.

Las referencias Majority, Persistence, LogisticRegression y RandomForest usan los mismos periodos; la exactitud no sustituye al F1 macro ni a métricas por clase. Las puntuaciones de regímenes pequeños se deben leer junto con su número de muestras.

No se cambian pesos de producción automáticamente, aunque un candidato supere las reglas históricas. Se requiere evaluación prospectiva independiente. JSON completo: window_study.json. Protocolo fijado antes de ejecutar: window_study_protocol.json. Pesos de candidatos: checkpoints locales, ignorados por Git.

## Regímenes en prueba exploratoria, 1 días (ventana 30)

| Régimen | Muestras | F1 macro | Exactitud |
| --- | --- | --- | --- |
| alcista | 208 | 0.3889 | 38.9% |
| bajista | 170 | 0.3426 | 34.7% |
| lateral | 108 | 0.3782 | 38.9% |

## Regímenes en prueba exploratoria, 7 días (ventana 30)

| Régimen | Muestras | F1 macro | Exactitud |
| --- | --- | --- | --- |
| alcista | 208 | 0.4085 | 44.7% |
| bajista | 164 | 0.2234 | 37.2% |
| lateral | 108 | 0.2301 | 31.5% |
