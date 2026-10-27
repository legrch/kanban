import type {DeploymentConfig} from './config-contract';
type BoardApi={readBoard:()=>Promise<unknown>;readActivity:(id:string,before?:number)=>Promise<unknown>;dispatchBoard:(body:unknown)=>Promise<unknown>};
// This mode is configuration, NOT proof of audience. Trusted owner-private Sites ingress is mandatory.
export function createServiceBoardHandlers(config:DeploymentConfig,api:BoardApi){
const enabled=config.serviceMode==='sites-owner-private';
const unavailable=()=>Response.json({error:'Private service adapter is not configured'},{status:503});
const {readBoard,readActivity,dispatchBoard}=api;
async function GET(req:Request){if(!enabled)return unavailable();try{const params=new URL(req.url).searchParams;const cardId=params.get('cardId');const cursor=params.get('beforeVersion');return Response.json(cardId?{activity:await readActivity(cardId,cursor===null?undefined:Number(cursor)),limit:100}:{cards:await readBoard()},{headers:{'Cache-Control':'no-store'}});}catch{return Response.json({error:'Invalid history request'},{status:400});}}
async function POST(req:Request){if(!enabled)return unavailable();if(!req.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return Response.json({error:'JSON content type required'},{status:415});if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return Response.json({error:'Invalid origin'},{status:403});try{const text=await req.text();if(text.length>32000)throw new Error('Request too large');return Response.json(await dispatchBoard(JSON.parse(text)));}catch(e){const error=e instanceof Error?e.message:'Invalid request';return Response.json({error},{status:error.startsWith('CONFLICT')?409:400});}}
return {GET,POST};
}
