'use strict';

let passage=null;
let visitedShelves=false;

// One moving facade and one hinged leaf. The aperture reveals the actual shelf DOM.
async function crossThreshold(stage,interior,fromInside,commit,signal) {
  const photo=stage.querySelector('.store-art');
  if(reducedMotion.matches || stage.classList.contains('missing-art')) {commit();return;}
  const viewport=document.createElement('div');
  viewport.className='shelf-portal';
  viewport.innerHTML='<div class="aperture"><div class="portal-field"></div></div><div class="moving-facade" aria-hidden="true"></div>';
  const aperture=viewport.firstElementChild, field=aperture.firstElementChild, front=viewport.lastElementChild;
  const scroll=interior.querySelector('.recto')?.scrollTop || 0;
  field.append(interior);
  document.body.append(viewport);
  const view=viewport.getBoundingClientRect(),bounds=stage.getBoundingClientRect(),leaf=stage.querySelector('.door-position').getBoundingClientRect();
  const dw=leaf.width,dh=leaf.height,W=view.width,H=view.height;
  const dx=leaf.x-view.x+dw/2,dy=leaf.y-view.y+dh/2;
  const maxScale=1.02*Math.max(W/dw,H/dh);
  const door=mountFacade(front,photo,bounds,leaf);
  const base=document.getElementById('main');
  if(fromInside && field.querySelector('.recto')) field.querySelector('.recto').scrollTop=scroll;
  let progress=fromInside?1:0, goal=fromInside?0:1, onArrive=commit;
  let duration=visitedShelves||fromInside ? motionTime['return-trip'] : motionTime.passage;
  const trip={
    turn(inside,next,arrive) {
      const target=inside?1:0;
      if(target!==goal) duration=motionTime['return-trip'];
      goal=target;onArrive=arrive;
      if(next) field.replaceChildren(next);
    }
  };
  passage=trip;
  function draw() {
    const walk=easePhase(progress,.18,.98), scale=Math.pow(maxScale,walk);
    const cx=lerp(dx,W/2,walk),cy=lerp(dy,H/2,walk);
    const left=cx-dw*scale/2,top=cy-dh*scale/2,right=cx+dw*scale/2,bottom=cy+dh*scale/2;
    const x=cx+(bounds.left-view.x-dx)*scale,y=cy+(bounds.top-view.y-dy)*scale;
    front.style.transform='translate('+x+'px,'+y+'px) scale('+scale+')';
    door.style.transform='perspective('+dw*2.1+'px) rotateY('+89.9*easePhase(progress,0,.34)+'deg)';
    aperture.style.clipPath='inset('+Math.max(0,top)+'px '+Math.max(0,W-right)+'px '+Math.max(0,H-bottom)+'px '+Math.max(0,left)+'px)';
    const z=Math.max(lerp(.70,1,walk),(Math.min(W,right)-Math.max(0,left))/W,(Math.min(H,bottom)-Math.max(0,top))/H);
    const u=Math.min(Math.max(0,left),Math.max(Math.min(W,right)-W*z,cx-W*z/2));
    const v=Math.min(Math.max(0,top),Math.max(Math.min(H,bottom)-H*z,cy-H*z/2));
    field.style.transform='translate('+u+'px,'+v+'px) scale('+z+')';
    aperture.inert=progress<.55 || !goal;
    aperture.style.pointerEvents=aperture.inert?'none':'auto';
  }
  draw();
  if(fromInside) commit(); // The street is the stationary layer behind the aperture.
  base.inert=true;
  await new Promise(resolve=>{
    const events=new AbortController(), options={signal:events.signal};
    let frame,last;
    function finish() {
      cancelAnimationFrame(frame);events.abort();signal.removeEventListener('abort',finish);
      if(passage===trip)passage=null;
      base.inert=false;
      if(!signal.aborted) {onArrive(goal?field.firstElementChild:null);if(goal) visitedShelves=true;}
      viewport.remove();resolve();
    }
    function tick(now) {
      last??=now;
      const step=(now-last)/duration;
      progress=goal?Math.min(1,progress+step):Math.max(0,progress-step);last=now;
      draw();
      if(progress===goal)finish();else frame=requestAnimationFrame(tick);
    }
    signal.addEventListener('abort',finish,{once:true});
    field.addEventListener('click',event=>{
      const control=event.target.closest('a,button,input');
      if(!goal || !control || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)return;
      // Adopt the visible shelf before handling the click so its live controls also save the right origin.
      event.preventDefault();event.stopPropagation();finish();
      queueMicrotask(()=>{
        if(!control.isConnected)return;
        if(control.matches('input'))control.focus({preventScroll:true});
        else control.click();
      });
    },{...options,capture:true});
    field.addEventListener('focusin',event=>{
      if(goal && event.target.matches('input')) {
        const input=event.target;finish();input.focus({preventScroll:true});
      }
    },options);
    window.addEventListener('resize',finish,options);
    window.addEventListener('bookshop-arrive',finish,options);
    document.addEventListener('visibilitychange',finish,options);
    reducedMotion.addEventListener('change',finish,options);
    window.addEventListener('keydown',e=>{if(e.key==='Escape')finish()},options);
    frame=requestAnimationFrame(tick);
  });
}
