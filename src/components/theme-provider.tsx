"use client";
import { useEffect, useState } from "react";

export type ThemeSettings={theme:string;colorMode:string;accentColor:string|null};
const fallback:ThemeSettings={theme:"fresh-mint",colorMode:"system",accentColor:null};
export function ThemeProvider({children,initial}:{children:React.ReactNode;initial?:ThemeSettings|null}){
  const [settings,setSettings]=useState<ThemeSettings>(initial??fallback);
  useEffect(()=>{
    const apply=(value:ThemeSettings)=>{
      const root=document.documentElement;
      root.dataset.theme=value.theme;
      root.dataset.mode=value.colorMode;
      if(value.theme==="custom"&&value.accentColor)root.style.setProperty("--accent-custom",value.accentColor);
      else root.style.removeProperty("--accent-custom");
    };
    apply(settings);
    const onChange=(event:Event)=>{const detail=(event as CustomEvent<ThemeSettings>).detail;if(detail){setSettings(detail);apply(detail);}};
    window.addEventListener("intelylist-theme-change",onChange);
    return ()=>window.removeEventListener("intelylist-theme-change",onChange);
  },[settings]);
  return <>{children}</>;
}
