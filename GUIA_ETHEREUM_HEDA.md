> Actualización 26/10/2026: para publicar la versión actual usa primero [GUIA_CIERRE_TT_HEDA.md](GUIA_CIERRE_TT_HEDA.md). Ahora se requieren SQL 013/014 y la configuración de avisos; los pasos antiguos de este archivo documentan la primera versión.

# Ethereum: entrenamiento, publicación y límites

Primera versión experimental real. No utiliza Gemini para adivinar precios. La LSTM clasifica tendencias a 1 y 7 días con umbral ±1%. No es una recomendación de inversión y todavía presenta desempeño bajo.

## Publicar, en orden

1. En PowerShell de tu PC, dentro del proyecto, ejecuta:

```powershell
node scripts/build-ethereum.mjs
Get-Content -Raw -Encoding UTF8 "C:\Users\vicda\OneDrive\Documents\GitHub\HEDA-App\supabase\ethereum-forecast-dashboard.ts" | Set-Clipboard
```

2. Supabase → Edge Functions → Deploy a new function → Via Editor. Nombre EXACTO: `ethereum-forecast`. Sustituye el contenido de `index.ts` con lo copiado y publica. Es TypeScript: **NO va en SQL Editor**. En Details/Settings, desactiva **Verify JWT with legacy secret** (igual que heda-ai): `withSupabase({auth:"user"})` valida la sesión y `getUser()` comprueba el usuario. No es una función anónima; exige sesión válida. No expongas claves secretas para probarlo.
3. Actualiza también la función existente `heda-ai` para corregir las respuestas antiguas que negaban poder proponer movimientos:

```powershell
node scripts/build-heda-ai.mjs
Get-Content -Raw -Encoding UTF8 "C:\Users\vicda\OneDrive\Documents\GitHub\HEDA-App\supabase\heda-ai-dashboard.ts" | Set-Clipboard
```

Pega en **heda-ai → Code → index.ts**, reemplaza y publica. Para crear movimientos/metas/presupuestos/recurrentes desde el chat se mantiene la migración `202610250012_assistant_actions.sql`; si ya la ejecutaste no necesitas repetirla. Esa migración sí es SQL. No hay una migración SQL nueva para Ethereum.

4. Actualiza la web:

```powershell
npm run build:web
```

Sube la carpeta `dist` al mismo proyecto HEDA en Netlify. En móvil con Expo, recarga la app con el código actualizado.
5. Inicia sesión → IA → Explorar/Herramientas → Ethereum. Comprueba historial, fechas UTC, horizonte 1/7, metodología y botón Actualizar. Prueba sin conexión: debe mostrar error o advertencia, nunca fingir una cotización nueva. No he publicado estas funciones en tu cuenta.

No se necesita una API key nueva para Yahoo Finance. Si el proveedor bloquea o limita consultas, se muestra una consulta histórica claramente marcada con los últimos datos reales del entrenamiento. El caché es por instancia (1 hora); no garantiza una cuota global de proveedor entre múltiples instancias.

## Reproducir investigación

Python 3.12, entorno separado de npm/Expo:

```powershell
py -3.12 -m venv .venv-ethereum
.\.venv-ethereum\Scripts\python.exe -m pip install -r ml/ethereum/requirements.lock.txt
.\.venv-ethereum\Scripts\python.exe ml/ethereum/pipeline.py --as-of 2026-10-25 --epochs 45 --window 30
node scripts/build-ethereum.mjs
.\.venv-ethereum\Scripts\python.exe -m unittest discover -s ml/ethereum -p "test_*.py"
npm test
```

Para un nuevo experimento cambia `--as-of` (fecha exclusiva UTC). El proveedor puede revisar históricos; el manifiesto registra URL, fecha, filas y SHA-256 del CSV. El CSV se descarga localmente y no se incluye en Git. Revisar permisos/licencia del proveedor antes de redistribuir comercialmente los datos. Los pesos, manifiesto y resultados sí se conservan. No modifiques ni selecciones hiperparámetros usando repetidamente el conjunto de prueba; el siguiente experimento debe incluir validación temporal adicional y un nuevo periodo reservado.

