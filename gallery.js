
// Gallery overlay. Entries come from gallery/manifest.json (npm run gallery) plus each folder's meta.txt:
//   title: Some Title
//   0: caption for first image
//   1: caption for second image
(() => {
  const body = document.body;
  const gallery = document.getElementById('gallery');
  const openBtn = document.getElementById('gallery-open');
  const closeBtn = document.getElementById('gallery-close');
  const entriesEl = document.getElementById('gallery-entries');
  const scroller = document.getElementById('gallery-scroll');
  let loaded = null;

  function parseMeta(text) {
    const meta = { title: '', captions: {} };
    for (const line of text.split(/\r?\n/)) {
      const m = line.match(/^\s*(title|\d+)\s*[:=]\s*(.*?)\s*$/i);
      if (!m) continue;
      if (m[1].toLowerCase() === 'title') meta.title = m[2];
      else meta.captions[Number(m[1])] = m[2];
    }
    return meta;
  }


  // ---- Lightbox: the tile's thumbnail lifts out of the grid and grows to full size (FLIP), then settles back on close.
  const lb = document.createElement('div');
  lb.className = 'lb';
  lb.setAttribute('role', 'dialog');
  lb.setAttribute('aria-modal', 'true');
  lb.setAttribute('aria-label', 'Image viewer');
  lb.innerHTML = '<div class="lb-bg"></div><img class="lb-img" alt=""><p class="lb-cap"><span></span></p><button type="button" class="lb-close" aria-label="Close image">&times;</button>';
  gallery.append(lb);
  const lbBg = lb.querySelector('.lb-bg');
  const lbImg = lb.querySelector('.lb-img');
  const lbCap = lb.querySelector('.lb-cap span');
  const lbClose = lb.querySelector('.lb-close');
  let lbTile = null;
  let lbRatio = 1;
  let lbTimer = 0;

  function lbFit() {
    const o = lb.getBoundingClientRect();
    const padX = Math.min(48, o.width * 0.04), padTop = 64, padBottom = lbCap.textContent ? 88 : 48;
    const maxW = o.width - padX * 2, maxH = o.height - padTop - padBottom;
    let w = maxW, h = w / lbRatio;
    if (h > maxH) { h = maxH; w = h * lbRatio; }
    return { x: (o.width - w) / 2, y: padTop + (maxH - h) / 2, w, h, ox: o.left, oy: o.top };
  }
  function lbPlace(f) {
    Object.assign(lbImg.style, { left: f.x + 'px', top: f.y + 'px', width: f.w + 'px', height: f.h + 'px' });
  }
  function lbFrom(f, tile) {
    const r = tile.getBoundingClientRect();
    return `translate(${r.left - f.ox - f.x}px, ${r.top - f.oy - f.y}px) scale(${r.width / f.w})`;
  }

  function openLightbox(tile, thumbEl, id, image) {
    clearTimeout(lbTimer);
    lbTile = tile;
    lbRatio = image.w / image.h;
    lbImg.alt = image.caption || '';
    lbImg.src = thumbEl.currentSrc || thumbEl.src;
    lbCap.textContent = image.caption || '';
    lb.classList.add('is-shown');
    const f = lbFit();
    lbPlace(f);
    lbImg.style.transition = 'none';
    lbImg.style.transform = lbFrom(f, tile);
    lbImg.style.borderRadius = '0.75rem';
    lbImg.getBoundingClientRect(); // commit the start frame
    tile.classList.add('is-lifted');
    lbImg.style.transition = '';
    lb.classList.add('is-open');
    lbImg.style.transform = 'none';
    lbClose.focus({ preventScroll: true });

    // swap in the full-size file once it has decoded; same aspect ratio, so nothing jumps
    const full = new Image();
    full.src = `gallery/${encodeURIComponent(id)}/${encodeURIComponent(image.src)}`;
    full.decode().then(() => { if (lbTile === tile) lbImg.src = full.src; }, () => {});
  }

  function closeLightbox() {
    if (!lbTile) return;
    const tile = lbTile;
    lbTile = null;
    lb.classList.remove('is-open');
    const f = lbFit();
    const r = tile.getBoundingClientRect();
    const o = lb.getBoundingClientRect();
    const onScreen = r.bottom > o.top && r.top < o.bottom && r.right > o.left && r.left < o.right;
    if (onScreen) lbImg.style.transform = lbFrom(f, tile);
    else lbImg.style.opacity = '0';
    lbTimer = setTimeout(() => {
      tile.classList.remove('is-lifted');
      lb.classList.remove('is-shown');
      lbImg.style.opacity = '';
      lbImg.removeAttribute('src');
    }, 750);
    tile.focus({ preventScroll: true });
  }

  lbBg.addEventListener('click', closeLightbox);
  lbImg.addEventListener('click', closeLightbox);
  lbClose.addEventListener('click', closeLightbox);
  addEventListener('resize', () => {
    if (!lbTile) return;
    lbImg.style.transition = 'none';
    lbPlace(lbFit());
    lbImg.getBoundingClientRect();
    lbImg.style.transition = '';
  });

  async function loadEntry({ id, images }) {
    let meta = { title: '', captions: {} };
    try {
      const res = await fetch(`gallery/${encodeURIComponent(id)}/meta.txt`);
      if (res.ok) meta = parseMeta(await res.text());
    } catch {}

    const section = document.createElement('section');
    section.className = 'g-entry';
    const h2 = document.createElement('h2');
    h2.className = 'g-title';
    h2.textContent = meta.title || id;
    const grid = document.createElement('div');
    grid.className = 'g-grid';

    images.forEach((image, i) => {
      const tile = document.createElement('figure');
      tile.className = 'g-tile';
      tile.tabIndex = 0;
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      // reserve the final box up front so late-loading images never reflow the columns
      img.width = image.w;
      img.height = image.h;
      tile.style.aspectRatio = `${image.w} / ${image.h}`;
      const reveal = () => tile.classList.add('is-loaded');
      img.addEventListener('load', () => { (img.decode ? img.decode() : Promise.resolve()).then(reveal, reveal); }, { once: true });
      img.addEventListener('error', reveal, { once: true });
      img.src = `gallery/${encodeURIComponent(id)}/${image.thumb.split('/').map(encodeURIComponent).join('/')}`;
      const caption = meta.captions[i];
      image.caption = caption || '';
      img.alt = caption || `${meta.title || id} ${i}`;
      tile.append(img);
      if (caption) {
        const cap = document.createElement('figcaption');
        cap.className = 'g-cap';
        const span = document.createElement('span');
        span.textContent = caption;
        cap.append(span);
        tile.append(cap);
      }
      tile.addEventListener('click', () => openLightbox(tile, img, id, image));
      tile.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tile.click(); }
      });
      grid.append(tile);
    });

    section.append(h2, grid);
    return section;
  }

  function load() {
    if (loaded) return loaded;
    entriesEl.innerHTML = '<p class="g-status">loading&hellip;</p>';
    loaded = (async () => {
      try {
        const res = await fetch('gallery/manifest.json');
        if (!res.ok) throw new Error(res.status);
        const sections = await Promise.all((await res.json()).map(loadEntry));
        entriesEl.replaceChildren(...sections);
        if (!sections.length) entriesEl.innerHTML = '<p class="g-status">nothing here yet</p>';
        let n = 0;
        entriesEl.querySelectorAll('.g-tile').forEach((t) => t.style.setProperty('--i', n++));
      } catch {
        loaded = null;
        entriesEl.innerHTML = '<p class="g-status">couldn’t load the gallery</p>';
      }
    })();
    return loaded;
  }

  function setOpen(open) {
    if (!open) closeLightbox();
    body.classList.toggle('gallery-open', open);
    gallery.inert = !open;
    gallery.setAttribute('aria-hidden', String(!open));
    document.querySelector('main').inert = open;
    if (open) { scroller.scrollTop = 0; closeBtn.focus({ preventScroll: true }); }
    else openBtn.focus({ preventScroll: true });
  }

  openBtn.addEventListener('click', () => {
    load();
    history.pushState({ gallery: true }, '', '#gallery');
    setOpen(true);
  });
  closeBtn.addEventListener('click', () => {
    if (history.state && history.state.gallery) history.back();
    else { history.replaceState(null, '', location.pathname); setOpen(false); }
  });
  addEventListener('popstate', () => setOpen(location.hash === '#gallery'));
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (lbTile) closeLightbox();
    else if (body.classList.contains('gallery-open')) closeBtn.click();
  });

  if (location.hash === '#gallery') { load(); setOpen(true); }

  // ---- Services overlay: same open/close behaviour as the gallery.
  const services = document.getElementById('services');
  const sOpen = document.getElementById('services-open');
  const sClose = document.getElementById('services-close');

  function setServices(open) {
    body.classList.toggle('services-open', open);
    services.inert = !open;
    services.setAttribute('aria-hidden', String(!open));
    document.querySelector('main').inert = open;
    if (open) { services.querySelector('.g-scroll').scrollTop = 0; sClose.focus({ preventScroll: true }); }
    else sOpen.focus({ preventScroll: true });
  }

  sOpen.addEventListener('click', () => {
    history.pushState({ services: true }, '', '#services');
    setServices(true);
  });
  sClose.addEventListener('click', () => {
    if (history.state && history.state.services) history.back();
    else { history.replaceState(null, '', location.pathname); setServices(false); }
  });
  addEventListener('popstate', () => setServices(location.hash === '#services'));
  addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && body.classList.contains('services-open')) sClose.click();
  });

  if (location.hash === '#services') setServices(true);
})();
