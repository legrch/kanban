import raw from '../config/deployment.json' with {type:'json'};
import { validateDeploymentConfig } from './config-contract';
export const deploymentConfig=validateDeploymentConfig(raw);
