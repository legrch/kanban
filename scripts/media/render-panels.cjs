/** Deterministic vector detail illustrations; not captured screenshots. */
const fs=require('fs'),path=require('path'),sharp=require('sharp');
const {scene}=require('./synthetic-ui.cjs');sharp.concurrency(2);

const panels=[
 {name:'task-detail',title:'A clear next step',sub:'Owner, status and evidence stay with the task.',time:17.6,box:[588,50,594,390]},
 {name:'task-history',title:'See what changed',sub:'Expand a version to revisit its recorded next step.',time:28.2,box:[588,300,594,463]},
 {name:'project-focus',title:'Focus on one project',sub:'Project filters narrow the board without moving tasks.',time:14.25,box:[208,275,642,407]}
];
async function renderPanels(out){const contact=[];for(let i=0;i<panels.length;i++){
 const p=panels[i];let s=scene(p.time,{withCursor:false});
 if(p.name==='task-detail'){
  s=s.replace('No context added yet.','Make project search easier to scan.')
   .replaceAll('Not verified','Reported')
   .replace('No supporting details added yet.','Demo checklist: title and owner search reviewed.')
   .replace('Snapshot: No date','Snapshot: 12 Oct, 10:10')
   .replace(/<text x="600" y="436"[^>]*>Links &amp; discussions<\/text>/,'<rect x="600" y="411" width="570" height="25" rx="4" fill="#f5f3f7"/><text x="610" y="428" fill="#716d77" font-family="Arial,Helvetica,sans-serif" font-size="12">demo/search-checklist · example evidence</text>');
 }
 let inner=s.slice(s.indexOf('>')+1,s.lastIndexOf('</svg>'));
 const bw=1000,bh=620,scale=Math.min(bw/p.box[2],bh/p.box[3]),w=p.box[2]*scale,h=p.box[3]*scale,x=(1200-w)/2,y=116;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="800" viewBox="0 0 1200 800"><rect width="1200" height="800" fill="#f8f7f4"/><text x="60" y="47" font-family="Arial,Helvetica,sans-serif" font-size="27" font-weight="600" fill="#34313a">${p.title}</text><text x="60" y="79" font-family="Arial,Helvetica,sans-serif" font-size="17" fill="#77717f">${p.sub}</text><rect x="${x-1}" y="${y-1}" width="${w+2}" height="${h+2}" rx="10" fill="#ffffff" stroke="#ddd7e6"/><svg x="${x}" y="${y}" width="${w}" height="${h}" viewBox="${p.box.join(' ')}" overflow="hidden">${inner}</svg><text x="1140" y="777" text-anchor="end" font-family="Arial,Helvetica,sans-serif" font-size="13" fill="#867391">Illustrated detail · sample data</text></svg>`;
 fs.writeFileSync(path.join(out,p.name+'.svg'),svg);await sharp(Buffer.from(svg)).png().toFile(path.join(out,p.name+'.png'));
 contact.push({input:await sharp(Buffer.from(svg)).resize(600,400).png().toBuffer(),left:0,top:i*400});
 }
 await sharp({create:{width:600,height:1200,channels:3,background:'#f8f7f4'}}).composite(contact).png().toFile(path.join(out,'panels-contact-sheet.png'));
 fs.writeFileSync(path.join(out,'panel-specs.json'),JSON.stringify(panels,null,2));
}
module.exports={renderPanels};
