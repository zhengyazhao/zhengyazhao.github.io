'use strict';

window.startShopActivity = function (scene) {
  const street = scene.querySelector('.actor-layer');
  const button = scene.querySelector('.naruto-hit');
  const pose = scene.querySelector('.naruto-pose');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const durations = {kakashi: 7600, lee: 3200, hinata: 5800};
  const doorFrames = ['hinata-door-0', 'hinata-door-1', 'hinata-door-2'];
  let period = '', onScreen = true, nextVisitor, restAnimation;
  let previousVisitor = '', remaining = [];

  // Start each new arrival from its own clock, even if a walker is still on the street.
  function scheduleVisit() {
    nextVisitor = setTimeout(() => {
      if (!remaining.length) remaining = period === 'day' ? ['kakashi', 'lee', 'hinata'] : ['kakashi', 'lee'];
      const choices = remaining.filter(name => name !== previousVisitor);
      const pool = choices.length ? choices : remaining;
      const name = pool[Math.floor(Math.random() * pool.length)];
      remaining.splice(remaining.indexOf(name), 1);
      previousVisitor = name;
      const figure = document.createElement('div');
      if (name === 'hinata') {
        figure.className = 'vignette hinata';
        for (const frame of doorFrames) {
          const img = new Image();
          img.src = 'assets/shop/' + frame + '.webp';
          img.alt = '';
          figure.append(img);
        }
      } else {
        figure.className = 'traveller ' + name;
        figure.style.setProperty('--crossing', durations[name] + 'ms');
        figure.innerHTML = '<div class="stride"></div>';
      }
      figure.addEventListener('animationend', e => {
        if (e.animationName === 'cross-street' || e.animationName === 'hinata-enter') figure.remove();
      });
      street.append(figure);
      scheduleVisit();
    }, 10_000);
  }

  // Each group of ten in-between drawings joins two consecutive key poses.
  const columns = 7, rows = 6, lastFrame = 40;
  function position(frame) {
    return (frame % columns) * 100 / (columns - 1) + '% ' +
      Math.floor(frame / columns) * 100 / (rows - 1) + '%';
  }
  function restFrames() {
    const frames = [];
    const stops = [[0,0], [10,.11], [20,.20], [30,.30], [40,.40],
      [40,.67], [30,.75], [20,.84], [10,.93], [0,1]];
    for (let index = 0; index < stops.length - 1; index++) {
      const [from, start] = stops[index], [to, end] = stops[index+1];
      const count = Math.max(1, Math.abs(to - from));
      for (let step = 0; step < count; step++) {
        const t = step / count;
        frames.push({offset:start + (end-start)*t,
          backgroundPosition:position(Math.round(from + (to-from)*t)), easing:'steps(1, end)'});
      }
    }
    frames.push({offset:1, backgroundPosition:position(0)});
    return frames;
  }
  const restSequence = restFrames();
  function rest() {
    if (button.hidden || restAnimation) return;
    const still = reduced.matches;
    restAnimation = pose.animate(still ? [
      {backgroundPosition:position(lastFrame)}, {backgroundPosition:position(lastFrame)}
    ] : restSequence, {duration:still ? 2000 : 6200});
    restAnimation.onfinish = () => { restAnimation = null; };
  }
  function stop() {
    clearTimeout(nextVisitor);
    street.replaceChildren();
    restAnimation?.cancel();
    restAnimation = null;
  }
  function update() {
    stop();
    remaining = [];
    const visible = onScreen && !document.hidden;
    scene.dataset.paused = String(!visible || reduced.matches);
    button.hidden = !['day', 'night'].includes(period);
    if (period && visible && !reduced.matches) scheduleVisit();
  }
  const observer = new IntersectionObserver(([entry]) => {
    if (entry.isIntersecting !== onScreen) {
      onScreen = entry.isIntersecting;
      update();
    }
  });
  observer.observe(scene);
  button.addEventListener('click', rest);
  document.addEventListener('visibilitychange', update);
  reduced.addEventListener('change', update);

  // Warm the sprite cache before the first arrival.
  for (const name of ['kakashi', 'lee', ...doorFrames]) {
    const img = new Image();
    img.src = 'assets/shop/' + name + '.webp';
  }
  return {
    setPeriod(value) {
      if (period !== value) { period = value; update(); }
    },
    destroy() {
      stop();
      observer.disconnect();
      button.removeEventListener('click', rest);
      reduced.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
    }
  };
};
