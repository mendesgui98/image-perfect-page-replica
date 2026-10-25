import {createFileRoute} from '@tanstack/react-router';
import {PersonProfile} from '@/components/management/person-profile';
import {pageMeta} from '@/lib/page-meta';
export const Route=createFileRoute('/_authenticated/cadastros/$id')({head:()=>pageMeta('Perfil e relacionamento','Dados, obras e registros relacionados ao cadastro na JMG.'),component:Page});
function Page(){const {id}=Route.useParams();return <PersonProfile id={id}/>;}
