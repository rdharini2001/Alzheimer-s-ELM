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
const ATLAS_FEATURES={
 eTIV:{name:'Estimated intracranial volume',copy:'A global MRI-derived estimate of the cranial cavity volume, used as a model predictor.',kind:'MRI-DERIVED / GLOBAL VOLUME'},
 nWBV:{name:'Normalized whole brain volume',copy:'A global measure of brain volume relative to intracranial space. This illustration is not a volume map.',kind:'MRI-DERIVED / GLOBAL VOLUME'},
 CDR:{name:'Clinical Dementia Rating',copy:'A clinical assessment of dementia severity. CDR is closely related to the diagnostic labels.',kind:'CLINICAL MEASUREMENT'},
 MMSE:{name:'Mini-Mental State Examination',copy:'A recorded screening score describing cognitive performance; it is not an anatomical localization.',kind:'COGNITIVE ASSESSMENT'},
 EDUC:{name:'Years of education',copy:'Education history in the OASIS-2 tabular records, included among selected ELM predictors.',kind:'DEMOGRAPHIC MEASUREMENT'}
};
// This anatomical reference is an original teaching illustration. The OASIS-2 data
// provide global volumetric and clinical predictors, not anatomical labels or voxel maps.
const REGIONS={
 frontal:{name:'Frontal lobe',x:.30,y:.37,deep:false,detail:'Involved in planning, executive function, attention, and voluntary motor control.',note:'Cortical structure · approximately indicated'},
 parietal:{name:'Parietal lobe',x:.56,y:.22,deep:false,detail:'Supports sensory integration, spatial attention, and the organization of movement.',note:'Cortical structure · approximately indicated'},
 temporal:{name:'Temporal lobe',x:.46,y:.60,deep:false,detail:'Involved in hearing, language and memory-related processing.',note:'Cortical structure · approximately indicated'},
 occipital:{name:'Occipital lobe',x:.84,y:.35,deep:false,detail:'The major cortical region for processing visual information.',note:'Cortical structure · approximately indicated'},
 cerebellum:{name:'Cerebellum',x:.77,y:.80,deep:false,detail:'Supports coordination, balance, motor learning and precision of movement.',note:'Visible in this lateral illustration'},
 hippocampus:{name:'Hippocampus',x:.51,y:.57,deep:true,detail:'A medial temporal-lobe structure essential for forming new episodic memories. Its position is indicated schematically because it lies beneath the cortex.',note:'Deep structure · NOT visible on this brain surface'},
 amygdala:{name:'Amygdala',x:.42,y:.58,deep:true,detail:'A deep medial temporal structure associated with emotional salience and aspects of memory. The marker is schematic.',note:'Deep structure · NOT visible on this brain surface'},
 ventricles:{name:'Lateral ventricles',x:.57,y:.40,deep:true,detail:'Cerebrospinal-fluid-filled cavities deep within the cerebral hemispheres. Their marker is illustrative, not a segmented ventricle.',note:'Deep structure · NOT visible on this brain surface'}
};
let atlasController=null;
function atlasInit(){
 const canvas=pick('brain-canvas');if(!canvas||typeof canvas.getContext!=='function')return null;
 const ctx=canvas.getContext('2d');if(!ctx)return null;
 const image=pick('brain-anatomy-image');
 const state={view:'cortex',layer:'structure',region:'frontal',feature:'eTIV',outcome:'tp',zoom:1,panX:0,panY:0,drag:false,downX:0,downY:0,lastX:0,lastY:0};
 let w=0,h=0;
 const outcomes={tp:{shade:'#f9aa8b',label:'TRUE POSITIVE'},tn:{shade:'#c7f3ab',label:'TRUE NEGATIVE'},fn:{shade:'#f3c56c',label:'FALSE NEGATIVE'},fp:{shade:'#f19fa9',label:'FALSE POSITIVE'}};
 const colors={structure:'#b8f7c9',features:'#e7f99b',network:'#f6a98e'};
 const xy=(r)=>{
   // The source illustration has a 3:2 aspect ratio and is fitted within the stage.
   const iw=Math.min(w,h*1.5),ih=iw/1.5;
   return {x:w*.5+(((w-iw)*.5+iw*r.x)-w*.5)*state.zoom+state.panX,
           y:h*.5+(((h-ih)*.5+ih*r.y)-h*.5)*state.zoom+state.panY};
 };
 function marker(id,focus){
   const r=REGIONS[id],p=xy(r),deep=r.deep;
   ctx.save();ctx.beginPath();ctx.arc(p.x,p.y,focus?10:7,0,Math.PI*2);
   ctx.strokeStyle=focus?'#e7fa9a':'rgba(219,244,233,.76)';ctx.lineWidth=focus?2.4:1.5;
   if(deep)ctx.setLineDash([3,4]);ctx.stroke();ctx.setLineDash([]);
   ctx.beginPath();ctx.arc(p.x,p.y,focus?3.9:2.5,0,Math.PI*2);ctx.fillStyle=deep?'#ffd0af':'#c7f5d0';ctx.fill();
   if(focus){
     const right=p.x<w*.52;const bx=Math.max(18,Math.min(w-170,p.x+(right?16:-161))),by=Math.max(24,Math.min(h-56,p.y-48));
     ctx.strokeStyle='#d9efa8';ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(right?bx:bx+148,by+24);ctx.stroke();
     ctx.fillStyle='rgba(5,25,40,.91)';ctx.fillRect(bx,by,150,35);ctx.strokeStyle='#5b958e';ctx.strokeRect(bx+.5,by+.5,149,34);
     ctx.font='bold 11px Arial, sans-serif';ctx.fillStyle='#eaf9d3';ctx.fillText(r.name,bx+10,by+15);
     ctx.font='9px monospace';ctx.fillStyle='#aac3b8';ctx.fillText(deep?'DEEP / SCHEMATIC':'ANATOMICAL GUIDE',bx+10,by+28);
   }
   ctx.restore();
 }
 function draw(){if(!w||!h)return;
   ctx.clearRect(0,0,w,h);
   const show=state.view==='memory'?['hippocampus','amygdala','ventricles']:['frontal','parietal','temporal','occipital','cerebellum'];
   if(state.layer==='structure'&&state.view!=='outputs'){
     show.forEach(id=>marker(id,id===state.region));
   } else if(state.layer==='features'&&state.view!=='outputs'){
     const mapping={eTIV:{text:'eTIV · global intracranial volume',top:.16},nWBV:{text:'nWBV · normalized whole brain volume',top:.30},CDR:{text:'CDR · clinical rating',top:.45},MMSE:{text:'MMSE · cognitive assessment',top:.60},EDUC:{text:'EDUC · years of education',top:.75}};
     const a=mapping[state.feature];let cx=w*.5,cy=h*.52;
     const hw=Math.min(w*.34,h*.43)*state.zoom;
     ctx.save();ctx.strokeStyle='rgba(216,250,151,.7)';ctx.lineWidth=2;ctx.setLineDash([5,9]);ctx.beginPath();ctx.ellipse(cx+state.panX,cy+state.panY,hw*1.1,hw*.73,-.15,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
     const right=w*.70;const yy=h*a.top;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(right,yy);ctx.stroke();ctx.fillStyle='rgba(8,29,40,.94)';ctx.fillRect(Math.max(10,right-30),yy-30,Math.min(240,w*.35),45);ctx.fillStyle='#eafca7';ctx.font='bold 11px Arial, sans-serif';ctx.fillText(a.text,Math.max(15,right-20),yy-8);ctx.font='9px monospace';ctx.fillStyle='#a1c0b9';ctx.fillText('GLOBAL / NOT REGIONAL',Math.max(15,right-20),yy+8);ctx.restore();
   }
   if(state.view==='outputs'||state.layer==='network'){
     const o=outcomes[state.outcome],cx=w*.5+state.panX,cy=h*.49+state.panY;
     const r=Math.min(w*.4,h*.43)*state.zoom;
     ctx.save();ctx.lineWidth=1.8;ctx.strokeStyle=o.shade;
     for(let i=0;i<3;i++){
       ctx.globalAlpha=.43-i*.10;ctx.beginPath();ctx.ellipse(cx,cy,r*(1.08+i*.10),r*(.78+i*.075),-.14,0,Math.PI*2);ctx.stroke();
     }
     ctx.globalAlpha=1;const bx=Math.max(12,w*.09),by=h*.15;
     ctx.fillStyle='rgba(4,25,39,.9)';ctx.fillRect(bx,by,203,50);ctx.strokeStyle=o.shade;ctx.strokeRect(bx+.5,by+.5,202,49);
     ctx.fillStyle=o.shade;ctx.font='bold 12px Arial, sans-serif';ctx.fillText(o.label,bx+12,by+19);
     ctx.fillStyle='#b5d4ce';ctx.font='10px monospace';ctx.fillText('GLOBAL MODEL OUTPUT',bx+12,by+36);
     ctx.restore();
   }
   ctx.fillStyle='rgba(182,223,211,.8)';ctx.font='10px monospace';ctx.fillText('ILLUSTRATION / EDUCATIONAL ANATOMY',Math.max(14,w*.055),h-56);
 }
 function updateImage(){if(image){image.style.transform=`translate(${state.panX}px,${state.panY}px) scale(${state.zoom})`;}}
 function measure(){const box=canvas.getBoundingClientRect();w=Math.round(box.width);h=Math.round(box.height);if(w<1||h<1)return;const dpr=Math.min(2,window.devicePixelRatio||1);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);draw();}
 function changeView(view){if(!['cortex','memory','outputs'].includes(view))return;state.view=view;
   document.querySelectorAll('[data-view]').forEach(b=>{const on=b.dataset.view===view;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});draw();}
 function setLayer(layer){state.layer=layer;document.querySelectorAll('[data-layer]').forEach(b=>{const on=b.dataset.layer===layer;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});draw();}
 function setRegion(id){if(!REGIONS[id])return;state.region=id;state.layer='structure';setLayer('structure');
   if(REGIONS[id].deep)changeView('memory');else changeView('cortex');
   const info=REGIONS[id],d=pick('region-description');d.replaceChildren();const title=document.createElement('strong');title.textContent=info.name;const desc=document.createElement('p');desc.textContent=info.detail;const note=document.createElement('small');note.textContent=info.note;d.append(title,desc,note);
   document.querySelectorAll('[data-region]').forEach(b=>{const on=b.dataset.region===id;b.classList.toggle('chosen',on);b.setAttribute('aria-pressed',String(on));});draw();}
 function setFeature(feature){state.feature=feature;const info=ATLAS_FEATURES[feature];if(!info)return;const d=pick('feature-description');d.replaceChildren();const title=document.createElement('strong');title.textContent=info.name;const desc=document.createElement('p');desc.textContent=info.copy;const kind=document.createElement('span');kind.textContent=info.kind;d.append(title,desc,kind);document.querySelectorAll('[data-feature]').forEach(b=>{const on=b.dataset.feature===feature;b.classList.toggle('chosen',on);b.setAttribute('aria-pressed',String(on));});draw();}
 function zoom(f){state.zoom=Math.max(.75,Math.min(1.8,state.zoom*f));pick('zoom-label').textContent=`${Math.round(state.zoom*100)}%`;updateImage();draw();}
 document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>changeView(b.dataset.view)));
 document.querySelectorAll('[data-layer]').forEach(b=>b.addEventListener('click',()=>setLayer(b.dataset.layer)));
 document.querySelectorAll('[data-region]').forEach(b=>b.addEventListener('click',()=>setRegion(b.dataset.region)));
 document.querySelectorAll('[data-feature]').forEach(b=>b.addEventListener('click',()=>{setFeature(b.dataset.feature);changeView('cortex');setLayer('features');}));
 pick('zoom-in').addEventListener('click',()=>zoom(1.14));pick('zoom-out').addEventListener('click',()=>zoom(1/1.14));
 pick('reset-view').addEventListener('click',()=>{state.panX=0;state.panY=0;state.zoom=1;pick('zoom-label').textContent='100%';updateImage();setRegion('frontal');setFeature('eTIV');});
 canvas.addEventListener('wheel',e=>{e.preventDefault();zoom(e.deltaY<0?1.08:1/1.08);},{passive:false});
 canvas.addEventListener('pointerdown',e=>{state.drag=true;state.lastX=e.clientX;state.lastY=e.clientY;state.downX=e.clientX;state.downY=e.clientY;canvas.setPointerCapture?.(e.pointerId);});
 canvas.addEventListener('pointermove',e=>{if(!state.drag)return;state.panX+=(e.clientX-state.lastX);state.panY+=(e.clientY-state.lastY);state.lastX=e.clientX;state.lastY=e.clientY;updateImage();draw();});
 canvas.addEventListener('pointerup',e=>{state.drag=false;if(Math.hypot(e.clientX-state.downX,e.clientY-state.downY)<8){const rect=canvas.getBoundingClientRect();const nearby=Object.entries(REGIONS).map(([id,r])=>({id,p:xy(r)})).filter(({id})=>REGIONS[id].deep===(state.view==='memory')).map(v=>({id:v.id,d:Math.hypot(v.p.x-(e.clientX-rect.left),v.p.y-(e.clientY-rect.top))})).sort((a,b)=>a.d-b.d)[0];if(nearby&&nearby.d<25)setRegion(nearby.id);}});
 canvas.addEventListener('pointercancel',()=>{state.drag=false;});
 window.addEventListener('resize',measure,{passive:true});measure();
 const setOutcome=(key)=>{if(!outcomes[key])return;state.outcome=key;changeView('outputs');setLayer('network');};
 return {setOutcome,changeView,setLayer,setRegion};
}
function outcomeInit(atlas){
 const hold=data.experiments.session_holdout.find(r=>r.model==='ELM');if(!hold)return;
 for(const key of ['tp','tn','fp','fn'])pick('outcome-count-'+key).textContent=String(hold[key]);
 pick('outcome-total').textContent=`${hold.tp+hold.tn} / ${hold.n}`;
 const info={
 tp:{name:'Correctly predicted demented',actual:'demented',pred:'demented'},
 tn:{name:'Correctly predicted nondemented',actual:'nondemented',pred:'nondemented'},
 fp:{name:'Incorrectly predicted demented',actual:'nondemented',pred:'demented'},
 fn:{name:'Incorrectly predicted nondemented',actual:'demented',pred:'nondemented'}
 };
 let current='tp';
 const choose=(key)=>{if(!info[key])return;current=key;const v=info[key];
   pick('outcome-headline').textContent=`${hold[key]} · ${v.name.toLowerCase()} session${hold[key]===1?'':'s'}`;
   pick('outcome-copy').textContent=`Actual group: ${v.actual}. ELM predicted: ${v.pred}. This is an aggregate count from the saved holdout confusion matrix, not a participant-specific prediction, probability or brain-region score.`;
   document.querySelectorAll('[data-outcome]').forEach(b=>{const on=b.dataset.outcome===key;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
 };
 document.querySelectorAll('[data-outcome]').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.outcome)));
 pick('show-outcome-on-brain').addEventListener('click',()=>{atlas?.setOutcome(current);pick('atlas').scrollIntoView?.({behavior:'smooth',block:'start'});});
 choose('tp');
}

