'use client';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
export default function Dialog({open,onClose,title,children,className='',locked=false,portalSafe=false}:{open:boolean;onClose:()=>void;title:string;children:React.ReactNode;className?:string;locked?:boolean;portalSafe?:boolean}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(()=>{
    const dialog=ref.current;
    const active=document.activeElement as HTMLElement|null;
    if (open && dialog && !dialog.open) {
      if(portalSafe)dialog.show();else dialog.showModal();
    }
    if (!open && dialog?.open) dialog.close();
    if (open) {
      const previous=document.body.style.overflow;
      document.body.style.overflow='hidden';
      if(portalSafe)dialog?.querySelector<HTMLButtonElement>('button')?.focus();
      return()=>{document.body.style.overflow=previous;if(portalSafe)active?.focus();};
    }
  },[open,portalSafe]);
  return <>
    {open&&portalSafe?<div className="dialog-scrim" onClick={()=>{if(!locked)onClose();}} aria-hidden="true"/>:null}
    <dialog ref={ref} className={`app-dialog ${portalSafe?'portal-safe-dialog':''} ${className}`} aria-modal={open?true:undefined} onCancel={e=>{e.preventDefault();if(!locked) onClose();}} onClick={e=>{if(e.target===e.currentTarget&&!locked)onClose();}} onKeyDown={e=>{
      if(!portalSafe)return;
      if(e.key==='Escape'){e.preventDefault();e.stopPropagation();if(!locked)onClose();}
      if(e.key==='Tab'){
        const focusable=Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),[tabindex="0"]')||[]).filter(el=>el.getClientRects().length);
        const first=focusable[0],last=focusable.at(-1);
        if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}
        if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}
      }
    }} aria-label={title}>
    <div className="dialog-inner"><div className="dialog-heading"><h2>{title}</h2><button className="icon-button" aria-label="Close dialog" disabled={locked} onClick={onClose}><X size={20}/></button></div>{children}</div>
  </dialog></>;
}
