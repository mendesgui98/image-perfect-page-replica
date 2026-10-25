export function openingPosition(value:number,extras:number,received:number,paid:number,progress:number){
 if([value,extras,received,paid,progress].some(n=>!Number.isFinite(n)||n<0)||progress>100||received>value+extras)throw Error('Confira os valores e o avanço inicial.');
 return {updated:value+extras,receivable:value+extras-received,cash:received-paid,progress};
}