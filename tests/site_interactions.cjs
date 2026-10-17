// Dependency-free interaction smoke test for the statically generated GitHub Pages site.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'docs/index.html'), 'utf8');
const embedded = html.match(/<script type="application\/json" id="project-data">([\s\S]*?)<\/script>/);
assert(embedded, 'The page must embed experiment data');
const events = new Map();
class Element {
  constructor(id) { this.id=id; this.children=[]; this.attributes={}; this.dataset={}; this.style={}; this.textContent=''; this.value=''; this.className=''; this.classList={toggle:(cl,yes)=>{this.className=(this.className||'').replace(cl,'').trim()+(yes?` ${cl}`:'');}}; }
  setAttribute(k,v) { this.attributes[k]=v; }
  appendChild(el) { this.children.push(el);return el; }
  append(...els) { this.children.push(...els); }
  replaceChildren(...els) { this.children=els; }
  addEventListener(name, fn) { events.set(`${this.id}:${name}`,fn); }
  click() { const fn=events.get(`${this.id}:click`);if(fn)fn(); }
  remove() { }
  getBoundingClientRect() { return {width:860,height:570,left:0,top:0}; }
  setPointerCapture() { }
  getContext() { return this.id==='brain-canvas'?drawingContext:null; }
}
const drawingContext = new Proxy({},{get(target,prop){return target[prop]??(()=>{});},set(target,prop,value){target[prop]=value;return true;}});
const elements = new Map();
const get = (id) => { if(!elements.has(id))elements.set(id,new Element(id)); return elements.get(id); };
const btns=['session_holdout','group_subject_no_cdr','group_subject_with_cdr','group_session_with_cdr'].map(p => {const e=get(`button:${p}`);e.dataset.protocol=p;return e;});
const views=['lateral','coronal','axial'].map(v=>{const e=get('view:'+v);e.dataset.view=v;return e;});
const layers=['structure','features','network'].map(v=>{const e=get('layer:'+v);e.dataset.layer=v;return e;});
const features=['eTIV','nWBV','CDR','MMSE','EDUC'].map(v=>{const e=get('feature:'+v);e.dataset.feature=v;return e;});
get('project-data').textContent=embedded[1];
get('metric-select').value='accuracy'; get('activation-select').value='tanh';
const document={
  getElementById:get,
  querySelectorAll:(query)=>({ '[data-protocol]':btns,'[data-view]':views,'[data-layer]':layers,'[data-feature]':features})[query]??[],
  createElement:(tag)=>new Element(`new:${tag}`),
  createElementNS:(n,tag)=>new Element(`svg:${tag}`),
  createTextNode:(txt)=>{const e=new Element('text');e.textContent=txt;return e;},
  body:get('body'),documentElement:{scrollTop:0,scrollHeight:900,clientHeight:400}
};
const sandbox={document,window:{addEventListener:()=>{},devicePixelRatio:1,matchMedia:()=>({matches:true})},navigator:{},URL:{},Blob,console,setTimeout,requestAnimationFrame:()=>1};
vm.runInNewContext(fs.readFileSync(path.join(root,'docs/assets/site.js'),'utf8'),sandbox,{filename:'site.js'});
assert.equal(get('comparison-title').textContent,'ELM · session holdout');
assert.equal(get('detail-accuracy').textContent,'98.33%');
assert.equal(get('confusion-matrix').children.length,4);
assert.equal(get('model-bars').children.length,1);
btns[1].click();
assert.equal(get('comparison-title').textContent,'Participant-disjoint CV · no CDR');
assert.equal(get('model-bars').children.length,9);
assert.equal(get('confusion-matrix').children.length,4);
const handler=events.get('metric-select:change');
handler({target:{value:'f1'}});
assert.equal(get('model-bars').children.length,9);
get('activation-select').value='sigmoid';get('activation-select').click();
assert(get('activation-plot').children.length>10);
views[1].click();
assert.equal(views[1].attributes['aria-pressed'],'true');
get('zoom-in').click();
assert.equal(get('zoom-label').textContent,'114%');
layers[1].click();
assert.equal(layers[1].attributes['aria-pressed'],'true');
features[3].click();
assert.equal(get('feature-description').children[0].textContent,'Mini-Mental State Examination');
assert.equal(features[3].attributes['aria-pressed'],'true');
get('reset-view').click();
assert.equal(get('zoom-label').textContent,'100%');
assert.equal(views[0].attributes['aria-pressed'],'true');
assert.equal(layers[0].attributes['aria-pressed'],'true');
assert.equal(get('brain-canvas').width,860);
console.log('PASS: cohort, computed scores, chart controls, atlas orientations, zoom, layers and feature selection');
