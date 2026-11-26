'use strict';

// Solar noon and the sunrise/sunset hour angle for Beijing, using NOAA's
// approximation: https://gml.noaa.gov/grad/solcalc/solareqns.PDF
function beijingBookshopScene(now) {
  const dayMs = 86_400_000, offset = 8 * 3_600_000;
  const local = new Date(now + offset);
  const year = local.getUTCFullYear(), month = local.getUTCMonth();
  const midnight = Date.UTC(year, month, local.getUTCDate());
  const yearStart = Date.UTC(year, 0, 1);
  const gamma = 2 * Math.PI * (midnight - yearStart) / (Date.UTC(year + 1, 0, 1) - yearStart);
  const cos = Math.cos, sin = Math.sin, radians = Math.PI / 180;
  const equation = 229.18 * (.000075 + .001868*cos(gamma) - .032077*sin(gamma)
    - .014615*cos(2*gamma) - .040849*sin(2*gamma));
  const declination = .006918 - .399912*cos(gamma) + .070257*sin(gamma)
    - .006758*cos(2*gamma) + .000907*sin(2*gamma) - .002697*cos(3*gamma) + .00148*sin(3*gamma);
  const latitude = 39.9042 * radians, longitude = 116.4074;
  const hourAngle = Math.acos(cos(90.833*radians) / (cos(latitude)*cos(declination))
    - Math.tan(latitude)*Math.tan(declination)) / radians;
  const solarNoon = midnight + (720 - 4*longitude - equation) * 60_000;
  const sunrise = solarNoon - 4*hourAngle*60_000, sunset = solarNoon + 4*hourAngle*60_000;
  const day = now >= sunrise && now < sunset;
  const seasons = [['winter','冬'],['spring','春'],['summer','夏'],['autumn','秋']];
  const [season, label] = seasons[Math.floor(((month+1)%12)/3)];
  return {
    src:'assets/cat/panorama/'+season+'-'+(day?'day':'night')+'.webp',
    variant:season+'-'+(day?'day':'night'),
    period:day?'day':'night',
    alt:label+(day?'日，戴眼镜的橘猫坐在书店窗边打字':'夜，戴眼镜的橘猫在书店灯下读书'),
    nextChange:now < sunrise ? sunrise : day ? sunset : midnight + dayMs - offset
  };
}

function sizeCatScene(stage) {
  const paintHeight=stage.clientWidth/3;
  stage.style.setProperty('--painting-height',paintHeight+'px');
  stage.style.setProperty('--street-top',paintHeight*.86+'px');
}

const sceneTasks=new WeakMap();
const streetImage=variant=>'assets/cat/panorama/street-'+(variant.startsWith('winter')?'winter':'leafy')+'.webp';
function prepareCatScene(scene) {
  return Promise.all([loadEntryImage(scene.src),loadEntryImage(streetImage(scene.variant))]);
}

function applyCatScene(picture, scene) {
  if(picture.dataset.requested===scene.src && sceneTasks.has(picture))return sceneTasks.get(picture);
  picture.dataset.requested=scene.src;
  const stage=picture.closest('.stage');
  sizeCatScene(stage);
  const ready=prepareCatScene(scene).then(async()=>{
    if (sceneTasks.get(picture)!==ready || !stage.isConnected) return false;
    let old;
    if(picture.getAttribute('src') && picture.complete && picture.naturalWidth && !reducedMotion.matches) {
      old=document.createElement('div');old.className='previous-season';old.setAttribute('aria-hidden','true');
      old.style.cssText=stage.style.cssText;
      const art=picture.cloneNode(false);art.className='previous-art';art.alt='';
      old.append(stage.querySelector('.street').cloneNode(true),art);
    }
    picture.alt=scene.alt; picture.src=scene.src;
    stage.style.setProperty('--street-image','url("'+streetImage(scene.variant)+'")');
    stage.style.setProperty('--street-tone',scene.period==='night'?'brightness(.28) saturate(.65)':'none');
    sizeCatScene(stage);
    stage.dataset.period=scene.period; stage.dataset.variant=scene.variant;
    stage.classList.remove('missing-art');
    picture.onerror=()=>stage.classList.add('missing-art');
    if(old) {
      picture.after(old);
      const fade=animateChange(old,[{opacity:1},{opacity:0}]);
      if(fade)fade.finished.then(()=>old.remove(),()=>old.remove());else old.remove();
    }
    await picture.decode();
    return sceneTasks.get(picture)===ready && stage.isConnected;
  }).catch(()=>{
    if(sceneTasks.get(picture)===ready) {
      sceneTasks.delete(picture);
      if(!picture.naturalWidth)stage.classList.add('missing-art');
    }
    return false;
  });
  sceneTasks.set(picture,ready);
  return ready;
}

function startCatWindow(picture) {
  let timer;
  function update() {
    clearTimeout(timer);
    if (document.hidden) return;
    if(document.querySelector('.shelf-portal')) {timer=setTimeout(update,250);return;}
    const now = Date.now(), scene = beijingBookshopScene(now);
    applyCatScene(picture, scene);
    timer = setTimeout(update, Math.ceil(scene.nextChange - now) + 1);
  }
  document.addEventListener('visibilitychange',update);
  window.addEventListener('pageshow',update);
  const observer=new ResizeObserver(()=>sizeCatScene(picture.closest('.stage')));
  observer.observe(picture.closest('.stage'));
  update();
  return () => {
    clearTimeout(timer);
    document.removeEventListener('visibilitychange',update);
    window.removeEventListener('pageshow',update);
    observer.disconnect();
  };
}
