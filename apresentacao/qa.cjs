/* Browser integration checks for the experiment and responsive presentation. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require(require.resolve('playwright',{paths:[process.cwd(),process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES].filter(Boolean)}));
const root=path.resolve('dist');
const types={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.jpg':'image/jpeg','.txt':'text/plain'};
const server=http.createServer((req,res)=>{const pathname=decodeURIComponent(req.url.split('?')[0]);const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory()){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);});
async function run(){
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const url=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1080},deviceScaleFactor:1});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 fs.mkdirSync(path.join(root,'qa'),{recursive:true});
 try {
  await page.goto(url,{waitUntil:'load'});
  await page.waitForFunction(()=>window.__ROUTE_APP__?.ready,{},{timeout:25000});
  const inspect=()=>page.evaluate(()=>{const a=window.__ROUTE_APP__;return{generation:a.engine.generation,evaluations:a.engine.evaluations,progress:a.progress,playing:a.playing,phase:a.phase,scene:a.scene};});
  for(const [caseId,exact,nearest,n]of [['school','1.084,95','1.143,59',8],['city','5.520,00','5.760,00',12],['robot','56,00','68,00',15]]){
   await page.click(`.case-picker [data-case="${caseId}"]`);await page.click('#reset');await page.selectOption('#operator','OX');await page.click('[data-mode="automatico"]');
   const initial=await inspect();assert.equal(initial.evaluations,10);assert.equal(initial.scene.actors.length,10);
   const base=await page.evaluate(()=>window.__ROUTE_APP__.engine.problem.points[0]);
   assert(initial.scene.actors.every(a=>a.x===base.x&&a.y===base.y&&a.distance===0),'All ten must start at the exact common base');
   assert.equal(await page.locator('.agent-card').count(),10);assert.equal(await page.locator('#elites .elite').count(),2);assert.equal(await page.locator('#route-chips .gene').count(),n+1);
   await page.selectOption('#speed','2');await page.click('#play');
   await page.waitForFunction(()=>window.__ROUTE_APP__.progress>.2);
   await page.click('#play');const paused=await inspect();
   assert(paused.scene.actors.every(a=>a.distance>0),'Each individual must move');
   assert(new Set(paused.scene.actors.map(a=>a.x.toFixed(2)+','+a.y.toFixed(2))).size>=2,'Different routes must produce different positions');
   await page.waitForTimeout(250);assert.deepEqual(await inspect(),paused,'Pause freezes distances and generations');
   await page.screenshot({path:path.join(root,'qa',caseId+'-desktop.jpg'),quality:88,fullPage:true});
   await page.locator('.agent-card').first().click();assert(await page.locator('.agent-card').first().getAttribute('aria-pressed')==='true');
   await page.uncheck('#all-trails');assert.equal((await inspect()).scene.allTrails,false);await page.check('#all-trails');
   await page.click('#grid-toggle');assert.equal((await inspect()).scene.grid,false);await page.click('#grid-toggle');
   if(caseId!=='robot'){await page.click('#map-style');assert.equal((await inspect()).scene.projection,'plan');await page.screenshot({path:path.join(root,'qa',caseId+'-plan.jpg'),quality:85,fullPage:true});await page.click('#map-style');}
   await page.click('[data-route="exact"]');assert((await page.locator('#map-route-cost').innerText()).includes(exact));assert.equal((await inspect()).scene.actors.length,1);
   await page.click('[data-route="nearest"]');assert((await page.locator('#map-route-cost').innerText()).includes(nearest));
   await page.click('#play');await page.waitForFunction(()=>window.__ROUTE_APP__.progress>.03);await page.click('#play');assert.equal((await inspect()).generation,1,'Reference animation never advances GA');
   await page.selectOption('#distance-from',caseId==='robot'?'10':'0');await page.selectOption('#distance-to',caseId==='robot'?'8':'1');
   const distance=await page.locator('#distance-result').innerText();assert.equal(distance,{school:'111,80 m',city:'720,00 m',robot:'10,50 m'}[caseId]);
   await page.click('#reset');await page.click('[data-mode="didatico"]');
   for(let i=1;i<=3;i++){await page.click('#next-step');assert.equal((await inspect()).generation,1);assert.equal((await inspect()).phase,i);}
   const expected=await page.evaluate(()=>window.__ROUTE_APP__.pending.routes.map(r=>r.join(',')).sort());
   // Switching modes preserves the exact pending generation and random draws.
   await page.click('[data-mode="automatico"]');await page.selectOption('#speed','8');await page.click('#play');await page.waitForFunction(()=>window.__ROUTE_APP__.engine.generation===2);await page.click('#play');
   assert.deepEqual(await page.evaluate(()=>window.__ROUTE_APP__.engine.population.map(p=>p.route.join(',')).sort()),expected);
   await page.click('#reset');await page.click('[data-mode="didatico"]');
   for(let i=1;i<=4;i++)await page.click('#next-step');assert.equal((await inspect()).generation,2);assert.equal((await inspect()).phase,4);
   await page.screenshot({path:path.join(root,'qa',caseId+'-didactic.jpg'),quality:85,fullPage:true});
   await page.click('#population-open');assert.equal(await page.locator('.population-item').count(),10);await page.click('#population-close');
   await page.selectOption('#operator','PMX');assert.equal((await inspect()).generation,1);await page.click('#next-step');assert((await page.locator('#step-detail').innerText()).includes('Torneio'));await page.click('#next-step');assert((await page.locator('#step-detail').innerText()).includes('PMX'));
   await page.locator('.parameters summary').click();await page.fill('#pc','1.5');await page.click('#apply');assert(await page.locator('#parameter-error').isVisible());await page.fill('#pc','0.9');
   await page.fill('#seed','1001');await page.selectOption('#population-size','40');await page.click('#apply');assert.equal((await inspect()).evaluations,40);assert.equal((await inspect()).scene.actors.length,10);
   await page.click('#population-open');assert.equal(await page.locator('.population-item').count(),40);await page.keyboard.press('Escape');
   await page.fill('#seed','1000');await page.selectOption('#population-size','10');await page.click('#apply');await page.locator('.parameters summary').click();
   await page.click('[data-mode="automatico"]');await page.selectOption('#operator','OX');await page.selectOption('#speed','8');await page.click('#play');await page.waitForFunction(()=>window.__ROUTE_APP__.engine.generation>=3);await page.click('#play');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,caseId+' desktop overflow');
   await page.setViewportSize({width:390,height:844});await page.click('#reset');await page.selectOption('#speed','2');await page.click('#mobile-play');await page.waitForFunction(()=>window.__ROUTE_APP__.progress>.18);await page.click('#mobile-play');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,caseId+' mobile overflow');
   await page.screenshot({path:path.join(root,'qa',caseId+'-mobile.jpg'),quality:88,fullPage:true});await page.setViewportSize({width:1440,height:1080});
  }
  await page.click('#fullscreen');assert(await page.evaluate(()=>!!document.fullscreenElement));await page.click('#fullscreen');assert.equal(await page.evaluate(()=>!!document.fullscreenElement),false);
  for(const width of [1440,390]){await page.setViewportSize({width,height:width===390?844:1080});for(const tab of ['trabalho','metodo','resultados','ensino','fontes']){
   await page.locator(`nav [data-tab="${tab}"]`).click();await page.locator('#'+tab).waitFor({state:'visible'});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${width} overflow in ${tab}`);
  }}
  await page.locator('nav [data-tab="metodo"]').click();await page.click('#article-mutation');assert((await page.locator('#article-mutation-result').innerText()).includes('1.122,68'));
  await page.locator('#count-slider').evaluate(el=>{el.value='15';el.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal(await page.locator('#count-result').innerText(),'43.589.145.600');
  await page.locator('nav [data-tab="trabalho"]').click();await page.click('[data-open-case="city"]');assert.equal(await page.evaluate(()=>window.__ROUTE_APP__.caseId),'city');
  assert.equal(errors.length,0,errors.join('\n'));
  const report={status:'passed',cases:3,initialIndividuals:10,viewports:[1440,390],checks:['exact costs','nearest costs','common base','ten moving agents','pause','individual selection','trails','grid','projections','distance tool','didactic phases','didactic to automatic continuity','automatic generations','elites','OX and PMX','parameter validation','population dialog','reset','fullscreen','six sections','article operators','route counter','mobile controls'],javascriptErrors:errors};
  fs.writeFileSync(path.join(root,'qa','report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 } catch(error) { await page.screenshot({path:path.join(root,'qa','failure.jpg'),quality:85,fullPage:true});console.error('Map state:',await page.locator('#map-loading').innerText().catch(()=>''));throw error; } finally {await browser.close();server.close();}
}
run().catch(e=>{console.error(e);server.close();process.exitCode=1;});
