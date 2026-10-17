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
const palette=['#64ae99','#eea17f','#89bbd7'];
let protocol='session_holdout', metric='accuracy', selected='ELM';
function cohort(){
  const groups=data.cohort.groups;const total=labels.reduce((a,k)=>a+groups[k],0);
  const ring=pick('cohort-ring');ring.replaceChildren();const cx=130,cy=130,R=89,stroke=33,circ=2*Math.PI*R;
  let offset=0;
  labels.forEach((name,i)=>{const value=groups[name],len=value/total*circ;
    append(ring,svgEl('circle',{cx,cy,r:R,fill:'none',stroke:palette[i],'stroke-width':stroke,'stroke-dasharray':`${len} ${circ-len}`,'stroke-dashoffset':-offset,transform:`rotate(-90 ${cx} ${cy})`}));offset+=len;
  });
  append(ring,svgEl('text',{x:cx,y:122,fill:'#173b44','font-size':41,'font-weight':750,'text-anchor':'middle'},String(total)));
  append(ring,svgEl('text',{x:cx,y:146,fill:'#6f858e','font-size':12,'text-anchor':'middle'},'participants'));
  pick('cohort-legend').replaceChildren();labels.forEach((name,i)=>{const row=document.createElement('span');const square=document.createElement('i');square.style.background=palette[i];row.append(square,document.createTextNode(`${name}: ${groups[name]}`));pick('cohort-legend').append(row);});
  pick('n-subjects').textContent=data.cohort.subjects;pick('n-sessions').textContent=data.cohort.sessions;
  const svg=pick('age-histogram');svg.replaceChildren();const counts=data.cohort.ages, max=Math.max(...counts.map(x=>x.count),1),dx=344/counts.length;
  for(let i=0;i<=3;i++){const y=175-i*50;append(svg,svgEl('line',{x1:43,y1:y,x2:400,y2:y,stroke:'#d4e0dc','stroke-width':1}));append(svg,svgEl('text',{x:34,y:y+4,'text-anchor':'end','font-size':10,fill:'#718990'},String(Math.round(max*i/3))));}
  counts.forEach((d,i)=>{const h=147*d.count/max,x=48+i*dx;append(svg,svgEl('rect',{x,y:175-h,width:Math.max(8,dx-4),height:h,rx:2,fill:i%2?'#7fcbbb':'#366a85'}));if(i%2===0||counts.length<8)append(svg,svgEl('text',{x:x+(dx-4)/2,y:194,'text-anchor':'middle','font-size':10,fill:'#6a7e82'},String(d.age)));});
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
 for(let i=0;i<=4;i++){const v=i/4;append(svg,svgEl('line',{x1:X(v),y1:Y(0),x2:X(v),y2:Y(1),stroke:'#3c6174'}));append(svg,svgEl('line',{x1:X(0),y1:Y(v),x2:X(1),y2:Y(v),stroke:'#3c6174'}));append(svg,svgEl('text',{x:X(v),y:204,'text-anchor':'middle','font-size':9,fill:'#98bac3'},v.toFixed(2)));append(svg,svgEl('text',{x:29,y:Y(v)+3,'text-anchor':'end','font-size':9,fill:'#98bac3'},v.toFixed(2)));}
 append(svg,svgEl('line',{x1:X(0),y1:Y(0),x2:X(1),y2:Y(1),stroke:'#4a6b76','stroke-dasharray':'5 4','stroke-width':1.5}));
 append(svg,svgEl('polyline',{points:pts.map(([a,b])=>`${X(a)},${Y(b)}`).join(' '),fill:'none',stroke:'#d8f99a','stroke-width':3,'stroke-linejoin':'round','stroke-linecap':'round'}));
 pick('roc-caption').textContent=`ROC AUC ${fmt(r.auc)}`;
}
function activate(){const name=pick('activation-select').value, svg=pick('activation-plot');svg.replaceChildren();const X=x=>48+(x+4)/8*480,Y=y=>238-(y+1.2)/2.4*204;
 for(let k=-4;k<=4;k+=1){append(svg,svgEl('line',{x1:X(k),y1:20,x2:X(k),y2:238,stroke:'#cad9d1'}));if(k%2===0)append(svg,svgEl('text',{x:X(k),y:256,'font-size':10,'text-anchor':'middle',fill:'#6a868a'},String(k)));}
 for(let k=-1;k<=1;k+=.5){append(svg,svgEl('line',{x1:48,y1:Y(k),x2:528,y2:Y(k),stroke:k===0?'#6f9d8f':'#cad9d1','stroke-width':k===0?1.4:1}));append(svg,svgEl('text',{x:38,y:Y(k)+4,'font-size':10,'text-anchor':'end',fill:'#6a868a'},k.toFixed(1)));}
 const fn=x=>name==='tanh'?Math.tanh(x):name==='sigmoid'?1/(1+Math.exp(-x)):Math.max(0,x);
 const pts=Array.from({length:171},(_,i)=>{const x=-4+8*i/170;return `${X(x).toFixed(1)},${Math.min(238,Math.max(20,Y(fn(x)))).toFixed(1)}`;}).join(' ');
 append(svg,svgEl('polyline',{points:pts,fill:'none',stroke:'#2d877e','stroke-width':4,'stroke-linejoin':'round','stroke-linecap':'round'}));
 append(svg,svgEl('text',{x:289,y:279,'font-size':11,fill:'#6a868a','text-anchor':'middle'},'Hidden-layer preactivation'));}
