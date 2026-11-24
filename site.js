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
  return '<section class="shelf-hero"><div class="shelf-title">'+crumb('分类')+'<h1>分类书架</h1><p>'+sorted.length+' 个分类</p></div><img src="assets/shop/shelf.webp" alt="鸣人把手中的书归回木书架"></section><div class="shelves wrap"><section><div class="sec-head"><h2>文章最多的书架</h2></div>'+tiles(sorted.slice(0,8))+'</section><section class="others"><div class="sec-head"><h2>其他分类</h2></div>'+tiles(sorted.slice(8))+'</section></div>';
}
function archive(year) {
  if(!years.includes(year)) year=years[0];
  const list=catalog.filter(p=>p.date.startsWith(year));
  const groups=[...new Set(list.map(p=>p.date.slice(5,7)))];
  return '<div class="archive-layout"><aside class="archive-aside"><img src="assets/shop/archive.webp" alt="鸣人把索引卡收进木制抽屉"><div><h1>文章归档</h1><p>'+years.at(-1)+' — '+years[0]+'　/　'+catalog.length+' 篇</p></div></aside><section class="ledger">'+crumb('归档')+'<div class="year-tabs" aria-label="按年份浏览">'+years.map(y=>'<a aria-current="'+(year===y)+'" href="#archive/'+y+'">'+y+'</a>').join('')+'</div><div class="sec-head"><h2>'+year+'</h2><span class="num">'+list.length+' 篇</span></div>'+groups.map(m=>'<section class="month"><h3>'+months[Number(m)-1]+'月</h3>'+list.filter(p=>p.date.slice(5,7)===m).map(p=>row(p,true)).join('')+'</section>').join('')+'</section></div>';
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
function comic() {
  const captions=['乌鸦低头看着盘起的线','乌鸦吓得跳了起来','原来是 USB 插头'];
  return '<figure class="comic"><div class="comic-strips">'+captions.map((s,i)=>'<div class="panel"><img src="assets/crow-'+i+'.webp" alt="'+s+'"></div>').join('')+'</div><button type="button">↻　重播漫画</button></figure>';
}
async function article(id,route) {
  const p=catalog[id]; if(!p) return listing();
  await loadYear(p.date.slice(0,4)); if(location.hash!==route)return '';
  const split=p.title.indexOf('：'), title=split>0?escapeText(p.title.slice(0,split))+'<span>'+escapeText(p.title.slice(split+1))+'</span>':escapeText(p.title);
  let body=window.posts[id] || '<p>这篇日志的原文仅有标题。</p>';
  if(id===9)body=body.replace('</p>', '</p>'+comic());
  return '<div class="book-layout"><figure class="portrait"><img src="assets/shop/reader.webp" alt="鸣人坐在窗边的台灯下读书"></figure><div class="paper">'+crumb('<a href="#articles">文章</a>', '← 返回首页')+'<article><h1>'+title+'</h1><div class="metadata"><time>'+p.date+'</time><span class="dot"></span>zyz'+p.cats.map(c=>'<span class="dot"></span><a href="'+catHref(c)+'">'+escapeText(c)+'</a>').join('')+'</div><div class="prose">'+body+'</div><div class="article-exits"><a href="#home">← 返回首页</a><a class="original" href="'+p.url+'">查看原站文章 ↗</a></div></article></div></div>';
}
function startComic(){
  const f=document.querySelector('.comic');if(!f)return;
  function play(manual){
    f.classList.remove('play');if(manual)f.classList.add('requested');
    void f.offsetWidth;f.classList.add('play');
  }
  f.querySelector('button').addEventListener('click',()=>play(true));
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)play(false);
}
function home(){
  const ids=['王阳明心学摘录','复盘方法论','思维模式'].map(t=>catalog.find(p=>p.title===t));
  const particles = Array.from({length:48}, (_,i) =>
    '<i style="left:'+((i*37)%103)+'%;--still:'+((i*43)%98)+'%;--delay:-'+(i*.41).toFixed(2)+'s;--speed:'+(0.9+i%7*.14).toFixed(2)+'s"></i>').join('');
  return `<h1 class="sr">鸣人的夜读书店</h1>
    <section class="scene" tabindex="0" aria-haspopup="menu" aria-keyshortcuts="Shift+F10" aria-label="夜读书店橱窗，右键或长按可更换场景和鸣人形态">
      <div class="stage">
        <img class="store-art" alt="夜读书店的临街橱窗" decoding="async" fetchpriority="high">
        <div class="shopkeeper" aria-hidden="true"><div class="naruto-pose"></div></div><div class="curtain-draw" aria-hidden="true"><div class="shopkeeper"><div class="curtain-reader"></div></div></div>
        <div class="actor-layer" aria-hidden="true"></div><div class="climate" aria-hidden="true"></div>
        <div class="fx" aria-hidden="true">${particles}</div><div class="gust-fx" aria-hidden="true">${'<i></i>'.repeat(7)}</div>
        <button class="naruto-hit" type="button" aria-label="让鸣人起身休息" hidden></button>
        <div class="scene-links">${ids.map(p=>'<a href="#post/'+p.id+'"><span>'+escapeText(p.title)+'</span></a>').join('')}</div>
      </div>
    </section>
    <section class="home-mobile"><h2>最近写的</h2>${ids.map(p=>row(p,true)).join('')}</section>
    <div class="weather-credit"><span>天气数据 <a href="https://open-meteo.com/">Open-Meteo</a></span></div>`;

}
let stopWeather=()=>{};
async function render(){
  stopWeather();stopWeather=()=>{};
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
  if(app.querySelector('.scene')) stopWeather=window.startShopWeather();
  startComic();window.scrollTo(0,0);
}
window.addEventListener('hashchange',render);render();
