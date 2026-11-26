'use strict';
const app = document.getElementById('main');
function home(){
  return `<h1 class="sr">猫的夜读书店</h1>
    <section class="scene" aria-label="夜读书店橱窗">
      <div class="stage">
        <div class="street" aria-hidden="true"><div class="street-plane"></div></div>
        <img class="store-art" alt="" width="2172" height="724" fetchpriority="high">
        <div class="shopfront">
          <span class="door-position" aria-hidden="true"></span>
          <div class="scene-links">${recentPosts.map(p=>'<a href="#post/'+p.id+'"><span>'+escapeText(p.title)+'</span></a>').join('')}</div>
        </div>
      </div>
    </section>
    <section class="home-mobile"><h2>最近写的</h2>${recentPosts.map(p=>row(p,true)).join('')}</section>`;
}
let stopScene, entryController, pendingLink, activeRoom;
const searchBox = () => app.querySelector('.search-tag input');
function snapshotList(link) {
  const room=app.querySelector('.shop-room');
  const prose=app.querySelector('.prose');
  if(prose && location.hash==='#post/'+prose.dataset.post){
    const view={hash:location.hash,y:window.scrollY,reader:bookReader?.position()};
    history.replaceState({...history.state,view},'');
  }
  if (!room) return;
  const view = {hash:location.hash, y:window.scrollY, query:searchBox()?.value || '',
    offset:Number(room.dataset.offset), leaf:room.querySelector('.recto')?.scrollTop || 0,
    focus:link && room.contains(link) ? link.getAttribute('href') : null};
  history.replaceState({...history.state,view},'');
}
function updateRack(offset,animate=true) {
  const room=app.querySelector('.shop-room');
  if(!room || !activeRoom) return;
  const a=arrangeShelves(activeRoom,offset);
  const direction=Math.sign(a.first-Number(room.dataset.offset));
  room.dataset.offset=a.first;
  room.dataset.size=a.size;
  replaceRack(room.querySelector('.racks'),a.rows,direction,animate);
  room.querySelector('.case-count').textContent=activeRoom.items.length+' '+activeRoom.unit;
  room.querySelector('.no-books').hidden=activeRoom.items.length>0;
  const controls=room.querySelector('.rack-pager');
  const step=document.activeElement?.dataset.shelfStep;
  controls.innerHTML=pager(a);
  controls.hidden=a.pages===1;
  if (step && !controls.hidden) {
    const buttons=[...controls.querySelectorAll('button:not([disabled])')];
    (buttons.find(b=>b.dataset.shelfStep===step)||buttons[0])?.focus({preventScroll:true});
  }
}
function updateSearch() {
  const query=searchBox().value;
  if(activeRoom?.mode==='articles' && activeRoom.query===query)return;
  activeRoom=shelfModel('articles',null,null,query);
  updateRack(0);
}
for(const type of ['input','compositionend']) app.addEventListener(type,e=>{
  if(!e.isComposing && e.target===searchBox())updateSearch();
});
app.addEventListener('click',e=>{
  const step=e.target.closest('[data-shelf-step]');
  if (step && activeRoom) {
    const a=arrangeShelves(activeRoom,Number(app.querySelector('.shop-room').dataset.offset));
    updateRack(a.first+Number(step.dataset.shelfStep)*a.size);
  }
  if(e.target.closest('[data-clear-search]')) {
    searchBox().value='';updateSearch();searchBox().focus();
  }
});
for(const breakpoint of [narrowCase,mediumCase]) breakpoint.addEventListener('change',()=>{
  if(activeRoom) updateRack(Number(app.querySelector('.shop-room')?.dataset.offset || 0),false);
});

