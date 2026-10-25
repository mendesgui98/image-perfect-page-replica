import {createFileRoute} from '@tanstack/react-router';
import {FinancialDashboard,dashboardSearch} from '@/components/works/dashboard';
import {useMe} from '@/hooks/use-me';
import {NoAccess,PageHeader} from '@/components/page-header';
import {pageMeta} from '@/lib/page-meta';
export const Route=createFileRoute('/_authenticated/dashboard')({validateSearch:dashboardSearch,head:()=>pageMeta('Dashboard financeiro','Contratos, caixa, resultados e andamento das obras da JMG.'),component:Page});
function Page(){const {data:me}=useMe();if(!me)return null;if(!me.canSeeCosts)return <NoAccess/>;return <div><PageHeader title="JMG · Obras e resultados"/><FinancialDashboard/></div>;}
