/* Independent references and invariants for all three experiments. */
const assert=require('node:assert/strict'),A=require('./engine.js');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const enumeration=A.enumerate();assert.equal(enumeration.count,2520);close(enumeration.cost,1084.945435870697);
const references={school:[1084.945435870697,1143.5859274169068],city:[5520,5760],robot:[56,68]};
for(const [caseId,p]of Object.entries(A.CASES)){
 close(p.EXACT.cost,references[caseId][0]);close(p.NEAREST.cost,references[caseId][1]);assert(p.valid(p.EXACT.route));
 for(let i=0;i<p.points.length;i++)for(let j=0;j<p.points.length;j++){
  close(p.D[i][j],p.D[j][i]);if(i===j)close(p.D[i][j],0);
  if(caseId==='city')close(p.D[i][j],120*(Math.abs(p.points[i].x-p.points[j].x)+Math.abs(p.points[i].y-p.points[j].y)));
  if(caseId==='robot'){const path=p.paths[i][j];for(const q of path)assert(p.legal([q.x,q.y]));for(let k=1;k<path.length;k++)assert.equal(Math.abs(path[k].x-path[k-1].x)+Math.abs(path[k].y-path[k-1].y),1);close(p.D[i][j],(path.length-1)*.5);}
 }
 for(const operator of ['OX','PMX']){
  const g=new A.Genetic({caseId,operator}),again=new A.Genetic({caseId,operator});
  assert.equal(g.population.length,10);assert.equal(new Set(g.population.map(p=>p.id)).size,10);assert.equal(new Set(g.population.map(p=>p.slot)).size,10);assert.equal(g.evaluations,10);
  assert(!g.reached,'No optimum pre-inserted into initial population');
  let previous=g.best.cost;
  while(!g.done){const elites=g.population.slice(0,2).map(p=>({...p})),pending=g.prepare(),before=g.evaluations;assert.equal(g.evaluations,before);g.commit(pending);again.advance();
   assert(g.best.cost<=previous+1e-8);previous=g.best.cost;
   for(const elite of elites)assert.deepEqual(g.population.find(p=>p.id===elite.id),elite);
   assert.equal(new Set(g.population.map(p=>p.id)).size,10);assert.equal(new Set(g.population.map(p=>p.slot)).size,10);
   for(const p2 of g.population){assert(p.valid(p2.route));close(p2.cost,p.geometry(p2.route).cost);}
  }
  assert(g.evaluations<=50000);assert.deepEqual(g.population,again.population);assert.deepEqual(g.history,again.history);
  console.log(caseId,operator,'generations',g.generation,'best',g.best.cost,'evaluations',g.evaluations);
 }
 const random=A.rng(49),n=p.points.length-1;
 for(let i=0;i<50;i++){const p1=A.shuffle(random,n),p2=A.shuffle(random,n);for(let a=0;a<n-1;a++)for(let b=a+1;b<n;b++){assert(p.valid(A.ox(p1,p2,a,b)));assert(p.valid(A.pmx(p1,p2,a,b)));}}
}
assert.equal(A.CASES.robot.blocked.size,125);close(A.CASES.robot.D[0][1],3);close(A.CASES.robot.D[10][8],10.5);
const p=[1,5,4,2,3,7,6],q=[3,6,2,5,4,7,1];assert.deepEqual(A.ox(p,q,1,4),[1,5,4,2,3,6,7]);assert.deepEqual(A.pmx(p,q,1,4),[6,5,4,2,3,7,1]);
for(const options of [{size:0},{seed:-1},{seed:1.5},{pc:NaN},{pm:1.1},{caseId:'missing'}])assert.throws(()=>new A.Genetic(options));
console.log('PASS: exact solutions, nearest neighbors, BFS obstacles, route geometry, permutations, initial ten, elitism, identity, reproducibility and budgets.');
