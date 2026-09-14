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
  await page.waitForFunction(()=>window.__ROUTE_APP__?.ready,{},{timeout:20000});
  await page.screenshot({path:path.join(root,'qa','desktop.jpg'),quality:87,fullPage:true});
  assert.equal(await page.evaluate(()=>window.__ROUTE_APP__.engine.evaluations),80);
  assert(await page.locator('#best-cost').innerText().then(t=>t.includes('1.353,21')));
  assert.equal(await page.locator('#elites .elite').count(),2);
  await page.selectOption('#speed','8');await page.click('#play');
  await page.waitForFunction(()=>window.__ROUTE_APP__.engine.generation>=3,{},{timeout:10000});
  await page.click('#play');const paused=await page.evaluate(()=>({g:window.__ROUTE_APP__.engine.generation,p:window.__ROUTE_APP__.progress}));
  await page.waitForTimeout(350);
  assert.deepEqual(await page.evaluate(()=>({g:window.__ROUTE_APP__.engine.generation,p:window.__ROUTE_APP__.progress})),paused,'Pause must stop both movement and generations');
  await page.click('[data-route="exact"]');assert((await page.locator('#map-route-cost').innerText()).includes('1.084,95'));
  await page.click('[data-route="nearest"]');assert((await page.locator('#map-route-cost').innerText()).includes('1.143,59'));
  await page.click('#map-style');await page.screenshot({path:path.join(root,'qa','coordinates.jpg'),quality:85,fullPage:true});await page.click('#map-style');
  await page.click('#reset');await page.click('[data-mode="didatico"]');
  for(let i=1;i<=3;i++){await page.click('#next-step');assert.equal(await page.evaluate(()=>window.__ROUTE_APP__.engine.generation),1);assert.equal(await page.evaluate(()=>window.__ROUTE_APP__.phase),i);}
  await page.click('#next-step');assert.equal(await page.evaluate(()=>window.__ROUTE_APP__.engine.generation),2);
  await page.screenshot({path:path.join(root,'qa','didactic.jpg'),quality:85,fullPage:true});
  await page.click('#population-open');assert.equal(await page.locator('.population-item').count(),80);await page.keyboard.press('Escape');
  await page.selectOption('#operator','PMX');assert.equal(await page.evaluate(()=>window.__ROUTE_APP__.engine.generation),1);
  await page.locator('.parameters summary').click();await page.fill('#pc','1.5');await page.click('#apply');assert(await page.locator('#parameter-error').isVisible());
  await page.fill('#pc','0.9');await page.fill('#seed','1001');await page.click('#apply');assert.equal(await page.evaluate(()=>window.__ROUTE_APP__.engine.options.seed),1001);
  for(const tab of ['trabalho','metodo','resultados','ensino','fontes']){
    await page.locator(`nav [data-tab="${tab}"]`).click();await page.locator('#'+tab).waitFor({state:'visible'});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`Desktop overflow in ${tab}`);
  }
  await page.locator('nav [data-tab="metodo"]').click();await page.click('#article-mutation');assert((await page.locator('#article-mutation-result').innerText()).includes('1.122,68'));
  await page.locator('#count-slider').evaluate(el=>{el.value='15';el.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal(await page.locator('#count-result').innerText(),'43.589.145.600');
  await page.locator('nav [data-tab="resultados"]').click();await page.screenshot({path:path.join(root,'qa','results.jpg'),quality:86,fullPage:true});
  await page.setViewportSize({width:390,height:844});
  for(const tab of ['experimento','trabalho','metodo','resultados','ensino','fontes']){
    await page.locator(`nav [data-tab="${tab}"]`).click();await page.locator('#'+tab).waitFor({state:'visible'});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`Mobile overflow in ${tab}`);
  }
  await page.locator('nav [data-tab="experimento"]').click();await page.click('#reset');await page.click('[data-mode="automatico"]');await page.locator('.parameters summary').click();await page.evaluate(()=>window.scrollTo(0,0));
  await page.click('#mobile-play');assert.equal(await page.evaluate(()=>window.__ROUTE_APP__.playing),true);await page.click('#mobile-play');assert.equal(await page.evaluate(()=>window.__ROUTE_APP__.playing),false);
  await page.screenshot({path:path.join(root,'qa','mobile.jpg'),quality:87,fullPage:true});
  assert.equal(errors.length,0,errors.join('\n'));
  console.log('Interface verificada: renderização 2D, animação, pausa, referências, etapas didáticas, população, parâmetros, exemplos e navegação nas seis áreas. Sem erros JavaScript ou transbordamento em 1440 px e 390 px.');
 } catch(error) { await page.screenshot({path:path.join(root,'qa','failure.jpg'),quality:85,fullPage:true});console.error('Map state:',await page.locator('#map-loading').innerText().catch(()=>''));throw error; } finally {await browser.close();server.close();}
}
run().catch(e=>{console.error(e);server.close();process.exitCode=1;});
