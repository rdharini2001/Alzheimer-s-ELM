'use strict';
const data = JSON.parse(document.getElementById('project-data').textContent);
const pick = (id) => document.getElementById(id);
const ns = 'http://www.w3.org/2000/svg';
const svgEl = (tag, attrs = {}, text = '') => { const e=document.createElementNS(ns,tag); for(const [k,v] of Object.entries(attrs)) e.setAttribute(k,String(v)); if(text)e.textContent=text; return e; };
const append=(parent,el)=>{parent.appendChild(el);return el;};
const pct=(v, digits=2)=>`${(100*Number(v)).toFixed(digits)}%`;
const fmt=(v)=>Number(v).toFixed(4);
const names={LR:'Logistic regression',kNN:'k-nearest neighbors',NB:'Naive Bayes',SVM:'Support vector machine',DT:'Decision tree',RFC:'Random forest',GB:'Gradient boosting',ELM:'Extreme learning machine',Dummy:'Majority-class reference'};
const settings={session_holdout:{title:'ELM · session holdout',note:'A 60-session holdout drawn from the non-converted OASIS diagnostic groups. Some participants are represented in both partitions.'},group_subject_no_cdr:{title:'Participant-disjoint CV · no CDR',note:'Five participant-disjoint folds, with CDR omitted from the model predictors.'},group_subject_with_cdr:{title:'Participant-disjoint CV · with CDR',note:'Five participant-disjoint folds, including the recorded clinical dementia rating.'},group_session_with_cdr:{title:'Session-level CV · with CDR',note:'Five session-stratified folds, including CDR; repeated visits can appear in different folds.'}};
const labels=['Nondemented','Demented','Converted'];
const palette=['#6e58ac','#c56d69','#e0b4aa'];
let protocol='session_holdout', metric='accuracy', selected='ELM';
function cohort(){
  const groups=data.cohort.groups;const total=labels.reduce((a,k)=>a+groups[k],0);
  const ring=pick('cohort-ring');ring.replaceChildren();const cx=130,cy=130,R=89,stroke=33,circ=2*Math.PI*R;
  let offset=0;
  labels.forEach((name,i)=>{const value=groups[name],len=value/total*circ;
    append(ring,svgEl('circle',{cx,cy,r:R,fill:'none',stroke:palette[i],'stroke-width':stroke,'stroke-dasharray':`${len} ${circ-len}`,'stroke-dashoffset':-offset,transform:`rotate(-90 ${cx} ${cy})`}));offset+=len;
  });
  append(ring,svgEl('text',{x:cx,y:122,fill:'#302345','font-size':41,'font-weight':750,'text-anchor':'middle'},String(total)));
  append(ring,svgEl('text',{x:cx,y:146,fill:'#756780','font-size':12,'text-anchor':'middle'},'participants'));
  pick('cohort-legend').replaceChildren();labels.forEach((name,i)=>{const row=document.createElement('span');const square=document.createElement('i');square.style.background=palette[i];row.append(square,document.createTextNode(`${name}: ${groups[name]}`));pick('cohort-legend').append(row);});
  pick('n-subjects').textContent=data.cohort.subjects;pick('n-sessions').textContent=data.cohort.sessions;
  const svg=pick('age-histogram');svg.replaceChildren();const counts=data.cohort.ages, max=Math.max(...counts.map(x=>x.count),1),dx=344/counts.length;
  for(let i=0;i<=3;i++){const y=175-i*50;append(svg,svgEl('line',{x1:43,y1:y,x2:400,y2:y,stroke:'#dcd3df','stroke-width':1}));append(svg,svgEl('text',{x:34,y:y+4,'text-anchor':'end','font-size':10,fill:'#83758e'},String(Math.round(max*i/3))));}
  counts.forEach((d,i)=>{const h=147*d.count/max,x=48+i*dx;append(svg,svgEl('rect',{x,y:175-h,width:Math.max(8,dx-4),height:h,rx:2,fill:i%2?'#c56d69':'#8269b3'}));if(i%2===0||counts.length<8)append(svg,svgEl('text',{x:x+(dx-4)/2,y:194,'text-anchor':'middle','font-size':10,fill:'#716581'},String(d.age)));});
}
function hero(){
 const svg=pick('network-hero');svg.replaceChildren();
 const defs=append(svg,svgEl('defs'));
 const grad=append(defs,svgEl('radialGradient',{id:'cortex-gradient',cx:'50%',cy:'35%',r:'78%'}));
 append(grad,svgEl('stop',{offset:'0%', 'stop-color':'#8c71be'}));
 append(grad,svgEl('stop',{offset:'100%', 'stop-color':'#342852'}));
 const line=(x1,y1,x2,y2,stroke='#d5c0f0',opacity=.3,width=1)=>append(svg,svgEl('line',{x1,y1,x2,y2,stroke,'stroke-opacity':opacity,'stroke-width':width}));
 const circle=(x,y,r,fill,stroke='none',sw=1)=>append(svg,svgEl('circle',{cx:x,cy:y,r,fill,stroke,'stroke-width':sw}));
 // Abstract cortical contours are illustrative, rather than a diagnostic MRI image.
 circle(352,231,163,'url(#cortex-gradient)','#bca4dc',1.3);
 [183,213,247].forEach((r,i)=>append(svg,svgEl('ellipse',{cx:352,cy:231,rx:r,ry:r*.85,fill:'none',stroke:'#ddc0e7','stroke-opacity':i===1?.11:.07,'stroke-width':1.2,transform:`rotate(${i*16-24} 352 231)`})));
 const boundary='M348 83 C318 77 287 92 270 112 C235 111 209 136 210 166 C185 185 186 229 207 248 C199 282 226 317 254 323 C272 357 317 363 340 346 C375 363 413 354 428 332 C462 329 476 291 474 271 C507 232 480 196 471 173 C468 141 448 119 422 120 C411 96 381 80 348 83 Z';
 append(svg,svgEl('path',{d:boundary,fill:'#af8ec9', 'fill-opacity':'.17',stroke:'#e0c1ec','stroke-opacity':.7,'stroke-width':2}));
 const cortex=[
 'M331 104 C300 127 306 149 326 158 C351 165 361 180 344 195 C330 211 305 213 311 241',
 'M382 104 C367 120 377 140 392 150 C410 164 416 183 402 199 C383 214 387 232 408 247',
 'M257 143 C269 160 294 163 290 191 C288 211 262 230 267 249 C271 273 294 285 306 278',
 'M449 166 C426 170 434 197 449 211 C466 228 446 247 428 258 C415 275 420 299 442 303',
 'M244 203 C220 218 238 246 246 254 C255 273 255 293 271 303',
 'M322 324 C300 312 307 298 324 287 C346 273 357 253 349 230',
 'M368 330 C385 303 364 285 375 268 C384 253 401 250 399 225',
 'M339 116 C349 131 338 142 328 151 M318 185 C338 181 364 167 365 141',
 'M297 125 C283 138 302 152 308 163 M379 280 C396 292 400 305 387 315'
 ];
 cortex.forEach((d,i)=>append(svg,svgEl('path',{d,fill:'none',stroke:i%3===0?'#f4c0b3':'#d4b7f0','stroke-opacity':.45+(i%3)*.1,'stroke-width':i%3===0?2.1:1.5,'stroke-linecap':'round'})));
 // Five input features, arranged as a constellation rather than a neural-network schematic.
 const inputs=[['CDR',82,119],['eTIV',104,181],['EDUC',80,246],['MMSE',108,311],['nWBV',91,379]];
 inputs.forEach(([name,x,y],i)=>{line(x+30,y,234+i*9,152+i*36,'#e9bbcd',.42,1.3);circle(x,y,22,'#4a386e','#bfa5d6',1.2);append(svg,svgEl('text',{x,y:y+3.5,'text-anchor':'middle','font-family':'DM Mono, monospace','font-size':10,fill:'#fff0fa'},name));});
 const points=[[282,136],[338,117],[410,144],[432,203],[411,279],[363,322],[295,293],[255,222],[336,243],[359,179]];
 points.forEach(([x,y],i)=>{circle(x,y,i%3===0?6:3.5,i%3===0?'#f3b4a7':'#d4bee7');if(i%3===0)circle(x,y,11,'none','#f3b4a7',.7);});
 append(svg,svgEl('text',{x:351,y:404,fill:'#f1daea','text-anchor':'middle','font-family':'DM Mono, monospace','font-size':11,'letter-spacing':'2.5'},'A LONGITUDINAL FIELD'));
}
function rows(){return data.experiments[protocol]||[];}
function modelRank(){const available=rows();return [...available].sort((a,b)=>b[metric]-a[metric]);}
function chart(){
 const arr=modelRank(), barArea=pick('model-bars');barArea.replaceChildren();
 const cur=arr.find(x=>x.model===selected);if(!cur && arr.length)selected=arr[0].model;
 pick('comparison-title').textContent=settings[protocol].title;
 pick('sample-context').textContent=arr.length?`${arr[0].n} evaluated MRI sessions`: 'No results';
 pick('protocol-note').textContent=settings[protocol].note;
 arr.forEach(r=>{const btn=document.createElement('button');btn.type='button';btn.className='metric-bar'+(r.model===selected?' active':'');btn.setAttribute('aria-pressed',String(r.model===selected));
  const name=document.createElement('span');name.className='name';name.textContent=names[r.model]||r.model;
  const track=document.createElement('span');track.className='track';const fill=document.createElement('span');fill.className='fill';fill.style.display='block';fill.style.width=`${Math.min(100,Math.max(0,100*r[metric]))}%`;track.append(fill);
  const val=document.createElement('span');val.className='value';val.textContent=pct(r[metric],1);btn.append(name,track,val);btn.addEventListener('click',()=>{selected=r.model;chart();});barArea.append(btn);
 });
 const r=arr.find(x=>x.model===selected);if(r)detail(r);
}
function detail(r){
 pick('model-name').textContent=names[r.model]||r.model;
 pick('model-description').textContent=protocol==='session_holdout'?'ELM · five selected predictors · 64 tanh hidden units.':`${r.n} evaluated observations · ${protocol.startsWith('group_subject')?'participant-grouped':'session-level'} cross-validation.`;
 ['accuracy','sensitivity','specificity','f1'].forEach(k=>{pick('detail-'+k).textContent=k==='accuracy'?pct(r[k]):fmt(r[k]);});
 const m=pick('confusion-matrix');m.replaceChildren();['tn','fp','fn','tp'].forEach((k,i)=>{const cell=document.createElement('div');if(i===1||i===2)cell.className='off';cell.textContent=String(r[k]);cell.title=`${k.toUpperCase()}: ${r[k]}`;m.append(cell);});
 const svg=pick('roc-curve');svg.replaceChildren();const pts=r.roc||[[0,0],[1,1]];const X=x=>42+215*x,Y=y=>186-152*y;
 for(let i=0;i<=4;i++){const v=i/4;append(svg,svgEl('line',{x1:X(v),y1:Y(0),x2:X(v),y2:Y(1),stroke:'#55446e'}));append(svg,svgEl('line',{x1:X(0),y1:Y(v),x2:X(1),y2:Y(v),stroke:'#55446e'}));append(svg,svgEl('text',{x:X(v),y:204,'text-anchor':'middle','font-size':9,fill:'#c0aed7'},v.toFixed(2)));append(svg,svgEl('text',{x:29,y:Y(v)+3,'text-anchor':'end','font-size':9,fill:'#c0aed7'},v.toFixed(2)));}
 append(svg,svgEl('line',{x1:X(0),y1:Y(0),x2:X(1),y2:Y(1),stroke:'#786588','stroke-dasharray':'5 4','stroke-width':1.5}));
 append(svg,svgEl('polyline',{points:pts.map(([a,b])=>`${X(a)},${Y(b)}`).join(' '),fill:'none',stroke:'#ecb19f','stroke-width':3,'stroke-linejoin':'round','stroke-linecap':'round'}));
 pick('roc-caption').textContent=`ROC AUC ${fmt(r.auc)}`;
}
function activate(){const name=pick('activation-select').value, svg=pick('activation-plot');svg.replaceChildren();const X=x=>48+(x+4)/8*480,Y=y=>238-(y+1.2)/2.4*204;
 for(let k=-4;k<=4;k+=1){append(svg,svgEl('line',{x1:X(k),y1:20,x2:X(k),y2:238,stroke:'#d5bcc5'}));if(k%2===0)append(svg,svgEl('text',{x:X(k),y:256,'font-size':10,'text-anchor':'middle',fill:'#967c8b'},String(k)));}
 for(let k=-1;k<=1;k+=.5){append(svg,svgEl('line',{x1:48,y1:Y(k),x2:528,y2:Y(k),stroke:k===0?'#c997a2':'#d5bcc5','stroke-width':k===0?1.4:1}));append(svg,svgEl('text',{x:38,y:Y(k)+4,'font-size':10,'text-anchor':'end',fill:'#967c8b'},k.toFixed(1)));}
 const fn=x=>name==='tanh'?Math.tanh(x):name==='sigmoid'?1/(1+Math.exp(-x)):Math.max(0,x);
 const pts=Array.from({length:171},(_,i)=>{const x=-4+8*i/170;return `${X(x).toFixed(1)},${Math.min(238,Math.max(20,Y(fn(x)))).toFixed(1)}`;}).join(' ');
 append(svg,svgEl('polyline',{points:pts,fill:'none',stroke:'#a65b80','stroke-width':4,'stroke-linejoin':'round','stroke-linecap':'round'}));
 append(svg,svgEl('text',{x:289,y:279,'font-size':11,fill:'#967c8b','text-anchor':'middle'},'Hidden-layer preactivation'));}
