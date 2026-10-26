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
