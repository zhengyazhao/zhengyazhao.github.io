'use strict';

const entryImages = new Map();
function loadEntryImage(src) {
  if (!entryImages.has(src)) {
    const image = new Image();
    image.src = src;
    entryImages.set(src, image.decode().then(() => image).catch(error => {
      entryImages.delete(src);
      throw error;
    }));
  }
  return entryImages.get(src);
}

const lerp = (a, b, t) => a + (b - a) * t;
function easePhase(time, start, end) {
  const t = Math.max(0, Math.min(1, (time - start) / (end - start)));
  return t * t * (3 - 2 * t);
}

// A hinge and four strips share the storefront's already-decoded image.
function mountFacade(front,photo,bounds,leaf,stage) {
  const w=bounds.width,h=bounds.height,x=leaf.left-bounds.left,y=leaf.top-bounds.top;
  const dw=leaf.width,dh=leaf.height;
  front.style.width=w+'px';front.style.height=stage.clientHeight+'px';
  for(const name of ['--painting-height','--street-top','--street-image','--street-tone'])
    front.style.setProperty(name,stage.style.getPropertyValue(name));
  front.append(stage.querySelector('.street').cloneNode(true));
  const facade=document.createElement('div');
  Object.assign(facade.style,{position:'absolute',width:w+'px',height:h+'px',maskImage:'linear-gradient(#000 89%,transparent 100%)'});
  front.append(facade);
  function strip(left,top,width,height) {
    const part=document.createElement('span');
    Object.assign(part.style,{left:left+'px',top:top+'px',width:width+'px',height:height+'px',
      backgroundImage:'url("'+(photo.currentSrc||photo.src)+'")',backgroundSize:w+'px '+h+'px',
      backgroundPosition:-left+'px '+(-top)+'px'});
    facade.append(part);
    return part;
  }
  strip(0,0,x+.3,h);strip(x+dw-.3,0,w-x-dw+.3,h);
  strip(x,0,dw,y+.3);strip(x,y+dh-.3,dw,h-y-dh+.3);
  const door=strip(x,y,dw,dh);
  door.style.transformOrigin='left center';
  return door;
}

