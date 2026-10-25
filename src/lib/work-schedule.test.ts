import {describe,it,expect} from 'vitest';
import {calendarDays,endFromDuration,snapshotStages,scheduleSituation,barGeometry} from './work-schedule';
const stage=(id:string,start:string,end:string,progress=0)=>({id,name:id,sort:0,planned_start:start,planned_end:end,progress});
describe('cronograma compartilhado',()=>{
 it('duração inclusiva da demolição 05 a 10/11 é seis dias',()=>{expect(calendarDays('2026-11-05','2026-11-10')).toBe(6);expect(endFromDuration('2026-11-05',6)).toBe('2026-11-10');});
 it('preserva sobreposição de hidráulica e elétrica em 17/11',()=>{const s=scheduleSituation([stage('hidraulica','2026-11-17','2026-11-25'),stage('eletrica','2026-11-17','2026-11-28')],'2026-11-18');expect(s.current.map(x=>x.id)).toEqual(['hidraulica','eletrica']);expect(s.end).toBe('2026-11-28');expect(s.remaining).toBe(10);});
 it('marca etapa vencida incompleta, não a concluída',()=>{expect(scheduleSituation([stage('demolicao','2026-11-05','2026-11-10',75)],'2026-11-11').late).toHaveLength(1);expect(scheduleSituation([stage('demolicao','2026-11-05','2026-11-10',100)],'2026-11-11').late).toHaveLength(0);});
 it('original não muda ao editar a etapa atual',()=>{const json=[{id:'a',name:'Demolição',sort:0,planned_start:'2026-11-05',planned_end:'2026-11-10'}];const original=snapshotStages(json);const current=snapshotStages(json);current[0] && (current[0].planned_end='2026-11-12');expect(original[0]?.planned_end).toBe('2026-11-10');});
 it('posiciona barras pelo mesmo intervalo de dias',()=>{expect(barGeometry('2026-11-05','2026-11-10',{start:'2026-11-05',days:12})).toEqual({left:0,width:50});});
 it('não interpreta planejamento ausente como prazo confirmado',()=>{expect(scheduleSituation([{...stage('a','2026-11-05','2026-11-10'),planned_end:null}],'2026-11-01').status).toBe('Atenção');expect(calendarDays('2026-11-10','2026-11-05')).toBeNull();});
});