async function pickBook(link,signal) {
  if (!link?.isConnected || !link.animate || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cover=link.querySelector('.jacket');
  const animations=[animateChange(link,[
    {transform:getComputedStyle(link).transform}, {transform:'translateY(-5%) scale(1.045)'}
  ],'open',{fill:'forwards'})];
  if(cover) animations.push(animateChange(cover,[
    {transform:'perspective(550px) rotateY(0)'}, {transform:'perspective(550px) rotateY(-54deg)'}
  ],'open',{fill:'forwards'}));
  const cancel=()=>animations.forEach(a=>a.cancel());
  signal.addEventListener('abort',cancel,{once:true});
  try {await Promise.allSettled(animations.map(a=>a.finished));}
  finally {signal.removeEventListener('abort',cancel);cancel();}
}
let prefetchTimer;
function prepareRecentPost(event) {
  const link=event.target.closest('a[href^="#post/"]');
  if (!link || navigator.connection?.saveData) return;
  clearTimeout(prefetchTimer);
  const post=catalog[Number(link.hash.slice(6))];
  if(post)prefetchTimer=setTimeout(()=>loadYear(post.date.slice(0,4)).catch(()=>{}),
    event.type==='pointerdown'?0:120);
}
for(const type of ['pointerover','pointerdown','focusin']) app.addEventListener(type,prepareRecentPost);
app.addEventListener('pointerout',e=>{if(!e.target.closest('a')?.contains(e.relatedTarget))clearTimeout(prefetchTimer)});
window.addEventListener('pagehide',()=>snapshotList(document.activeElement));
document.addEventListener('scrollend',()=>{
  if(app.querySelector('.prose'))snapshotList(null);
});
document.addEventListener('click',event=>{
  if (event.button || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link=event.target.closest('a[href^="#"]');
  if (!link || link.target || !link.hash) return;
  if(link.hash===location.hash) {window.dispatchEvent(new Event('bookshop-arrive'));return;}
  const source = location.hash || '#home';
  snapshotList(link);
  if (link.hasAttribute('data-return') && history.state?.origin?.hash===link.hash && history.length>1) {
    event.preventDefault();
    history.back();
    return;
  }
  const shop = !!link.closest('.scene-links, .home-mobile');
  let origin=null;
  if (link.hash.startsWith('#post/') || (source==='#categories' && link.hash.startsWith('#category/')) || (source==='#archive' && link.hash.startsWith('#archive/'))) {
    const label = shop ? '返回首页' : activeRoom?.mode==='category' ? '返回本架' :
      source.startsWith('#archive') ? '返回归档' : '返回书架';
    origin={hash:source,label};
    const object=link.closest('.shelf-object');
    if(object)origin.rect={...object.getBoundingClientRect().toJSON(),viewport:innerWidth+'x'+innerHeight};
  }
  pendingLink={target:link.hash,origin,shop,findBook:link.dataset.findBook,object:link.closest('.shelf-object')};
});

async function render(){
  const route=location.hash;
  const clicked = pendingLink?.target===route ? pendingLink : null;
  pendingLink=null;
  if(clicked) {
    const view=clicked.findBook===undefined?null:{hash:route,offset:Number(clicked.findBook),focus:postHref(catalog[Number(clicked.findBook)])};
    history.replaceState({route,origin:clicked.origin,view},'');
  }
  const origin=history.state?.route===route ? history.state.origin : null;
  const saved=history.state?.view?.hash===route ? history.state.view : null;
  stopScene?.();stopScene=null;
  let path;
  try{path=route.slice(1).split('/').map(decodeURIComponent)}catch{path=['home']}
  const [page,arg,month]=path;
  const top=page==='post'?'articles':page==='category'?'categories':page;
  document.querySelectorAll('nav a').forEach(a=>{
    if(a.hash==='#'+top)a.setAttribute('aria-current','page');
    else a.removeAttribute('aria-current');
  });
  const isRoom=['articles','categories','category','archive'].includes(page);
  const homeRoute=!page || page==='home';
  const redirect=isRoom || homeRoute || page==='post' ? passage : null;
  if(!redirect)entryController?.abort();
  const controller=redirect?entryController:(entryController=new AbortController());
  const picking=redirect?Promise.resolve():bookReader ? bookReader.close(controller.signal,route) : pickBook(clicked?.object,controller.signal);
  let html,model,phase='loading',loadNotice=false;
  const post=page==='post'?catalog[Number(arg)]:null;
  function readingState(state) {
    phase=state;
    if(location.hash!==route || controller.signal.aborted)return;
    const prose=app.querySelector('.prose[data-phase="loading"]');
    if(prose && prose.dataset.post===String(post.id)) {
      prose.innerHTML=articleBody(post,phase);
      prose.dataset.phase=phase;prose.setAttribute('aria-busy','false');
      if(phase==='ready' && saved?.y)window.scrollTo(0,saved.y);
      app.querySelector('.book-end').hidden=phase!=='ready';
      bookReader?.refresh();
      const message=prose.querySelector('.reading-message');
      if(message)animateChange(message,[{opacity:0},{opacity:1}],'touch');
    }
  }
  if(page==='post'){
    if(post) {
      const timer=setTimeout(()=>{
        loadNotice=true;
        const message=app.querySelector('.prose[data-phase="loading"] [role=status]');
        if(message && location.hash===route && !controller.signal.aborted)message.textContent='正在取书…';
      },150);
      loadYear(post.date.slice(0,4)).then(()=>readingState('ready'),()=>readingState('error')).finally(()=>clearTimeout(timer));
    }
  }else if(isRoom){
    model=shelfModel(page,arg,month,saved?.query);
    html=bookcase(model,saved?.offset);
  }else html=home();
  await picking;
  if(controller.signal.aborted || location.hash!==route)return;
  let landing,mounted=false;
  function display(prepared){
    if(mounted)return;
    mounted=true;
    const previousRoom=app.querySelector('.shop-room'),wasReading=!!app.querySelector('.book-reading');
    bookReader?.dispose();bookReader=null;
    activeRoom=model;
    if(page==='post')html=article(Number(arg),origin,phase);
    if(post && prepared) {
      const body=prepared.querySelector('.prose');
      body.innerHTML=articleBody(post,phase);
      body.dataset.phase=phase;body.setAttribute('aria-busy',phase==='loading');
      prepared.querySelector('.book-end').hidden=phase!=='ready';
    }
    if(previousRoom && model)changeCase(previousRoom,caseElement(html));
    else if(model)app.replaceChildren(prepared || caseElement(html));
    else if(prepared)app.replaceChildren(prepared);
    else if (landing) app.replaceChildren(...landing.childNodes);
    else app.innerHTML=html;
    if(model && prepared && Number(prepared.dataset.size)!==2*shelfColumns(model.mode))updateRack(saved?.offset || 0,false);
    // Direct visits to an interior route may not have loaded the storefront yet.
    if(post || model)prepareCatScene(beijingBookshopScene(Date.now())).catch(()=>{});
    if(post) {
      bookReader=mountReader(app.querySelector('.book-reading'),saved,origin);
      const book=app.querySelector('.bound-book'),bounds=book.getBoundingClientRect();
      const source=clicked?.origin?.rect;
      const start=source ? 'translate('+(source.x-bounds.x)+'px,'+(source.y-bounds.y)+'px) scale('+source.width/bounds.width+','+source.height/bounds.height+')' : 'translateY(10px) scale(.975)';
      animateChange(book,[{opacity:.3,transform:start,transformOrigin:'0 0'},{opacity:1,transform:'none',transformOrigin:'0 0'}],'reading-open');
      const heading=app.querySelector('.article-heading h1');
      heading?.focus({preventScroll:true});
      if(heading)animateChange(heading,[{opacity:.5,transform:'translateY(3px)'},{opacity:1,transform:'none'}]);
      if(phase==='loading' && loadNotice)app.querySelector('.reading-message').textContent='正在取书…';
    }
    document.title=(app.querySelector('h1')?.textContent||'夜读书店')+' · zyz 的日志记录';
    const picture=app.querySelector('.store-art');
    if(picture) stopScene=startCatWindow(picture);
    window.scrollTo(0,saved?.y || 0);
    const leaf=app.querySelector('.recto');
    if (leaf && saved) leaf.scrollTop=saved.leaf;
    const restored=saved?.focus && [...app.querySelectorAll('a')].find(a=>a.getAttribute('href')===saved.focus);
    if(restored) {
      restored.focus({preventScroll:true});
      if(wasReading && restored.matches('.shelf-object')) {
        animateChange(restored,[{transform:'translateY(-6px) scale(1.025)'},{transform:'none'}]);
        const jacket=restored.querySelector('.jacket');
        if(jacket)animateChange(jacket,[{transform:'perspective(550px) rotateY(-38deg)'},{transform:'none'}]);
      }
    }
  }

  if(redirect && passage===redirect) {
    const template=document.createElement('template');
    template.innerHTML=post?article(Number(arg),origin,phase):html || '';
    redirect.turn(!!model || !!post,model || post ? template.content.firstElementChild : null,display);
    return;
  }
  const inside=app.querySelector('.shop-room,.book-reading');
  const leave=(!page || page==='home') && !!(inside || app.querySelector('article'));
  const enter=app.querySelector('.stage') && (model || post);
  if (!leave && !enter) {display();return;}
  try {
    let stage = app.querySelector('.stage');
    if (leave) {
      // Measure the actual destination before moving it into the document flow.
      landing = document.createElement('div');
      landing.className = 'home-destination';
      landing.inert = true;
      landing.innerHTML = html;
      document.body.append(landing);
      stage = landing.querySelector('.stage');
      applyCatScene(stage.querySelector('.store-art'), beijingBookshopScene(Date.now()));
    }
    let shelfInterior;
    if (enter && (model || post)) {
      const template=document.createElement('template');
      template.innerHTML=post?article(Number(arg),origin,phase):html;
      shelfInterior=template.content.firstElementChild;
    } else if (leave && inside) {
      shelfInterior=inside;
    }
    if(shelfInterior)await crossThreshold(stage,shelfInterior,leave,display,controller.signal);
    else display();
    if (!controller.signal.aborted && !app.querySelector(':focus')) app.focus({preventScroll:true});
  } finally { landing?.remove(); }
}
// The router positions each destination; browser restoration would move the article before the exit shot.
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
document.addEventListener('keydown',event=>{
  if(event.key!=='Escape' || passage || event.target.matches('input'))return;
  const close=app.querySelector('.shut-book,.reading-toolbar .crumb a');
  if(close){event.preventDefault();close.click();}
});
app.addEventListener('click',e=>{if(e.target.closest('[data-retry]'))render()});
window.addEventListener('hashchange',render);render();
for(const type of ['focusin','pointerover','pointerdown']) document.querySelector('header nav').addEventListener(type,e=>{
  const link=e.target.closest('a');
  if(link && app.querySelector('.stage'))warmShelves(link.hash.slice(1));
});
