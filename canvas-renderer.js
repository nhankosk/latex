/* Canvas 2D fallback for the small subset of scene-graph operations used by ROTAS.
   The same licensed sprites and exact route geometry are used with or without WebGL. */
window.RouteCanvas=function(){
const color=v=>typeof v==='number'?'#'+v.toString(16).padStart(6,'0'):v||'#000000';
const point=(x=0,y=x)=>({x,y,set(a,b=a){this.x=a;this.y=b;}});
const measure=document.createElement('canvas').getContext('2d');
class Container{
 constructor(){this.children=[];this.position=point();this.scale=point(1);this.rotation=0;this.alpha=1;this.anchor=point();this.events={};this.visible=true;}
 get x(){return this.position.x;}set x(v){this.position.x=v;}get y(){return this.position.y;}set y(v){this.position.y=v;}
 addChild(...items){this.children.push(...items);return items[0];}addChildAt(v,i){this.children.splice(i,0,v);}getChildIndex(v){return this.children.indexOf(v);}removeChildren(){return this.children.splice(0);}destroy(){this.children=[];}on(type,fn){this.events[type]=fn;}
}
class Graphics extends Container{
 constructor(){super();this.shapes=[];this.path=[];}
 clear(){this.shapes=[];this.path=[];return this;}
 poly(v){this.path.push(['poly',v]);return this;}circle(...v){this.path.push(['circle',...v]);return this;}ellipse(...v){this.path.push(['ellipse',...v]);return this;}roundRect(...v){this.path.push(['roundRect',...v]);return this;}
 moveTo(...v){this.path.push(['moveTo',...v]);return this;}lineTo(...v){this.path.push(['lineTo',...v]);return this;}
 finish(type,style){this.shapes.push({path:this.path.slice(),type,style:typeof style==='object'?style:{color:style}});this.path=[];return this;}fill(style){return this.finish('fill',style);}stroke(style){return this.finish('stroke',style);}
}
class Rectangle{constructor(x,y,width,height){Object.assign(this,{x,y,width,height});}}
class Texture{constructor({source,frame}){this.source=source;this.frame=frame||new Rectangle(0,0,source.image.width,source.image.height);}}
class Sprite extends Container{
 constructor(texture){super();this.texture=texture;}
 get width(){return this.texture.frame.width*this.scale.x;}set width(v){this.scale.x=v/this.texture.frame.width;}
}
const font=s=>`${s.fontWeight||400} ${s.fontSize||14}px ${s.fontFamily||'sans-serif'}`;
class Text extends Container{
 constructor({text,style}){super();this.text=String(text);this.style=style;}
 get width(){measure.font=font(this.style);return Math.max(...this.text.split('\n').map(s=>measure.measureText(s).width));}
}
function shapePath(ctx,path){ctx.beginPath();for(const [kind,...args]of path){
 if(kind==='poly'){const v=args[0];ctx.moveTo(v[0],v[1]);for(let i=2;i<v.length;i+=2)ctx.lineTo(v[i],v[i+1]);ctx.closePath();}
 else if(kind==='circle'){ctx.moveTo(args[0]+args[2],args[1]);ctx.arc(...args,0,Math.PI*2);}
 else if(kind==='ellipse')ctx.ellipse(args[0],args[1],args[2],args[3],0,0,Math.PI*2);
 else ctx[kind](...args);
}}
class Application{
 constructor(){this.stage=new Container();this.callbacks=[];this.ticker={add:fn=>this.callbacks.push(fn)};}
 async init(options){
  this.canvas=document.createElement('canvas');this.ctx=this.canvas.getContext('2d');this.resolution=options.resolution||1;this.hits=[];
  this.renderer={resize:(w,h)=>{this.canvas.width=Math.round(w*this.resolution);this.canvas.height=Math.round(h*this.resolution);this.canvas.style.width=w+'px';this.canvas.style.height=h+'px';}};this.renderer.resize(options.width,options.height);
  const hit=e=>{const rect=this.canvas.getBoundingClientRect(),x=(e.clientX-rect.left)*this.resolution,y=(e.clientY-rect.top)*this.resolution;for(const h of [...this.hits].reverse()){const p=new DOMPoint(x,y).matrixTransform(h.matrix.inverse());if(h.node.shapes.some(s=>s.path.some(v=>v[0]==='circle'&&Math.hypot(p.x-v[1],p.y-v[2])<=v[3])))return h.node;}};
  this.canvas.addEventListener('pointerup',e=>hit(e)?.events.pointertap?.());this.canvas.addEventListener('pointermove',e=>{this.canvas.style.cursor=hit(e)?'pointer':'default';});
  const tick=()=>{for(const fn of this.callbacks)fn();this.render();this.raf=requestAnimationFrame(tick);};this.raf=requestAnimationFrame(tick);
 }
 render(){const ctx=this.ctx;ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,this.canvas.width,this.canvas.height);ctx.scale(this.resolution,this.resolution);this.hits=[];this.draw(this.stage);}
 draw(node){if(!node.visible)return;const c=this.ctx;c.save();c.translate(node.x,node.y);c.rotate(node.rotation||0);c.scale(node.scale.x,node.scale.y);c.globalAlpha*=node.alpha;
  if(node instanceof Graphics){for(const s of node.shapes){c.save();shapePath(c,s.path);c.globalAlpha*=s.style.alpha??1;if(s.type==='fill'){c.fillStyle=color(s.style.color);c.fill();}else{c.strokeStyle=color(s.style.color);c.lineWidth=s.style.width||1;c.lineJoin=s.style.join||'round';c.lineCap=s.style.cap||'round';c.stroke();}c.restore();}if(node.eventMode==='static')this.hits.push({node,matrix:c.getTransform()});}
  if(node instanceof Sprite){const f=node.texture.frame;c.imageSmoothingEnabled=node.texture.source.scaleMode!=='nearest';c.drawImage(node.texture.source.image,f.x,f.y,f.width,f.height,-f.width*node.anchor.x,-f.height*node.anchor.y,f.width,f.height);}
  if(node instanceof Text){const s=node.style,lines=node.text.split('\n'),lh=(s.fontSize||14)*1.2;c.font=font(s);c.fillStyle=color(s.fill);c.textAlign='center';c.textBaseline='middle';lines.forEach((v,i)=>c.fillText(v,0,(i-(lines.length-1)/2)*lh));}
  for(const child of node.children)this.draw(child);c.restore();
 }
}
const Assets={load:async urls=>{const entries=await Promise.all(urls.map(url=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve([url,new Texture({source:{image,scaleMode:'linear'}})]);image.onerror=()=>reject(Error('Falha na imagem '+url));image.src=url;})));return Object.fromEntries(entries);}};
return{Container,Graphics,Rectangle,Texture,Sprite,Text,Application,Assets};
};