// The interactive brain is a mathematical surface illustration. It does not represent MRI pixels, segmentation, or anatomical feature localization.
const ATLAS_FEATURES={
 eTIV:{name:'Estimated intracranial volume',copy:'A global MRI-derived estimate of the cranial cavity volume, used as a model predictor.',kind:'MRI-DERIVED / GLOBAL VOLUME'},
 nWBV:{name:'Normalized whole brain volume',copy:'A global measure of brain volume relative to intracranial space. This illustration is not a volume map.',kind:'MRI-DERIVED / GLOBAL VOLUME'},
 CDR:{name:'Clinical Dementia Rating',copy:'A clinical assessment of dementia severity. CDR is closely related to the diagnostic labels.',kind:'CLINICAL MEASUREMENT'},
 MMSE:{name:'Mini-Mental State Examination',copy:'A recorded screening score describing cognitive performance; it is not an anatomical localization.',kind:'COGNITIVE ASSESSMENT'},
 EDUC:{name:'Years of education',copy:'Education history in the OASIS-2 tabular records, included among selected ELM predictors.',kind:'DEMOGRAPHIC MEASUREMENT'}
};
function atlasInit(){
 const canvas=pick('brain-canvas');
 if(!canvas||typeof canvas.getContext!=='function')return;
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const stage=pick('brain-stage');
 const reduced=typeof window.matchMedia==='function'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const state={yaw:.24,pitch:-.22,zoom:1,targetYaw:.24,targetPitch:-.22,layer:'structure',feature:'eTIV',drag:false,lastX:0,lastY:0,dirty:true,motion:0};
 const latN=43,lonN=78;
 const vertices=[];
 const idx=(a,b)=>a*(lonN+1)+b;
 for(let a=0;a<=latN;a++){
  const theta=-Math.PI/2+a*Math.PI/latN;
  for(let b=0;b<=lonN;b++){
   const phi=b*Math.PI*2/lonN;
   const corrugation=.048*Math.sin(13*phi+4*Math.sin(3*theta))*Math.cos(10*theta)+.027*Math.sin(21*phi-8*theta)+.015*Math.cos(29*theta+11*phi);
   const taper=theta<-.3?Math.max(.73,1+.19*(theta+.3)) :1;
   const r=1+corrugation;
   const x=1.24*r*Math.cos(theta)*Math.cos(phi)*(theta<-.8?.88:1);
   const y=.86*r*Math.sin(theta)-.013*Math.sin(phi*4)*Math.cos(theta);
   const z=.97*r*Math.cos(theta)*Math.sin(phi)*taper;
   vertices.push([x,y,z,theta,phi]);
  }
 }
 const panels=[];
 for(let a=0;a<latN;a++)for(let b=0;b<lonN;b++)panels.push([idx(a,b),idx(a+1,b),idx(a+1,b+1),idx(a,b+1)]);
 const specs={lateral:{yaw:.24,pitch:-.22},coronal:{yaw:1.43,pitch:-.12},axial:{yaw:.30,pitch:1.27}};
 let points=[], logicalW=0,logicalH=0,rafId=null;
 const project=(x,y,z)=>{
  const cy=Math.cos(state.yaw),sy=Math.sin(state.yaw),cp=Math.cos(state.pitch),sp=Math.sin(state.pitch);
  const rx=cy*x+sy*z,rz=-sy*x+cy*z;
  const ry=cp*y-sp*rz,rzz=sp*y+cp*rz;
  const perspective=3.8/(3.8-rzz*.28);
  const scale=Math.min(logicalW*.34,logicalH*.365)*state.zoom;
  return {x:logicalW*.49+rx*scale*perspective,y:logicalH*.52-ry*scale*perspective,z:rzz,shade:.28+.72*Math.max(0,.23*rx+.45*ry+.74*rzz)};
 };
 const draw=()=>{
  state.yaw+=(state.targetYaw-state.yaw)*.12;
  state.pitch+=(state.targetPitch-state.pitch)*.12;
  if(!state.drag&&!reduced)state.motion+=.005;
  const w=logicalW,h=logicalH;
  if(!w||!h)return;
  ctx.clearRect(0,0,w,h);
  // Reference geometry and translucent orbit guides are illustrative design elements.
  ctx.save();ctx.translate(w*.49,h*.52);ctx.strokeStyle='rgba(107,198,188,.11)';ctx.lineWidth=1;
  for(let i=0;i<3;i++){ctx.beginPath();ctx.ellipse(0,0,w*(.29+i*.035),h*(.31+i*.06),i*.20,0,Math.PI*2);ctx.stroke();}
  ctx.strokeStyle='rgba(153,219,208,.12)';ctx.beginPath();ctx.moveTo(-w*.4,0);ctx.lineTo(w*.4,0);ctx.moveTo(0,-h*.40);ctx.lineTo(0,h*.40);ctx.stroke();ctx.restore();
  points=vertices.map(([x,y,z])=>project(x,y,z));
  const faces=panels.map(([a,b,c,d])=>{
   const p=points[a],q=points[b],r=points[c],s=points[d];
   return {v:[p,q,r,s],depth:(p.z+q.z+r.z+s.z)/4,lit:(p.shade+q.shade+r.shade+s.shade)/4};
  }).sort((a,b)=>a.depth-b.depth);
  faces.forEach(f=>{
   const v=f.v,lit=f.lit,depth=f.depth;
   const hue=state.layer==='network'?173:165;
   const light=state.layer==='network'?Math.round(19+lit*29):Math.round(16+lit*42);
   const sat=state.layer==='network'?37:38;
   ctx.fillStyle=`hsl(${hue} ${sat}% ${light}%)`;
   ctx.beginPath();ctx.moveTo(v[0].x,v[0].y);for(let j=1;j<4;j++)ctx.lineTo(v[j].x,v[j].y);ctx.closePath();ctx.fill();
   if(depth>-.1 && (state.layer==='structure'||state.layer==='features')){
    ctx.lineWidth=lit>.65?.8:.5;ctx.strokeStyle=`rgba(188,246,213,${Math.max(.065,.09+lit*.13)})`;ctx.stroke();
   }
  });
  const visibleLine=(latFn,lonFn,n,stroke,width)=>{
   ctx.lineWidth=width;ctx.strokeStyle=stroke;ctx.beginPath();let active=false;
   for(let i=0;i<=n;i++){
    const t=i/n;const theta=latFn(t),phi=lonFn(t);const co=Math.cos(theta);
    const wobble=1+.055*Math.sin(13*phi+4*Math.sin(3*theta))*Math.cos(10*theta)+.027*Math.sin(21*phi-8*theta)+.015*Math.cos(29*theta+11*phi);
    const p=project(1.24*wobble*co*Math.cos(phi)*(theta<-.8?.88:1),.86*wobble*Math.sin(theta)-.013*Math.sin(phi*4)*co,.97*wobble*co*Math.sin(phi)*(theta<-.3?Math.max(.73,1+.19*(theta+.3)):1));
    if(p.z<-.08){if(active){ctx.stroke();ctx.beginPath();active=false;}continue;}
    if(!active){ctx.moveTo(p.x,p.y);active=true;}else ctx.lineTo(p.x,p.y);
   }ctx.stroke();
  };
  // Several surface trajectories give the brain a readable folded appearance.
  for(let n=0;n<17;n++){
   const phi=(n+.7)*Math.PI*2/17;
   visibleLine(t=>-1.34+t*2.67+Math.sin(t*20+phi*3)*.036,t=>phi+.038*Math.sin(t*24+phi*5),80,n%4===0?'rgba(231,255,185,.37)':'rgba(194,247,223,.30)',n%4===0?1.65:1.1);
  }
  for(let n=0;n<11;n++){
   const theta=(n+.8)*Math.PI/12-Math.PI/2;
   visibleLine(t=>theta+.047*Math.sin(t*27+n*3),t=>t*Math.PI*2,130,n%3===0?'rgba(213,245,168,.33)':'rgba(128,215,198,.24)',1.1);
  }
  if(state.layer==='network'){
   const nodes=[];
   for(let i=0;i<44;i++){const theta=-1.06+2.05*(i%9)/8,phi=(i*2.39996)%(Math.PI*2);const rr=1.06;const p=project(1.24*rr*Math.cos(theta)*Math.cos(phi),.86*rr*Math.sin(theta),.97*rr*Math.cos(theta)*Math.sin(phi));if(p.z>0)nodes.push(p);}
   nodes.forEach((p,i)=>{const q=nodes[(i*7+11)%nodes.length];ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.quadraticCurveTo((p.x+q.x)/2+15,(p.y+q.y)/2-16,q.x,q.y);ctx.strokeStyle='rgba(228,250,137,.18)';ctx.lineWidth=.8;ctx.stroke();ctx.beginPath();ctx.arc(p.x,p.y,i%5===0?3.5:2,0,Math.PI*2);ctx.fillStyle=i%5===0?'#e8fd9b':'#93e7d8';ctx.fill();});
  }
  if(state.layer==='features'){
   const anchors=[[.17,.18],[.80,.20],[.10,.48],[.80,.70],[.24,.84]];
   const featureNames=['eTIV','nWBV','CDR','MMSE','EDUC'];
   anchors.forEach(([x,y],i)=>{
    const px=x*w,py=y*h,bpx=w*.49+(x-.5)*w*.29,bpy=h*.52+(y-.5)*h*.25;
    const on=state.feature===featureNames[i];
    ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(bpx,bpy);ctx.strokeStyle=on?'rgba(227,251,142,.88)':'rgba(138,216,202,.40)';ctx.lineWidth=on?2:1;ctx.stroke();
    ctx.beginPath();ctx.arc(bpx,bpy,on?4:2.5,0,Math.PI*2);ctx.fillStyle=on?'#e1fb8e':'#7ccfc2';ctx.fill();
    ctx.fillStyle=on?'#e1fb8e':'#c7e5df';ctx.font=`${on?'bold ':''}11px monospace`;ctx.fillText(featureNames[i],px,py-6);
   });
  }
  ctx.fillStyle='rgba(186,219,219,.6)';ctx.font='10px monospace';ctx.fillText('ILLUSTRATIVE MODEL / NOT MRI DATA',Math.max(15,w*.05),h-16);
 };
 const measure=()=>{
  const box=canvas.getBoundingClientRect();const w=Math.round(box.width),h=Math.round(box.height);
  if(w<1||h<1)return;
  logicalW=w;logicalH=h;const dpr=Math.min(2,window.devicePixelRatio||1);
  canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();
 };
 const animate=()=>{if(state.drag||Math.abs(state.yaw-state.targetYaw)>.0002||Math.abs(state.pitch-state.targetPitch)>.0002){draw();}rafId=requestAnimationFrame(animate);};
 const changeView=(view)=>{const next=specs[view];if(!next)return;state.targetYaw=next.yaw;state.targetPitch=next.pitch;document.querySelectorAll('[data-view]').forEach(b=>{const active=b.dataset.view===view;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active));});draw();};
 const setLayer=(layer)=>{state.layer=layer;document.querySelectorAll('[data-layer]').forEach(b=>{const active=b.dataset.layer===layer;b.classList.toggle('on',active);b.setAttribute('aria-pressed',String(active));});draw();};
 const setFeature=(feature)=>{state.feature=feature;const info=ATLAS_FEATURES[feature];if(!info)return;const d=pick('feature-description');d.replaceChildren();const h=document.createElement('strong');h.textContent=info.name;const p=document.createElement('p');p.textContent=info.copy;const k=document.createElement('span');k.textContent=info.kind;d.append(h,p,k);document.querySelectorAll('[data-feature]').forEach(b=>{const on=b.dataset.feature===feature;b.classList.toggle('chosen',on);b.setAttribute('aria-pressed',String(on));});if(state.layer==='features')draw();};
 document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>changeView(b.dataset.view)));
 document.querySelectorAll('[data-layer]').forEach(b=>b.addEventListener('click',()=>setLayer(b.dataset.layer)));
 document.querySelectorAll('[data-feature]').forEach(b=>b.addEventListener('click',()=>{setFeature(b.dataset.feature);if(state.layer!=='features')setLayer('features');}));
 const zoom=(factor)=>{state.zoom=Math.min(1.55,Math.max(.65,state.zoom*factor));pick('zoom-label').textContent=Math.round(state.zoom*100)+'%';draw();};
 pick('zoom-in').addEventListener('click',()=>zoom(1.14));pick('zoom-out').addEventListener('click',()=>zoom(1/1.14));
 pick('reset-view').addEventListener('click',()=>{state.zoom=1;pick('zoom-label').textContent='100%';changeView('lateral');setLayer('structure');setFeature('eTIV');});
 canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0?1.07:1/1.07);},{passive:false});
 canvas.addEventListener('pointerdown',e=>{state.drag=true;state.lastX=e.clientX;state.lastY=e.clientY;canvas.setPointerCapture?.(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(!state.drag)return;state.targetYaw+=(e.clientX-state.lastX)*.008;state.targetPitch=Math.min(1.4,Math.max(-1.4,state.targetPitch+(e.clientY-state.lastY)*.006));state.lastX=e.clientX;state.lastY=e.clientY;draw();});
 const release=()=>state.drag=false;canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);
 window.addEventListener('resize',measure,{passive:true});measure();if(typeof requestAnimationFrame==='function')animate();
}