## Evidencia obtenida

- 3,272 velas diarias ETH-USD, 2017-11-09 a 2026-10-24. OHLCV; no se rellenan días faltantes ni se usa la vela diaria abierta.
- Diez variables derivadas, ventana 30 días, normalización ajustada solo al periodo de entrenamiento.
- Separación cronológica 70/15/15 y eliminación de objetivos que cruzan sus fronteras. Early stopping por F1 macro de validación.
- Comparadores: clase mayoritaria, regresión logística, árbol de decisión y Random Forest.
- LSTM prueba: F1 macro 0.3465 / exactitud 36.42% a 1 día; F1 macro 0.2522 / exactitud 26.04% a 7 días.
- Ganador por validación: regresión logística (1 día), Random Forest (7 días). LSTM es el experimento principal solicitado por el TT, **no se afirma que sea superior**. A 7 días incluso la exactitud de clase mayoritaria es mayor.
- Métricas por clase y matrices de confusión: `ml/ethereum/reports/evaluation.json`. Comparación: `model_comparison.csv` y `evaluation.png`.
- Inferencia JavaScript contrastada contra salidas reales PyTorch y variables normalizadas. Los valores softmax no están calibrados y no se muestran como certeza de mercado.

Pendientes científicos: varias semillas, validación walk-forward, análisis por régimen, calibración, selección de variables/ventanas sin contaminar prueba, incertidumbre y evaluación prospectiva. No se promete alcanzar determinada exactitud.


## Revisión experimental v2 (26/10/2026)

Se compararon semillas predeclaradas 42/7/17/73 (máximo 70 épocas en los candidatos nuevos) y se eligió por F1 macro de VALIDACIÓN, nunca por la prueba. Se conservó semilla 42 a 1 día y se eligió 17 a 7 días. F1 macro de prueba: 0.3465 y 0.3110; exactitud 36.42% y 34.17%. La LSTM mejoró a 7 días, pero sigue siendo débil. El ganador por validación es logística (1 día) y LSTM (7 días); Random Forest todavía obtiene un F1 de prueba mayor a 7 días (0.3186). Esto no justifica decidir inversiones.

Se exportaron referencias logística/Random Forest e inferencia contrastada con sklearn. Tres particiones temporales crecientes para referencias, anteriores al test original, están en reference_models.json. El test de v1 ya había sido visto: la revisión v2 es exploratoria, **no una prueba ciega nueva**. Aún se necesita un periodo prospectivo reservado.

Para reproducir después del pipeline inicial:

```powershell
.\.venv-ethereum\Scripts\python.exe ml/ethereum/compare_models.py
.\.venv-ethereum\Scripts\python.exe ml/ethereum/tune_lstm.py
node scripts/build-ethereum.mjs
node scripts/build-notifications.mjs
```

La fuente alternativa Coinbase usa un mercado y volumen distintos a Yahoo. La advertencia se mantiene visible; no se afirma que la evaluación con Yahoo valide automáticamente esa sustitución. Requiere estudio específico de cambio de distribución si se desea usar como fuente habitual del modelo.


## Revisión de mercado y experimento BTC — 26/10/2026

La pantalla separa variaciones históricas de 1/7/30 días de tendencias experimentales. Cuando LSTM y referencia discrepan muestra Señales mixtas; una instantánea antigua no se presenta como tendencia actual. La metodología y métricas quedan plegadas para reducir carga visual.

La consulta del servidor compite entre los dos endpoints de Yahoo y un fallback Coinbase retrasado 750 ms. Solo acepta como actualización velas del último día cerrado; una respuesta atrasada no gana por ser más rápida. La fuente alternativa sigue indicando que el modelo se entrenó con Yahoo. El cliente conserva cinco minutos la respuesta por cuenta; Actualizar consulta el servidor, sujeto a su caché.

Experimento reproducible, separado de los pesos publicados:

```powershell
.\.venv-ethereum\Scripts\python.exe ml/ethereum/market_context_experiment.py
```

