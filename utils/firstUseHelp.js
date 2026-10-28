export const firstUseTips = {
 movement:{title:'Registrar un ingreso o gasto',text:'Ingreso es dinero que recibes. Gasto es dinero que usas. Elige uno, escribe la cantidad y toca Guardar. Puedes cambiar la fecha si ocurrió otro día.'},
 recurring:{title:'¿Qué es un recurrente?',text:'Es un pago o ingreso que se repite, como renta o salario. Elige cada cuánto y la primera fecha. HEDA te lo recordará; tú confirmas cuando ocurra. No hace pagos automáticos.'},
 goal:{title:'Crear una meta de ahorro',text:'Ponle nombre y elige cuánto quieres reunir. La fecha es opcional. Después puedes registrar tus aportaciones con Agregar ahorro.'},
 savings:{title:'Registrar una aportación',text:'Escribe cuánto apartaste para esta meta y toca Registrar ahorro. Esto actualiza su avance; no mueve dinero ni registra un gasto en tu saldo.'},
 editMovement:{title:'Corregir un movimiento',text:'Puedes cambiar la cantidad, categoría, fecha o nota del registro. Solo se aplican los cambios cuando tocas Guardar cambios.'},
 reports:{title:'Entender tus reportes',text:'Elige una semana, mes o año para ver tus ingresos y gastos. Más abajo están tus metas de ahorro y los gastos por categoría.'},
 budget:{title:'Elegir un límite de gasto',text:'Un presupuesto es lo máximo que planeas gastar en una categoría. Por ejemplo: 1,500 pesos al mes en comida. HEDA compara ese límite con tus registros.'},
 alerts:{title:'Revisar tus avisos',text:'Aquí aparecen pagos pendientes y avisos de tus presupuestos. Las notificaciones del teléfono o navegador necesitan tu permiso; los avisos de esta pantalla se pueden consultar aquí.'},
 assistant:{title:'Preguntarle a HEDA',text:'Escribe tu pregunta sobre dinero o el uso de la app. Para responder con tus registros, primero te pedirá permiso. Si propone crear algo, revisa y confirma antes de guardarlo.'},
 education:{title:'Aprender paso a paso',text:'Elige una lección, lee la explicación y responde la pregunta. Puedes regresar al tema cuando quieras; tu avance se guarda en tu cuenta.'},
 habits:{title:'Conocer tus hábitos',text:'Estos resúmenes usan los movimientos que registraste. Si faltan gastos o ingresos, la información también estará incompleta.'},
 qr:{title:'Compartir un registro con QR',text:'Puedes mostrar un código o leer el de otra persona. Revisa el registro antes de guardarlo. El QR no transfiere dinero ni cobra a una tarjeta.'},
 ethereum:{title:'Explorar Ethereum',text:'Aquí puedes consultar precios históricos y una tendencia experimental. Revisa siempre la fecha de los datos. La estimación puede fallar y no es una recomendación para invertir.'}
};
export const firstUseKey = owner => owner ? `heda:first-use:v1:${owner}` : null;
export function normalizeSeenHelp(value){return Object.fromEntries(Object.keys(firstUseTips).filter(key=>value?.[key]===true).map(key=>[key,true]));}
