import {describe,it,expect} from 'vitest';
import {physicalProgress,progressAttention,stageStatus,workDeadline} from './work-progress';
describe('acompanhamento da obra',()=>{
 it('pondera percentuais pelas etapas',()=>expect(physicalProgress([{weight:30,progress:100},{weight:70,progress:50}])).toBe(65));
 it('preserva avanço inicial sem etapas ponderadas',()=>expect(physicalProgress([],40)).toBe(40));
 it('sinaliza custos de 75% para execução de 40%',()=>expect(progressAttention(40,80,75000,100000)).toEqual({consumed:75,costAhead:true,receiptsBehind:false}));
 it('sinaliza recebimentos de 45% para execução de 70%',()=>expect(progressAttention(70,45,0,null).receiptsBehind).toBe(true));
 it('não presume previsão de custos ausente',()=>expect(progressAttention(40,40,75000,null).consumed).toBeNull());
 it('etapa completa não permanece atrasada',()=>expect(stageStatus({progress:100,weight:100,planned_end:'2026-10-01'},'2026-10-25')).toBe('concluido'));
 it('prazo vencido e execução incompleta indica atraso',()=>expect(workDeadline('2026-10-01',65,[],'2026-10-25')).toBe('Atrasada'));
});