Compara indicadores estacionarios ETH versus ETH+BTC con regresión logística y HistGradientBoosting, tres ventanas crecientes, purga de objetivos igual al horizonte y escaladores ajustados solo con entrenamiento. No se usa el test para seleccionar. El test original ya había sido visto: los resultados siguen siendo exploratorios. No reemplaza ni modifica la LSTM desplegada.

En validación temporal, HistGradientBoosting ETH+BTC frente a ETH solo: F1 medio de 1 día 0.3749 frente a 0.3513; de 7 días 0.3363 frente a 0.3358. Es una señal de investigación, sin prueba estadística de superioridad. El cambio de siete días es mínimo. Las métricas de test exploratorio del candidato son 0.3851 y 0.3485, respectivamente; no son directamente comparables con un experimento de distinta selección/representación como si fueran un nuevo holdout independiente. Ver reports/market_context_experiment.json y data/btc_manifest.json para fechas y trazabilidad. No se recopilaron publicaciones sociales ni se fabricaron noticias.

Para congelar predicciones nuevas antes de que cierre la fecha objetivo:

```powershell
node scripts/capture-ethereum.mjs
```

Guarda fuente, cierre de origen, fecha objetivo, hora de captura, modelo, SHA-256 y resultados todavía pendientes en ml/ethereum/reports/prospective_predictions.json. Rechaza fuentes desactualizadas y no reemplaza predicciones anteriores con la misma clave. El 26/10/2026 se registraron horizontes con objetivo 26/10 y 01/11; todavía no son evidencia de acierto. El objetivo de un día puede registrarse durante ese día, antes del cierre UTC; no representa un horizonte de 24 horas desde el clic. Al evaluar, usar el cierre posterior de la misma fuente y documentar la hora de emisión. La captura es manual; no se configuró una tarea automática.

Para publicar esta revisión: copiar ethereum-forecast-dashboard.ts a la función ethereum-forecast y subir dist a Netlify. No requiere SQL nuevo ni claves adicionales. heda-notify-dashboard.ts también se regeneró con el proveedor compartido y el diagnóstico de generación, pero la pantalla Ethereum no depende de volver a desplegar heda-notify.


## Noticias RSS y nueva comparación LSTM — 27/10/2026

La pantalla incluye «Noticias y contexto», plegado inicialmente. Solo consulta titulares al abrirla. Fuentes permitidas: Ethereum Foundation (institucional), CoinDesk y Cointelegraph; se conservan título, URL HTTPS, publicación, primera observación y fuente. No se extraen artículos completos ni se envían datos de la cuenta a esos sitios. Tres consultas paralelas, máximo seis segundos por fuente, caché de diez minutos por instancia y funcionamiento parcial si falla alguna fuente. La disponibilidad depende también de la red del servidor. Se indican fecha de consulta y fuentes disponibles.

El «tono del titular» es un conteo explícito de palabras en inglés, con abstención ante algunas negaciones. **No es FinBERT ni una medida validada del sentimiento del mercado**, no representa todas las personas, no interpreta todo el artículo y no entra en la LSTM. Noticias y predicción son dos elementos distintos. Una noticia favorable puede acompañar una caída. Se rechazan enlaces fuera de las fuentes, fechas futuras, XML con entidades externas y cargas excesivas.

### Publicar, en este orden

1. En la terminal de VS Code dentro de HEDA-App:

```powershell
Get-Content -Raw -Encoding UTF8 ".\supabase\ethereum-forecast-dashboard.ts" | Set-Clipboard
```

2. Supabase → Edge Functions → ethereum-forecast → Code. Reemplazar **todo** el archivo por el portapapeles y pulsar Deploy. Es TypeScript, **no va al SQL Editor**. Conserva la autenticación existente. No requiere claves nuevas, SQL ni modificar heda-notify.
3. Subir la carpeta dist actualizada al mismo proyecto Netlify.
4. En HEDA → Herramientas → Ethereum → Noticias y contexto, comprobar título, enlace, fecha, disponibilidad de fuentes y actualización. Si todas fallan, debe mostrarse el estado para reintentar; la predicción no debe desaparecer.

