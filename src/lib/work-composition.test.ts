import {describe,it,expect} from 'vitest';
import {workComposition} from './work-composition';
import {indicatorTotal,type ExecutiveData} from './executive';
const data={works:[{work:{id:'w',name:'Piloto',origin:'direto',is_pilot:true,status:'execucao'},client:'Cliente',base:{saleNet:300000},result:{sale:322000,commission:0,taxes:0,remainingEstimate:25000,estimateConfirmed:true},incurred:95000,committed:20000,balance:{receivable:142000},extras:[{id:'x',description:'Elétrica',approved:true,price:22000}],opening:{received:180000,paid:95000,pending_payable:10000,reference_date:'2026-10-25',existing_extras:0}}],finance:{entries:[],settlements:[],people:[]}} as unknown as ExecutiveData;
describe('composição da obra',()=>{
 it('contrato atualizado soma original e 22 mil de aditivos',()=>expect(indicatorTotal(workComposition(data,data.works[0] as typeof data.works[number]).updated)).toBe(322000));
 it('recebido detalha os 180 mil sem duplicar posição inicial',()=>expect(indicatorTotal(workComposition(data,data.works[0] as typeof data.works[number]).received)).toBe(180000));
 it('despesas detalham 95 mil e não se tornam custo duas vezes',()=>expect(indicatorTotal(workComposition(data,data.works[0] as typeof data.works[number]).spent)).toBe(95000));
 it('resultado previsto compõe contrato e custos assinados',()=>expect(indicatorTotal(workComposition(data,data.works[0] as typeof data.works[number]).forecast)).toBe(182000));
});