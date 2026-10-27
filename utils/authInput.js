// iOS password autofill can repeatedly resize the keyboard while secure fields are edited.
// Keep manual typing/paste and visibility controls; Android retains password-manager hints.
export function authAutofillProps(platform,{password=false,autoComplete,textContentType}={}){
  if(platform==='ios' && password)return {textContentType:'none'};
  if(platform==='web'&&autoComplete==='username-new')return {autoComplete:'username'};
  if(autoComplete)return {autoComplete};
  return textContentType?{textContentType}:{};
}
export function dismissFocusedKeyboard(keyboard,inputState){
  try{inputState?.currentlyFocusedInput?.()?.blur?.();}catch{}
  keyboard.dismiss();
}
