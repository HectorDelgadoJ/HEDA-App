export const tourStops=[
 {route:'Inicio',title:'Tu dinero, de un vistazo',text:'Aquí ves tu saldo y lo más importante para hoy. Puedes elegir qué bloques aparecen desde Perfil.',action:'Mira el saldo y tus próximos compromisos.'},
 {route:'Movimientos',title:'Registra lo que entra y sale',text:'Elige Gasto o Ingreso, escribe el monto y guarda. Puedes cambiar la fecha y consultar tu historial.',action:'Los pagos que se repiten se programan desde esta sección.'},
 {route:'Reportes',title:'Entiende tus gastos y tus metas',text:'Consulta tus gastos por categoría y crea metas de ahorro. La fecha de una meta es opcional.',action:'Empieza con una meta pequeña y alcanzable.'},
 {route:'IA',title:'Pregunta, aprende y explora',text:'HEDA te ayuda con dudas de economía, finanzas y uso de la app. Aprender y explorar reúne las herramientas.',action:'Tú decides si compartes un resumen financiero con la IA.'},
 {route:'Perfil',title:'Haz HEDA tuya',text:'Cambia la vista, la apariencia y lo que aparece en Inicio. Aquí también encuentras tus alertas, presupuestos y esta visita guiada.',action:'Personalizar HEDA y Ver visita guiada estarán siempre aquí.'}
];
export function welcomeStage(preferences,{ready=true,deferred=false}={}){
 if(!ready||deferred)return 'idle';
 if(!preferences.welcomeDone)return 'personalize';
 return preferences.tourDone?'done':'tour';
}
