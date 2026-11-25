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

function applyCatScene(picture, scene) {
  picture.dataset.requested=scene.src;
  if (picture.getAttribute('src') === scene.src) return;
  const stage=picture.closest('.stage');
  function install() {
    if (picture.dataset.requested!==scene.src || !stage.isConnected) return;
    const old=picture.getAttribute('src') && picture.complete && picture.naturalWidth && !reducedMotion.matches
      ? picture.cloneNode(false) : null;
    picture.alt=scene.alt; picture.src=scene.src;
    stage.dataset.period=scene.period; stage.dataset.variant=scene.variant;
    stage.classList.remove('missing-art');
    picture.onerror=()=>stage.classList.add('missing-art');
    if(old) {
      old.className='previous-season';old.alt='';old.setAttribute('aria-hidden','true');
      picture.after(old);
      const fade=animateChange(old,[{opacity:1},{opacity:0}]);
      if(fade)fade.finished.then(()=>old.remove(),()=>old.remove());else old.remove();
    }
  }
  if(!picture.getAttribute('src'))install();
  else {loadEntryImage(scene.src).then(install).catch(()=>{});return;}

}

function startCatWindow(picture) {
  let timer;
  function update() {
    clearTimeout(timer);
    if (document.hidden) return;
    const now = Date.now(), scene = beijingBookshopScene(now);
    applyCatScene(picture, scene);
    timer = setTimeout(update, Math.ceil(scene.nextChange - now) + 1);
  }
  document.addEventListener('visibilitychange',update);
  window.addEventListener('pageshow',update);
  update();
  return () => {
    clearTimeout(timer);
    document.removeEventListener('visibilitychange',update);
    window.removeEventListener('pageshow',update);
  };
}
