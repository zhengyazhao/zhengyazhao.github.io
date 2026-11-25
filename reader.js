'use strict';

let bookReader=null;

function mountReader(root,saved,origin) {
  const book=root.querySelector('.bound-book'),windowEl=root.querySelector('.folio-window');
  const flow=root.querySelector('.folio-flow'),prose=flow.querySelector('.prose');
  const prev=root.querySelector('[data-page="-1"]'),next=root.querySelector('[data-page="1"]');
  const counter=root.querySelector('.folio-count');
  const events=new AbortController(),listen={signal:events.signal};
  let index=0,count=1,columns=1,stride=0,gap=0,desired=0,anchor=saved?.reader || null;
  let warming=0,frame=0,reflow=0,turn=null,ghosts=null,drag=null,disposed=false,ready=false,suppressClickUntil=0;
  function prepareText() {
    if(prose.dataset.phase!=='ready' || prose.dataset.prepared)return;
    // Hexo exports line numbers as a two-column table. Keep its code as flowing text.
    for(const figure of prose.querySelectorAll('figure')) {
      const cells=figure.querySelectorAll('td');
      const numbers=cells[0]?.querySelector('pre'),code=cells[1]?.querySelector('pre');
      if(cells.length===2 && numbers && code && numbers.innerText.trim().split(/\s+/).every((n,i)=>Number(n)===i+1)) {
        figure.replaceWith(code);
      }
    }
    for(const picture of prose.querySelectorAll('img')) {
      if(picture.closest('a'))continue;
      const link=document.createElement('a');
      link.href=picture.src;link.target='_blank';link.rel='noopener';
      link.setAttribute('aria-label',picture.alt?'查看原图，'+picture.alt:'查看原图');
      picture.before(link);link.append(picture);
    }
    prose.dataset.prepared='true';
  }
  const maxIndex=()=>Math.max(0,Math.floor((count-1)/columns)*columns);
  const limit=value=>Math.max(0,Math.min(maxIndex(),value));

  function remember() {
    if(!ready)return;
    const rect=windowEl.getBoundingClientRect();
    const visibleStride=stride*rect.width/windowEl.clientWidth;
    // Locate the first visible character, including when a long paragraph crosses a page.
    const walker=document.createTreeWalker(flow,NodeFilter.SHOW_TEXT);
    const range=document.createRange();
    let node;
    while(node=walker.nextNode()) {
      if(!node.textContent.trim())continue;
      range.selectNodeContents(node);
      if(![...range.getClientRects()].some(r=>r.right>rect.left && r.left<rect.left+visibleStride && r.top<rect.bottom && r.bottom>rect.top))continue;
      let low=0,high=node.length-1;
      while(low<high) {
        const mid=Math.floor((low+high)/2);
        range.setStart(node,mid);range.setEnd(node,mid+1);
        if(range.getBoundingClientRect().left<rect.left-1)low=mid+1;else high=mid;
      }
      while(low<node.length-1 && !node.textContent[low].trim())low++;
      range.setStart(node,low);range.setEnd(node,Math.min(node.length,low+1));
      const first=range.getBoundingClientRect();
      if(first.width===0 || first.left<rect.left-1 || first.left>=rect.left+visibleStride)continue;
      const path=[];let parent=node;
      while(parent!==flow){path.unshift([...parent.parentNode.childNodes].indexOf(parent));parent=parent.parentNode;}
      anchor={path,offset:low};
      break;
    }
    if(location.hash==='#post/'+prose.dataset.post) {
      const view={...history.state?.view,hash:location.hash,reader:anchor};
      history.replaceState({...history.state,view},'');
    }
  }
  function pageAtAnchor() {
    if(!anchor)return index;
    let node=flow;
    for(const step of anchor.path)node=node?.childNodes[step];
    if(!node || node.nodeType!==Node.TEXT_NODE)return index;
    const range=document.createRange();
    const offset=Math.min(anchor.offset,Math.max(0,node.length-1));
    range.setStart(node,offset);range.setEnd(node,Math.min(node.length,offset+1));
    const rect=range.getBoundingClientRect(),base=flow.getBoundingClientRect();
    const scale=windowEl.getBoundingClientRect().width/windowEl.clientWidth || 1;
    return Math.floor(Math.max(0,(rect.left-base.left)/scale+1)/stride);
  }
  function renderPages() {
    flow.style.transform='translateX('+(-index*stride)+'px)';
    root.dataset.page=index;
    root.dataset.pages=count;
    root.dataset.columns=columns;
    prev.disabled=!ready || index===0;
    next.disabled=!ready || index>=maxIndex();
    counter.textContent=ready ? (columns===2 ? (index+1)+'–'+Math.min(count,index+2) : index+1)+' / '+count+' 页' : '';
    const bounds=windowEl.getBoundingClientRect();
    for(const link of flow.querySelectorAll('a')) {
      const visible=[...link.getClientRects()].some(r=>r.left>=bounds.left-1 && r.right<=bounds.right+1 && r.top<bounds.bottom && r.bottom>bounds.top);
      if(visible)link.removeAttribute('tabindex');else link.tabIndex=-1;
    }
  }
  function discardTurn() {
    cancelAnimationFrame(frame);
    turn=null;
    if(ghosts)ghosts.layer.style.visibility='hidden';
    book.classList.remove('turning');
  }
  function layout() {
    reflow=0;
    if(disposed || !root.isConnected)return;
    discardTurn();
    prepareText();
    const width=windowEl.clientWidth,height=windowEl.clientHeight;
    columns=getComputedStyle(book).getPropertyValue('--leaf-columns').trim()==='2'?2:1;
    gap=parseFloat(getComputedStyle(flow).columnGap)||0;
    stride=(width+gap)/columns;
    root.style.setProperty('--leaf-height',height+'px');
    root.style.setProperty('--flow-width',width+'px');
    ready=prose.dataset.phase==='ready';
    const last=flow.lastElementChild;
    const base=flow.getBoundingClientRect();
    const scale=windowEl.getBoundingClientRect().width/width || 1;
    const end=Math.max(...[...last.getClientRects()].map(r=>(r.right-base.left)/scale),width);
    count=Math.max(columns,Math.ceil((end+gap-1)/stride));
    index=limit(Math.floor(pageAtAnchor()/columns)*columns);desired=index;
    ghosts?.layer.remove();ghosts=null;
    renderPages();remember();scheduleWarm();
  }
  function scheduleLayout() {
    if(!reflow)reflow=requestAnimationFrame(layout);
  }
  function scheduleWarm() {
    if(window.cancelIdleCallback)cancelIdleCallback(warming);else clearTimeout(warming);
    if(reducedMotion.matches || !ready)return;
    const warm=()=>{if(!disposed && !ghosts)prepareGhosts()};
    warming=window.requestIdleCallback?requestIdleCallback(warm,{timeout:600}):setTimeout(warm,100);
  }
  function copyFlow() {
    const copy=flow.cloneNode(true);
    copy.removeAttribute('id');
    for(const node of copy.querySelectorAll('[id]'))node.removeAttribute('id');
    copy.classList.add('folio-copy');copy.removeAttribute('role');
    return copy;
  }
  function prepareGhosts() {
    if(ghosts)return ghosts;
    const layer=document.createElement('div');
    layer.className='page-turn';layer.style.visibility='hidden';layer.inert=true;layer.setAttribute('aria-hidden','true');
    layer.innerHTML='<div class="old-leaf"><div class="leaf-window"></div></div><div class="turn-leaf"><div class="leaf-face leaf-front"><div class="leaf-window"></div></div><div class="leaf-face leaf-back"><div class="leaf-window"></div></div></div>';
    const copies=[...layer.querySelectorAll('.leaf-window')].map(slot=>{const copy=copyFlow();slot.append(copy);return copy;});
    book.append(layer);
    const shadows=[...layer.querySelectorAll('.leaf-face')].map(face=>{
      const shadow=document.createElement('i');shadow.className='turn-shadow';face.append(shadow);return shadow;
    });
    ghosts={layer,copies,shadows,leaf:layer.querySelector('.turn-leaf')};
    return ghosts;
  }
  function paintTurn() {
    if(!turn)return;
    const g=ghosts,t=turn.progress,p=drag?.active?t:t*t*(3-2*t);
    g.leaf.style.transform='rotateY('+(turn.direction>0?-180*p:180*p)+'deg)';
    for(const shadow of g.shadows)shadow.style.opacity=String(Math.sin(p*Math.PI)*.15);
    if(columns===1)g.leaf.style.opacity=String(1-Math.pow(p,7));
  }
  function startTurn(target) {
    const g=prepareGhosts(),direction=Math.sign(target-index);
    turn={from:index,to:target,direction,progress:0,goal:1,last:0};
    g.layer.style.visibility='visible';
    g.layer.dataset.direction=direction>0?'next':'previous';
    const staticPage=direction>0?index:index+columns-1;
    const frontPage=direction>0?index+columns-1:index;
    const backPage=direction>0?target:target+columns-1;
    [staticPage,frontPage,backPage].forEach((page,i)=>g.copies[i].style.transform='translateX('+(-page*stride)+'px)');
    if(columns===1)g.layer.querySelector('.old-leaf').hidden=true;
    else g.layer.querySelector('.old-leaf').hidden=false;
    index=target;renderPages();
    book.classList.add('turning');
    paintTurn();
  }
  function tick(now) {
    if(!turn)return;
    const elapsed=turn.last?Math.min(50,now-turn.last):0;turn.last=now;
    const speed=motionTime[desired===turn.to?'reading-turn':'reading-repeat'];
    const amount=elapsed/speed;
    turn.progress=turn.goal?Math.min(1,turn.progress+amount):Math.max(0,turn.progress-amount);
    paintTurn();
    if(turn.progress===turn.goal) {
      index=turn.goal?turn.to:turn.from;
      discardTurn();renderPages();remember();
      if(index!==desired) {startTurn(index+Math.sign(desired-index)*columns);frame=requestAnimationFrame(tick);}
    } else frame=requestAnimationFrame(tick);
  }
  function move(delta) {
    if(!ready || window.getSelection()?.toString())return;
    desired=limit(desired+delta*columns);
    if(reducedMotion.matches) {discardTurn();index=desired;renderPages();remember();return;}
    if(turn) {
      turn.goal=desired===turn.from?0:1;
      turn.last=0;
      return;
    }
    if(desired===index)return;
    startTurn(index+Math.sign(desired-index)*columns);
    frame=requestAnimationFrame(tick);
  }
  root.querySelector('.folio-controls').addEventListener('click',e=>{
    const button=e.target.closest('[data-page]');if(button)move(Number(button.dataset.page));
  },listen);
  document.addEventListener('keydown',e=>{
    if(e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.target.closest('input,textarea,select,pre,[contenteditable]') || !root.isConnected || root.closest('[inert]'))return;
    const delta=['ArrowRight','PageDown'].includes(e.key)?1:['ArrowLeft','PageUp'].includes(e.key)?-1:0;
    if(delta){e.preventDefault();move(delta);}
  },listen);
  windowEl.addEventListener('click',e=>{
    if(performance.now()<suppressClickUntil){e.preventDefault();return;}
    const a=e.target.closest('a[href^="#"]');
    if(a) {
      let id;try{id=decodeURIComponent(a.hash.slice(1))}catch{return}
      const destination=[...flow.querySelectorAll('[id]')].find(n=>n.id===id);
      if(destination){
        e.preventDefault();e.stopPropagation();
        const r=destination.getBoundingClientRect(),base=flow.getBoundingClientRect();
        discardTurn();index=desired=limit(Math.floor((r.left-base.left)/stride/columns)*columns);
        renderPages();remember();destination.tabIndex=-1;destination.focus({preventScroll:true});
      }
      return;
    }
    if(e.target.closest('button,pre,table') || window.getSelection()?.toString())return;
    const box=windowEl.getBoundingClientRect(),ratio=(e.clientX-box.left)/box.width;
    if(ratio<.14)move(-1);else if(ratio>.86)move(1);
  },listen);
  windowEl.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='touch' || !ready || e.clientX<24 || e.clientX>innerWidth-24 || window.getSelection()?.toString() || e.target.closest('a,button,pre,table'))return;
    drag={x:e.clientX,y:e.clientY,id:e.pointerId,active:false};
  },listen);
  windowEl.addEventListener('pointermove',e=>{
    if(!drag || drag.id!==e.pointerId)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
    if(!drag.active) {
      if(Math.abs(dy)>Math.abs(dx)+8){drag=null;return;}
      if(Math.abs(dx)<12)return;
      discardTurn();desired=index;
      const target=limit(index+(dx<0?1:-1)*columns);
      if(target===index){drag=null;return;}
      startTurn(target);drag.active=true;windowEl.setPointerCapture(e.pointerId);
    }
    cancelAnimationFrame(frame);
    turn.progress=Math.max(0,Math.min(1,-dx*turn.direction/(windowEl.clientWidth/columns)));
    if(!reducedMotion.matches)paintTurn();
  },listen);
  function endDrag(e) {
    if(!drag || drag.id!==e.pointerId)return;
    if(drag.active && turn) {
      suppressClickUntil=performance.now()+350;
      turn.goal=e.type==='pointercancel'?0:Number(turn.progress>.22);
      desired=turn.goal?turn.to:turn.from;turn.last=0;
      if(reducedMotion.matches){index=desired;discardTurn();renderPages();remember();}
      else frame=requestAnimationFrame(tick);
    }
    drag=null;
  }
  windowEl.addEventListener('pointerup',endDrag,listen);
  windowEl.addEventListener('pointercancel',endDrag,listen);
  reducedMotion.addEventListener('change',()=>{
    if(reducedMotion.matches){index=desired;discardTurn();renderPages();remember();}
  },listen);
  function imageChanged(e){if(!e.target.closest('.page-turn'))scheduleLayout();}
  root.addEventListener('load',imageChanged,{...listen,capture:true});
  root.addEventListener('error',imageChanged,{...listen,capture:true});
  const observer=new ResizeObserver(scheduleLayout);observer.observe(windowEl);
  document.fonts.ready.then(()=>{if(!disposed)scheduleLayout()});
  layout();
  const cover=root.querySelector('.reading-cover');
  let coverPhase='opening';
  if(cover) {
    const opening=animateChange(cover,[{transform:'rotateY(0deg)'},{transform:'rotateY(-165deg)',opacity:0}],'reading-open');
    const finishCover=()=>{if(coverPhase==='opening')cover.hidden=true;};
    if(opening)opening.finished.then(finishCover,finishCover);
    else cover.hidden=true;
  }
  return {
    refresh:layout,
    position:()=>anchor,
    async close(signal,target) {
      if(reducedMotion.matches || !cover || !root.isConnected)return;
      discardTurn();coverPhase='closing';
      for(const animation of cover.getAnimations())animation.cancel();
      cover.hidden=false;
      const closing=animateChange(cover,[{transform:'rotateY(-165deg)',opacity:0},{transform:'rotateY(0deg)',opacity:1}],'reading-close',{fill:'forwards'});
      const destination=target===origin?.hash?origin.rect:null;
      const bounds=book.getBoundingClientRect();
      const returning=destination?.viewport===innerWidth+'x'+innerHeight ? animateChange(book,[
        {transform:'none',transformOrigin:'0 0',opacity:1},
        {transform:'translate('+(destination.x-bounds.x)+'px,'+(destination.y-bounds.y)+'px) scale('+destination.width/bounds.width+','+destination.height/bounds.height+')',transformOrigin:'0 0',opacity:0}
      ],'reading-close',{fill:'forwards'}):null;
      const cancel=()=>{closing?.cancel();returning?.cancel()};
      signal.addEventListener('abort',cancel,{once:true});
      await Promise.allSettled([closing?.finished,returning?.finished]);
      signal.removeEventListener('abort',cancel);
    },
    dispose(){disposed=true;if(window.cancelIdleCallback)cancelIdleCallback(warming);else clearTimeout(warming);events.abort();observer.disconnect();cancelAnimationFrame(reflow);discardTurn();},
    move
  };
}
