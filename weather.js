'use strict';

const shopScenes = {
  sun: {label:'晴日', art:'sun', period:'day', sky:'clear'},
  rain: {label:'春雨', art:'rain', period:'day', sky:'rain'},
  autumn: {label:'秋日', art:'autumn', period:'day', sky:'clear'},
  gust: {label:'秋风', art:'gust', period:'day', sky:'clear', windy:true, autumn:true},
  autumnRain: {label:'秋雨', art:'autumn-rain', period:'day', sky:'rain', windy:true, autumn:true},
  winter: {label:'冬日', art:'winter', period:'day', sky:'clear'},
  snow: {label:'落雪', art:'snow', period:'day', sky:'snow'},
  dusk: {label:'黄昏拉帘', art:'curtain', period:'dusk', sky:'clear'},
  clearNight: {label:'夜读', art:'reading', period:'night', sky:'clear'},
  wetNight: {label:'雨夜', art:'reading', period:'night', sky:'rain'},
  closed: {label:'熄灯', art:'closed', period:'closed', sky:'clear'}
};

window.startShopWeather = function () {
  const api = 'https://api.open-meteo.com/v1/forecast?latitude=39.9042&longitude=116.4074&timezone=Asia%2FShanghai&current=weather_code,temperature_2m,wind_speed_10m,wind_direction_10m,wind_gusts_10m&daily=weather_code,sunrise,sunset&forecast_days=2';
  const cacheKey = 'zyz-bookshop-beijing-v3';
  const scene = document.querySelector('.scene');
  const picture = scene.querySelector('.store-art');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const activity = window.startShopActivity(scene);
  const alt = {sun:'晴天，鸣人在临街书店的窗边写字',rain:'雨落在石板路上，鸣人在屋里写字',autumn:'秋叶落在路面，鸣人在窗边写字',gust:'风卷起秋叶，鸣人在店里写字','autumn-rain':'秋雨落在石板路和金黄的落叶上',winter:'冬日树枝疏朗，鸣人在窗边写字',snow:'窗台覆雪，鸣人在灯下写字',curtain:'黄昏时鸣人起身拉上窗帘',reading:'台灯在帘上投出鸣人读书的剪影',closed:'窗内灯光熄灭，门前留着一盏灯'};
  const beijing = new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
  const stamp = time => typeof time === 'string' ? Date.parse(time+'+08:00') : NaN;
  const params = new URLSearchParams(location.search);
  const selection = {
    scene:Object.hasOwn(shopScenes,params.get('scene')) ? params.get('scene') : 'auto',
    form:params.get('form') === 'sage' ? 'sage' : 'normal'
  };
  let data, controller, timeout, timer, nextRequest = 0, disposed = false;
  let duskKey = '', finishedDusk = '';
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey));
    if (cached?.forecast?.timezone === 'Asia/Shanghai') {
      data = cached.forecast;
      const age = Date.now() - cached.savedAt;
      if (age >= 0 && age < 15*60000) nextRequest = cached.savedAt + 15*60000;
    }
  } catch {}

  function sky(code) {
    if ([0,1].includes(code)) return 'clear';
    if ([2,3].includes(code)) return 'cloud';
    if ([45,48].includes(code)) return 'fog';
    if ([71,73,75,77,85,86].includes(code)) return 'snow';
    if ([95,96,99].includes(code)) return 'storm';
    return [51,53,55,56,57,61,63,65,66,67,80,81,82].includes(code) ? 'rain' : 'neutral';
  }
  function state(now,day,localTime) {
    const index = data?.daily?.time?.indexOf(day) ?? -1;
    const current = data?.current;
    const age = now-stamp(current?.time);
    const fresh = age >= -15*60000 && age < 3600000 && sky(current?.weather_code) !== 'neutral';
    const dailyCode = data?.daily?.weather_code?.[index];
    const code = fresh ? current.weather_code : dailyCode;
    const condition = sky(code);
    const month = Number(day.slice(5,7));
    const autumn = month >= 9 && month <= 11;
    const winter = month === 12 || month <= 2;
    const windy = !!fresh && (current.wind_speed_10m >= 20 || current.wind_gusts_10m >= 35);
    // The clock keeps running when the weather provider is offline.
    const rise = stamp(data?.daily?.sunrise?.[index]) || stamp(day+'T07:00');
    const sunset = stamp(data?.daily?.sunset?.[index]) || stamp(day+'T18:00');
    let period = 'day';
    if (localTime >= '23:00' || now < rise) period = 'closed';
    else if (now >= sunset) period = now < sunset+6*60000 ? 'dusk' : 'night';
    let art;
    if (period !== 'day') art = {closed:'closed',dusk:'curtain',night:'reading'}[period];
    else if (condition === 'snow') art = 'snow';
    else if (condition === 'rain' || condition === 'storm') art = autumn ? 'autumn-rain' : winter ? 'winter' : 'rain';
    else if (autumn) art = windy ? 'gust' : 'autumn';
    else if (winter) art = 'winter';
    else art = 'sun';
    return {art,period,sky:condition,windy,autumn,direction:current?.wind_direction_10m};
  }
  function show() {
    if (disposed) return;
    const now = Date.now(), local = beijing.format(now);
    const date = local.slice(0,10), time = local.slice(11,16);
    let s = shopScenes[selection.scene] || state(now,date,time);
    scene.dataset.form = selection.form;
    duskKey = s.period === 'dusk' ? date : '';
    if (duskKey && (finishedDusk === duskKey || reducedMotion.matches)) s = {...s,period:'night',art:'reading'};
    if (scene.dataset.art !== s.art) {
      picture.src = 'assets/shop/'+s.art+'.webp';
      picture.alt = alt[s.art];
      scene.dataset.art = s.art;
    }
    scene.dataset.period = s.period;
    scene.dataset.sky = s.sky;
    scene.dataset.wind = s.windy ? (s.autumn?'leaves':'wind') : 'calm';
    scene.dataset.flow = s.direction > 0 && s.direction < 180 ? 'left' : 'right';
    activity.setPeriod(s.period);
  }
  function curtainsClosed(e) {
    if (e.animationName !== 'draw-curtain' || !duskKey) return;
    finishedDusk = duskKey;
    show();
  }
  async function refresh() {
    if (disposed || controller || document.hidden) return;
    controller = new AbortController();
    timeout = setTimeout(()=>controller?.abort(),8000);
    nextRequest = Date.now()+60000;
    show();
    try {
      const res = await fetch(api,{signal:controller.signal,referrerPolicy:'no-referrer'});
      if (!res.ok) throw Error('weather');
      const result = await res.json();
      if (!disposed && result.timezone === 'Asia/Shanghai' && result.current && Array.isArray(result.daily?.time)) {
        data = result;
        nextRequest = Date.now()+15*60000;
        try { localStorage.setItem(cacheKey,JSON.stringify({forecast:result,savedAt:Date.now()})); } catch {}
      }
    } catch {} finally { clearTimeout(timeout); controller=null; show(); }
  }
  function tick() {
    clearTimeout(timer);
    if (disposed || document.hidden) return;
    show();
    if (Date.now() >= nextRequest) refresh();
    timer = setTimeout(tick,60000-Date.now()%60000+5);
  }
  function choose(group, value) {
    if (group === 'scene') finishedDusk = '';
    selection[group] = value;
    const url = new URL(location.href);
    if (value === 'auto' || value === 'normal') url.searchParams.delete(group);
    else url.searchParams.set(group,value);
    history.replaceState(history.state,'',url);
    show();
  }
  const names = Object.fromEntries(Object.entries(shopScenes).map(([key, value])=>[key,value.label]));
  const closeMenu = window.startShopMenu(scene, names, key=>selection[key], choose);
  scene.addEventListener('animationend',curtainsClosed);
  reducedMotion.addEventListener('change',show);
  document.addEventListener('visibilitychange',tick);
  show();
  tick();
  return () => {
    disposed=true;
    clearTimeout(timer); clearTimeout(timeout); controller?.abort();
    activity.destroy();
    closeMenu();
    scene.removeEventListener('animationend',curtainsClosed);
    reducedMotion.removeEventListener('change',show);
    document.removeEventListener('visibilitychange',tick);
  };
};
