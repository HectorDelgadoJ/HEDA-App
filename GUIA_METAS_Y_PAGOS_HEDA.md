# Confirmar recurrentes y entender tus metas

## Publicación

Sube dist al mismo sitio de Netlify y recarga HEDA. Este cambio utiliza funciones y columnas existentes: no se ejecuta SQL ni se cambia ninguna Edge Function.

## Confirmar pago

El botón envía la referencia del recurrente y su fecha. La función del servidor comprueba la cuenta, el vencimiento y si ya se registró esa ocurrencia; obtiene la tarjeta desde el propio recurrente. La app espera una referencia de movimiento confirmado antes de mostrar éxito. Confirma solo si el pago o cobro ocurrió realmente: HEDA no realiza pagos.

## Metas

La barra usa ahorro acumulado / cantidad objetivo, limitada visualmente a 100%. Las metas alcanzadas siguen en Reportes. Cada aportación verificada actualiza la barra y los cálculos. El guardado impide sobrescribir un avance que haya cambiado en otro dispositivo; si no se puede comprobar el resultado, revisa la cantidad antes de repetirlo.

Con fecha elegida, HEDA calcula lo que falta y una cantidad semanal orientativa para terminar a tiempo. Tras siete días desde la creación y con ahorro positivo, compara el promedio acumulado por día con la fecha objetivo. No existe historial detallado de aportaciones: es un promedio desde la creación, no una medición de cuándo se aportó cada cantidad. Una aportación grande aislada puede hacer que ese promedio no represente el futuro. No garantiza que se alcance la meta ni comprueba la capacidad real para ahorrar.

Cómo puedo avanzar permite revisar una aportación sugerida antes de registrarla, o ajustar la fecha con calendario. La fecha sigue siendo opcional. El cálculo es local y no consulta a la IA.

## Comprobación manual

1. Confirmar un recurrente vencido que realmente haya ocurrido; revisar un solo movimiento en Historial y la siguiente fecha del recurrente.
2. Repetir con un ingreso y un cargo asociado a tarjeta.
3. Crear una meta, registrar una aportación y comprobar el cambio del porcentaje.
4. Revisar el plan, ajustar la fecha y verificar el nuevo cálculo.
5. Completar la meta y recargar: debe seguir visible al 100%.
6. Abrir la visita desde Perfil: debe indicar Tutorial de HEDA.

Prueba automatizada de navegador: scripts/check-goals-payments.cjs. Intercepta todas las peticiones de Supabase y no modifica cuentas reales.
