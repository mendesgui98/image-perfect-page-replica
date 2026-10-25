import {supabase} from '@/integrations/supabase/client';
import {loadBudget,type Budget} from './budget-data';
import {emptyParams,computeBudget,directContractBase} from './pricing';
export async function loadWorkBudget(workId:string){
 const wr=await supabase.from('work_registry').select('*').eq('id',workId).single();if(wr.error)throw wr.error;const w=wr.data;
 if(w.linked_budget_id)return loadBudget(w.linked_budget_id);
 const op=await supabase.from('work_openings').select('*').eq('work_id',workId).single();if(op.error)throw op.error;
 // In-memory display adapter only: never inserts a fictitious budget or invents markup/tax rates.
 const budget:Budget={id:workId,number:0,revision:0,parent_budget_id:null,title:w.name,client_id:w.client_id,architect_id:w.architect_id,client_display:null,endereco:w.address,bairro:null,cidade:null,uf:null,cep:null,status:'aprovado',issue_date:op.data.reference_date,validity_date:null,estimated_term:null,params:{},general_discount:0,payment_terms:[],notes:w.notes,exclusions:null,closing_text:null,archived:w.archived,created_by:w.created_by,updated_by:w.updated_by,created_at:w.created_at,updated_at:w.updated_at,approval_date:null,approval_path:null};
 return {budget,params:emptyParams,terms:[],sections:[],items:[],directValue:op.data.original_value,paymentConditions:w.payment_conditions,scope:w.notes};
}
export function workBase(b:Awaited<ReturnType<typeof loadWorkBudget>>){const r=computeBudget(b.items,b.params,b.budget.general_discount);if('directValue' in b)return directContractBase(b.directValue);return r;}