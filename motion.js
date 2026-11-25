'use strict';

const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
const motionStyles=getComputedStyle(document.documentElement);
const motionTime=Object.fromEntries(['touch','change','open','passage','return-trip','reading-open','reading-close','reading-turn','reading-repeat'].map(name=>
  [name,parseFloat(motionStyles.getPropertyValue('--'+name))]));
const settle=motionStyles.getPropertyValue('--settle').trim();
const activeMotions=new Set();
function animateChange(node,frames,tempo='change',options={}) {
  if (!node?.animate || reducedMotion.matches) return null;
  const animation=node.animate(frames,{duration:motionTime[tempo],easing:settle,...options});
  activeMotions.add(animation);
  animation.finished.then(()=>activeMotions.delete(animation),()=>activeMotions.delete(animation));
  return animation;
}
reducedMotion.addEventListener('change',()=>{
  if(reducedMotion.matches) for(const animation of activeMotions) animation.cancel();
});

// Only the visible books move. Titles shared by both arrangements keep their identity.
function replaceRack(rack,html,direction=0,animate=true) {
  rack.querySelector('.rack-ghost')?.remove();
  if (!animate || reducedMotion.matches) {rack.innerHTML=html;return;}
  const from=new Map([...rack.querySelectorAll('a')].map(a=>[a.hash,a.getBoundingClientRect()]));
  const ghost=rack.cloneNode(true);
  ghost.className='rack-ghost';ghost.inert=true;ghost.setAttribute('aria-hidden','true');
  rack.innerHTML=html;
  const links=[...rack.querySelectorAll('a')];
  const next=links.map(a=>a.getBoundingClientRect());
  const hashes=new Set(links.map(a=>a.hash));
  for(const a of ghost.querySelectorAll('a')) if(hashes.has(a.hash)) a.style.visibility='hidden';
  rack.append(ghost);
  const fade=animateChange(ghost,[{opacity:.85},{opacity:0,transform:'translateX('+(-direction*8)+'px)'}],'touch');
  if(fade) fade.finished.then(()=>ghost.remove(),()=>ghost.remove());else ghost.remove();
  links.forEach((a,i)=>{
    const old=from.get(a.hash),now=next[i];
    const x=old ? old.x-now.x : direction*12;
    const y=old ? old.y-now.y : 5;
    animateChange(a.parentElement,[{opacity:old?1:0,transform:'translate('+x+'px,'+y+'px)'},{opacity:1,transform:'none'}]);
  });
}
