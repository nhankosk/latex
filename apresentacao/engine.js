(function(root){
'use strict';
const EPS=1e-8;
const rng=seed=>{let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^(a>>>15),1|a);t^=t+Math.imul(t^(t>>>7),61|t);return((t^(t>>>14))>>>0)/4294967296;};};
function shuffle(random,n=7){const a=Array.from({length:n},(_,i)=>i+1);for(let i=n-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function valid(r,n=7){return Array.isArray(r)&&r.length===n&&new Set(r).size===n&&r.every(x=>Number.isInteger(x)&&x>=1&&x<=n);}
function ox(p1,p2,a,b){const n=p1.length,f=Array(n).fill(null),block=new Set(p1.slice(a,b+1));for(let i=a;i<=b;i++)f[i]=p1[i];let j=(b+1)%n;for(const g of p2.filter(x=>!block.has(x))){while(f[j]!==null)j=(j+1)%n;f[j]=g;j=(j+1)%n;}return f;}
function pmx(p1,p2,a,b){const n=p1.length,f=Array(n).fill(null);for(let i=a;i<=b;i++)f[i]=p1[i];for(let i=a;i<=b;i++){if(f.includes(p2[i]))continue;let j=i;while(j>=a&&j<=b)j=p2.indexOf(p1[j]);f[j]=p2[i];}for(let i=0;i<n;i++)if(f[i]===null)f[i]=p2[i];return f;}
function heldKarp(D){
 const n=D.length-1,S=1<<n,dp=new Float64Array(S*n).fill(Infinity),prev=new Int16Array(S*n).fill(-1);
 for(let j=0;j<n;j++)dp[(1<<j)*n+j]=D[0][j+1];
 for(let mask=1;mask<S;mask++)for(let j=0;j<n;j++)if(mask&(1<<j)){
  const before=mask^(1<<j);if(!before)continue;
  for(let k=0;k<n;k++)if(before&(1<<k)){const v=dp[before*n+k]+D[k+1][j+1];if(v<dp[mask*n+j]-EPS){dp[mask*n+j]=v;prev[mask*n+j]=k;}}
 }
 let end=0,best=Infinity;for(let j=0;j<n;j++){const v=dp[(S-1)*n+j]+D[j+1][0];if(v<best-EPS){best=v;end=j;}}
 let mask=S-1;const route=[];while(end>=0){route.push(end+1);const last=prev[mask*n+end];mask^=1<<end;end=last;}route.reverse();return{route,cost:best};
}
function makeProblem(def){
 const points=def.coordinates.map(([x,y],id)=>({id,x,y,name:def.names[id]}));
 const blocked=new Set();for(const[x0,x1,y0,y1]of def.rectangles||[])for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)blocked.add(x+','+y);
 const legal=([x,y])=>x>=0&&y>=0&&x<def.width&&y<def.height&&!blocked.has(x+','+y);
 function bfs(a,b){
  const start=[a.x,a.y],target=[b.x,b.y],key=p=>p.join(','),q=[start],prev=new Map([[key(start),null]]);
  for(let h=0;h<q.length;h++){
   const p=q[h];if(key(p)===key(target)){const route=[];let c=p;while(c){route.push({x:c[0],y:c[1]});c=prev.get(key(c));}return route.reverse();}
   for(const[dx,dy]of [[1,0],[0,1],[-1,0],[0,-1]]){const next=[p[0]+dx,p[1]+dy],k=key(next);if(legal(next)&&!prev.has(k)){prev.set(k,p);q.push(next);}}
  }throw Error('Pontos desconectados na grade.');
 }
 const paths=points.map(a=>points.map(b=>{
  if(a.id===b.id)return[{x:a.x,y:a.y}];
  if(def.metric==='euclidean')return[{x:a.x,y:a.y},{x:b.x,y:b.y}];
  if(def.metric==='grid')return bfs(a,b);
  const p=[{x:a.x,y:a.y}],step=(v,d)=>v<d?1:-1;let x=a.x,y=a.y;
  while(x!==b.x){x+=step(x,b.x);p.push({x,y});}while(y!==b.y){y+=step(y,b.y);p.push({x,y});}return p;
 }));
 const D=points.map((a,i)=>points.map((b,j)=>def.metric==='euclidean'?def.scale*Math.hypot(a.x-b.x,a.y-b.y):(paths[i][j].length-1)*def.scale));
 const cost=route=>{let c=0,last=0;for(const x of route){c+=D[last][x];last=x;}return c+D[last][0];};
 const nearest=()=>{const remaining=new Set(points.slice(1).map(p=>p.id)),route=[];let last=0;while(remaining.size){let next=-1;for(const p of remaining)if(next<0||D[last][p]<D[last][next]-EPS||(Math.abs(D[last][p]-D[last][next])<EPS&&p<next))next=p;route.push(next);remaining.delete(next);last=next;}return{route,cost:cost(route)};};
 const exact=heldKarp(D);let permutations=1;for(let i=2;i<points.length;i++)permutations*=i;exact.count=permutations/2;
 function geometry(route){
  const ids=[0,...route,0],vertices=[{x:points[0].x,y:points[0].y,at:0}],visits=[{id:0,at:0}];let distance=0;
  for(let i=0;i<ids.length-1;i++){
   const leg=paths[ids[i]][ids[i+1]];
   for(let j=1;j<leg.length;j++){distance+=Math.hypot(leg[j].x-leg[j-1].x,leg[j].y-leg[j-1].y)*def.scale;vertices.push({...leg[j],at:distance});}
   visits.push({id:ids[i+1],at:distance});
  }return{vertices,visits,cost:distance};
 }
 return{...def,points,POINTS:points,D,paths,blocked,legal,cost,geometry,valid:r=>valid(r,points.length-1),EXACT:exact,NEAREST:nearest()};
}
const CASES={
 school:makeProblem({id:'school',number:'01',title:'Campus escolar',subtitle:'Oito pontos. Qual é a melhor rota?',description:'Dez estudantes saem da portaria, visitam os sete locais e retornam. Cada um representa uma solução.',metric:'euclidean',scale:50,width:8,height:8,paperSize:80,names:['Portaria','Biblioteca','Laboratório','Ginásio','Horta escolar','Refeitório','Secretaria','Quadra'],coordinates:[[0,0],[2,1],[5,1],[6,4],[4,6],[1,6],[1,3],[4,3]]}),
 city:makeProblem({id:'city',number:'02',title:'Coleta de doações',subtitle:'Onze coletas. Uma volta pelo bairro.',description:'Dez veículos saem da escola e percorrem ruas ortogonais para recolher doações. Qual ordem reduz a distância?',metric:'manhattan',scale:120,width:11,height:11,paperSize:120,names:['Escola','Ponto A','Ponto B','Ponto C','Ponto D','Ponto E','Ponto F','Ponto G','Ponto H','Ponto I','Ponto J','Ponto K'],coordinates:[[4,4],[1,1],[2,5],[1,8],[4,9],[7,8],[9,6],[8,3],[9,1],[6,0],[3,1],[5,6]]}),
 robot:makeProblem({id:'robot',number:'03',title:'Robôs de inspeção',subtitle:'Quatorze inspeções. Obstáculos no caminho.',description:'Dez robôs saem da mesma base e visitam os pontos de inspeção. Os caminhos respeitam as áreas bloqueadas.',metric:'grid',scale:.5,width:31,height:21,paperSize:180,names:['Base',...Array.from({length:14},(_,i)=>'Inspeção '+(i+1))],coordinates:[[2,2],[5,5],[5,16],[15,17],[25,17],[28,10],[26,3],[15,3],[14,10],[16,10],[3,10],[14,6],[24,10],[27,6],[27,14]],rectangles:[[8,12,6,14],[18,22,0,7],[18,22,13,20]]})
};
class Genetic{
 constructor(options={}){
  this.options={size:10,pc:.9,pm:.2,operator:'OX',seed:1000,budget:50000,caseId:'school',...options};
  const o=this.options;this.problem=CASES[o.caseId];
  if(!this.problem||!Number.isInteger(o.size)||o.size<4||o.size>200||!Number.isInteger(o.seed)||o.seed<0||o.seed>4294967295||!['OX','PMX'].includes(o.operator)||!Number.isFinite(o.pc)||o.pc<0||o.pc>1||!Number.isFinite(o.pm)||o.pm<0||o.pm>1)throw Error('Parâmetros inválidos.');
  this.random=rng(o.seed);this.generation=1;this.evaluations=0;this.serial=0;
  this.population=Array.from({length:o.size},(_,slot)=>this.evaluate(shuffle(this.random,this.problem.points.length-1),{id:++this.serial,slot}));this.sort();this.history=[{generation:1,cost:this.best.cost,average:this.average}];
 }
 evaluate(route,identity){if(!this.problem.valid(route))throw Error('Permutação inválida.');this.evaluations++;return{route:route.slice(),cost:this.problem.cost(route),...identity};}
 sort(){this.population.sort((a,b)=>a.cost-b.cost);this.best=this.population[0];this.average=this.population.reduce((s,p)=>s+p.cost,0)/this.population.length;}
 get reached(){return Math.abs(this.best.cost-this.problem.EXACT.cost)<EPS;}
 get exhausted(){return this.evaluations+this.options.size>this.options.budget;}
 get done(){return this.reached||this.exhausted;}
 tournament(){const candidates=Array.from({length:3},()=>Math.floor(this.random()*this.population.length));let winner=candidates[0];for(const p of candidates.slice(1))if(this.population[p].cost<this.population[winner].cost)winner=p;return{candidates,winner,parent:this.population[winner]};}
 prepare(){
  if(this.done)return null;
  const n=this.problem.points.length-1,routes=this.population.slice(0,2).map(p=>p.route.slice()),identities=this.population.slice(0,2).map(p=>({id:p.id,slot:p.slot}));
  const used=new Set(identities.map(p=>p.slot)),available=Array.from({length:this.options.size},(_,i)=>i).filter(i=>!used.has(i));let trace=null,nextSerial=this.serial;
  while(routes.length<this.options.size){
   const t1=this.tournament(),t2=this.tournament(),p1=t1.parent.route,p2=t2.parent.route,cross=this.random()<this.options.pc;let a=null,b=null;
   if(cross){a=Math.floor(this.random()*n);b=Math.floor(this.random()*(n-1));if(b>=a)b++;if(a>b)[a,b]=[b,a];}
   const op=this.options.operator==='OX'?ox:pmx,children=cross?[op(p1,p2,a,b),op(p2,p1,a,b)]:[p1.slice(),p2.slice()],before=children.map(r=>r.slice()),mutations=[],childIds=[];
   for(const r of children){let swap=null;if(this.random()<this.options.pm){const i=Math.floor(this.random()*n);let j=Math.floor(this.random()*(n-1));if(j>=i)j++;[r[i],r[j]]=[r[j],r[i]];swap=[i,j];}mutations.push(swap);if(routes.length<this.options.size){routes.push(r);const identity={id:++nextSerial,slot:available.shift()};identities.push(identity);childIds.push(identity.id);}}
   if(!trace)trace={t1,t2,p1:p1.slice(),p2:p2.slice(),a,b,cross,before,after:children.map(r=>r.slice()),mutations,childIds};
  }
  return{routes,identities,serial:nextSerial,trace,generation:this.generation+1};
 }
 commit(pending){if(!pending||this.done)return false;if(pending.generation!==this.generation+1)throw Error('Geração pendente inválida.');this.population=pending.routes.map((r,i)=>this.evaluate(r,pending.identities[i]));this.serial=pending.serial;this.generation++;this.sort();this.history.push({generation:this.generation,cost:this.best.cost,average:this.average});return true;}
 advance(){return this.commit(this.prepare());}
}
const school=CASES.school;
function enumerate(){
 let count=0,best=Infinity,route=null;
 function visit(prefix,remaining){if(!remaining.length){if(prefix[0]>prefix.at(-1))return;count++;const value=school.cost(prefix);if(value<best-EPS){best=value;route=prefix.slice();}return;}
 for(const x of remaining)visit([...prefix,x],remaining.filter(v=>v!==x));}
 visit([],school.points.slice(1).map(p=>p.id));return{route,cost:best,count};
}
const API={CASES,POINTS:school.points,D:school.D,cost:school.cost,valid,rng,shuffle,ox,pmx,heldKarp,enumerate,EXACT:school.EXACT,NEAREST:school.NEAREST,Genetic};
root.RouteLab=API;if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(globalThis);
