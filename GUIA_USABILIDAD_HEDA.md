# HEDA: usabilidad y ayudas de primera vez

## Qué cambia

- Registro y acceso indican los campos obligatorios. El último paso del registro dice Finalizar registro; después de confirmar el correo se ofrece ir a iniciar sesión. No se confunde crear una cuenta con entrar a una existente.
- Recurrentes es el nombre de la sección de pagos e ingresos que se repiten. El formulario y el botón usan el mismo concepto.
- Inicio destaca una acción según la prioridad: gastos, pagos recurrentes o ahorro. Abre la tarea correspondiente; no crea registros por elegir una prioridad.
- La vista simple nueva muestra tres atajos de partida, sin duplicar el acceso al registro. Las selecciones guardadas se conservan y todas las funciones siguen disponibles desde el menú y Herramientas. Elegir qué mostrar permite cambiarlo.
- Visita guiada de seis pasos, con explicaciones concretas, opción de salir, accesibilidad y botones para probar una tarea. Ahorrar adelanta el paso de metas. Las cuentas que ya terminaron el tutorial no tienen que repetirlo; se abre desde Perfil.
- Ayudas breves en movimientos, edición, recurrentes, metas, aportaciones de ahorro, reportes, presupuestos, avisos, IA, lecciones, hábitos, QR y Ethereum. No aparecen ventanas en cada botón: la descripción está junto a la tarea y no bloquea el formulario.

## Control de las ayudas

Pulsa **Entendido · No mostrar otra vez** para ocultar esa explicación. La decisión se recuerda por cuenta en ese navegador o dispositivo, no entre dispositivos. Perfil → Volver a mostrar explicaciones reinicia las ayudas, sin borrar registros. Personalizar HEDA → Atajos y bloques → Ayudas permite desactivar las explicaciones y ocultar la tarjeta de prioridad de Inicio. Guarda las preferencias.

## Publicar y probar

Subir la carpeta dist actualizada al mismo proyecto de Netlify. No requiere SQL ni modificar Edge Functions. El endurecimiento de contraseña del servidor se configura por separado según SEGURIDAD_CONTRASENAS_HEDA.md.

Prueba recomendada con una cuenta de ensayo:
1. Cambiar entre las tres prioridades y comprobar que Inicio propone acciones distintas.
2. Usar el acceso a metas para crear una y registrar ahorro.
3. Crear un recurrente manualmente; revisar fecha y tipo antes de guardar.
4. Ocultar una explicación, recargar y comprobar que sigue oculta.
5. Repetir las ayudas desde Perfil y verificar que reaparece.
6. Abrir Ver visita guiada y probar una tarea desde el recorrido.
7. Ampliar el texto al 200% y verificar campos y botones de los formularios.

Las pruebas automatizadas usan datos ficticios y no acreditan una evaluación con personas mayores. Falta observar a usuarios reales realizando tareas sin ayuda para evaluar si el lenguaje y el recorrido les resultan claros.

## Regresiones locales

npm test

Con la web local de npm run preview:web y Playwright disponible:
- node scripts/check-manual-forms.cjs
- node scripts/check-usability.cjs

Si Playwright está fuera del proyecto, establecer HEDA_PLAYWRIGHT_MODULE con su ruta. HEDA_QA_DARK=1 verifica tema oscuro; HEDA_QA_LARGE=1 en check-manual-forms verifica texto al 200%. Las solicitudes de Supabase se interceptan en estas pruebas.
