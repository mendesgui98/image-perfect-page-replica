import {describe,it,expect} from 'vitest';
import {editableStages,scheduleStatus} from './schedule-data';
const stage={id:'a',name:'Demolição',sort:0,planned_start:'2026-11-05',planned_end:'2026-11-10',progress:0};
describe('cronogramas independentes',()=>{
it('sem etapas fica em elaboração',()=>expect(scheduleStatus([],'2026-11-05')).toBe('elaboracao'));
it('etapa incompleta vencida fica atrasada',()=>expect(scheduleStatus([stage],'2026-11-11')).toBe('atrasado'));
it('etapa concluída não fica atrasada',()=>expect(scheduleStatus([{...stage,progress:100}],'2026-11-11')).toBe('concluido'));
it('preserva dependência e avanço na leitura do avulso',()=>{const rows=editableStages([{...stage,weight:40,progress:65,dependency_id:'b',actual_start:'2026-11-05'}]);expect(rows[0]?.dependency_id).toBe('b');expect(rows[0]?.progress).toBe(65);expect(rows[0]?.actual_start).toBe('2026-11-05');});
it('etapas simultâneas são cronograma ativo',()=>expect(scheduleStatus([stage,{...stage,id:'b',name:'Alvenaria'}],'2026-11-05')).toBe('ativo'));
});