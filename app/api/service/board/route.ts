import {readBoard,readActivity,dispatchBoard} from '../../../../lib/board';
import {deploymentConfig} from '../../../../lib/deployment-config';
import {createServiceBoardHandlers} from '../../../../lib/service-board';
export const dynamic='force-dynamic';
export const {GET,POST}=createServiceBoardHandlers(deploymentConfig,{readBoard,readActivity,dispatchBoard});
