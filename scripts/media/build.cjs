#!/usr/bin/env node
'use strict';
// Offline only: never connects to a board or captures authenticated browser state.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const sharp=require('sharp');sharp.concurrency(2);
const {renderAnimation}=require('./render-animation.cjs');
const {renderPanels}=require('./render-panels.cjs');
const {events,W,H,FPS,DURATION}=require('./synthetic-ui.cjs');
const root=path.resolve(__dirname,'../..');
const args=process.argv.slice(2);
if(args.length && (args.length!==2||args[0]!=='--output'))throw Error('Usage: node scripts/media/build.cjs [--output DIRECTORY]');
const output=path.resolve(args[1]||path.join(root,'docs/media'));
const {preflight,writeOutput}=require('./safe-output.cjs');
const names=['kanban-workflow.gif','kanban-workflow-poster.png','task-detail.png','task-history.png','project-focus.png'];
const deliver=[...names,'contact-sheet.png','panels-contact-sheet.png','interaction-timeline.json','synthetic-fixtures.json','panel-specs.json'];
const targets=[...deliver,'media-verification.json'];
preflight(output,targets); // Fail before rendering or writing any output.
function run(command,args){const r=spawnSync(command,args,{encoding:'utf8',maxBuffer:8*1024*1024});if(r.error||r.status!==0)throw Error(`${command} failed: ${r.error||r.stderr}`);return r.stdout;}
const ffmpeg=run('ffmpeg',['-version']).split('\n')[0];
run('ffprobe',['-version']);
if(sharp.versions.sharp!=='0.35.5')throw Error('Expected sharp 0.35.5; install scripts/media dependencies');
for(const e of events){if(e.x<0||e.x>W||e.y<0||e.y>H)throw Error('Pointer target outside frame');const [x,y,w,h]=e.rect;if(e.x<x||e.x>x+w||e.y<y||e.y>y+h)throw Error('Pointer misses target: '+e.name);}
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'kanban-media-'));
(async()=>{try{
 await renderAnimation(temp);await renderPanels(temp);
 const common=['-hide_banner','-loglevel','error','-y','-threads','2','-framerate',String(FPS),'-i',path.join(temp,'frames/%04d.png')];
 run('ffmpeg',[...common,'-filter_complex_threads','2','-vf','palettegen=max_colors=192:stats_mode=diff','-frames:v','1','-update','1',path.join(temp,'palette.png')]);
 run('ffmpeg',[...common,'-i',path.join(temp,'palette.png'),'-filter_complex_threads','2','-lavfi','paletteuse=dither=bayer:bayer_scale=3:diff_mode=rectangle','-loop','0',path.join(temp,'kanban-workflow.gif')]);
 const files=[];
 for(const name of names){const file=path.join(temp,name),m=await sharp(file,{animated:true,limitInputPixels:false}).metadata();if(m.width!==W||(m.pageHeight||m.height)!==H)throw Error('Incorrect dimensions: '+name);if(name.endsWith('.gif')&&(m.pages!==FPS*DURATION||m.loop!==0))throw Error('Incorrect GIF frames/loop');files.push({name,bytes:fs.statSync(file).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),width:m.width,height:m.pageHeight||m.height,...(m.pages?{frames:m.pages,loop:m.loop}: {})});}
 const probe=JSON.parse(run('ffprobe',['-v','error','-show_entries','format=duration','-of','json',path.join(temp,names[0])]));
 if(Math.abs(Number(probe.format.duration)-DURATION)>.1)throw Error('Incorrect GIF duration');
 preflight(output,targets);
 fs.mkdirSync(output,{recursive:true});
 preflight(output,targets);
 for(const name of deliver)writeOutput(output,name,fs.readFileSync(path.join(temp,name)));
 const report={classification:'Synthetic UI illustration; not runtime acceptance evidence',node:process.version,sharp:sharp.versions,ffmpeg,duration:Number(probe.format.duration),files};
 writeOutput(output,'media-verification.json',JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify({output,files},null,2));
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
