'use strict';

window.startShopMenu = function (scene, scenes, readSelection, choose) {
  const groups = {
    scene: {label:'更换场景', options:{auto:'跟随北京天气', ...scenes}},
    form: {label:'鸣人形态', options:{normal:'常态', sage:'仙人模式'}}
  };
  const menu = document.createElement('div');
  menu.className = 'shop-menu';
  menu.id = 'shop-context-menu';
  menu.hidden = true;
  menu.setAttribute('role', 'menu');
  document.body.append(menu);
  scene.setAttribute('aria-controls', menu.id);
  scene.setAttribute('aria-expanded', 'false');

  const listeners = new AbortController();
  const {signal} = listeners;
  let group = '', anchorX = 0, anchorY = 0, opener = scene;
  let pressTimer, touchOrigin, suppressReleaseClick = false;

  function hide(restoreFocus = false) {
    if (menu.hidden) return;
    menu.hidden = true;
    scene.setAttribute('aria-expanded', 'false');
    if (restoreFocus && opener.isConnected) opener.focus({preventScroll:true});
  }

  function place() {
    const box = menu.getBoundingClientRect();
    const left = Math.max(8, Math.min(anchorX, document.documentElement.clientWidth - box.width - 8));
    const top = Math.max(8, Math.min(anchorY, window.innerHeight - box.height - 8));
    Object.assign(menu.style, {left:left+'px', top:top+'px'});
  }

  function item(text, action, value, checked) {
    const el = document.createElement('button');
    el.type = 'button';
    el.tabIndex = -1;
    el.textContent = text;
    el.dataset.action = action;
    el.dataset.value = value;
    el.setAttribute('role',checked === undefined ? 'menuitem' : 'menuitemradio');
    if (checked !== undefined) el.setAttribute('aria-checked', String(checked));
    if (action === 'group') el.setAttribute('aria-haspopup', 'menu');
    return el;
  }

  function display(nextGroup = '', focusValue = '') {
    group = nextGroup;
    menu.dataset.group = group;
    menu.setAttribute('aria-label', groups[group]?.label || '书店选项');
    menu.replaceChildren();
    if (group) {
      const back = item(groups[group].label, 'back', '');
      back.setAttribute('aria-label', '返回书店选项');
      menu.append(back);
      const selected = readSelection(group);
      for (const [key, name] of Object.entries(groups[group].options))
        menu.append(item(name, 'select', key, key === selected));
    } else {
      for (const [key, data] of Object.entries(groups))
        menu.append(item(data.label, 'group', key));
    }
    place();
    const target = focusValue && [...menu.children].find(el=>el.dataset.value === focusValue);
    (target || menu.querySelector('[aria-checked=true]') || menu.firstElementChild).focus({preventScroll:true});
  }

  function open(x, y, target) {
    anchorX=x; anchorY=y;
    opener=target.closest('a,button,[tabindex]') || scene;
    menu.hidden=false;
    scene.setAttribute('aria-expanded', 'true');
    display();
  }
  function cancelPress() {
    clearTimeout(pressTimer);
    touchOrigin = null;
  }
  scene.addEventListener('contextmenu', e => {
    e.preventDefault();
    cancelPress();
    if (e.pointerType === 'touch') suppressReleaseClick = true;
    open(e.clientX, e.clientY, e.target);
  }, {signal});
  scene.addEventListener('keydown', e => {
    if (e.key !== 'ContextMenu' && !(e.shiftKey && e.key === 'F10')) return;
    e.preventDefault();
    const b=e.target.getBoundingClientRect();
    open(b.left+Math.min(60,b.width/2), b.top+Math.min(40,b.height/2), e.target);
  }, {signal});

  scene.addEventListener('pointerdown', e => {
    suppressReleaseClick = false;
    cancelPress();
    if (e.pointerType !== 'touch' || !e.isPrimary) return;
    touchOrigin={x:e.clientX,y:e.clientY};
    pressTimer=setTimeout(()=>{
      suppressReleaseClick=true;
      open(e.clientX,e.clientY,e.target);
    },550);
  }, {signal});
  scene.addEventListener('pointermove', e => {
    if (touchOrigin && Math.hypot(e.clientX-touchOrigin.x,e.clientY-touchOrigin.y)>10) cancelPress();
  }, {signal});
  for (const type of ['pointerup','pointercancel','pointerleave'])
    scene.addEventListener(type, cancelPress, {signal});
  scene.addEventListener('click', e => {
    if (suppressReleaseClick && e.detail !== 0) {
      suppressReleaseClick = false;
      e.preventDefault();
      e.stopPropagation();
    }
  }, {capture:true,signal});

  menu.addEventListener('click', e => {
    const button = e.target.closest('button');
    if (!button) return;
    const {action, value} = button.dataset;
    if (action === 'group') display(value);
    else if (action === 'back') display('', group);
    else {choose(group, value); hide(true);}
  }, {signal});
  menu.addEventListener('keydown', e => {
    const buttons = [...menu.querySelectorAll('button')];
    const here = buttons.indexOf(document.activeElement);
    if (e.key === 'Tab') {hide(true);return;}
    if (e.key === 'Escape') {e.preventDefault();hide(true);return;}
    if (e.key === 'ArrowLeft' && group) {e.preventDefault();display('',group);return;}
    if (e.key === 'ArrowRight' && !group) {e.preventDefault();buttons[here]?.click();return;}
    const destinations = {Home:0, End:buttons.length-1, ArrowDown:here+1, ArrowUp:here-1};
    if (!Object.hasOwn(destinations,e.key)) return;
    e.preventDefault();
    buttons[(destinations[e.key]+buttons.length)%buttons.length].focus();
  }, {signal});
  document.addEventListener('pointerdown', e => {
    if (!menu.contains(e.target)) hide();
  }, {capture:true,signal});
  document.addEventListener('scroll', e => {
    if (!menu.contains(e.target)) hide();
  }, {capture:true,signal});
  window.addEventListener('resize', () => {if(!menu.hidden) place();}, {signal});
  window.addEventListener('blur', () => hide(), {signal});
  return () => {
    cancelPress();
    listeners.abort();
    menu.remove();
  };
};
