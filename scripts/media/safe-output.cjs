'use strict';
const fs=require('node:fs'),path=require('node:path');
function lstatIfPresent(p){try{return fs.lstatSync(p);}catch(e){if(e.code==='ENOENT')return null;throw e;}}
function checkDirectory(output){
 if(output===path.parse(output).root)throw Error('Refusing filesystem root');
 for(let p=output;p!==path.dirname(p);p=path.dirname(p)){const s=lstatIfPresent(p);if(s&&!s.isDirectory())throw Error('Refusing non-directory or symlink output path: '+p);}
}
function checkTarget(output,name){
 checkDirectory(output);
 if(path.basename(name)!==name)throw Error('Output name must be a basename');
 const target=path.join(output,name),s=lstatIfPresent(target);
 if(s&&(!s.isFile()||s.nlink!==1))throw Error('Refusing non-regular or linked output: '+target);
 return target;
}
function preflight(output,names){checkDirectory(output);for(const name of names)checkTarget(output,name);}
function writeOutput(output,name,data){
 const target=checkTarget(output,name);
 // O_NOFOLLOW also rejects a symlink introduced after the lstat check.
 if(typeof fs.constants.O_NOFOLLOW!=='number')throw Error('This platform lacks safe O_NOFOLLOW writes');
 const fd=fs.openSync(target,fs.constants.O_WRONLY|fs.constants.O_CREAT|fs.constants.O_NOFOLLOW,0o644);
 try{const s=fs.fstatSync(fd);if(!s.isFile()||s.nlink!==1)throw Error('Refusing non-regular or linked open output');fs.ftruncateSync(fd,0);fs.writeFileSync(fd,data);}finally{fs.closeSync(fd);}
}
module.exports={preflight,writeOutput};
