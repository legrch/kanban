export const stages = ['plan', 'active', 'review', 'blocked', 'done'] as const;
export type Stage = typeof stages[number];
export const stageNames: Record<Stage,string> = {plan:'Backlog',active:'In progress',review:'In review',blocked:'Blocked',done:'Done'};
export type Card = {id:string;taskNumber?:string;title:string;project:string;owner:string;stage:Stage;priority:'high'|'normal'|'low';storyPoints?:number|null;summary:string;nextAction:string;evidence:string;evidenceState:'verified'|'reported'|'unknown';evidenceAt:string;source:string;links:{label:string;url:string}[];version:number;updatedAt:string};
export type ActivityEntry = {id:string;cardId:string;version:number;createdAt:string;kind:'created'|'updated';changedFields:string[];snapshot:Omit<Card,'version'|'updatedAt'>};
