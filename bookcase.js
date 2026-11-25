'use strict';

// The clickable shelf surfaces stay registered to the two ledges in the room painting.
const narrowCase = matchMedia('(max-width:650px)');
const mediumCase = matchMedia('(max-width:1000px)');
const binding = index => 'assets/interior/cover-' + (index % 6) + '.webp';
const yearHref = year => '#archive/' + year;

function shelfModel(page, arg, month, query='') {
  if (page==='articles') {
    return {mode:'articles',title:'全部书目',items:catalogMatches(query),unit:'篇',query};
  }
  if (page==='category' && shelves.has(arg)) {
    return {mode:'category',title:arg,items:shelves.get(arg),unit:'篇',back:'#categories',backLabel:'全部分类'};
  }
  if (page==='categories' || page==='category') {
    return {mode:'categories',title:'分类标签',items:shelfNames,unit:'类'};
  }
  const year=years.includes(arg) ? arg : '';
  return {mode:'archive',title:'年度合订本',items:years,unit:'册',year,month};
}

function jacket(label,index,href,kind,detail='') {
  const length=Array.from(label).length;
  return `<a class="shelf-object volume ${kind}" href="${href}" title="${escapeText(label)}" aria-label="${escapeText(label)}" style="--book-h:${[94,87,92,99,90][index%5]}%">
    <span class="book-leaves" aria-hidden="true"></span>
    <span class="jacket" style="background-image:url('${binding(index)}')">
      <span class="jacket-title ${length>16?'long-title':''}">${escapeText(label)}</span>
      ${detail?`<small>${detail}</small>`:''}
    </span></a>`;
}
function shelfObject(model,item,index) {
  if (model.mode==='categories') {
    return `<a class="shelf-object topic-divider" style="--books-direction:${index%3===1?-1:1};--group-height:${[85,78,91,83][index%4]}%" href="${catHref(item)}" aria-label="${escapeText(item)}，${shelves.get(item).length} 篇">
      <img src="assets/interior/dividers.webp" alt=""><span class="divider-label">${escapeText(item)}</span></a>`;
  }
  if (model.mode==='archive') return jacket(item,index,yearHref(item),'year-volume','日志合订本');
  return jacket(item.title,item.id,postHref(item),'article-volume');
}

function shelfColumns(mode) {
  if(mode==='archive')return 3;
  const columns=narrowCase.matches ? 2 : mediumCase.matches ? 3 : 5;
  return mode==='categories'?Math.min(columns,4):columns;
}
function arrangeShelves(model,offset) {
  const columns=shelfColumns(model.mode);
  const size=2*columns;
  const pages=Math.max(1,Math.ceil(model.items.length/size));
  const current=Math.max(0,Math.min(pages-1,Math.floor(offset/size)||0));
  const first=current*size;
  const books=model.items.slice(first,first+size);
  const middle=Math.ceil(books.length/2);
  const rows=[books.slice(0,middle),books.slice(middle)].map((items,r)=>
    `<div class="case-row tier-${r}" style="--slots:${columns}">${items.map((item,i)=>
      `<div class="case-slot">${shelfObject(model,item,first+i+(r?middle:0))}</div>`).join('')}</div>`
  ).join('');
  return {size,current,pages,first,rows};
}
function pager(arrangement) {
  const {pages,current}=arrangement;
  return `<button type="button" data-shelf-step="-1" aria-label="上一架" ${current===0?'disabled':''}>‹</button>
    <span aria-live="polite">第 ${current+1} / ${pages} 架</span>
    <button type="button" data-shelf-step="1" aria-label="下一架" ${current+1===pages?'disabled':''}>›</button>`;
}

function openVolume(year,requestedMonth) {
  const all=catalog.filter(p=>p.date.startsWith(year));
  const months=[...new Set(all.map(p=>p.date.slice(5,7)))];
  const month=months.includes(requestedMonth) ? requestedMonth : '';
  const tabs=['',...months].map(m=>`<a href="${yearHref(year)}${m?'/'+m:''}" ${m===month?'aria-current="page"':''}>${m?Number(m)+' 月':'全年'}</a>`).join('');
  const entries=(month?[month]:months).map(m=>`<section class="log-month"><h3>${Number(m)} 月</h3>
    ${all.filter(p=>p.date.slice(5,7)===m).map(p=>`<a class="log-entry" href="${postHref(p)}"><time datetime="${p.date}">${p.date.slice(8)} 日</time><span>${escapeText(p.title)}</span></a>`).join('')}</section>`).join('');
  return `<div class="volume-desk"><section class="spread" aria-label="${year} 年合订本">
    <div class="verso"><a class="shut-book" href="#archive" data-return>← 合上书</a><h2>${year}</h2>
      <p>日志合订本 · ${all.length} 篇</p><div class="month-ribbons" aria-label="按月翻阅">${tabs}</div></div>
    <div class="recto" tabindex="0" aria-label="${year} 年${month?Number(month)+' 月':'全年'}文章">${entries}</div>
    </section></div>`;
}

