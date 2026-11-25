'use strict';

const catalog = window.catalog;
const shelves = new Map();
for (const post of catalog) {
  for (const name of post.cats) {
    if (!shelves.has(name)) shelves.set(name, []);
    shelves.get(name).push(post);
  }
}
const shelfNames = [...shelves.keys()].sort((a,b) =>
  shelves.get(b).length - shelves.get(a).length || a.localeCompare(b,'zh-CN'));
const years = [...new Set(catalog.map(post => post.date.slice(0,4)))];
const recentPosts = ['王阳明心学摘录','复盘方法论','思维模式'].map(title => catalog.find(p => p.title === title));
const escapeText = text => String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const catHref = name => '#category/' + encodeURIComponent(name);
const postHref = post => '#post/' + post.id;

function row(post, shortDate=false) {
  return `<a class="entry" href="${postHref(post)}"><time class="date" datetime="${post.date}">${shortDate ? post.date.slice(5) : post.date}</time><b>${escapeText(post.title)}</b><i aria-hidden="true">↗</i></a>`;
}

function catalogMatches(query) {
  const needle = query.trim().normalize('NFKC').toLocaleLowerCase();
  return needle ? catalog.filter(p => p.title.normalize('NFKC').toLocaleLowerCase().includes(needle)) : catalog;
}
const loadedYears = new Map();
window.posts = Object.create(null);
function loadYear(year) {
  if (!loadedYears.has(year)) loadedYears.set(year,new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='assets/posts-'+year+'.js';
    function fail(){clearTimeout(timeout);script.onload=script.onerror=null;loadedYears.delete(year);script.remove();reject(Error('文章读取失败'));}
    const timeout=setTimeout(fail,10000);
    script.onload=()=>{clearTimeout(timeout);resolve()};
    script.onerror=fail;
    document.head.append(script);
  }));
  return loadedYears.get(year);
}

function articleBody(post,phase) {
  if(phase==='error')return '<div class="reading-message" role="alert">这本书暂时取不出来。 <button type="button" data-retry>再试一次</button></div>';
  if(phase==='loading')return '<div class="reading-message" role="status"></div>';
  const html=window.posts[post.id] || '<p>这篇日志的原文仅有标题。</p>';
  // Only inspect the leading heading. The browser parses the full article once, on insertion.
  const heading=html.match(/^\s*<h1\b[^>]*>[\s\S]*?<\/h1>/i);
  if(!heading)return html;
  const sample=document.createElement('template');
  sample.innerHTML=heading[0];
  const first=sample.content.firstElementChild;
  if(first.textContent.trim()!==post.title.trim())return html;
  const anchor=first.id ? '<span id="'+escapeText(first.id)+'"></span>' : '';
  return anchor+html.slice(heading[0].length);
}
function article(id,origin,phase) {
  const post=catalog[id];
  if(!post)return '<div class="empty-catalog"><h1>文章不存在</h1><a href="#articles">返回文章书架</a></div>';
  const back = `<a ${origin?'data-return':'data-find-book="'+id+'"'} href="${escapeText(origin?.hash || '#articles')}" aria-label="合上书，${escapeText(origin?.label || '返回文章书架')}">← 合上书</a>`;
  const home = origin?.hash==='#home' ? '' : '<a href="#home">书店首页</a>';
  const period=beijingBookshopScene(Date.now()).period;
  return `<section class="book-reading" style="--reading-room:url('assets/interior/wall-${period}.webp')">
    <div class="reading-toolbar"><div class="crumb">${back}${home}</div><a class="original-entry" href="${escapeText(post.url)}">原文 ↗</a></div>
    <div class="bound-book" data-cover="closed" aria-label="${escapeText(post.title)}">
      <div class="folio-window" tabindex="0" aria-label="文章书页">
        <article class="folio-flow"><div class="article-heading"><h1 tabindex="-1">${escapeText(post.title)}</h1>
          <div class="metadata"><time datetime="${post.date}">${post.date}</time><span>zyz</span>
          ${post.cats.map(c=>`<a href="${catHref(c)}">${escapeText(c)}</a>`).join('')}</div></div>
          <div class="prose" data-post="${id}" data-phase="${phase}" aria-busy="${phase==='loading'}">${articleBody(post,phase)}</div>
          <p class="book-end" ${phase==='ready'?'':'hidden'}>读到这里 · 合上书，歇一会儿</p>
        </article>
      </div>
      <div class="book-binding" aria-hidden="true"></div>
      <div class="reading-cover" aria-hidden="true" style="background-image:url('${binding(id)}')"><span>${escapeText(post.title)}</span></div>
    </div>
    <div class="folio-controls" aria-label="翻阅文章">
      <button type="button" data-page="-1" aria-label="上一页" disabled>← <span>上一页</span></button>
      <span class="folio-count" role="status" aria-live="polite"></span>
      <button type="button" data-page="1" aria-label="下一页" disabled><span>下一页</span> →</button>
    </div>
  </section>`;
}
