export type DeploymentConfig = {projects:Record<string,string>;defaultProject:string;defaultOwner:string;defaultPrefix:string;legacyPrefixes:Record<string,string>;serviceMode:'disabled'|'sites-owner-private';siteProjectId:string|null};
export function validateDeploymentConfig(input:unknown):DeploymentConfig {
 const c=input as DeploymentConfig;
 const keys=['projects','defaultProject','defaultOwner','defaultPrefix','legacyPrefixes','serviceMode','siteProjectId'];
 if(!c||typeof c!=='object'||Object.keys(c).some(k=>!keys.includes(k))||keys.some(k=>!Object.hasOwn(c,k)))throw new Error('Invalid deployment config keys');
 if(!c.projects||Array.isArray(c.projects)||typeof c.projects!=='object'||Object.keys(c.projects).length<1)throw new Error('Invalid projects');
 const prefixes=Object.values(c.projects);
 if(Object.entries(c.projects).some(([name,prefix])=>!name.trim()||name!==name.trim()||name.length>40||['__proto__','constructor','prototype'].includes(name)||typeof prefix!=='string'||!(/^[A-Z]{2,8}$/).test(prefix))||new Set(prefixes).size!==prefixes.length)throw new Error('Invalid project prefixes');
 if(!Object.hasOwn(c.projects,c.defaultProject)||!prefixes.includes(c.defaultPrefix)||typeof c.defaultOwner!=='string'||c.defaultOwner.length>40)throw new Error('Invalid defaults');
 if(!c.legacyPrefixes||typeof c.legacyPrefixes!=='object'||Array.isArray(c.legacyPrefixes)||Object.entries(c.legacyPrefixes).some(([n,prefix])=>!(/^[1-9][0-9]*$/).test(n)||!Number.isSafeInteger(Number(n))||!prefixes.includes(prefix)))throw new Error('Invalid legacy overrides');
 if(!['disabled','sites-owner-private'].includes(c.serviceMode))throw new Error('Unknown service mode');
 if(c.siteProjectId!==null&&(typeof c.siteProjectId!=='string'||!/^appgprj_[a-f0-9]{32}$/.test(c.siteProjectId)))throw new Error('Invalid Site identity');
 if(c.serviceMode==='sites-owner-private'&&!c.siteProjectId)throw new Error('Private service mode requires Site identity; actual audience still needs live verification');
 return c;
}
export function validateHosting(c:DeploymentConfig,hosting:unknown){
 const h=hosting as {project_id?:string;d1?:string};
 if(!h||typeof h!=='object'||(h.project_id??null)!==c.siteProjectId||h.d1!=='DB')throw new Error('Deployment config and hosting manifest mismatch');
}
