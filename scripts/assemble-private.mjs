// Local-only assembly. No Git, network, database, credentials or publication.
import {readFileSync,writeFileSync,readdirSync,mkdirSync,copyFileSync,existsSync,lstatSync,realpathSync} from 'node:fs';
import {resolve,relative,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {validateDeploymentConfig,validateHosting} from '../lib/config-contract.ts';
const [sourceArg,overlayArg,targetArg]=process.argv.slice(2);
if(!sourceArg||!overlayArg||!targetArg)throw new Error('Usage: node --import ./scripts/test-loader.mjs scripts/assemble-private.mjs PUBLIC_SOURCE PRIVATE_INPUT NEW_TARGET');
const source=realpathSync(sourceArg),overlay=realpathSync(overlayArg),target=resolve(targetArg);
if(existsSync(target)||existsSync(target+'.assembly-receipt.json'))throw new Error('Target and receipt must not already exist; existing checkouts are never overwritten');
if(!relative(source,target).startsWith('..')||!relative(target,source).startsWith('..'))throw new Error('Use separate, non-nested source and target directories');
const read=(root,path)=>readFileSync(resolve(root,path),'utf8');
const publicConfig=validateDeploymentConfig(JSON.parse(read(source,'config/deployment.json')));
validateHosting(publicConfig,JSON.parse(read(source,'.openai/hosting.json')));
if(publicConfig.serviceMode!=='disabled'||publicConfig.siteProjectId!==null)throw new Error('Assembly input must be the generic public source');
const privateConfig=validateDeploymentConfig(JSON.parse(read(overlay,'deployment.json')));
const privateHosting=JSON.parse(read(overlay,'hosting.json'));
validateHosting(privateConfig,privateHosting);
if(privateConfig.serviceMode!=='sites-owner-private')throw new Error('Expected explicitly configured owner-private deployment; verify actual audience separately');
const excluded=new Set(['.git','node_modules','dist','.next','.vinext','.wrangler','.sites-runtime','.cache','.private','private','backups','coverage','outputs','work','.agents','.codex','next-env.d.ts','tsconfig.tsbuildinfo']);
function files(root,dir=''){return readdirSync(resolve(root,dir)).sort().flatMap(name=>{if(excluded.has(name)||name.startsWith('.env')||name.startsWith('.dev.vars')||/\.(?:pem|sqlite3?|db|zip|log|tsbuildinfo)$/.test(name)||name.endsWith('.tar.gz'))return [];const path=dir?dir+'/'+name:name;const stat=lstatSync(resolve(root,path));if(stat.isSymbolicLink())throw new Error('Unexpected source symlink: '+path);return stat.isDirectory()?files(root,path):[path];});}
const hash=data=>createHash('sha256').update(data).digest('hex');
const allowlist=files(source);
const inventory=allowlist.map(path=>({path,sha256:hash(readFileSync(resolve(source,path)))}));
mkdirSync(target,{recursive:true});
for(const path of allowlist){mkdirSync(dirname(resolve(target,path)),{recursive:true});copyFileSync(resolve(source,path),resolve(target,path));}
copyFileSync(resolve(overlay,'deployment.json'),resolve(target,'config/deployment.json'));
copyFileSync(resolve(overlay,'hosting.json'),resolve(target,'.openai/hosting.json'));
const differences=allowlist.filter(path=>hash(readFileSync(resolve(source,path)))!==hash(readFileSync(resolve(target,path))));
const permitted=['.openai/hosting.json','config/deployment.json'];
if(differences.length!==2||differences.some(p=>!permitted.includes(p)))throw new Error('Unexpected assembly difference');
writeFileSync(target+'.assembly-receipt.json',JSON.stringify({publicSourceTreeSha256:hash(JSON.stringify(inventory)),publicFiles:inventory,privateConfigurationSha256:hash(readFileSync(resolve(target,'config/deployment.json'))),privateHostingSha256:hash(readFileSync(resolve(target,'.openai/hosting.json'))),differences,gitHeadVerified:false,liveAudienceVerified:false,publicationPerformed:false},null,2)+'\n');
console.log('Local assembly complete: only two JSON configuration files differ. Receipt is private. Verify actual owner-private Sites audience before publication.');
