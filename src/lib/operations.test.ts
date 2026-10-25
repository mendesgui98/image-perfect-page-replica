import { describe,it,expect } from 'vitest';
import { materialBalance,weightedProgress,financeTotals,accountBalances,allocatedCost } from './operations';
const entry={id:'e',work_id:null,direction:'saida',amount:100,incurred:true,canceled:false,purchase_order_id:null,category:'Outras'};
describe('Operações sem dupla contagem',()=>{
 it('recebimento parcial não desconta o recebido duas vezes',()=>expect(materialBalance(100,10,60,20,5)).toEqual({pending:40,available:25,toBuy:30}));
 it('compra parcelada gera um custo, não um por pagamento',()=>{const e={...entry,purchase_order_id:'p'};expect(financeTotals([e],[{entry_id:'e',account_id:'a',amount:30},{entry_id:'e',account_id:'a',amount:20}])).toMatchObject({spent:50,payable:50});});
 it('parcelas vinculadas ao pedido não repetem o custo econômico',()=>{expect(allocatedCost([{...entry,payable_order_id:'pedido',amount:3000}],[])).toBe(0);expect(allocatedCost([{...entry,payable_order_id:null,amount:3000}],[])).toBe(3000);});
 it('rateio não duplica o consolidado',()=>{const a=[{entry_id:'e',work_id:'w',amount:60},{entry_id:'e',work_id:'z',amount:40}];expect(allocatedCost([entry],a)).toBe(100);expect(allocatedCost([entry],a,'w')).toBe(60);});
 it('transferência interna altera contas sem receita ou despesa',()=>{expect(financeTotals([],[]).cash).toBe(0);expect(accountBalances([{id:'a',opening_balance:100},{id:'b',opening_balance:0}],[],[],[{from_account_id:'a',to_account_id:'b',amount:40}]).map(a=>a.balance)).toEqual([60,40]);});
 it('avanço usa pesos e valida 100%',()=>{expect(weightedProgress([{weight:80,progress:100},{weight:20,progress:0}])).toEqual({weightSum:100,valid:true,progress:80});expect(weightedProgress([{weight:50,progress:100}]).valid).toBe(false);});
});
