(function(){
 var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
 // contact + footer together fill the last screen: publish the real footer height as --foot
 var foot=document.querySelector('footer');
 if(foot){var setFoot=function(){document.documentElement.style.setProperty('--foot',foot.offsetHeight+'px')};setFoot();addEventListener('resize',setFoot);addEventListener('load',setFoot)}
 // videos: muted loops that play only while visible
 document.querySelectorAll('.demos video').forEach(function(v){
  v.removeAttribute('controls');v.muted=true;v.loop=true;v.preload='metadata';
  if(reduce)return;
  new IntersectionObserver(function(e){e.forEach(function(x){x.isIntersecting?v.play().catch(function(){}):v.pause()})},{threshold:.35}).observe(v);
 });
 // $19B count-up
 var m=document.querySelector('.mega b');
 if(m&&!reduce){var end=19,done=false;new IntersectionObserver(function(e,o){if(e[0].isIntersecting&&!done){done=true;var t0=performance.now();(function f(t){var p=Math.min((t-t0)/1400,1);m.textContent=Math.round(end*(1-Math.pow(1-p,3)));if(p<1)requestAnimationFrame(f)})(t0);o.disconnect()}},{threshold:.5}).observe(m)}
})();
