'use strict';
const app = document.getElementById('main');
const catalog = window.catalog;
window.posts = Object.create(null);
const categoryCounts = new Map();
for (const entry of catalog) for (const cat of entry.cats) categoryCounts.set(cat, (categoryCounts.get(cat) || 0) + 1);
const colors = ['#356056','#94513e','#bd8848','#546478','#665137','#8a6449','#8f7540'];
const years = [...new Set(catalog.map(p => p.date.slice(0,4)))];
const months = '一 二 三 四 五 六 七 八 九 十 十一 十二'.split(' ');
const loadedYears = new Map();
const escapeText = text => String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const catHref = cat => '#category/'+encodeURIComponent(cat);
function row(p,shortDate=false) {
  return '<a class="entry" href="#post/'+p.id+'"><time class="date" datetime="'+p.date+'">'+(shortDate?p.date.slice(5):p.date)+'</time><b>'+escapeText(p.title)+'</b><i aria-hidden="true">↗</i></a>';
}
function crumb(text, homeLabel = '夜读书店') {return '<div class="crumb"><a href="#home">'+homeLabel+'</a>　/　'+text+'</div>'}
function categories() {
  const sorted=[...categoryCounts.keys()].sort((a,b)=>categoryCounts.get(b)-categoryCounts.get(a)||a.localeCompare(b,'zh'));
  function tiles(cats){return '<div class="shelf-grid">'+cats.map((c,i)=>'<a class="shelf-link" href="'+catHref(c)+'"><i class="spine" aria-hidden="true" style="--color:'+colors[i%colors.length]+'"></i><b>'+escapeText(c)+'</b><span class="num">'+categoryCounts.get(c)+' 篇</span></a>').join('')+'</div>'}
  return '<section class="shelf-hero"><div class="shelf-title">'+crumb('分类')+'<h1>分类书架</h1><p>'+sorted.length+' 个分类</p></div><img src="assets/shelf.webp" alt="橘猫站在矮凳上，把书放回木书架"></section><div class="shelves wrap"><section><div class="sec-head"><h2>文章最多的书架</h2></div>'+tiles(sorted.slice(0,8))+'</section><section class="others"><div class="sec-head"><h2>其他分类</h2></div>'+tiles(sorted.slice(8))+'</section></div>';
}
function archive(year) {
  if(!years.includes(year)) year=years[0];
  const list=catalog.filter(p=>p.date.startsWith(year));
  const groups=[...new Set(list.map(p=>p.date.slice(5,7)))];
  return '<div class="archive-layout"><aside class="archive-aside"><img src="assets/archive.webp" alt="橘猫在木制索引柜前整理卡片"><div><h1>文章归档</h1><p>'+years.at(-1)+' — '+years[0]+'　/　'+catalog.length+' 篇</p></div></aside><section class="ledger">'+crumb('归档')+'<div class="year-tabs" aria-label="按年份浏览">'+years.map(y=>'<a aria-current="'+(year===y)+'" href="#archive/'+y+'">'+y+'</a>').join('')+'</div><div class="sec-head"><h2>'+year+'</h2><span class="num">'+list.length+' 篇</span></div>'+groups.map(m=>'<section class="month"><h3>'+months[Number(m)-1]+'月</h3>'+list.filter(p=>p.date.slice(5,7)===m).map(p=>row(p,true)).join('')+'</section>').join('')+'</section></div>';
}
function listing(cat) {
  const list=cat?catalog.filter(p=>p.cats.includes(cat)):catalog;
  return '<section class="listing wrap"><div class="list-head">'+crumb(cat?'<a href="#categories">分类</a>　/　'+escapeText(cat):'文章')+'<h1>'+escapeText(cat||'全部文章')+'</h1><p>'+list.length+' 篇</p></div>'+list.map(p=>row(p)).join('')+'</section>';
}
function loadYear(year){
  if(!loadedYears.has(year)) loadedYears.set(year,new Promise((resolve,reject)=>{
    const s=document.createElement('script');s.src='assets/posts-'+year+'.js';s.onload=resolve;
    s.onerror=()=>{loadedYears.delete(year);reject(Error('文章读取失败'))};document.head.append(s);
  }));
  return loadedYears.get(year);
}
async function article(id,route) {
  const p=catalog[id]; if(!p) return listing();
  await loadYear(p.date.slice(0,4)); if(location.hash!==route)return '';
  const split=p.title.indexOf('：'), title=split>0?escapeText(p.title.slice(0,split))+'<span>'+escapeText(p.title.slice(split+1))+'</span>':escapeText(p.title);
  const body=window.posts[id] || '<p>这篇日志的原文仅有标题。</p>';
  return '<div class="book-layout"><figure class="portrait"><img src="assets/reader.webp" alt="戴眼镜的橘猫坐在窗边的灯下读书"></figure><div class="paper">'+crumb('<a href="#articles">文章</a>', '← 返回首页')+'<article><h1>'+title+'</h1><div class="metadata"><time>'+p.date+'</time><span class="dot"></span>zyz'+p.cats.map(c=>'<span class="dot"></span><a href="'+catHref(c)+'">'+escapeText(c)+'</a>').join('')+'</div><div class="prose">'+body+'</div><div class="article-exits"><a href="#home">← 返回首页</a><a class="original" href="'+p.url+'">查看原站文章 ↗</a></div></article></div></div>';
}
function home(){
  const ids=['王阳明心学摘录','复盘方法论','思维模式'].map(t=>catalog.find(p=>p.title===t));
  return `<h1 class="sr">猫的夜读书店</h1>
    <section class="scene" aria-label="夜读书店橱窗">
      <div class="stage">
        <img class="store-art" alt="" width="1536" height="852" fetchpriority="high">
        <div class="scene-links">${ids.map(p=>'<a href="#post/'+p.id+'"><span>'+escapeText(p.title)+'</span></a>').join('')}</div>
      </div>
    </section>
    <section class="home-mobile"><h2>最近写的</h2>${ids.map(p=>row(p,true)).join('')}</section>`;
}
let stopScene;
async function render(){
  stopScene?.();stopScene=null;
  const route=location.hash;let path;try{path=decodeURIComponent(route.slice(1)).split('/')}catch{path=['home']}
  const [page,arg]=path;
  const top=page==='post'?'articles':page==='category'?'categories':page;
  document.querySelectorAll('nav a').forEach(a=>{if(a.hash==='#'+top)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current')});
  let html;
  if(page==='post'){
    try{html=await article(Number(arg),route)}catch{html='<div class="wrap list-head"><h1>文章暂时无法读取</h1><a href="#home">← 返回首页</a>　<a href="#articles">返回文章目录</a></div>'}
  }else if(page==='categories')html=categories();
  else if(page==='category')html=listing(arg);
  else if(page==='articles')html=listing();
  else if(page==='archive')html=archive(arg);
  else html=home();
  if(location.hash!==route)return;
  app.innerHTML=html;document.title=(app.querySelector('h1')?.textContent||'夜读书店')+' · zyz 的日志记录';
  const picture=app.querySelector('.store-art');
  if(picture) stopScene=startCatWindow(picture);
  window.scrollTo(0,0);
}
window.addEventListener('hashchange',render);render();
