import {queryOptions} from '@tanstack/react-query';
import {supabase} from '@/integrations/supabase/client';
export const relationshipOptions=(costs:boolean)=>queryOptions({queryKey:['relationships',costs],queryFn:async()=>{
 const people=await supabase.from('people').select('*').order('name');if(people.error)throw people.error;
 const works=await supabase.from('work_registry').select('*');if(works.error)throw works.error;
 if(!costs)return {people:people.data,works:works.data,budgets:[],contracts:[],purchases:[],records:[],history:[]};
 const [budgets,contracts,purchases,records,history]=await Promise.all([supabase.from('budgets').select('*'),supabase.from('contracts').select('*'),supabase.from('purchase_orders').select('*,purchase_lines(*)'),supabase.from('work_records').select('*').eq('kind','documento'),supabase.from('catalog_history').select('*').eq('entity','people').order('changed_at',{ascending:false})]);for(const r of [budgets,contracts,purchases,records,history])if(r.error)throw r.error;
 return {people:people.data,works:works.data,budgets:budgets.data,contracts:contracts.data,purchases:purchases.data,records:records.data,history:history.data};
}});
