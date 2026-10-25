import { NewWork } from '@/components/works/new-work';
import { FinancialDashboard,dashboardSearch } from '@/components/works/dashboard';
import {useMe} from '@/hooks/use-me';
import { createFileRoute,Link } from '@tanstack/react-router';
import { useSuspenseQuery,useQuery } from '@tanstack/react-query';
import { HardHat } from 'lucide-react';
import { worksOptions } from '@/lib/work-data';
import { pageMeta } from '@/lib/page-meta';
import { PageHeader } from '@/components/page-header';
import { fmtDate,fmtNum } from '@/lib/format';
import { weightedProgress } from '@/lib/operations';
import { supabase } from '@/integrations/supabase/client';
export const Route=createFileRoute('/_authenticated/obras/')({validateSearch:dashboardSearch,head:()=>pageMeta('Obras','Obras da JMG: contratação, execução, cronograma e entrega.'),loader:({context})=>context.queryClient.ensureQueryData(worksOptions),component:Works});
function Works(){const {data:me}=useMe();const {data}=useSuspenseQuery(worksOptions);const {data:stages=[]}=useQuery({queryKey:['all-work-stages'],queryFn:async()=>{const r=await supabase.from('work_stages').select('*');if(r.error)throw r.error;return r.data;}});if(me?.canSeeCosts)return <div className="space-y-6"><div className="flex justify-end"><NewWork/></div><FinancialDashboard/></div>;return <div><PageHeader title="Obras"/><div className="divide-y border-y">{data.map(w=>{const p=weightedProgress(stages.filter(s=>s.work_id===w.id));return <Link key={w.id} to="/obras/$id" params={{id:w.id}} className="flex flex-wrap items-center gap-4 py-5 hover:bg-muted/40"><HardHat className="h-6 w-6 text-primary"/><div className="min-w-0 flex-1"><h2 className="font-semibold">{w.name}</h2><p className="text-sm text-muted-foreground">{w.address||'Endereço não informado'}</p><p className="text-xs text-muted-foreground">{w.responsible||'Sem responsável'} · {fmtDate(w.planned_start)} → {fmtDate(w.planned_end)}</p></div><div className="text-right"><p className="text-sm capitalize">{w.status}</p><p className="font-semibold num">{fmtNum(p.progress)}%</p></div></Link>;})}{!data.length&&<p className="py-8 text-muted-foreground">Nenhuma obra cadastrada. Os orçamentos aprovados aparecem aqui após a conversão.</p>}</div></div>;}
