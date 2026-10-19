import React from 'react';
export const useWebInstall=()=>({supported:false,openGuide:()=>{}});
export const InstallHint=()=>null;
export default function WebInstallProvider({children}){return children;}
