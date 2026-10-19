export function localDay(now=new Date()){return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;}
export function birthDateISO(value){
 const text=String(value||'').trim();const match=/^(\d{2})\/(\d{2})\/(\d{4})$/.exec(text);
 const iso=match?`${match[3]}-${match[2]}-${match[1]}`:text;
 if(!/^\d{4}-\d{2}-\d{2}$/.test(iso))return null;
 const [y,m,d]=iso.split('-').map(Number),date=new Date(Date.UTC(y,m-1,d));
 return y>=1900&&date.getUTCFullYear()===y&&date.getUTCMonth()===m-1&&date.getUTCDate()===d?iso:null;
}
export function ageFromBirthDate(value,today=localDay()){
 const birth=birthDateISO(value);if(!birth||!/^\d{4}-\d{2}-\d{2}$/.test(today)||birth>today)return null;
 const [y,m,d]=birth.split('-').map(Number),[ty,tm,td]=today.split('-').map(Number);
 const age=ty-y-(tm<m||tm===m&&td<d?1:0);return age>=0&&age<=120?age:null;
}
export function displayBirthDate(value){const iso=birthDateISO(value);return iso?iso.split('-').reverse().join('/'):String(value||'');}
export function validateBirthDate(value,today=localDay()){const birthDate=birthDateISO(value),age=ageFromBirthDate(value,today);return {birthDate,age,error:age===null?'Escribe una fecha válida, no futura, en formato día/mes/año.':null};}
export function maskBirthDate(value){const digits=String(value||'').replace(/\D/g,'').slice(0,8);return digits.length>4?`${digits.slice(0,2)}/${digits.slice(2,4)}/${digits.slice(4)}`:digits.length>2?`${digits.slice(0,2)}/${digits.slice(2)}`:digits;}
