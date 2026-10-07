/* Header state, full-screen menu and section reveal for the marketing pages. */
(function(){
'use strict';
var doc=document.documentElement,body=document.body;
var reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
doc.classList.add('js');

// Header: transparent over the hero, solid after 40px of scroll.
var header=document.querySelector('.site-header');
if(header&&!header.classList.contains('solid')){
 var onScroll=function(){header.classList.toggle('scrolled',window.scrollY>40);};
 onScroll();window.addEventListener('scroll',onScroll,{passive:true});
}

// Menu overlay (below 900px).
var btn=document.querySelector('.menu'),nav=document.getElementById('links');
if(btn&&nav){
 var openLabel=btn.textContent,closeLabel=btn.getAttribute('data-close')||'Close';
 var openAria=btn.getAttribute('aria-label'),closeAria=btn.getAttribute('data-close-aria')||closeLabel;
 var focusables=function(){return [btn].concat([].slice.call(nav.querySelectorAll('a')));};
 var setOpen=function(open){
  btn.setAttribute('aria-expanded',String(open));
  btn.textContent=open?closeLabel:openLabel;
  if(openAria)btn.setAttribute('aria-label',open?closeAria:openAria);
  nav.classList.toggle('open',open);body.classList.toggle('menu-open',open);
  if(header)header.classList.toggle('solid',open);
  if(open){var a=nav.querySelector('a');if(a)a.focus();}
 };
 btn.addEventListener('click',function(){setOpen(btn.getAttribute('aria-expanded')!=='true');});
 nav.addEventListener('click',function(e){if(e.target.closest('a')&&btn.getAttribute('aria-expanded')==='true')setOpen(false);});
 document.addEventListener('keydown',function(e){
  if(btn.getAttribute('aria-expanded')!=='true')return;
  if(e.key==='Escape'){setOpen(false);btn.focus();return;}
  if(e.key==='Tab'){
   var f=focusables(),first=f[0],last=f[f.length-1];
   if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
   else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
  }
 });
 window.addEventListener('resize',function(){if(window.innerWidth>=900&&btn.getAttribute('aria-expanded')==='true')setOpen(false);});
}

// Reveal: fade and rise 16px on first view, staggered 60ms.
if(reduce.matches||!('IntersectionObserver' in window))return;
var groups=document.querySelectorAll('main .section .shell, .page-top, .prose section');
var items=[];
groups.forEach(function(g){
 [].slice.call(g.children).forEach(function(el,i){
  if(el.closest('.hero'))return;
  el.classList.add('reveal');el.style.setProperty('--d',Math.min(i,8)*60+'ms');items.push(el);
 });
});
var io=new IntersectionObserver(function(entries){
 entries.forEach(function(en){if(en.isIntersecting){en.target.classList.add('in');io.unobserve(en.target);}});
},{rootMargin:'0px 0px -8% 0px',threshold:.05});
items.forEach(function(el){io.observe(el);});
})();
