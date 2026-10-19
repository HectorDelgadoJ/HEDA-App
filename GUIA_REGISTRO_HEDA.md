# Registro de HEDA

Crear cuenta muestra solo el nombre HEDA, sin banner promocional ni botón de Google repetido. Solicita nombre, edad declarada en años, @usuario, correo y contraseña con confirmación. Después conserva las preferencias de inicio. Google permanece en Iniciar sesión; su flujo existente no solicita estos campos y no debe considerarse un registro con edad verificada.

## Paso obligatorio en Supabase

Abre `supabase/migrations/202610170009_registration_profile.sql`, copia TODO el contenido y ejecútalo en SQL Editor, después de las migraciones anteriores. Es SQL, no una Edge Function. No cambies secrets ni claves.

Para copiarlo desde PowerShell en la carpeta del proyecto:

```powershell
Get-Content .\supabase\migrations\202610170009_registration_profile.sql -Raw | Set-Clipboard
```

El script conserva los perfiles existentes. Si encuentra @ repetidos, aborta sin renombrarlos. Para identificarlos:

```sql
select lower(regexp_replace(btrim(username),'^@','')) as usuario, count(*)
from public.profiles where nullif(btrim(username),'') is not null
 group by 1 having count(*) > 1;
```

Resuelve esos duplicados individualmente antes de ejecutar de nuevo el script. El índice único evita colisiones también al editar perfiles o con registros simultáneos. El RPC público devuelve solo disponibilidad, nunca datos de perfiles. Sigue aplicando límites de Auth/CAPTCHA para el registro.

La edad es autodeclarada entre 1 y 120; este rango solo valida el dato, no establece una política legal de admisión. Se guarda junto con la fecha de registro y no aumenta automáticamente. No se pide fecha de nacimiento. Los perfiles antiguos conservan sus datos sin inventar edades.

## Verificación manual

Crear cuenta debe mostrar todos los campos obligatorios; probar edad vacía/decimal y un @ ocupado; registrar @ nuevo; intentar reutilizarlo con otro correo y desde Editar perfil. Confirmar que no aparece Google en Crear cuenta y que el teclado funciona en iPhone. El formulario necesita esta migración para comprobar disponibilidad.
