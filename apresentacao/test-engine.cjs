const assert=require("node:assert/strict");
const A=require("./engine.js");
assert.equal(A.EXACT.count,2520);
assert.ok(Math.abs(A.EXACT.cost-1084.945435870697)<1e-8);
assert.deepEqual(A.NEAREST.route,[1,6,5,4,3,7,2]);
assert.ok(Math.abs(A.NEAREST.cost-1143.5859274169068)<1e-8);
const p=[1,5,4,2,3,7,6],q=[3,6,2,5,4,7,1];
assert.deepEqual(A.ox(p,q,1,4),[1,5,4,2,3,6,7]);
assert.deepEqual(A.pmx(p,q,1,4),[6,5,4,2,3,7,1]);
const random=A.rng(49);
for(let i=0;i<100;i++){const p=A.shuffle(random),q=A.shuffle(random);for(let a=0;a<6;a++)for(let b=a+1;b<7;b++){assert.ok(A.valid(A.ox(p,q,a,b)));assert.ok(A.valid(A.pmx(p,q,a,b)));}}
for(const operator of ["OX","PMX"]){let g=new A.Genetic({operator,seed:1000}),previous=g.best.cost;
while(!g.done){g.advance();assert.ok(g.best.cost<=previous+1e-8);previous=g.best.cost;}assert.ok(g.reached);assert.ok(g.evaluations<=50000);
const again=new A.Genetic({operator,seed:1000});while(!again.done)again.advance();assert.deepEqual(g.history,again.history);}
console.log("Dados, exemplos do artigo, permutações, elitismo e reprodutibilidade verificados.");
