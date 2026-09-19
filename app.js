/* ROTAS — três experimentos, uma população visível e dois modos sincronizados. */
(async function(){
'use strict';
const $=id=>document.getElementById(id),all=q=>[...document.querySelectorAll(q)],L=RouteLab;
const fmt=(n,d=2)=>Number(n).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d}),int=n=>fmt(n,0),meters=n=>`${fmt(n)} <small>m</small>`;
const palette=['#2369dd','#cc4b62','#078779','#aa6b12','#884fc1','#087aab','#b94c22','#68781a','#b33f99','#42516a'];
const opts={size:10,pc:.9,pm:.2,operator:'OX',seed:1000,budget:50000,caseId:'school'};
let engine=new L.Genetic(opts),mode='automatico',routeType='current',playing=false,phase=0,progress=0,pending=null;
let isometric=true,showGrid=true,allTrails=true,activeView='experimento',ready=false,scene=null,selectedId=engine.best.id;
const problem=()=>engine.problem;
const visiblePopulation=()=>engine.population.slice(0,10).sort((a,b)=>a.slot-b.slot);
const selectedRoute=()=>routeType==='exact'?problem().EXACT:routeType==='nearest'?problem().NEAREST:engine.population.find(p=>p.id===selectedId)||engine.best;
const robotPalette=['#59adff','#f4798e','#53cfb1','#ffc96a','#bb95f2','#57d0e8','#ffad79','#c5da73','#ee91d4','#abc8dc'];
const color=p=>(problem().id==='robot'?robotPalette:palette)[visiblePopulation().findIndex(a=>a.id===p.id)%10]||palette[0];
const state=()=>({problem:problem(),population:visiblePopulation(),selected:selectedRoute(),routeType,progress,playing,isometric,showGrid,allTrails,palette,color});
const geneHTML=(route,options={})=>{
 const r=options.base?[0,...route,0]:route,names=(options.school?L.CASES.school:problem()).names;
 return r.map((g,i)=>`${options.arrows&&i?'<span class="gene-arrow" aria-hidden="true">›</span>':''}<span class="gene ${g===0?'base':''} ${options.block&&i>=options.block[0]&&i<=options.block[1]?'block':''} ${options.swap?.includes(i)?'mutated':''}" title="${g} · ${names[g]}" aria-label="${g}, ${names[g]}">${g}</span>`).join('');
};
function setPlaying(value){playing=value;renderButtons();}
function renderButtons(){
 $('play-symbol').textContent=playing?'Ⅱ':'▶';
 $('mobile-play').textContent=playing?'Ⅱ Pausar':routeType!=='current'||engine.done||mode==='didatico'?'▶ Animar':'▶ Iniciar';
 $('play-text').textContent=playing?'Pausar':routeType!=='current'||engine.done||mode==='didatico'?'Animar percursos':engine.generation===1&&progress===0?'Iniciar evolução':'Continuar evolução';
 $('status').className='status'+(engine.reached?' complete':playing?' running':'');
 $('status').textContent=engine.reached?'Ótimo encontrado':engine.exhausted?'Limite atingido':playing?'Em execução':engine.generation===1&&progress===0?'Pronto':'Pausado';
 $('mode-help').textContent=routeType!=='current'?'Uma rota de referência está em exibição. Volte a “Em evolução” para acompanhar a população.':mode==='automatico'?'Todos saem juntos. Ao terminarem os percursos, a próxima geração começa automaticamente.':'Anime a população e use “Próxima etapa” para explicar a geração seguinte. Depois, continue no automático.';
 $('next-step').disabled=engine.done&&phase!==4;
 $('next-step').textContent=engine.done&&phase!==4?'Execução concluída':phase===4?'Novo ciclo →':'Próxima etapa →';
}
function renderRoute(){
 const r=selectedRoute();
 $('route-chips').innerHTML=geneHTML(r.route,{base:true,arrows:true});$('map-route-cost').innerHTML=meters(r.cost);
 $('route-name').textContent=routeType==='current'?`Indivíduo ${r.id}${r.id===engine.best.id?' · melhor rota':''}`:routeType==='exact'?'Referência: ótimo exato':'Referência: vizinho mais próximo';
 all('[data-route]').forEach(b=>{const on=b.dataset.route===routeType;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',on);});
 $('fleet').classList.toggle('reference-view',routeType!=='current');
 all('.agent-card').forEach(b=>{const on=routeType==='current'&&+b.dataset.agent===r.id;b.classList.toggle('selected',on);b.setAttribute('aria-pressed',on);});
 scene?.drawRoute();renderButtons();updateFleet();
}
function renderFleet(){
 const p=problem(),rows=visiblePopulation(),noun={school:'estudantes',city:'veículos',robot:'robôs'}[p.id];
 $('fleet-title').textContent=`${rows.length} ${noun} · ${engine.options.size===10?'10 soluções':`de ${engine.options.size} soluções`}`;
 $('fleet').innerHTML=rows.map((r,i)=>`<button class="agent-card" data-agent="${r.id}" style="--agent:${color(r)}" aria-pressed="${r.id===selectedId}" aria-label="Indivíduo ${r.id}, ${fmt(r.cost)} metros"><div class="agent-card-top"><span class="agent-portrait ${p.id}" ${p.id==='school'?`style="background-position:0 -${i*48}px"`:''}>${p.id==='robot'?'<img src="media/robot.png" alt="">':''}</span><b>${String(r.id).padStart(2,'0')}</b>${engine.population.indexOf(r)<2?'<span class="elite-star" title="Elite">★</span>':''}</div><strong>${fmt(r.cost,p.id==='robot'?1:0)} <small>m</small></strong><span class="agent-state">Na base</span><span class="agent-progress"><i></i></span></button>`).join('');
 all('[data-agent]').forEach(b=>b.addEventListener('click',()=>{selectedId=+b.dataset.agent;routeType='current';renderRoute();}));
}
function updateFleet(){
 const rows=visiblePopulation(),max=Math.max(...rows.map(r=>r.cost));let finished=0;
 all('.agent-card').forEach((el,i)=>{const p=rows[i],ratio=Math.min(1,progress*max/p.cost);if(ratio>=1)finished++;
 el.querySelector('.agent-progress i').style.width=`${ratio*100}%`;
 el.querySelector('.agent-state').textContent=routeType!=='current'?'Aguardando':ratio===0?'Na base':ratio>=1?'Retornou':`${int(ratio*100)}% da rota`;
 });
 $('fleet-progress').textContent=routeType!=='current'?'Referência · 1 percurso':progress===0?`Partida comum: ${problem().names[0]}`:`${finished} / ${rows.length} retornaram à base`;
}
function render(){
 if(!visiblePopulation().some(r=>r.id===selectedId))selectedId=engine.best.id;
 $('best-cost').innerHTML=meters(engine.best.cost);$('generation').textContent=String(engine.generation).padStart(2,'0');$('generation-badge').textContent=String(engine.generation).padStart(2,'0');
 $('evaluations').textContent=`${int(engine.evaluations)} / ${int(engine.options.budget)}`;
 $('elites').innerHTML=engine.population.slice(0,2).map((r,i)=>`<div class="elite"><div class="elite-header"><b>${i===0?'1ª':'2ª'} elite · indivíduo ${r.id}</b><span>${fmt(r.cost)} m</span></div><div class="gene-row">${geneHTML(r.route)}</div></div>`).join('');
 renderFleet();renderRoute();renderChart();renderStep();
}
function renderChart(){
 const h=engine.history,x0=43,x1=311,y0=12,y1=109,exact=problem().EXACT.cost;
 const pad=Math.max(1,(h[0].cost-exact)*.12),lo=exact-pad,hi=h[0].cost+pad;
 const x=g=>x0+(g-1)/Math.max(5,engine.generation-1)*(x1-x0),y=v=>y1-(v-lo)/(hi-lo)*(y1-y0),points=h.map(v=>`${x(v.generation)},${y(v.cost)}`).join(' '),exactY=y(exact);
 $('chart').innerHTML=[...[.35,.7,1].map(v=>{const n=lo+(hi-lo)*v;return `<line x1="${x0}" y1="${y(n)}" x2="${x1}" y2="${y(n)}" stroke="#e4ebf1"/><text x="35" y="${y(n)+3}" text-anchor="end">${int(n)}</text>`;}),`<line x1="${x0}" y1="${exactY}" x2="${x1}" y2="${exactY}" stroke="#147f7c" stroke-dasharray="4 4"/><text x="35" y="${exactY+3}" text-anchor="end">${int(exact)}</text>`,`<polygon points="${x0},${y1} ${points} ${x(h.at(-1).generation)},${y1}" fill="#2569dc" opacity=".055"/>`,`<polyline points="${points}" fill="none" stroke="#2569dc" stroke-width="2.5" stroke-linejoin="round"/>`,`<circle cx="${x(h.at(-1).generation)}" cy="${y(h.at(-1).cost)}" r="3.3" fill="#2569dc"/>`,`<text x="${x0}" y="128">1</text><text x="${x1}" y="128" text-anchor="end">Geração ${engine.generation}</text>`].join('');
 $('chart').setAttribute('aria-label',`Melhor distância por geração: começou em ${fmt(h[0].cost)} metros e está em ${fmt(engine.best.cost)}. Ótimo: ${fmt(exact)} metros.`);
}
function renderStep(){
 all('.step-track span').forEach((e,i)=>{e.classList.toggle('active',i===phase);e.setAttribute('aria-label',`${i+1}: ${['População','Seleção','Cruzamento','Mutação','Renovação'][i]}`);});
 if(phase===0){$('step-detail').innerHTML=`<h3>1 · População avaliada</h3><p>${engine.options.size} rotas, cada uma com ${problem().points.length-1} visitas e retorno à base. As elites ${engine.population.slice(0,2).map(p=>p.id).join(' e ')} serão preservadas.</p>`;return;}
 const t=pending?.trace;if(!t&&phase!==4)return;
 if(phase===1){$('step-detail').innerHTML=`<h3>2 · Seleção por torneio</h3><p>Dois torneios escolhem os pais do primeiro par. Ganha a menor distância, com sorteios que podem repetir um indivíduo.</p>${[t.t1,t.t2].map((v,i)=>`<p><b>Torneio ${i+1}:</b> ${v.candidates.map(j=>`#${engine.population[j].id} (${fmt(engine.population[j].cost)} m)`).join(' · ')}<br>Vencedor: <strong>#${v.parent.id}</strong></p><div class="gene-row">${geneHTML(v.parent.route)}</div>`).join('')}`;}
 if(phase===2){$('step-detail').innerHTML=`<h3>3 · Cruzamento ${engine.options.operator}</h3><p>${t.cross?`Cortes nas posições ${t.a+1} e ${t.b+1}. Estes são os filhos antes da mutação.`:'O sorteio não ativou o cruzamento. Os pais foram copiados.'}</p>${t.before.map((r,i)=>`<p>Filho #${t.childIds[i]} · ${fmt(problem().cost(r))} m</p><div class="gene-row">${geneHTML(r,{block:t.cross?[t.a,t.b]:null})}</div>`).join('')}`;}
 if(phase===3){$('step-detail').innerHTML=`<h3>4 · Mutação por troca</h3>${t.after.map((r,i)=>`<p>Filho #${t.childIds[i]}: ${t.mutations[i]?`posições ${t.mutations[i][0]+1} ↔ ${t.mutations[i][1]+1}.`:'sem mutação.'}<br>${fmt(problem().cost(t.before[i]))} → <strong>${fmt(problem().cost(r))} m</strong></p><div class="gene-row">${geneHTML(r,{swap:t.mutations[i]})}</div>`).join('')}`;}
 if(phase===4){$('step-detail').innerHTML=`<h3>5 · Nova geração</h3><p>As duas elites e os novos filhos formam a <strong>geração ${engine.generation}</strong>. Melhor distância: <strong>${fmt(engine.best.cost)} m</strong>. Os identificadores das elites foram mantidos.</p><p>Você pode continuar em <strong>Automático</strong> a partir daqui.</p>`;}
}
function reset(){engine=new L.Genetic(opts);selectedId=engine.best.id;pending=null;phase=0;progress=0;routeType='current';setPlaying(false);render();}
function commitGeneration(){if(engine.done)return false;const result=pending?engine.commit(pending):engine.advance();pending=null;phase=0;progress=0;selectedId=engine.best.id;render();return result;}
function nextStep(){
 setPlaying(false);routeType='current';progress=0;
 if(phase===4){phase=0;pending=null;render();return;}
 if(engine.done)return;
 if(phase===0){pending=pending||engine.prepare();phase=1;}else if(phase<3)phase++;else{engine.commit(pending);phase=4;selectedId=engine.best.id;}
 render();if(phase===4)pending=null;
}
function configureCase(){
 const p=problem();$('experimento').dataset.case=p.id;
 $('case-eyebrow').textContent=`CASO ${p.number} / ${p.title.toUpperCase()}`;$('case-title').textContent=p.subtitle;$('case-description').textContent=p.description;
 $('map-scale').textContent=`1 ${p.id==='robot'?'passo':'unidade'} = ${fmt(p.scale,p.scale<1?1:0)} m`;
 $('map-key').textContent=p.id==='robot'?'■ 125 células bloqueadas':`● ${p.names[0]} · partida e chegada`;
 $('map-caption').textContent={school:'Campus hipotético · distâncias euclidianas · sem obstáculos',city:'Bairro hipotético · distância de Manhattan · escala de 120 m',robot:'Grade 31 × 21 · busca em largura · 0,5 m por passo'}[p.id];
 $('art-caption').textContent=p.id==='school'?'Arte: Kenney + FLAG':'Arte: Kenney';
 $('distance-help').textContent={school:'Distância em linha reta entre as coordenadas, multiplicada por 50 m.',city:'Distância horizontal + vertical, multiplicada por 120 m.',robot:'Menor caminho livre na grade. Cada passo mede 0,5 m.'}[p.id];
 $('campus').setAttribute('aria-label',`Mapa de ${p.title}, ${p.points.length} pontos e dez indivíduos. Percursos e custos disponíveis em texto abaixo.`);
 $('map-style').hidden=p.id==='robot';updateStyleLabel();
 all('.case-picker [data-case]').forEach(b=>{const on=b.dataset.case===p.id;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on);});
 for(const id of ['distance-from','distance-to'])$(id).innerHTML=p.points.map(a=>`<option value="${a.id}">${a.id} · ${a.name}</option>`).join('');$('distance-to').value=1;distance();
 document.querySelector('.point-legend').innerHTML=p.points.map(a=>`<span><b>${a.id}</b>${a.name}</span>`).join('');
}
function switchCase(id){if(id===opts.caseId)return;opts.caseId=id;opts.size=10;$('population-size').value='10';isometric=id!=='robot';reset();configureCase();scene?.redraw();}
function updateStyleLabel(){$('map-style').textContent=isometric?'Plano cartesiano':problem().id==='school'?'Campus isométrico':'Bairro isométrico';$('map-style').setAttribute('aria-pressed',!isometric);}
function distance(){const i=+$('distance-from').value,j=+$('distance-to').value;$('distance-result').textContent=`${fmt(problem().D[i][j])} m`;}
all('.case-picker [data-case]').forEach(b=>b.addEventListener('click',()=>switchCase(b.dataset.case)));
all('[data-open-case]').forEach(b=>b.addEventListener('click',()=>switchCase(b.dataset.openCase)));
all('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;setPlaying(false);if(phase===4){phase=0;pending=null;}all('[data-mode]').forEach(x=>{const on=x===b;x.classList.toggle('selected',on);x.setAttribute('aria-pressed',on);});$('didactic-panel').hidden=mode!=='didatico';renderButtons();renderStep();}));
all('[data-route]').forEach(b=>b.addEventListener('click',()=>{routeType=b.dataset.route;progress=0;setPlaying(false);renderRoute();}));
function togglePlay(){if(ready){if(progress>=1)progress=0;setPlaying(!playing);}}
$('play').addEventListener('click',togglePlay);$('mobile-play').addEventListener('click',togglePlay);$('reset').addEventListener('click',reset);$('next-step').addEventListener('click',nextStep);
$('operator').addEventListener('change',()=>{opts.operator=$('operator').value;reset();});
$('apply').addEventListener('click',()=>{
 const seed=+$('seed').value,pc=+$('pc').value,pm=+$('pm').value,size=+$('population-size').value;
 const valid=$('seed').value!==''&&Number.isInteger(seed)&&seed>=0&&seed<=4294967295&&$('pc').value!==''&&Number.isFinite(pc)&&pc>=0&&pc<=1&&$('pm').value!==''&&Number.isFinite(pm)&&pm>=0&&pm<=1;
 $('parameter-error').hidden=valid;if(!valid){$('parameter-error').textContent='Use uma semente inteira entre 0 e 4.294.967.295 e probabilidades entre 0 e 1.';return;}Object.assign(opts,{seed,pc,pm,size});reset();
});
$('map-style').addEventListener('click',()=>{isometric=!isometric;updateStyleLabel();scene?.redraw();});
$('grid-toggle').addEventListener('click',()=>{showGrid=!showGrid;$('grid-toggle').setAttribute('aria-pressed',showGrid);scene?.redraw();});
$('all-trails').addEventListener('change',()=>{allTrails=$('all-trails').checked;scene?.drawRoute();});
$('fullscreen').addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('fullscreen').title='Tela cheia indisponível neste navegador';}});
document.addEventListener('fullscreenchange',()=>{$('fullscreen').setAttribute('aria-label',document.fullscreenElement?'Sair da tela cheia':'Entrar em tela cheia');});
function navigate(){const target=location.hash.slice(1)||'experimento';if(!$(target)?.classList.contains('view'))return;if(activeView!==target)setPlaying(false);activeView=target;all('.view').forEach(v=>v.hidden=v.id!==target);all('nav [data-tab]').forEach(a=>{if(a.dataset.tab===target)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});if(target==='experimento')requestAnimationFrame(()=>scene?.resize());}
window.addEventListener('hashchange',navigate);document.addEventListener('visibilitychange',()=>{if(document.hidden)setPlaying(false);});
document.addEventListener('keydown',e=>{if(activeView!=='experimento'||$('population-dialog').open||/INPUT|SELECT|TEXTAREA|BUTTON|SUMMARY|A/.test(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();togglePlay();}if(e.code==='ArrowRight'&&mode==='didatico'){e.preventDefault();nextStep();}});
$('population-open').addEventListener('click',()=>{setPlaying(false);$('dialog-generation').textContent=engine.generation;$('population-list').innerHTML=engine.population.map((p,i)=>`<div class="population-item ${i<2?'elite-item':''}"><span>#${p.id}</span><div class="gene-row">${geneHTML(p.route)}</div><strong>${fmt(p.cost)} m</strong></div>`).join('');$('population-dialog').showModal();});
$('population-close').addEventListener('click',()=>$('population-dialog').close());
$('population-dialog').addEventListener('click',e=>{if(e.target===$('population-dialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
$('distance-from').addEventListener('change',distance);$('distance-to').addEventListener('change',distance);
$('optimal-chromosome').innerHTML=geneHTML([6,5,4,3,7,2,1],{base:true,arrows:true});
const P1=[1,5,4,2,3,7,6],P2=[3,6,2,5,4,7,1],OX=L.ox(P1,P2,1,4),PMX=L.pmx(P1,P2,1,4),mutated=[6,5,4,3,2,7,1];
const exampleRow=(label,r,options={})=>`<div class="example-row"><strong>${label}</strong><div class="gene-row">${geneHTML(r,options)}</div><span>${fmt(L.cost(r))} m</span></div>`;
$('article-example').innerHTML=[['Pai 1',P1],['Pai 2',P2],['Filho OX',OX],['Filho PMX',PMX]].map(([label,r])=>exampleRow(label,r,{block:[1,4]})).join('');
$('article-mutation-result').innerHTML=exampleRow('PMX após troca',mutated,{swap:[3,4]})+'<p class="help">Troca das posições 4 e 5: 1.236,21 m → 1.122,68 m. Ainda acima do ótimo de 1.084,95 m.</p>';
$('article-mutation').addEventListener('click',()=>{const show=$('article-mutation-result').hidden;$('article-mutation-result').hidden=!show;$('article-mutation').setAttribute('aria-expanded',show);$('article-mutation').textContent=show?'Ocultar a mutação':'Mostrar a mutação do filho PMX →';});
$('count-slider').addEventListener('input',()=>{const n=Number($('count-slider').value);let f=1;for(let i=2;i<n;i++)f*=i;$('count-n').textContent=n;$('count-result').textContent=int(f/2);});
$('success-bars').innerHTML=[['01 · Campus escolar',30,30,'8 pontos · distâncias euclidianas'],['02 · Malha urbana',30,18,'12 pontos · distâncias de Manhattan'],['03 · Com obstáculos',12,10,'15 pontos · caminhos livres']].map(([title,ox,pmx,note])=>`<article class="success-card"><h3>${title}</h3>${[['OX',ox],['PMX',pmx]].map(([name,value])=>`<div class="bar-row"><span>${name}</span><div class="bar-track"><div class="bar-fill ${name==='PMX'?'pmx':''}" style="width:${value/30*100}%"></div></div><strong>${value} / 30</strong></div>`).join('')}<p>${note}</p></article>`).join('');
const legend=document.createElement('div');legend.className='point-legend';document.querySelector('.route-summary').after(legend);
configureCase();render();navigate();
try{
 let uiClock=0;
 scene=await createRouteScene($('campus'),state,dt=>{
  if(!playing||activeView!=='experimento')return;
  progress=Math.min(1,progress+dt*Number($('speed').value)/12);
  if(progress>=1){if(mode==='automatico'&&routeType==='current'&&!engine.done)commitGeneration();else{setPlaying(false);updateFleet();}}
  uiClock+=dt;if(uiClock>.1){uiClock=0;updateFleet();}
 },id=>{$('distance-from').value=id;distance();});
 scene.resize();ready=true;$('map-loading').hidden=true;$('mobile-play').disabled=false;
}catch(error){console.error('Falha ao carregar mapa:',error);$('map-loading').innerHTML='<div style="max-width:300px;padding:20px">Não foi possível carregar a animação. <button class="secondary" onclick="location.reload()">Tentar novamente</button></div>';$('play').disabled=true;}
window.__ROUTE_APP__={get engine(){return engine;},get playing(){return playing;},get progress(){return progress;},get ready(){return ready;},get phase(){return phase;},get mode(){return mode;},get routeType(){return routeType;},get pending(){return pending;},get scene(){return scene?.diagnostics();},get caseId(){return opts.caseId;}};
})();
