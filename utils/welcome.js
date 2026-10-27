export const tourStops=[
 {route:'Inicio',title:'Tu dinero, de un vistazo',text:'Aquí ves tu saldo y lo más importante para hoy. Puedes elegir qué bloques aparecen desde Perfil.',action:'Los atajos «Elegir atajos» y «Accesibilidad y lectura» también están disponibles en Inicio.'},
 {route:'Perfil',title:'Elige qué aparece en tu pantalla',text:'En Perfil → Personalizar HEDA puedes elegir vista simple o completa y tema claro u oscuro. En Atajos y bloques eliges qué mostrar en Inicio.',action:'Ocultar un bloque o atajo no borra tus registros. Puedes volver a mostrarlo cuando quieras. Recuerda guardar tus preferencias.',settingsSection:'shortcuts',settingsLabel:'Elegir qué mostrar'},
 {route:'Perfil',title:'Haz la lectura más cómoda',text:'En Personalizar HEDA → Accesibilidad puedes ampliar el texto hasta 200%, reforzar el contraste, usar negrita o lectura espaciada, reducir el movimiento y ampliar los controles.',action:'Guarda para aplicar los cambios. VoiceOver y TalkBack se activan en los ajustes de tu teléfono.',settingsSection:'accessibility',settingsLabel:'Ajustar accesibilidad'},
 {route:'Movimientos',title:'Registra lo que entra y sale',text:'Elige Gasto o Ingreso, escribe el monto y guarda. Puedes cambiar la fecha y consultar tu historial.',action:'Los pagos que se repiten se programan desde esta sección.'},
 {route:'Reportes',title:'Entiende tus gastos y tus metas',text:'Consulta tus gastos por categoría y crea metas de ahorro. La fecha de una meta es opcional.',action:'Empieza con una meta pequeña y alcanzable.'},
 {route:'IA',title:'Conversa con HEDA',text:'La pestaña IA está dedicada al chat. Puedes guardar hasta dos conversaciones en este dispositivo desde el icono de chats.',action:'Analizar mis finanzas permite revisar el resumen antes de compartirlo. Cada chat requiere su propio permiso.'},
 {route:'Herramientas',title:'Aprende y explora desde aquí',text:'Esta pestaña del menú inferior reúne Educación financiera, Hábitos, QR, Alertas y presupuestos y Ethereum.',action:'También puedes activar o quitar los atajos de Inicio en Personalizar HEDA.'},
 {route:'Perfil',title:'Haz HEDA tuya',text:'En Perfil siempre encontrarás Personalizar HEDA para ajustar tu pantalla y la accesibilidad. Puedes repetir esta visita desde Ver visita guiada.',action:'Tus preferencias se pueden cambiar en cualquier momento; no tienes que crear otra cuenta.'}
];
export function welcomeStage(preferences,{ready=true,deferred=false}={}){
 if(!ready||deferred)return 'idle';
 if(!preferences.welcomeDone)return 'personalize';
 return preferences.tourDone?'done':'tour';
}