function init(){cohort();chart();activate();atlasController=atlasInit();outcomeInit(atlasController);
 document.querySelectorAll('[data-protocol]').forEach(b=>b.addEventListener('click',()=>{protocol=b.dataset.protocol;selected='ELM';document.querySelectorAll('[data-protocol]').forEach(el=>{el.classList.toggle('selected',el.dataset.protocol===protocol);el.setAttribute('aria-pressed',String(el.dataset.protocol===protocol));});chart();}));
 pick('metric-select').addEventListener('change',e=>{metric=e.target.value;chart();});pick('activation-select').addEventListener('change',activate);
 pick('download-metrics').addEventListener('click',()=>{const cols=['model','n','accuracy','sensitivity','specificity','f1','auc','tn','fp','fn','tp'];const lines=[cols.join(','),...rows().map(r=>cols.map(k=>r[k]).join(','))];const url=URL.createObjectURL(new Blob([lines.join('\n')+'\n'],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=`oasis_elm_${protocol}.csv`;document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);});
 pick('copy-code').addEventListener('click',()=>{const txt=pick('install-code').textContent;navigator.clipboard?.writeText(txt).then(()=>{pick('copy-code').textContent='Copied';setTimeout(()=>pick('copy-code').textContent='Copy',1200);}).catch(()=>{});});
 window.addEventListener('scroll',()=>{const h=document.documentElement;const fraction=(h.scrollTop||document.body.scrollTop)/Math.max(1,h.scrollHeight-h.clientHeight);pick('scroll-progress').style.transform=`scaleX(${Math.min(1,Math.max(0,fraction))})`;},{passive:true});
}
init();
