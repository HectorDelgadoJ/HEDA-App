# HEDA

Aplicación de finanzas personales desarrollada con **Expo SDK 57**, React Native y Supabase. Permite registrar ingresos y gastos, programar movimientos recurrentes y llevar el seguimiento de deudas por tarjeta.

## 1. Preparar la computadora

Instala:

- [GitHub Desktop](https://desktop.github.com/) para descargar y actualizar el proyecto.
- [Node.js](https://nodejs.org/), que incluye npm. La versión probada es **Node 22.15.1 con npm 10.9.2**. También se admiten Node 22 desde 22.13 o Node 24 desde 24.3, con npm 10 u 11.
- **Expo Go** en tu celular, actualizado desde App Store o Google Play.

Después de instalar Node, abre una terminal nueva y verifica:

```powershell
node -v
npm -v
```

Los requisitos están definidos en `package.json`. `.nvmrc` y `.node-version` indican la versión probada para quienes usan un administrador de versiones de Node.

## 2. Descargar el proyecto

En GitHub Desktop:

1. Inicia sesión con tu cuenta de GitHub.
2. Selecciona **File → Clone repository** y busca `HectorDelgadoJ/HEDA-App`.
3. Elige la carpeta donde guardarás el proyecto y pulsa **Clone**.
4. En **Current branch**, selecciona **main**.
5. Pulsa **Fetch origin** y, si aparece, **Pull origin**.
6. Abre una terminal en la carpeta descargada. Debes ver `package.json` en esa carpeta.

Si prefieres usar Git desde la terminal:

```powershell
git clone --branch main https://github.com/HectorDelgadoJ/HEDA-App.git
cd HEDA-App
```

Necesitas acceso al repositorio si GitHub solicita iniciar sesión.

## 3. Instalar las dependencias

Desde la carpeta del proyecto:

```powershell
npm install
```

No necesitas instalar Expo globalmente. Los comandos del proyecto utilizan su versión local.

No uses `--force` ni `--legacy-peer-deps` para ocultar conflictos de versiones. Conserva `package-lock.json`: contiene las versiones de las dependencias que se probaron juntas. Para una instalación limpia y estrictamente basada en ese archivo también puedes usar `npm ci`.

## 4. Configurar la conexión a Supabase

### Si HEDA ya funciona en otra computadora

Copia su archivo **`.env.local`** a la raíz del proyecto nuevo, junto a `package.json`. El archivo está excluido de Git, por lo que no se descarga al clonar.

Usando el mismo proyecto Supabase tendrás los mismos usuarios y datos. **No necesitas crear otra base de datos ni repetir los SQL.**

### Si no tienes el archivo de configuración

Crea una copia del ejemplo:

```powershell
Copy-Item .env.example .env.local
```

Abre `.env.local` y reemplaza los valores de ejemplo:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=https://TU_PROYECTO.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLISHABLE
```

Obtén la URL y la clave **publishable** en el panel de tu proyecto Supabase. No coloques claves secretas ni `service_role` en la aplicación.

`npm install` instala las dependencias; estas variables permiten conectar la aplicación a tus datos. Después de modificarlas, detén Expo y vuelve a iniciarlo.

## 5. Iniciar HEDA y abrirla en el celular

Inicia sesión con tu cuenta de Expo:

```powershell
npx expo login
```

Arranca el proyecto mediante un túnel:

```powershell
npm run start:tunnel
```

Este modo necesita internet y permite conectar el celular aunque esté en otra red Wi-Fi.

En el celular:

1. Abre Expo Go.
2. **En iPhone, inicia sesión con la misma cuenta de Expo que usaste en la terminal.** Tu cuenta de Expo es independiente de tu cuenta dentro de HEDA.
3. Escanea el QR nuevo: en iPhone usa la cámara y abre el enlace con Expo Go; en Android puedes usar el lector de Expo Go.
4. Espera a que termine la carga inicial.
5. Dentro de HEDA, crea tu cuenta o inicia sesión con la que ya tienes.

Mantén la computadora y la terminal encendidas mientras usas esta versión de desarrollo.

Si ambos dispositivos están en la misma red local, también puedes iniciar con:

```powershell
npm start
```

En la terminal de Expo, **`r`** recarga la aplicación y **Ctrl+C** detiene el servidor.

## 6. Usar la aplicación

### Registrar un movimiento

1. Abre **Movimientos → Registrar**.
2. Elige **Gasto** o **Ingreso**.
3. Introduce el monto y selecciona una categoría; puedes escribir una categoría personalizada.
4. Cambia la fecha si el movimiento corresponde a otro día y agrega una nota si la necesitas.
5. Pulsa **Guardar gasto** o **Guardar ingreso**.

En **Historial** puedes tocar un movimiento para editarlo o eliminarlo. Los ingresos tienen contorno verde y los gastos, rojo.

### Elegir cómo llevar tus gastos

En la parte superior de Movimientos puedes elegir:

- **Simple:** los ingresos aumentan tu saldo y los gastos lo reducen directamente.
- **Con tarjetas:** cada gasto puede salir de **Mi saldo** o cargarse a una tarjeta. Un cargo aumenta la deuda de esa tarjeta; el saldo disponible baja cuando la pagas.

Los movimientos anteriores permanecen como movimientos de Mi saldo. Cambiar de modo conserva los registros y no convierte cargos anteriores en otro tipo de movimiento.

### Agregar una tarjeta

1. Activa **Con tarjetas** y abre **Programados → Mis tarjetas**.
2. Pulsa **Agregar tarjeta**.
3. Escribe el nombre, la deuda inicial anterior a HEDA y la fecha límite de pago.
4. Usa **0** como deuda inicial si empiezas sin deuda. No incluyas aquí compras que ya registraste asociadas a esa tarjeta: se suman automáticamente.
5. Guarda la tarjeta. Ahora podrás elegirla al registrar gastos y recurrentes.

**Ya pagué** confirma el pago de toda la deuda registrada: reduce el saldo disponible y la deuda sin contar las compras otra vez como gastos. Confirma únicamente un pago que hayas realizado. Actualiza la fecha límite según el siguiente estado de cuenta.

### Programar un ingreso o gasto recurrente

1. Abre **Movimientos → Programados**.
2. Pulsa **Programar pago o ingreso**.
3. Completa nombre, tipo, monto, categoría y primera fecha.
4. Elige la frecuencia o personaliza cada cuántos días, semanas, meses o años se repite.
5. En Con tarjetas, elige **Mi saldo** o la tarjeta donde se cargará el gasto.
6. Guarda la programación y revisa la confirmación de las próximas fechas.

Los movimientos se registran al **confirmarlos**, no automáticamente. Un recurrente asociado a una tarjeta se confirma como cargo y aumenta su deuda. Puedes editar, pausar, reanudar o eliminar una programación.

Los recordatorios aparecen **dentro de HEDA**; esta versión no envía notificaciones al celular con la aplicación cerrada ni realiza cargos o cobros bancarios.

### Consultar saldos y reportes

- **Inicio:** muestra el saldo disponible y las tarjetas con seguimiento.
- **Reportes:** muestra ingresos y gastos; pagar una tarjeta no duplica el gasto de sus compras.
- **Programados:** muestra el saldo estimado al cierre del próximo mes, incluyendo pagos desde Mi saldo y deudas registradas de tarjetas que vencen en el periodo.

Los cargos futuros a tarjetas se muestran aparte: todavía no salen de tu saldo disponible. Las fechas e importes de las tarjetas se registran manualmente; HEDA no consulta al banco. El estimado no incluye gastos o ingresos que no hayas registrado o programado.

## 7. Si el QR no carga

Revisa en este orden:

1. **Rama:** confirma que descargaste `main` y que está actualizada.
2. **Versiones:** ejecuta `node -v`, `npm -v` y `npm run check:expo`.
3. **Expo Go:** actualízalo y revisa el mensaje concreto de incompatibilidad si aparece.
4. **Cuenta en iPhone:** la cuenta de Expo Go debe coincidir con la usada en `npx expo login`.
5. **Conexión:** usa `npm run start:tunnel`, espera a que aparezca el QR y escanea ese QR nuevo. No reutilices uno de otra computadora o sesión.
6. **Configuración:** confirma que `.env.local` existe y sus valores ya no son los ejemplos. `supabaseUrl is required` indica que falta la URL.

Si sigue fallando, detén el servidor con Ctrl+C y vuelve a iniciarlo limpiando la caché:

```powershell
npm run start:tunnel -- --clear
```

Si el túnel informa un error de conexión, comprueba internet y conserva el texto exacto del error para diagnosticarlo. No cambies versiones de paquetes al azar.

Para revisar la configuración general:

```powershell
npx expo-doctor
```

## 8. Actualizar el proyecto después

Antes de descargar cambios, guarda tus modificaciones locales con un commit. En GitHub Desktop selecciona `main` y pulsa **Fetch/Pull origin**. Después ejecuta:

```powershell
npm install
npm run start:tunnel
```

Tu `.env.local` permanece en la computadora. Al actualizar dependencias, sube siempre `package.json` y `package-lock.json` juntos.

## Base de datos para un proyecto nuevo

Solo si estás creando un proyecto Supabase desde cero, ejecuta los archivos de `supabase/migrations` **en orden** desde su SQL Editor. No repitas migraciones ya ejecutadas.

Para copiar el contenido de una migración desde PowerShell, por ejemplo la inicial:

```powershell
Get-Content -Raw -Encoding utf8 .\supabase\migrations\202610110001_initial_heda.sql | Set-Clipboard
```

Luego pega el **contenido SQL copiado** en Supabase → SQL Editor → Run. El comando de PowerShell se ejecuta en tu computadora; no se pega en el SQL Editor.

## Pruebas y versiones

```powershell
npm run check:expo
npx expo-doctor
npm test
```

Las pruebas de cálculos no necesitan Supabase. La prueba local de PostgreSQL es opcional y se omite si no se configura `PGLITE_TEST_MODULE`.

- Expo: **57.0.28**.
- React: **19.2.3**.
- React Native: **0.86.3**.
- Dependencias exactas y requisitos de Node/npm: `package.json`.

Referencias: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) y [requisito de inicio de sesión de Expo Go en iOS](https://docs.expo.dev/troubleshooting/expo-go-sign-in-required/).


## Asistente HEDA IA

La conexión activa utiliza Gemini mediante una Edge Function autenticada de Supabase. Sigue [la guía de configuración](GUIA_IA_GEMINI.md) para configurar Secrets y publicar el código. El asistente solo consulta agregados de tus registros al pulsar Analizar mis finanzas; antes de enviarlos a Gemini muestra una vista previa y pide autorización. La búsqueda web queda desactivada por defecto para probar en el nivel gratuito; activarla depende del acceso y facturación del proyecto de Gemini. No basta con iniciar Expo para publicar la función.

El asistente mantiene contexto reciente dentro del chat (hasta seis intercambios completos). Nueva conversación o cerrar sesión limpia ese contexto local; no hay historial permanente. Para activar seguimientos, publica la versión actual de la función según la guía.

Analizar mis finanzas prepara un resumen del mes hasta hoy, tarjetas con seguimiento y metas activas. Las categorías personalizadas se agrupan en Otros. Compartirlo inicia un chat con esos datos; Nueva conversación deja de compartirlos. Requiere publicar la función actualizada, sin SQL nuevo.


## Alertas y presupuestos mensuales

Para activar los límites por categoría, ejecuta una vez en SQL Editor la migración `supabase/migrations/202610150006_budgets.sql`, después de las migraciones anteriores. Consulta [GUIA_ALERTAS_PRESUPUESTOS.md](GUIA_ALERTAS_PRESUPUESTOS.md) para el comando de copia y las pruebas. Los avisos funcionan dentro de la app; no son notificaciones push.
