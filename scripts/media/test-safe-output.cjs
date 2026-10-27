'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const {preflight,writeOutput}=require('./safe-output.cjs');
const fixture=fs.mkdtempSync(path.join(os.tmpdir(),'kanban-output-test-'));
try{
 for(const name of ['kanban-workflow.gif','media-verification.json']){
  const output=path.join(fixture,name+'.case');fs.mkdirSync(output);
  const outside=path.join(fixture,name+'.outside');
  fs.writeFileSync(path.join(output,'unrelated.txt'),'preserve');fs.symlinkSync(outside,path.join(output,name));
  const r=spawnSync(process.execPath,[path.join(__dirname,'build.cjs'),'--output',output],{encoding:'utf8'});
  assert.notEqual(r.status,0);assert.match(r.stderr,/Refusing non-regular or linked output/);
  assert.equal(fs.existsSync(outside),false);assert.deepEqual(fs.readdirSync(output).sort(),[name,'unrelated.txt'].sort());
  assert.equal(fs.readFileSync(path.join(output,'unrelated.txt'),'utf8'),'preserve');
 }
 const output=path.join(fixture,'late');fs.mkdirSync(output);preflight(output,['asset.png']);
 const outside=path.join(fixture,'late-outside');fs.symlinkSync(outside,path.join(output,'asset.png'));
 assert.throws(()=>writeOutput(output,'asset.png','bad'),/Refusing/);assert.equal(fs.existsSync(outside),false);
 fs.unlinkSync(path.join(output,'asset.png'));writeOutput(output,'asset.png','first');writeOutput(output,'asset.png','new');assert.equal(fs.readFileSync(path.join(output,'asset.png'),'utf8'),'new');
 const danglingDir=path.join(fixture,'dangling-dir');fs.symlinkSync(path.join(fixture,'missing'),danglingDir);assert.throws(()=>preflight(danglingDir,['asset.png']),/Refusing/);
 console.log('PASS: dangling asset/report refused before writes; late symlink refused; dangling directory refused; unrelated files preserved; regular replacement works.');
}finally{fs.rmSync(fixture,{recursive:true,force:true});}
