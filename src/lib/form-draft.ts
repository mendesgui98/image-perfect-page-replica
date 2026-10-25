export function readDraft(serialized:string|null):Record<string,string>{
 if(!serialized)return {};
 const value:unknown=JSON.parse(serialized);
 if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Rascunho inválido');
 return Object.fromEntries(Object.entries(value).filter((entry):entry is [string,string]=>typeof entry[1]==='string'));
}
export function captureDraft(form:HTMLFormElement):Record<string,string>{
 const values:Record<string,string>={};
 for(const [key,value] of new FormData(form))if(typeof value==='string')values[key]=value;
 for(const control of Array.from(form.elements))if(control instanceof HTMLInputElement&&control.name&&control.type==='checkbox')values[control.name]=control.checked?control.value:'';
 return values;
}
export function restoreDraft(form:HTMLFormElement,values:Record<string,string>){
 for(const control of Array.from(form.elements)){
  if(!(control instanceof HTMLInputElement||control instanceof HTMLSelectElement||control instanceof HTMLTextAreaElement)||!control.name)continue;
  const value=values[control.name];if(value===undefined)continue;
  if(control instanceof HTMLInputElement){
   if(control.type==='file')continue;
   if(control.type==='checkbox'){control.checked=value===control.value;continue;}
   if(control.type==='radio'){control.checked=value===control.value;continue;}
  }
  control.value=value;
 }
}