function bookcase(model,offset=0) {
  const a=arrangeShelves(model,offset);
  const period=beijingBookshopScene(Date.now()).period;
  const searching=model.mode==='articles';
  const opened=!!model.year;
  return `<section class="library shop-room" aria-label="${escapeText(model.title)}" data-mode="${model.mode}" data-offset="${a.first}" data-size="${a.size}">
    <div class="room-frame" ${opened?'inert':''}>
      <img class="room-wall" src="assets/interior/wall-${period}.webp" alt="" fetchpriority="high" draggable="false">
      <h1 class="case-sign">${escapeText(model.title)}<small class="case-count" aria-live="polite">${model.items.length} ${model.unit}</small></h1>
      <div class="racks">${a.rows}</div>
      <div class="no-books" ${model.items.length?'hidden':''}>架上没有这本书 <button type="button" data-clear-search>清空搜索</button></div>
      <div class="drawer-controls">
        <a class="drawer-tag case-back" href="${model.back||'#home'}" ${model.back?'data-return':''}>← ${model.backLabel||'回到店外'}</a>
        <div class="drawer-tag rack-pager" ${a.pages===1?'hidden':''}>${pager(a)}</div>
        ${searching?`<label class="drawer-tag search-tag"><i aria-hidden="true"></i><span class="sr">按标题查找文章</span><input type="search" autocomplete="off" placeholder="查找书名" value="${escapeText(model.query)}"></label>`:''}
      </div>
    </div>${opened?openVolume(model.year,model.month):''}</section>`;
}

function caseElement(html) {
  const template=document.createElement('template');
  template.innerHTML=html;
  const room=template.content.firstElementChild,wall=room.querySelector('.room-wall');
  if(wall && !wall.complete) {
    wall.style.opacity='0';
    wall.addEventListener('load',()=>{wall.style.removeProperty('opacity');animateChange(wall,[{opacity:0},{opacity:1}]);},{once:true});
  }
  return room;
}
function changeCase(room,next) {
  room.querySelector('.closing-spread')?.remove();
  const oldDesk=room.querySelector('.volume-desk'),desk=next.querySelector('.volume-desk');
  if(oldDesk && desk && oldDesk.querySelector('h2').textContent===desk.querySelector('h2').textContent) {
    const oldMonth=oldDesk.querySelector('[aria-current]').hash, newMonth=desk.querySelector('[aria-current]').hash;
    oldDesk.querySelectorAll('.month-ribbons a').forEach(a=>{
      if(a.hash===newMonth)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    });
    const leaf=oldDesk.querySelector('.recto');
    leaf.setAttribute('aria-label',desk.querySelector('.recto').getAttribute('aria-label'));
    leaf.replaceChildren(...desk.querySelector('.recto').childNodes);
    leaf.scrollTop=0;
    animateChange(leaf,[{opacity:.5,transform:'translateX('+(newMonth>oldMonth?7:-7)+'px)'},{opacity:1,transform:'none'}]);
    return;
  }
  const frame=room.querySelector('.room-frame');
  room.setAttribute('aria-label',next.getAttribute('aria-label'));
  frame.inert=!!desk;
  room.dataset.mode=next.dataset.mode;
  room.dataset.offset=next.dataset.offset;
  room.dataset.size=next.dataset.size;
  const oldArt=frame.querySelector('.room-wall'),art=next.querySelector('.room-wall');
  if(oldArt.getAttribute('src')!==art.getAttribute('src'))oldArt.src=art.src;
  frame.querySelector('.case-sign').replaceChildren(...next.querySelector('.case-sign').childNodes);
  replaceRack(frame.querySelector('.racks'),next.querySelector('.racks').innerHTML,0,!oldDesk && !desk);
  frame.querySelector('.drawer-controls').replaceWith(next.querySelector('.drawer-controls'));
  frame.querySelector('.no-books').hidden=next.querySelector('.no-books').hidden;
  if(oldDesk) {
    oldDesk.inert=true;oldDesk.classList.add('closing-spread');
    const fade=animateChange(oldDesk,[{opacity:1},{opacity:0}],'touch');
    if(fade)fade.finished.then(()=>oldDesk.remove(),()=>oldDesk.remove());else oldDesk.remove();
  }
  if(desk) {
    room.append(desk);
    animateChange(desk.querySelector('.spread'),[{opacity:.1,transform:'translateY(10px) scale(.97)'},{opacity:1,transform:'none'}],'open');
    desk.querySelector('.shut-book').focus({preventScroll:true});
  }
}

function warmShelves(mode) {
  if(navigator.connection?.saveData)return;
  const period=beijingBookshopScene(Date.now()).period;
  const files=['assets/interior/wall-'+period+'.webp',...(mode==='categories'?['assets/interior/dividers.webp']:Array.from({length:6},(_,i)=>binding(i)))];
  for(const file of files)loadEntryImage(file).catch(()=>{});
}
