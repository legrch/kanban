import {readFileSync} from 'node:fs';
import {validateDeploymentConfig,validateHosting} from '../lib/config-contract.ts';
const config=validateDeploymentConfig(JSON.parse(readFileSync('config/deployment.json','utf8')));
validateHosting(config,JSON.parse(readFileSync('.openai/hosting.json','utf8')));
console.log('Deployment configuration consistent; actual Sites audience is not verified by this check.');