function init(){hero();cohort();chart();activate();
 document.querySelectorAll('[data-protocol]').forEach(b=>b.addEventListener('click',()=>{protocol=b.dataset.protocol;selected='ELM';document.querySelectorAll('[data-protocol]').forEach(el=>{el.classList.toggle('selected',el.dataset.protocol===protocol);el.setAttribute('aria-pressed',String(el.dataset.protocol===protocol));});chart();}));
 pick('metric-select').addEventListener('change',e=>{metric=e.target.value;chart();});pick('activation-select').addEventListener('change',activate);
 pick('download-metrics').addEventListener('click',()=>{const cols=['model','n','accuracy','sensitivity','specificity','f1','auc','tn','fp','fn','tp'];const lines=[cols.join(','),...rows().map(r=>cols.map(k=>r[k]).join(','))];const url=URL.createObjectURL(new Blob([lines.join('\n')+'\n'],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`oasis_elm_${protocol}.csv`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);});
 pick('copy-code').addEventListener('click',()=>{const txt=pick('install-code').textContent;navigator.clipboard?.writeText(txt).then(()=>{pick('copy-code').textContent='Copied';setTimeout(()=>pick('copy-code').textContent='Copy',1200);}).catch(()=>{});});
 window.addEventListener('scroll',()=>{const h=document.documentElement;const fraction=(h.scrollTop||document.body.scrollTop)/Math.max(1,h.scrollHeight-h.clientHeight);pick('scroll-progress').style.transform=`scaleX(${Math.min(1,Math.max(0,fraction))})`;},{passive:true});
}
init();
