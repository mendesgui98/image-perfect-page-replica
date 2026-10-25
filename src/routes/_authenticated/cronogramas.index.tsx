import {createFileRoute} from '@tanstack/react-router';
import {pageMeta} from '@/lib/page-meta';
import {schedulesOptions} from '@/lib/schedule-data';
import {PageHeader} from '@/components/page-header';
import {NewSchedule} from '@/components/schedules/new-schedule';
import {ScheduleList} from '@/components/schedules/schedule-list';
import {useMe} from '@/hooks/use-me';
export const Route=createFileRoute('/_authenticated/cronogramas/')({head:()=>pageMeta('Cronogramas','Planejamentos vinculados às obras e cronogramas avulsos da JMG Reformas.'),loader:({context})=>context.queryClient.ensureQueryData(schedulesOptions),component:Schedules});
function Schedules(){const {data:me}=useMe();return <div><PageHeader title="Cronogramas" subtitle="Planejamento e acompanhamento" actions={me?.canSeeCosts?<NewSchedule/>:undefined}/><ScheduleList/></div>;}