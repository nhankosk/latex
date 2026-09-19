/* PixiJS: arte licenciada, três ambientes e dez percursos independentes. */
window.createRouteScene=async function(host,getState,onFrame,onPoint){
'use strict';
let P=window.PIXI,rendererKind='webgl';
const manifest=await fetch('assets/manifest.json').then(r=>{if(!r.ok)throw Error('Manifesto indisponível');return r.json();});
const pick=(pack,name)=>{const e=manifest[pack].find(a=>a.name.endsWith('/'+name+'.png'));if(!e)throw Error('Arte ausente: '+name);return e.path;};
const buildings=['000','123','125','092','026','100','024','008'].map(n=>pick('buildings','buildingTiles_'+n));
const tree=pick('city','cityDetails_010'),garden=pick('city','cityTiles_059');
const cars=Array.from({length:16},(_,i)=>pick('vehicles',`carBlue1_${String(i).padStart(3,'0')}`));
const urls=[...new Set([...buildings,tree,garden,...cars,'media/people.png','media/robot.png'])];
const settings={width:host.clientWidth||800,height:host.clientHeight||500,backgroundAlpha:0,antialias:true,resolution:Math.min(devicePixelRatio||1,2),autoDensity:true,preference:'webgl'};
let app=new P.Application();try{await app.init(settings);}catch{P=RouteCanvas();rendererKind='canvas2d';app=new P.Application();await app.init(settings);}
const textures=await P.Assets.load(urls);textures['media/people.png'].source.scaleMode='nearest';host.appendChild(app.canvas);
const world=new P.Container(),ground=new P.Graphics(),environment=new P.Container(),trails=new P.Container(),pins=new P.Container(),actors=new P.Container();
app.stage.addChild(world);world.addChild(ground,environment,trails,pins,actors);
let positions=[],mobile=false,entities=[],elapsed=0,renderedCase='',peopleFrames=new Map(),snapshot=[];
const projection=p=>{
 const s=getState();
 if(s.problem.id==='school')return s.isometric?{x:425+(p.x-p.y)*43,y:475-(p.x+p.y)*24}:{x:155+p.x*78,y:495-p.y*65};
 if(s.problem.id==='city')return s.isometric?{x:425+(p.x-p.y)*33,y:490-(p.x+p.y)*19}:{x:115+p.x*61,y:490-p.y*44};
 return{x:80+p.x*23,y:500-p.y*21};
};
const poly=(g,coords,color,alpha=1)=>g.poly(coords.flatMap(p=>[p.x,p.y])).fill({color,alpha});
const line=(g,a,b,color,width=1,alpha=1)=>g.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({color,width,alpha});
function rect(x0,y0,x1,y1){return[{x:x0,y:y0},{x:x1,y:y0},{x:x1,y:y1},{x:x0,y:y1}].map(projection);}
function sprite(texture,x,y,width){const v=new P.Sprite(texture);v.anchor.set(.5,1);v.position.set(x,y);v.width=width;v.scale.y=v.scale.x;environment.addChild(v);return v;}
function text(value,x,y,style={}){const t=new P.Text({text:value,style:{fontFamily:'DM Sans, sans-serif',fontSize:14,fill:0x395768,fontWeight:'500',...style}});t.anchor.set(.5);t.position.set(x,y);pins.addChild(t);return t;}
const empty=c=>c.removeChildren().forEach(v=>v.destroy({children:true}));
function school(s){
 if(s.isometric){
  const corners=rect(-1,-1,7,7);poly(ground,corners.map(p=>({x:p.x+5,y:p.y+20})),0x102d41,.06);poly(ground,corners.map(p=>({x:p.x,y:p.y+10})),0xb3c6c5);poly(ground,corners,0xdce8e3);
  if(s.showGrid)for(let i=-1;i<=7;i++){line(ground,projection({x:i,y:-1}),projection({x:i,y:7}),0xbacdc9,1,.6);line(ground,projection({x:-1,y:i}),projection({x:7,y:i}),0xbacdc9,1,.6);}
  const decorative=[[-.1,4.8],[.1,5.2],[2.8,6.5],[3.2,6.5],[6.6,2],[6.6,2.5],[-.4,.4],[.4,-.4],[5.7,5.5],[5.9,5.9]];
  const scenery=decorative.map(([x,y])=>({...projection({x,y}),type:'tree'}));s.problem.points.forEach(p=>scenery.push({...positions[p.id],type:'building',id:p.id}));
  scenery.sort((a,b)=>a.y-b.y).forEach(p=>{if(p.type==='tree'){sprite(textures[tree],p.x,p.y-4,20);return;}if(p.id===4){sprite(textures[garden],p.x-12,p.y-7,79);sprite(textures[tree],p.x+11,p.y-26,24);}else sprite(textures[buildings[p.id]],p.x,p.y-10,p.id===3?104:p.id===0?76:91);});
 }else{
  if(s.showGrid)for(let i=0;i<=6;i++){line(ground,projection({x:i,y:0}),projection({x:i,y:6.5}),0xc9dce4);line(ground,projection({x:0,y:i}),projection({x:6.5,y:i}),0xc9dce4);text(String(i),projection({x:i,y:0}).x,520,{fontSize:15});text(String(i),126,projection({x:0,y:i}).y,{fontSize:15});}
  line(ground,projection({x:0,y:0}),projection({x:6.5,y:0}),0x829faa,2);line(ground,projection({x:0,y:0}),projection({x:0,y:6.5}),0x829faa,2);text('x',688,503,{fontSize:18});text('y',155,53,{fontSize:18});
 }
}
function city(s){
 const corners=rect(-.7,-.7,10.7,10.7);poly(ground,corners.map(p=>({x:p.x,y:p.y+10})),0xccbfa7);poly(ground,corners,0xe5e5d0);
 // Todas as ruas correspondem à malha de Manhattan, inclusive trechos sem coleta.
 for(let i=0;i<=10;i++){
  const a=projection({x:i,y:-.5}),b=projection({x:i,y:10.5}),c=projection({x:-.5,y:i}),d=projection({x:10.5,y:i});
  for(const [u,v]of [[a,b],[c,d]]){line(ground,u,v,0xfaf7ed,s.isometric?17:20);line(ground,u,v,0xb5bdc0,s.isometric?13:16);if(s.showGrid)line(ground,u,v,0xe7e9e6,1,.8);}
 }
 if(s.isometric){
  const decor=[];for(let x=0;x<10;x++)for(let y=0;y<10;y++)if((x*3+y)%4===0)decor.push({x:x+.5,y:y+.5,kind:(x+y)%3});
  decor.sort((a,b)=>projection(a).y-projection(b).y).forEach((p,i)=>{const at=projection(p);if(p.kind===0){sprite(textures[garden],at.x,at.y+5,35);sprite(textures[tree],at.x,at.y,15);}else sprite(textures[buildings[(i%7)+1]],at.x,at.y+5,35);});
  const home=projection({x:4.5,y:4.5});sprite(textures[buildings[0]],home.x,home.y+3,52);
 }else if(s.showGrid){for(let i=0;i<=10;i++){text(String(i),projection({x:i,y:0}).x,524,{fontSize:13});text(String(i),87,projection({x:0,y:i}).y,{fontSize:13});}}
}
function robot(s){
 const corners=rect(-.5,-.5,30.5,20.5);poly(ground,corners.map(p=>({x:p.x,y:p.y+10})),0x061923);poly(ground,corners,0x19333e);
 if(s.showGrid){for(let x=0;x<=31;x++)line(ground,projection({x:x-.5,y:-.5}),projection({x:x-.5,y:20.5}),0x30505b,1,.68);for(let y=0;y<=21;y++)line(ground,projection({x:-.5,y:y-.5}),projection({x:30.5,y:y-.5}),0x30505b,1,.68);}
 for(const[x0,x1,y0,y1]of s.problem.rectangles){
  const p=rect(x0-.5,y0-.5,x1+.5,y1+.5);poly(ground,p,0x526671);ground.poly(p.flatMap(v=>[v.x,v.y])).stroke({color:0xe7ad5e,width:2});
  for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){const q=rect(x-.4,y-.4,x+.4,y+.4);poly(ground,q,(x+y)%2?0x3e535f:0x475c68);}
  const at=projection({x:(x0+x1)/2,y:(y0+y1)/2});text('ÁREA\nBLOQUEADA',at.x,at.y,{fontSize:11,fontWeight:'700',fill:0xd6e1e6,align:'center',letterSpacing:1});
 }
 if(s.showGrid){for(let x=0;x<=30;x+=5)text(String(x),projection({x,y:0}).x,532,{fill:0x8db0bd,fontSize:13});for(let y=0;y<=20;y+=5)text(String(y),50,projection({x:0,y}).y,{fill:0x8db0bd,fontSize:13});}
}
function redraw(){
 const s=getState();renderedCase=s.problem.id;ground.clear();empty(environment);empty(pins);positions=s.problem.points.map(projection);
 ({school,city,robot}[s.problem.id])(s);
 s.problem.points.forEach(p=>{
  const at=positions[p.id],dark=s.problem.id==='robot',r=dark?10:mobile?15:12;
  const dot=new P.Graphics().circle(at.x,at.y,r+2).fill(dark?0xabc6cb:0xffffff).circle(at.x,at.y,r).fill(p.id===0?0xd97642:dark?0x204954:0x102d41);
  pins.addChild(dot);text(String(p.id),at.x,at.y,{fill:0xffffff,fontSize:dark?12:mobile?19:14,fontWeight:'700'});
  if(!mobile&&s.problem.id==='school'){const label=text(p.name,at.x,at.y+30,{fontSize:14}),box=new P.Graphics().roundRect(at.x-label.width/2-8,at.y+19,label.width+16,23,5).fill({color:0xffffff,alpha:.93});pins.addChildAt(box,pins.getChildIndex(label));}
  dot.eventMode='static';dot.cursor='pointer';dot.on('pointertap',()=>onPoint(p.id));
 });drawRoute();
}
function peopleTexture(row,direction,frame){
 const key=`${row}-${direction}-${frame}`;if(!peopleFrames.has(key))peopleFrames.set(key,new P.Texture({source:textures['media/people.png'].source,frame:new P.Rectangle((direction*10+frame)*32,row*48,32,48)}));return peopleFrames.get(key);
}
function drawRoute(){
 const s=getState();if(renderedCase!==s.problem.id){redraw();return;}
 empty(trails);empty(actors);entities=[];
 const rows=s.routeType==='current'?s.population:[{...s.selected,id:0}],max=Math.max(...rows.map(p=>p.cost));
 rows.forEach((p,i)=>{
  const selected=s.routeType!=='current'||p.id===s.selected.id,color=s.routeType==='exact'?'#147f7c':s.routeType==='nearest'?'#d48245':s.color(p),geometry=s.problem.geometry(p.route),vertices=geometry.vertices.map(v=>({...projection(v),at:v.at}));
  const g=new P.Graphics();trails.addChild(g);
  // Separação visual de percursos coincidentes; as distâncias usam a geometria exata.
  const lane=s.allTrails&&s.routeType==='current'?(i-4.5)*.7:0;
  if(s.allTrails||selected){
   const stroke=(width,alpha,strokeColor)=>{vertices.forEach((v,j)=>{if(j)g.lineTo(v.x+lane,v.y+lane*.5);else g.moveTo(v.x+lane,v.y+lane*.5);});g.stroke({color:strokeColor,width,alpha,join:'round',cap:'round'});};
   if(selected)stroke(6,.6,s.problem.id==='robot'?0x09212b:0xffffff);
   stroke(selected?3.3:1.55,selected?.95:.38,color);
  }
  const carrier=new P.Container(),shadow=new P.Graphics().ellipse(0,0,s.problem.id==='robot'?8:12,5).fill({color,alpha:.45});
  const texture=s.problem.id==='school'?peopleTexture(i,0,0):s.problem.id==='city'?textures[cars[0]]:textures['media/robot.png'];
  const actor=new P.Sprite(texture);actor.anchor.set(.5,s.problem.id==='school'?.88:.5);actor.width=s.problem.id==='school'?42:s.problem.id==='city'?34:19;actor.scale.y=actor.scale.x;
  const label=s.routeType==='current'?String(p.id):'R',badgeWidth=Math.max(22,label.length*8+8);
  const badge=new P.Graphics().roundRect(-badgeWidth/2,-12,badgeWidth,17,6).fill(color);badge.position.set(0,s.problem.id==='school'?-40:-22);
  const idText=new P.Text({text:label,style:{fontFamily:'DM Sans, sans-serif',fontSize:12,fontWeight:'700',fill:s.problem.id==='robot'?0x102d41:0xffffff}});idText.anchor.set(.5);idText.position.set(0,badge.y-3);
  carrier.addChild(shadow,actor,badge,idText);actors.addChild(carrier);carrier.eventMode='none';
  entities.push({p,i,carrier,actor,shadow,geometry,vertices,max,selected,color,lane});
 });positionActors();
}
function positionActors(){
 const s=getState();snapshot=[];
 for(const e of entities){
  const distance=Math.min(e.p.cost,s.progress*e.max),v=e.vertices;let k=1;while(k<v.length-1&&v[k].at<distance)k++;
  const a=v[k-1],b=v[k],t=Math.min(1,Math.max(0,(distance-a.at)/Math.max(1e-10,b.at-a.at))),x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
  const logicalA=e.geometry.vertices[k-1],logicalB=e.geometry.vertices[k],logical={x:logicalA.x+(logicalB.x-logicalA.x)*t,y:logicalA.y+(logicalB.y-logicalA.y)*t};
  const moving=s.playing&&distance<e.p.cost,angle=Math.atan2(b.y-a.y,b.x-a.x),atBase=distance===0||distance>=e.p.cost;
  // Um pequeno espalhamento torna visíveis os dez indivíduos reunidos na mesma base.
  const spread=atBase?1:Math.max(0,1-distance/(s.problem.scale*1.4)),offsetX=((e.i%5)-2)*(s.problem.id==='robot'?24:14)*spread,offsetY=(Math.floor(e.i/5)-.5)*(s.problem.id==='robot'?46:17)*spread;
  e.carrier.position.set(x+offsetX+(!atBase?e.lane:0),y+offsetY+(!atBase?e.lane*.5:0));
  if(s.problem.id==='school'){
   const direction=b.y>=a.y?(b.x>=a.x?0:1):(b.x<a.x?2:3),frame=moving?1+(Math.floor(elapsed*10+e.i)%8):0;
   e.actor.texture=peopleTexture(e.i,direction,frame);e.actor.width=42;e.actor.scale.y=e.actor.scale.x;
  }else if(s.problem.id==='city'){
   const direction=((Math.round(angle/(Math.PI/4))%8)+8)%8,indices=[6,0,2,1,8,9,11,5];e.actor.texture=textures[cars[indices[direction]]];e.actor.width=34;e.actor.scale.y=e.actor.scale.x;
  }else e.actor.rotation=angle;
  e.carrier.alpha=e.selected?1:.94;
  snapshot.push({id:e.p.id,x:logical.x,y:logical.y,distance,cost:e.p.cost,finished:distance>=e.p.cost,vertices:e.geometry.vertices.length});
 }
 actors.children.sort((a,b)=>a.y-b.y);
}
function resize(){if(!host.clientWidth)return;const w=host.clientWidth,h=host.clientHeight;app.renderer.resize(w,h);mobile=w<580;const scale=Math.min(w/850,h/570);world.scale.set(scale);world.position.set((w-850*scale)/2,(h-570*scale)/2+(mobile?-8:0));redraw();}
new ResizeObserver(resize).observe(host);let last=performance.now();app.ticker.add(()=>{const now=performance.now(),dt=Math.min((now-last)/1000,.08);last=now;elapsed+=dt;onFrame(dt);positionActors();});
return{redraw,resize,drawRoute,diagnostics:()=>({caseId:renderedCase,renderer:rendererKind,actors:snapshot,projection:getState().isometric?'isometric':'plan',grid:getState().showGrid,allTrails:getState().allTrails,canvas:{width:host.clientWidth,height:host.clientHeight}})};
};
