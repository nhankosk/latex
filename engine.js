(function(root) {
"use strict";
const EPS=1e-8;
const POINTS=[
{id:0,name:"Portaria",x:0,y:0},{id:1,name:"Biblioteca",x:2,y:1},
{id:2,name:"Laboratório",x:5,y:1},{id:3,name:"Ginásio",x:6,y:4},
{id:4,name:"Horta escolar",x:4,y:6},{id:5,name:"Refeitório",x:1,y:6},
{id:6,name:"Secretaria",x:1,y:3},{id:7,name:"Quadra",x:4,y:3}];
const D=POINTS.map(a=>POINTS.map(b=>50*Math.hypot(a.x-b.x,a.y-b.y)));
const cost=route=>{let sum=0,last=0;for(const p of route){sum+=D[last][p];last=p;}return sum+D[last][0];};
const valid=r=>Array.isArray(r)&&r.length===7&&new Set(r).size===7&&r.every(n=>Number.isInteger(n)&&n>=1&&n<=7);
const rng=seed=>{let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};};
function shuffle(random){const a=[1,2,3,4,5,6,7];for(let i=6;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function nearest(){let last=0;const left=new Set([1,2,3,4,5,6,7]),r=[];while(left.size){let chosen=-1;for(const p of left)if(chosen<0||D[last][p]<D[last][chosen]-EPS||(Math.abs(D[last][p]-D[last][chosen])<EPS&&p<chosen))chosen=p;r.push(chosen);left.delete(chosen);last=chosen;}return {route:r,cost:cost(r)};}
function enumerate(){let best=Infinity,route=null,count=0;function visit(a,left){if(!left.length){if(a[0]>a[6])return;count++;const c=cost(a);if(c<best-EPS){best=c;route=a.slice();}return;}left.forEach((p,i)=>visit(a.concat(p),left.filter((_,j)=>j!==i)));}visit([],[1,2,3,4,5,6,7]);return {route,cost:best,count};}
function ox(p1,p2,a,b){const f=Array(7).fill(null),block=new Set(p1.slice(a,b+1));for(let i=a;i<=b;i++)f[i]=p1[i];const q=p2.filter(x=>!block.has(x));let p=(b+1)%7;for(const g of q){while(f[p]!==null)p=(p+1)%7;f[p]=g;p=(p+1)%7;}return f;}
function pmx(p1,p2,a,b){const f=Array(7).fill(null);for(let i=a;i<=b;i++)f[i]=p1[i];for(let i=a;i<=b;i++){const gene=p2[i];if(f.includes(gene))continue;let j=i;while(j>=a&&j<=b)j=p2.indexOf(p1[j]);f[j]=gene;}for(let i=0;i<7;i++)if(f[i]===null)f[i]=p2[i];return f;}
const EXACT=enumerate(),NEAREST=nearest();
class Genetic{
constructor(options={}){this.options={size:80,pc:0.9,pm:0.2,operator:"OX",seed:1000,budget:50000,...options};const o=this.options;if(!Number.isInteger(o.size)||o.size<4||o.size>200||!Number.isInteger(o.seed)||!["OX","PMX"].includes(o.operator)||o.pc<0||o.pc>1||o.pm<0||o.pm>1)throw Error("Parâmetros inválidos.");this.random=rng(o.seed);this.generation=1;this.evaluations=0;this.population=Array.from({length:o.size},()=>this.evaluate(shuffle(this.random)));this.sort();this.history=[{generation:1,cost:this.best.cost,average:this.average}];}
evaluate(route){if(!valid(route))throw Error("Permutação inválida.");this.evaluations++;return {route:route.slice(),cost:cost(route)};}
sort(){this.population.sort((a,b)=>a.cost-b.cost);this.best=this.population[0];this.average=this.population.reduce((s,p)=>s+p.cost,0)/this.population.length;}
get reached(){return Math.abs(this.best.cost-EXACT.cost)<EPS;}
get exhausted(){return this.evaluations+this.options.size>this.options.budget;}
get done(){return this.reached||this.exhausted;}
tournament(){const candidates=Array.from({length:3},()=>Math.floor(this.random()*this.population.length));let winner=candidates[0];for(const p of candidates.slice(1))if(this.population[p].cost<this.population[winner].cost)winner=p;return {candidates,winner,parent:this.population[winner]};}
prepare(){if(this.done)return null;const routes=this.population.slice(0,2).map(x=>x.route.slice());let trace=null;while(routes.length<this.options.size){const t1=this.tournament(),t2=this.tournament(),p1=t1.parent.route,p2=t2.parent.route;const cross=this.random()<this.options.pc;let a=null,b=null;if(cross){a=Math.floor(this.random()*7);b=Math.floor(this.random()*6);if(b>=a)b++;if(a>b)[a,b]=[b,a];}const op=this.options.operator==="OX"?ox:pmx;const children=cross?[op(p1,p2,a,b),op(p2,p1,a,b)]:[p1.slice(),p2.slice()];const before=children.map(r=>r.slice()),mutations=[];for(const r of children){let swap=null;if(this.random()<this.options.pm){const i=Math.floor(this.random()*7);let j=Math.floor(this.random()*6);if(j>=i)j++;[r[i],r[j]]=[r[j],r[i]];swap=[i,j];}mutations.push(swap);if(routes.length<this.options.size)routes.push(r);}if(!trace)trace={t1,t2,p1:p1.slice(),p2:p2.slice(),a,b,cross,before,after:children.map(r=>r.slice()),mutations};}return {routes,trace,generation:this.generation+1};}
commit(pending){if(!pending||this.done)return false;if(pending.generation!==this.generation+1)throw Error("Geração pendente inválida.");this.population=pending.routes.map(r=>this.evaluate(r));this.generation++;this.sort();this.history.push({generation:this.generation,cost:this.best.cost,average:this.average});return true;}
advance(){return this.commit(this.prepare());}
}
const API={POINTS,D,cost,valid,rng,shuffle,ox,pmx,enumerate,EXACT,NEAREST,Genetic};
root.RouteLab=API;if(typeof module!=="undefined"&&module.exports)module.exports=API;
})(globalThis);
