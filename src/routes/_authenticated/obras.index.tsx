import {WorkList} from '@/components/management/work-list';
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
function Works(){const {data:me}=useMe();return <div><PageHeader title="Obras" subtitle="Gestão e acompanhamento" actions={me?.canSeeCosts?<NewWork/>:undefined}/><WorkList/></div>;}
