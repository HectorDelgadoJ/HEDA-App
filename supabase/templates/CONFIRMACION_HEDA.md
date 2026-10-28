# Correo de confirmación HEDA

En Supabase → Authentication → Emails → Confirm sign up:

- Subject: `Confirma tu correo y empieza con HEDA`
- Body → Source: reemplazar TODO por confirmation.html y guardar.

Para copiar el cuerpo desde la terminal de VS Code, dentro de HEDA-App:

```powershell
Get-Content -Raw -Encoding UTF8 ".\supabase\templates\confirmation.html" | Set-Clipboard
```

No va en SQL Editor ni Edge Functions. Mantén `{{ .ConfirmationURL }}` exactamente: Supabase lo sustituye por el enlace real. El logo utiliza https://heda-app.netlify.app/icons/icon-192.png, verificado público (HTTP 200, image/png). No hace falta volver a subir dist para esta plantilla. Algunos clientes bloquean imágenes externas: el nombre HEDA y el botón permanecen como texto. No se usan base64, SVG, JavaScript ni seguimiento de apertura.

El HTML usa entidades para los acentos, tablas y estilos inline, con adaptación a pantallas pequeñas y colores de modo oscuro cuando el cliente los admite. Las previsualizaciones de navegador no acreditan todos los clientes de correo: probar un registro nuevo en el iPhone y en escritorio. La fecha de caducidad depende de Supabase; no se incluye un tiempo fijo ni un código OTP que la pantalla de registro no permita introducir.
