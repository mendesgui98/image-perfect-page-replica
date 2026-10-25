import {createFileRoute} from '@tanstack/react-router';
import {PageHeader,NoAccess} from '@/components/page-header';
import {Finance} from '@/components/works/finance';
import {useMe} from '@/hooks/use-me';
import {pageMeta} from '@/lib/page-meta';
export const Route=createFileRoute('/_authenticated/financeiro')({validateSearch:(s:Record<string,unknown>)=>({work:typeof s['work']==='string'?s['work']:undefined}),head:()=>pageMeta('Financeiro','Contas, caixa, pagamentos, recebimentos e rateios da JMG.'),component:Page});
function Page(){const {data:me}=useMe();if(!me)return null;if(!me.canSeeCosts)return <NoAccess/>;return <div><PageHeader title="Financeiro"/><Finance/></div>;}
