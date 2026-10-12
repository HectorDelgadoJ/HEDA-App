# HEDA

App de finanzas personales con Expo SDK 57, React Native y Supabase.

## Instalar en otra computadora

1. Instala Node.js **22.15.1** (version probada) y su npm **10.9.2**. Tambien se admiten Node 22 desde 22.13 o Node 24 desde 24.3, con npm 10 u 11. Revisa `node -v` y `npm -v`.
2. Clona el repositorio y usa la rama **main** actualizada. En GitHub Desktop: Clone repository, elige main y Fetch/Pull origin.
3. Abre una terminal en la carpeta que contiene `package.json` y ejecuta:

```powershell
npm install
```

No uses `--force` ni `--legacy-peer-deps`. `package.json` fija las dependencias directas y `package-lock.json` conserva las versiones del resto. No borres el lockfile para resolver diferencias entre computadoras.

4. Copia **`.env.local`** de la computadora donde HEDA ya funciona a la raiz del proyecto. Este archivo no se sube a Git. Si no lo tienes, ejecuta:

```powershell
Copy-Item .env.example .env.local
```

Abre `.env.local` y sustituye los ejemplos por la URL y la clave **publishable** de tu proyecto Supabase. No uses claves secretas ni `service_role` en la app. `npm install` instala dependencias; la conexion a tus datos requiere estas dos variables.

5. Inicia sesion con tu cuenta de Expo y abre el proyecto:

```powershell
npx expo login
npm run start:tunnel
```

Actualiza Expo Go en el telefono. En un iPhone, inicia sesion en Expo Go con la **misma cuenta de Expo** que usaste en la terminal, y escanea el QR nuevo. Manten la computadora y la terminal encendidas. El tunel necesita internet y permite probar sin estar en la misma red Wi-Fi.

Para iniciar por red local usa `npm start`. Para limpiar la cache al cambiar de computadora o version usa `npm run start:tunnel -- --clear`.

## Verificar la instalacion

```powershell
npm run check:expo
npx expo-doctor
npm test
```

Para una instalacion limpia y estrictamente basada en el lockfile, usa `npm ci`. Las pruebas de base de datos locales son opcionales y se omiten si no se configura `PGLITE_TEST_MODULE`; las pruebas de calculos no necesitan Supabase.

## Base de datos

Al usar el mismo proyecto Supabase no necesitas crear otra base ni repetir sus migraciones. Para un proyecto **nuevo**, ejecuta los archivos de `supabase/migrations` en orden, desde SQL Editor. Las migraciones ya ejecutadas no deben repetirse.

## Versiones del proyecto

- Expo SDK 57: React 19.2.3 y React Native 0.86.3.
- Node/npm: definidos en `package.json`; `.nvmrc` y `.node-version` indican la version probada.
- Dependencias: instala y sube siempre `package.json` y `package-lock.json` juntos.

Referencias: [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/) y [requisito de inicio de sesion de Expo Go en iOS](https://docs.expo.dev/troubleshooting/expo-go-sign-in-required/).
