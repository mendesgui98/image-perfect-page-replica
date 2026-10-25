import {useEffect,useRef,useState,type FormEvent,type ReactNode} from 'react';
import {useMe} from '@/hooks/use-me';
import {captureDraft,readDraft,restoreDraft} from '@/lib/form-draft';
export function DraftForm({scope,onSubmit,children,className}:{scope:string;onSubmit:(e:FormEvent<HTMLFormElement>)=>void;children:ReactNode;className?:string}){
 const ref=useRef<HTMLFormElement>(null);const {data:me}=useMe();const key=me?`jmg-draft:${me.id}:${scope}`:'';const [ready,setReady]=useState(false);const [status,setStatus]=useState('');
 useEffect(()=>{if(!key||!ref.current)return;const form=ref.current;setReady(false);try{const values=readDraft(localStorage.getItem(key));restoreDraft(form,values);if(Object.keys(values).length){form.dispatchEvent(new CustomEvent('jmg-draft-restored',{bubbles:true}));setStatus('Rascunho recuperado · selecione os anexos novamente');}else setStatus('');}catch{setStatus('Não foi possível recuperar o rascunho');}setReady(true);},[key]);
 function save(){if(!key||!ready||!ref.current)return;const values=captureDraft(ref.current);try{localStorage.setItem(key,JSON.stringify(values));setStatus('Rascunho salvo neste dispositivo');}catch{setStatus('Rascunho não salvo — mantenha esta tela aberta');}}
 return <form ref={ref} className={className} onInput={save} onChange={save} onSubmit={e=>{save();onSubmit(e);}}>{children}<p role="status" className="text-xs text-muted-foreground">{status}</p></form>;
}
