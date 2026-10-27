export const codexThreadPattern=/^codex:\/\/threads\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isCodexLink=(url:string)=>codexThreadPattern.test(url);
export function isSafeLink(url:string){if(isCodexLink(url))return true;try{const parsed=new URL(url);return parsed.protocol==='https:'&&!parsed.username&&!parsed.password;}catch{return false;}}