function init(){cohort();chart();activate();atlasInit();
 document.querySelectorAll('[data-protocol]').forEach(b=>b.addEventListener('click',()=>{protocol=b.dataset.protocol;selected='ELM';document.querySelectorAll('[data-protocol]').forEach(el=>{el.classList.toggle('selected',el.dataset.protocol===protocol);el.setAttribute('aria-pressed',String(el.dataset.protocol===protocol));});chart();}));
 pick('metric-select').addEventListener('change',e=>{metric=e.target.value;chart();});pick('activation-select').addEventListener('change',activate);
 pick('download-metrics').addEventListener('click',()=>{const cols=['model','n','accuracy','sensitivity','specificity','f1','auc','tn','fp','fn','tp'];const lines=[cols.join(','),...rows().map(r=>cols.map(k=>r[k]).join(','))];const url=URL.createObjectURL(new Blob([lines.join('\n')+'\n'],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`oasis_elm_${protocol}.csv`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);});
 pick('copy-code').addEventListener('click',()=>{const txt=pick('install-code').textContent;navigator.clipboard?.writeText(txt).then(()=>{pick('copy-code').textContent='Copied';setTimeout(()=>pick('copy-code').textContent='Copy',1200);}).catch(()=>{});});
 window.addEventListener('scroll',()=>{const h=document.documentElement;const fraction=(h.scrollTop||document.body.scrollTop)/Math.max(1,h.scrollHeight-h.clientHeight);pick('scroll-progress').style.transform=`scaleX(${Math.min(1,Math.max(0,fraction))})`;},{passive:true});
}
init();
