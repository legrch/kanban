import { env } from 'cloudflare:workers';
import { createBoardStore } from './board-store';
function store(){if(!env.DB)throw new Error('Database unavailable');return createBoardStore(env.DB);}
export const readBoard=()=>store().readBoard();
export const upsertCard=(input:unknown)=>store().upsertCard(input);
export const dispatchBoard=(input:unknown)=>store().dispatchBoard(input);
export const readActivity=(cardId:string,beforeVersion?:number)=>store().readActivity(cardId,beforeVersion);
