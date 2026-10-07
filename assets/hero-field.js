/* Hero field: market participants as drifting particle clusters; a shock pulse ripples out from the centre every ~6s. */
(function(){
'use strict';
var canvas=document.querySelector('.hero .field');
if(!canvas||!canvas.getContext)return;
var ctx=canvas.getContext('2d',{alpha:false});
var reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var W=0,H=0,dpr=1,pts=[],clusters=[],running=false,visible=true,raf=0,t0=0,last=0;
var PULSE=6000;

function rand(seed){return function(){seed=(seed*16807)%2147483647;return(seed-1)/2147483646;};}
function build(){
 var r=rand(20261007),n=W<700?600:1500;
 clusters=[];
 for(var c=0;c<5;c++){
  var a=c/5*Math.PI*2+.6,rad=Math.min(W,H)*(.22+.12*r());
  clusters.push({x:W*.58+Math.cos(a)*rad*1.35,y:H*.46+Math.sin(a)*rad*.8,s:Math.min(W,H)*(.1+.08*r())});
 }
 pts=[];
 for(var i=0;i<n;i++){
  var loose=r()<.28,cl=clusters[i%5];
  var g=Math.sqrt(-2*Math.log(r()+1e-9))*Math.cos(2*Math.PI*r()),h=Math.sqrt(-2*Math.log(r()+1e-9))*Math.cos(2*Math.PI*r());
  var x=loose?r()*W:cl.x+g*cl.s,y=loose?r()*H:cl.y+h*cl.s*.8;
  pts.push({x:x,y:y,ox:x,oy:y,ph:r()*Math.PI*2,sp:.00012+r()*.00025,amp:6+r()*18,a:.18+r()*.5,sz:r()<.08?1.6:1});
 }
}
function resize(){
 var rect=canvas.getBoundingClientRect();
 dpr=Math.min(window.devicePixelRatio||1,2);
 W=Math.max(1,rect.width);H=Math.max(1,rect.height);
 canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr);
 ctx.setTransform(dpr,0,0,dpr,0,0);
 build();draw(t0||0);
}
function draw(t){
 ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
 var cx=W*.58,cy=H*.46,maxR=Math.hypot(W,H)*.75;
 var p=(t%PULSE)/PULSE,front=p*maxR,band=60+120*p,fade=1-p;
 // pulse ring
 if(!reduce){
  ctx.strokeStyle='rgba(255,255,255,'+(0.10*fade).toFixed(3)+')';ctx.lineWidth=1;
  ctx.beginPath();ctx.arc(cx,cy,front,0,Math.PI*2);ctx.stroke();
 }
 for(var i=0;i<pts.length;i++){
  var q=pts[i],ang=q.ph+t*q.sp;
  var x=q.ox+Math.cos(ang)*q.amp,y=q.oy+Math.sin(ang*1.3)*q.amp*.6;
  var a=q.a;
  if(!reduce){
   var dx=x-cx,dy=y-cy,d=Math.sqrt(dx*dx+dy*dy)||1,k=1-Math.abs(d-front)/band;
   if(k>0){k*=fade;a=Math.min(1,a+k*.6);x+=dx/d*k*6;y+=dy/d*k*6;}
  }
  ctx.fillStyle='rgba(255,255,255,'+a.toFixed(3)+')';
  ctx.fillRect(x,y,q.sz,q.sz);
 }
}
function frame(now){
 if(!running)return;
 if(!t0)t0=now;
 if(now-last>=32){last=now;draw(now-t0);} // ~30fps is enough for a slow field
 raf=requestAnimationFrame(frame);
}
function update(){
 var should=!reduce&&visible&&!document.hidden;
 if(should&&!running){running=true;raf=requestAnimationFrame(frame);}
 else if(!should&&running){running=false;cancelAnimationFrame(raf);}
}
resize();
var rt;window.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(resize,150);});
if(reduce)return; // one static frame
if('IntersectionObserver' in window){
 new IntersectionObserver(function(e){visible=e[0].isIntersecting;update();}).observe(canvas);
}
document.addEventListener('visibilitychange',update);
update();
})();