### LSTM con Bitcoin: resultado real

Experimento local `ml/ethereum/lstm_market_experiment.py`: representaciones estacionarias ETH y ETH+BTC, misma semilla/configuración, tres particiones temporales crecientes anteriores a la prueba, ventana de 30 días, horizonte de purga, normalización y early stopping solo con entrenamiento interno. El conjunto de prueba original ya fue observado: sigue siendo exploratorio. Las puntuaciones no son directamente comparables con la LSTM publicada porque cambian representación y procedimiento de ajuste.

| Horizonte | F1 medio validación ETH | F1 medio validación ETH+BTC | Candidato seleccionado | F1 prueba exploratoria |
| --- | --- | --- | --- | --- |
| 1 día | 0.3101 | 0.3175 | ETH: ganancia BTC menor a 0.01 | 0.3580 |
| 7 días | 0.2674 | 0.3154 | ETH+BTC | 0.2331 |

El candidato de siete días no generalizó bien. **Los pesos publicados permanecen intactos**; no se afirma que añadir Bitcoin haya mejorado el sistema en producción. Configuración, hashes, particiones y resultados están en reports/lstm_market_experiment.json; checkpoints locales ignorados por Git. El estudio previo de HistGradientBoosting también permanece documentado.

### Recopilación y evaluación reproducibles

```powershell
# Capturar titulares públicos, sin reescribir cuándo se vieron por primera vez:
node scripts/capture-ethereum-news.mjs
# Comprobar si existe muestra suficiente para precios versus precios+titulares:
.\.venv-ethereum\Scripts\python.exe ml/ethereum/sentiment_experiment.py
# Congelar predicciones nuevas:
node scripts/capture-ethereum.mjs
# Resolver objetivos ya cerrados, con la misma fuente y sin modificar pronósticos:
node scripts/evaluate-ethereum.mjs
# Repetir la comparación LSTM (usa los CSV locales y no publica pesos):
.\.venv-ethereum\Scripts\python.exe ml/ethereum/lstm_market_experiment.py
```

La captura es **manual**; no hay un recolector programado. Los titulares de hoy no se retrotraen a años anteriores por tener una fecha de publicación antigua. El archivo conserva primera observación y versión/hash de la regla de tono. Los días sin captura son desconocidos, no días con cero noticias. Para entrenar la comparación de sentimiento se exigen al menos 180 orígenes observados con precios y objetivos disponibles. Hoy devuelve **muestra insuficiente**; no existe una puntuación de mejora de sentimiento que se pueda defender todavía. Con esta recogida prospectiva sola no se espera alcanzar esa muestra antes del 18 de noviembre: sería necesario un archivo histórico fiable y autorizado, o presentarlo como trabajo futuro. El CSV de precios de investigación permanece congelado al 24/10; debe ampliarse explícitamente con velas verificadas de la misma fuente para alinear observaciones nuevas.

La evaluación prospectiva exige que el pronóstico se haya registrado antes del cierre objetivo, la misma fuente, precios positivos y origen no revisado. No sustituye un cierre Yahoo por Coinbase para acreditar un acierto. Las predicciones pueden haberse emitido durante el día objetivo: se informa el tiempo efectivo hasta su cierre. Se añadieron dos registros Coinbase con origen 26/10; los dos registros Yahoo anteriores siguen pendientes porque la consulta actual devolvió otra fuente. Cuatro registros no constituyen evidencia suficiente de capacidad predictiva.

### Evidencia y límites

263 pruebas JavaScript y cinco Python pasaron. Se comprobó en navegador móvil simulado la consulta bajo demanda, fuente/fecha/enlace y ausencia de errores y desbordamiento en claro y oscuro. Axe no detectó infracciones en esos estados muestreados; no sustituye la prueba con lector de pantalla físico. El TypeScript generado pasó Deno check. Se consultaron feeds reales. La primera captura Node detectó redirecciones en Foundation y CoinDesk; se corrigieron a sus URLs finales y la captura posterior recibió las tres fuentes, con 12 titulares seleccionados y 15 acumulados. No se garantiza disponibilidad continua.
