/* ROTAS — interface, animação e exploração do Caso 1. */
(async function () {
'use strict';
const $ = id => document.getElementById(id);
const all = q => [...document.querySelectorAll(q)];
const L = window.RouteLab;
const fmt = (n,d=2) => Number(n).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d});
const int = n => fmt(n,0);
const meters = n => `${fmt(n)} <small>m</small>`;
const names = L.POINTS.map(p=>p.name);
const opts = {size:80,pc:.9,pm:.2,operator:'OX',seed:1000,budget:50000};
let engine = new L.Genetic(opts), mode='automatico', routeType='current', playing=false, phase=0, progress=0, pending=null;
let isometric=true, showGrid=true, activeView='experimento', ready=false, scene=null;
const selectedRoute = () => routeType==='exact' ? L.EXACT : routeType==='nearest' ? L.NEAREST : engine.best;
const geneHTML = (route, options={}) => {
  const r=options.base?[0,...route,0]:route;
  return r.map((g,i)=>`${options.arrows&&i?'<span class="gene-arrow" aria-hidden="true">›</span>':''}<span class="gene ${g===0?'base':''} ${options.block&&i>=options.block[0]&&i<=options.block[1]?'block':''} ${options.swap?.includes(i)?'mutated':''}" title="${g} · ${names[g]}" aria-label="${g}, ${names[g]}">${g}</span>`).join('');
};
function setPlaying(value){playing=value;renderButtons();}
function renderButtons(){
  $('play-symbol').textContent=playing?'Ⅱ':'▶';
  $('mobile-play').textContent=playing?'Ⅱ Pausar':routeType!=='current'||engine.done||mode==='didatico'?'▶ Animar':'▶ Iniciar';
  $('play-text').textContent=playing?'Pausar':routeType!=='current'||engine.done||mode==='didatico'?'Animar percurso':engine.generation===1?'Iniciar evolução':'Continuar evolução';
  $('status').className='status'+(engine.reached?' complete':playing?' running':'');
  $('status').textContent=engine.reached?'Ótimo encontrado':engine.exhausted?'Limite atingido':playing?'Em execução':engine.generation===1?'Pronto':'Pausado';
  $('mode-help').textContent=routeType!=='current'?'Você está vendo uma rota de referência. Selecione “Em evolução” para continuar o algoritmo.':mode==='automatico'?'A cada volta, uma nova geração. Pause a qualquer momento para explorar a rota.':'Use “Próxima etapa” para avançar o algoritmo. O botão de animação apenas percorre a rota atual.';
  $('next-step').disabled=engine.done && phase!==4;
  $('next-step').textContent=engine.done&&phase!==4?'Execução concluída':phase===4?'Novo ciclo →':'Próxima etapa →';
}
function renderRoute(){
  const r=selectedRoute();
  $('route-chips').innerHTML=geneHTML(r.route,{base:true,arrows:true});
  $('map-route-cost').innerHTML=meters(r.cost);
  $('route-name').textContent={current:'Melhor rota da geração',nearest:'Referência: vizinho mais próximo',exact:'Referência: ótimo exato'}[routeType];
  all('[data-route]').forEach(b=>{const on=b.dataset.route===routeType;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',on);});
  scene?.drawRoute();renderButtons();
}
function render(){
  $('best-cost').innerHTML=meters(engine.best.cost);
  $('generation').textContent=String(engine.generation).padStart(2,'0');
  $('generation-badge').textContent=String(engine.generation).padStart(2,'0');
  $('evaluations').textContent=`${int(engine.evaluations)} / ${int(engine.options.budget)}`;
  $('elites').innerHTML=engine.population.slice(0,2).map((r,i)=>`<div class="elite"><div class="elite-header"><b>${i===0?'01 · Melhor indivíduo':'02 · Segundo indivíduo'}</b><span>${fmt(r.cost)} m</span></div><div class="gene-row">${geneHTML(r.route)}</div></div>`).join('');
  renderRoute();renderChart();renderStep();
}
function renderChart(){
  const h=engine.history,x0=40,x1=311,y0=12,y1=109;
  const lo=L.EXACT.cost-35,hi=Math.max(h[0].cost,L.EXACT.cost+100)+65;
  const x=g=>x0+(g-1)/Math.max(5,engine.generation-1)*(x1-x0);
  const y=v=>y1-(v-lo)/(hi-lo)*(y1-y0);
  const points=h.map(v=>`${x(v.generation)},${y(v.cost)}`).join(' ');
  const exactY=y(L.EXACT.cost);
  $('chart').innerHTML=[
    ...[lo+(hi-lo)*.25,lo+(hi-lo)*.65,hi].map(v=>`<line x1="${x0}" y1="${y(v)}" x2="${x1}" y2="${y(v)}" stroke="#e4ebf1"/><text x="32" y="${y(v)+3}" text-anchor="end">${int(v)}</text>`),
    `<line x1="${x0}" y1="${exactY}" x2="${x1}" y2="${exactY}" stroke="#147f7c" stroke-dasharray="4 4"/><text x="32" y="${exactY+3}" text-anchor="end">1.085</text>`,
    `<polygon points="${x0},${y1} ${points} ${x(h.at(-1).generation)},${y1}" fill="#2569dc" opacity=".055"/>`,
    `<polyline points="${points}" fill="none" stroke="#2569dc" stroke-width="2.5" stroke-linejoin="round"/>`,
    `<circle cx="${x(h.at(-1).generation)}" cy="${y(h.at(-1).cost)}" r="3.3" fill="#2569dc"/>`,
    `<text x="${x0}" y="128">1</text><text x="${x1}" y="128" text-anchor="end">Geração ${engine.generation}</text>`
  ].join('');
}
function renderStep(){
  all('.step-track span').forEach((e,i)=>{e.classList.toggle('active',i===phase);e.setAttribute('aria-label',`${i+1}: ${['População','Seleção','Cruzamento','Mutação','Renovação'][i]}`);});
  if(phase===0){$('step-detail').innerHTML=`<h3>1 · População avaliada</h3><p>${engine.options.size} rotas estão ordenadas pela distância. As duas elites serão preservadas.</p>`;return;}
  const t=pending?.trace;
  if(!t && phase!==4)return;
  if(phase===1){$('step-detail').innerHTML=`<h3>2 · Seleção por torneio</h3><p>Primeiro acasalamento: dois torneios de três sorteios escolhem os pais. Posições na população: ${t.t1.candidates.map(i=>i+1).join(', ')} e ${t.t2.candidates.map(i=>i+1).join(', ')}.</p><div class="gene-row">${geneHTML(t.p1)}</div><div class="gene-row">${geneHTML(t.p2)}</div>`;}
  if(phase===2){$('step-detail').innerHTML=`<h3>3 · Cruzamento ${engine.options.operator}</h3><p>${t.cross?`Cortes nas posições ${t.a+1} e ${t.b+1}. Abaixo, os dois filhos antes da mutação.`:'O sorteio não ativou o cruzamento neste par. Os pais foram copiados.'}</p>${t.before.map(r=>`<div class="gene-row">${geneHTML(r,{block:t.cross?[t.a,t.b]:null})}</div>`).join('')}`;}
  if(phase===3){$('step-detail').innerHTML=`<h3>4 · Mutação por troca</h3>${t.after.map((r,i)=>`<p>Filho ${i+1}: ${t.mutations[i]?`troca das posições ${t.mutations[i][0]+1} e ${t.mutations[i][1]+1}.`:'sem mutação neste sorteio.'}</p><div class="gene-row">${geneHTML(r,{swap:t.mutations[i]})}</div>`).join('')}`;}
  if(phase===4){$('step-detail').innerHTML=`<h3>5 · Nova geração</h3><p>Os demais acasalamentos completaram a população. As duas elites e os filhos foram avaliados: <strong>geração ${engine.generation}</strong>, com melhor distância de <strong>${fmt(engine.best.cost)} m</strong>.</p>`;}
}
function reset(){engine=new L.Genetic(opts);pending=null;phase=0;progress=0;routeType='current';setPlaying(false);render();scene?.positionActor();}
function commitGeneration(){
  if(engine.done)return false;
  const result=pending?engine.commit(pending):engine.advance();
  pending=null;phase=0;progress=0;render();
  return result;
}
function nextStep(){
  setPlaying(false);routeType='current';progress=0;
  if(phase===4){phase=0;pending=null;render();return;}
  if(engine.done)return;
  if(phase===0){pending=pending||engine.prepare();phase=1;}
  else if(phase<3)phase++;
  else {engine.commit(pending);phase=4;}
  render();
  if(phase===4)pending=null;
}
all('[data-mode]').forEach(b=>b.addEventListener('click',()=>{
  mode=b.dataset.mode;setPlaying(false);
  if(phase===4){phase=0;pending=null;}
  all('[data-mode]').forEach(x=>{const on=x===b;x.classList.toggle('selected',on);x.setAttribute('aria-pressed',on);});
  $('didactic-panel').hidden=mode!=='didatico';renderButtons();renderStep();
}));
all('[data-route]').forEach(b=>b.addEventListener('click',()=>{routeType=b.dataset.route;progress=0;setPlaying(false);renderRoute();scene?.positionActor();}));
$('play').addEventListener('click',()=>{if(ready)setPlaying(!playing);});
$('mobile-play').addEventListener('click',()=>{if(ready)setPlaying(!playing);});
$('reset').addEventListener('click',reset);
$('next-step').addEventListener('click',nextStep);
$('operator').addEventListener('change',()=>{opts.operator=$('operator').value;reset();});
$('apply').addEventListener('click',()=>{
  const seed=Number($('seed').value),pc=Number($('pc').value),pm=Number($('pm').value),size=Number($('population-size').value);
  const valid=$('seed').value!==''&&Number.isInteger(seed)&&seed>=0&&seed<=4294967295&&$('pc').value!==''&&pc>=0&&pc<=1&&$('pm').value!==''&&pm>=0&&pm<=1;
  $('parameter-error').hidden=valid;
  if(!valid){$('parameter-error').textContent='Use uma semente inteira entre 0 e 4.294.967.295 e probabilidades entre 0 e 1.';return;}
  Object.assign(opts,{seed,pc,pm,size});reset();
});
$('map-style').addEventListener('click',()=>{isometric=!isometric;$('map-style').textContent=isometric?'Plano cartesiano':'Campus isométrico';$('map-style').setAttribute('aria-pressed',!isometric);scene?.redraw();});
$('grid-toggle').addEventListener('click',()=>{showGrid=!showGrid;$('grid-toggle').setAttribute('aria-pressed',showGrid);scene?.redraw();});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('fullscreen').title='Tela cheia indisponível neste navegador';}});
function navigate(){
  const target=location.hash.slice(1)||'experimento';
  if(!$(target)?.classList.contains('view'))return;
  if(activeView!==target)setPlaying(false);
  activeView=target;all('.view').forEach(v=>v.hidden=v.id!==target);
  all('nav [data-tab]').forEach(a=>{if(a.dataset.tab===target)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
  if(target==='experimento')requestAnimationFrame(()=>scene?.resize());
}
window.addEventListener('hashchange',navigate);
document.addEventListener('visibilitychange',()=>{if(document.hidden)setPlaying(false);});
document.addEventListener('keydown',e=>{
  if(activeView!=='experimento'||$('population-dialog').open||/INPUT|SELECT|TEXTAREA|BUTTON|SUMMARY|A/.test(e.target.tagName))return;
  if(e.code==='Space'){e.preventDefault();if(ready)setPlaying(!playing);}
  if(e.code==='ArrowRight'&&mode==='didatico'){e.preventDefault();nextStep();}
});
$('population-open').addEventListener('click',()=>{
  setPlaying(false);$('dialog-generation').textContent=engine.generation;
  $('population-list').innerHTML=engine.population.map((p,i)=>`<div class="population-item ${i<2?'elite-item':''}"><span>${i+1}</span><div class="gene-row">${geneHTML(p.route)}</div><strong>${fmt(p.cost)} m</strong></div>`).join('');
  $('population-dialog').showModal();
});
$('population-close').addEventListener('click',()=>$('population-dialog').close());
$('population-dialog').addEventListener('click',e=>{if(e.target===$('population-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
for(const id of ['distance-from','distance-to'])$(id).innerHTML=L.POINTS.map(p=>`<option value="${p.id}">${p.id} · ${p.name}</option>`).join('');
$('distance-to').value=1;
function distance(){const i=Number($('distance-from').value),j=Number($('distance-to').value);$('distance-result').textContent=`${fmt(L.D[i][j])} m`;}
$('distance-from').addEventListener('change',distance);$('distance-to').addEventListener('change',distance);distance();
$('optimal-chromosome').innerHTML=geneHTML([6,5,4,3,7,2,1],{base:true,arrows:true});
const P1=[1,5,4,2,3,7,6],P2=[3,6,2,5,4,7,1],OX=L.ox(P1,P2,1,4),PMX=L.pmx(P1,P2,1,4),mutated=[6,5,4,3,2,7,1];
const exampleRow=(label,r,options={})=>`<div class="example-row"><strong>${label}</strong><div class="gene-row">${geneHTML(r,options)}</div><span>${fmt(L.cost(r))} m</span></div>`;
$('article-example').innerHTML=[['Pai 1',P1],['Pai 2',P2],['Filho OX',OX],['Filho PMX',PMX]].map(([label,r])=>exampleRow(label,r,{block:[1,4]})).join('');
$('article-mutation-result').innerHTML=exampleRow('PMX após troca',mutated,{swap:[3,4]})+'<p class="help">Troca das posições 4 e 5: 1.236,21 m → 1.122,68 m. Ainda acima do ótimo de 1.084,95 m.</p>';
$('article-mutation').addEventListener('click',()=>{const show=$('article-mutation-result').hidden;$('article-mutation-result').hidden=!show;$('article-mutation').setAttribute('aria-expanded',show);$('article-mutation').textContent=show?'Ocultar a mutação':'Mostrar a mutação do filho PMX →';});
$('count-slider').addEventListener('input',()=>{const n=Number($('count-slider').value);let f=1;for(let i=2;i<n;i++)f*=i;$('count-n').textContent=n;$('count-result').textContent=int(f/2);});
$('success-bars').innerHTML=[['01 · Campus escolar',30,30,'8 pontos · distâncias euclidianas'],['02 · Malha urbana',30,18,'12 pontos · distâncias de Manhattan'],['03 · Com obstáculos',12,10,'15 pontos · caminhos livres']].map(([title,ox,pmx,note])=>`<article class="success-card"><h3>${title}</h3>${[['OX',ox],['PMX',pmx]].map(([name,value])=>`<div class="bar-row"><span>${name}</span><div class="bar-track"><div class="bar-fill ${name==='PMX'?'pmx':''}" style="width:${value/30*100}%"></div></div><strong>${value} / 30</strong></div>`).join('')}<p>${note}</p></article>`).join('');
const legend=document.createElement('div');legend.className='point-legend';legend.innerHTML=L.POINTS.map(p=>`<span><b>${p.id}</b>${p.name}</span>`).join('');document.querySelector('.route-summary').after(legend);
render();navigate();

/* Camadas isométricas: cenário CC0, geometria da rota e veículo animado. */
try{
  const host=$('campus');
  const manifest=await fetch('assets/manifest.json').then(r=>{if(!r.ok)throw Error('Manifesto de arte indisponível');return r.json();});
  const pick=(pack,basename)=>{const entry=manifest[pack].find(a=>a.name.endsWith('/'+basename+'.png'));if(!entry)throw Error('Recurso ausente: '+basename);return entry.path;};
  const buildingNames=['buildingTiles_000','buildingTiles_123','buildingTiles_125','buildingTiles_092','buildingTiles_026','buildingTiles_100','buildingTiles_024','buildingTiles_008'];
  const buildingURLs=buildingNames.map(n=>pick('buildings',n));
  const treeURL=pick('city','cityDetails_010'),gardenURL=pick('city','cityTiles_059');
  const vehicleURLs=Array.from({length:16},(_,i)=>pick('vehicles',`carBlue1_${String(i).padStart(3,'0')}`));
  const textures=await PIXI.Assets.load([...new Set([...buildingURLs,treeURL,gardenURL,...vehicleURLs])]);
  const app=new PIXI.Application();
  await app.init({width:host.clientWidth||800,height:host.clientHeight||500,backgroundAlpha:0,antialias:true,resolution:Math.min(devicePixelRatio||1,2),autoDensity:true,preference:'webgl'});
  host.appendChild(app.canvas);
  const world=new PIXI.Container();app.stage.addChild(world);
  const ground=new PIXI.Graphics(),environment=new PIXI.Container(),routeLine=new PIXI.Graphics(),pins=new PIXI.Container(),actorLayer=new PIXI.Container();
  world.addChild(ground,environment,routeLine,pins,actorLayer);
  const shadow=new PIXI.Graphics().ellipse(0,0,14,6).fill({color:0x0a2942,alpha:.16});
  const actor=new PIXI.Sprite(textures[vehicleURLs[0]]);actor.anchor.set(.5,.83);actor.width=40;actor.scale.y=actor.scale.x;
  actorLayer.addChild(shadow,actor);
  let positions=[],scale=1,mobile=false;
  const projection=p=>isometric?{x:425+(p.x-p.y)*43,y:475-(p.x+p.y)*24}:{x:155+p.x*78,y:495-p.y*65};
  const poly=(g,coords,color,alpha=1)=>g.poly(coords.flatMap(p=>[p.x,p.y])).fill({color,alpha});
  function line(g,a,b,color,width=1,alpha=1){g.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({color,width,alpha});}
  function sprite(texture,x,y,width){const s=new PIXI.Sprite(texture);s.anchor.set(.5,1);s.position.set(x,y);s.width=width;s.scale.y=s.scale.x;environment.addChild(s);return s;}
  function text(text,x,y,style={}){const t=new PIXI.Text({text,style:{fontFamily:'DM Sans, sans-serif',fontSize:14,fill:0x395768,fontWeight:'500',...style}});t.anchor.set(.5);t.position.set(x,y);pins.addChild(t);return t;}
  function drawRoute(){
    routeLine.clear();const ids=[0,...selectedRoute().route,0];
    const color=routeType==='exact'?0x147f7c:routeType==='nearest'?0xd48245:0x2569dc;
    routeLine.moveTo(positions[0]?.x||0,positions[0]?.y||0);
    for(const id of ids.slice(1)){const p=positions[id];if(p)routeLine.lineTo(p.x,p.y);}
    routeLine.stroke({color:0xffffff,width:8,alpha:.75,join:'round',cap:'round'});
    routeLine.moveTo(positions[0]?.x||0,positions[0]?.y||0);
    for(const id of ids.slice(1)){const p=positions[id];if(p)routeLine.lineTo(p.x,p.y);}
    routeLine.stroke({color,width:3.5,alpha:.92,join:'round',cap:'round'});
    positionActor();
  }
  function redraw(){
    ground.clear();environment.removeChildren().forEach(c=>c.destroy());pins.removeChildren().forEach(c=>c.destroy());
    positions=L.POINTS.map(projection);
    if(isometric){
      const corners=[{x:-1,y:-1},{x:7,y:-1},{x:7,y:7},{x:-1,y:7}].map(projection);
      poly(ground,corners.map(p=>({x:p.x+5,y:p.y+20})),0x102d41,.06);
      poly(ground,corners.map(p=>({x:p.x,y:p.y+10})),0xb3c6c5);
      poly(ground,corners,0xdce8e3);
      if(showGrid)for(let i=-1;i<=7;i++){
        line(ground,projection({x:i,y:-1}),projection({x:i,y:7}),0xbacdc9,1,.6);
        line(ground,projection({x:-1,y:i}),projection({x:7,y:i}),0xbacdc9,1,.6);
      }
      const decorative=[[-.1,4.8],[.1,5.2],[2.8,6.5],[3.2,6.5],[6.6,2],[6.6,2.5],[-.4,.4],[.4,-.4],[5.7,5.5],[5.9,5.9]];
      const scenery=decorative.map(([x,y])=>({...projection({x,y}),type:'tree'}));
      L.POINTS.forEach(p=>scenery.push({...positions[p.id],type:'building',id:p.id}));
      scenery.sort((a,b)=>a.y-b.y).forEach(p=>{
        if(p.type==='tree'){sprite(textures[treeURL],p.x,p.y-4,20);return;}
        if(p.id===4){
          sprite(textures[gardenURL],p.x-12,p.y-7,79);
          sprite(textures[treeURL],p.x+11,p.y-26,24);
        }else sprite(textures[buildingURLs[p.id]],p.x,p.y-10,p.id===3?104:p.id===0?76:91);
      });
    }else{
      const a=projection({x:0,y:0}),b=projection({x:6.5,y:0}),c=projection({x:0,y:6.5});
      if(showGrid)for(let i=0;i<=6;i++){
        line(ground,projection({x:i,y:0}),projection({x:i,y:6.5}),0xc9dce4,1);
        line(ground,projection({x:0,y:i}),projection({x:6.5,y:i}),0xc9dce4,1);
        text(String(i),projection({x:i,y:0}).x,520,{fontSize:15});
        text(String(i),126,projection({x:0,y:i}).y,{fontSize:15});
      }
      line(ground,a,b,0x829faa,2);line(ground,a,c,0x829faa,2);
      text('x',688,503,{fontSize:18});text('y',155,53,{fontSize:18});
    }
    L.POINTS.forEach(p=>{
      const at=positions[p.id],r=mobile?15:12;
      const dot=new PIXI.Graphics().circle(at.x,at.y,r+2).fill(0xffffff).circle(at.x,at.y,r).fill(p.id===0?0xd97642:0x102d41);
      pins.addChild(dot);text(String(p.id),at.x,at.y,{fill:0xffffff,fontSize:mobile?19:14,fontWeight:'700'});
      if(!mobile){
        const title=`${p.name}`,label=text(title,at.x,at.y+30,{fontSize:14});
        const box=new PIXI.Graphics().roundRect(at.x-label.width/2-8,at.y+19,label.width+16,23,5).fill({color:0xffffff,alpha:.93});
        pins.addChildAt(box,pins.getChildIndex(label));
      }
      dot.eventMode='static';dot.cursor='pointer';dot.on('pointertap',()=>{$('distance-from').value=p.id;distance();});
    });
    drawRoute();
  }
  function positionActor(){
    if(!positions.length)return;
    const ids=[0,...selectedRoute().route,0],lengths=[];let total=0;
    for(let i=0;i<8;i++){const len=L.D[ids[i]][ids[i+1]];lengths.push(len);total+=len;}
    let distance=progress*total,segment=0;
    while(segment<7&&distance>lengths[segment]){distance-=lengths[segment];segment++;}
    const t=lengths[segment]?distance/lengths[segment]:0;
    const a=positions[ids[segment]],b=positions[ids[segment+1]];
    const x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
    actor.position.set(x,y-4);shadow.position.set(x,y+2);
    const angle=Math.atan2(b.y-a.y,b.x-a.x);
    // 16 vistas do mesmo veículo; escolher a direção do deslocamento.
    const direction=((Math.round(angle/(Math.PI/4))%8)+8)%8;
    const indices=[6,0,2,1,8,9,11,5];
    actor.texture=textures[vehicleURLs[indices[direction]]];actor.width=40;actor.scale.y=actor.scale.x;
  }
  function resize(){
    if(host.clientWidth===0)return;
    const w=host.clientWidth,h=host.clientHeight;
    app.renderer.resize(w,h);scale=Math.min(w/850,h/570);mobile=w<580;
    world.scale.set(scale);world.position.set((w-850*scale)/2,(h-570*scale)/2+(mobile?-10:0));
    redraw();
  }
  scene={drawRoute,redraw,resize,positionActor};resize();
  new ResizeObserver(resize).observe(host);
  let last=performance.now();
  app.ticker.add(()=>{
    const now=performance.now(),dt=Math.min((now-last)/1000,.08);last=now;
    if(!playing||activeView!=='experimento')return;
    progress+=dt*Number($('speed').value)/8;
    if(progress>=1){
      progress=0;
      if(mode==='automatico'&&routeType==='current'&&!engine.done)commitGeneration();
      else if(mode==='automatico'||routeType!=='current')setPlaying(false);
    }
    positionActor();
  });
  ready=true;$('map-loading').hidden=true;$('mobile-play').disabled=false;
}catch(error){
  console.error('Falha ao carregar mapa:',error);
  $('map-loading').innerHTML='<div style="max-width:280px;padding:20px">Não foi possível carregar o cenário neste navegador. As rotas e os cálculos continuam disponíveis. <button class="secondary" onclick="location.reload()">Tentar novamente</button></div>';
  // A leitura e o modo didático permanecem funcionais mesmo sem WebGL.
  $('play').disabled=true;
}
window.__ROUTE_APP__={get engine(){return engine;},get playing(){return playing;},get progress(){return progress;},get ready(){return ready;},get phase(){return phase;},get mode(){return mode;},get routeType(){return routeType;},get pending(){return pending;}};
})();
