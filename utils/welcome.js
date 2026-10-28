export const tourStops=[
 {route:'Inicio',title:'Empieza con un solo paso',text:'Tu saldo resume lo que registraste. Debajo encontrarás un botón según la prioridad que elegiste.',action:'No tienes que configurar todo hoy. Empieza por una acción y vuelve cuando lo necesites.'},
 {route:'Movimientos',title:'Anota lo que recibes o gastas',text:'Ingreso es dinero que recibes. Gasto es dinero que usas. Elige uno, escribe la cantidad y guarda.',action:'En Recurrentes puedes recordar renta, salario y otros pagos o ingresos que se repiten.',tryLabel:'Probar: registrar un gasto',params:{openSection:'Nuevo',movementType:'Gasto'}},
 {route:'Reportes',title:'Ahorra para algo que te importe',text:'Toca Nueva meta, escribe para qué ahorrarás y cuánto necesitas. Puedes dejar la fecha vacía.',action:'Cuando apartes dinero, toca Agregar ahorro en esa meta. Esto registra tu avance; no hace una transferencia.',tryLabel:'Probar: crear una meta',params:{goalAction:'create'}},
 {route:'Herramientas',title:'Encuentra más opciones cuando las necesites',text:'Aquí están las lecciones, tus hábitos, los códigos QR, los avisos y Ethereum.',action:'Cada opción explica brevemente para qué sirve la primera vez. No necesitas usar todas.',tryLabel:'Explorar herramientas'},
 {route:'IA',title:'Pregunta con tus propias palabras',text:'Puedes pedir una explicación o ayuda para organizar tu dinero. HEDA pedirá permiso antes de consultar tus registros.',action:'Revisa cualquier propuesta antes de confirmarla. El asistente puede equivocarse.',tryLabel:'Abrir el asistente'},
 {route:'Perfil',title:'Haz la pantalla más cómoda para ti',text:'En Personalizar HEDA puedes aumentar las letras, mejorar el contraste y elegir qué aparece en Inicio.',action:'Aquí también puedes cambiar tu prioridad, repetir esta visita o volver a mostrar las explicaciones.',settingsSection:'accessibility',settingsLabel:'Ajustar tamaño y lectura'}
];
export function tourStopsForPriority(priority){
 const text=priority==='saving'?'Elegiste ahorrar: el botón de tu prioridad abre una meta o te permite agregar ahorro.':priority==='payments'?'Elegiste recordar pagos: tu prioridad abre los recurrentes o te ayuda a crear el primero.':'Elegiste controlar gastos: tu prioridad te ayuda a registrar un gasto o revisar tus presupuestos.';
 const stops=tourStops.map(stop=>({...stop}));stops[0].text=text;
 if(priority==='saving')[stops[1],stops[2]]=[stops[2],stops[1]];
 return stops;
}
export function welcomeStage(preferences,{ready=true,deferred=false}={}){
 if(!ready||deferred)return 'idle';
 if(!preferences.welcomeDone)return 'personalize';
 return preferences.tourDone?'done':'tour';
}
