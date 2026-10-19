export function installPlatform({userAgent='',platform='',maxTouchPoints=0,standalone=false,displayStandalone=false}={}){
 if(standalone||displayStandalone)return 'installed';
 if(/iPhone|iPad|iPod/i.test(userAgent)||(platform==='MacIntel'&&maxTouchPoints>1))return 'ios';
 if(/Android/i.test(userAgent))return 'android';
 return 'desktop';
}
export function installInstructions(platform){
 if(platform==='ios')return ['Abre el enlace de HEDA en Safari.','Toca Compartir: el cuadro con una flecha hacia arriba. Puede estar dentro del menú de Safari.','Elige “Agregar a inicio” o “Añadir a pantalla de inicio”.','Si aparece “Abrir como app”, actívalo. Toca Agregar.'];
 if(platform==='android')return ['Abre HEDA en Chrome.','Toca el menú de tres puntos.','Elige “Instalar app” o “Agregar a la pantalla principal”.','Confirma la instalación o añade el acceso directo.'];
 return ['Abre HEDA en Chrome o Edge.','Busca el icono de instalación en la barra de direcciones o abre el menú del navegador.','Elige “Instalar HEDA” o “Instalar esta página como una aplicación”.'];
}
