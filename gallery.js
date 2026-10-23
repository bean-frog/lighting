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

    images.forEach((file, i) => {
      const tile = document.createElement('figure');
      tile.className = 'g-tile';
      tile.tabIndex = 0;
      const img = document.createElement('img');
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = `gallery/${encodeURIComponent(id)}/${encodeURIComponent(file)}`;
      const caption = meta.captions[i];
      img.alt = caption || `${meta.title || id} ${i}`;
      tile.append(img);
      if (caption) {
        const cap = document.createElement('figcaption');
        cap.className = 'g-cap';
        const span = document.createElement('span');
        span.textContent = caption;
        cap.append(span);
        tile.append(cap);
        // touch devices have no hover: tap toggles the caption
        tile.addEventListener('click', () => {
          if (!matchMedia('(hover: none)').matches) return;
          const was = tile.classList.contains('is-active');
          grid.querySelectorAll('.is-active').forEach((t) => t.classList.remove('is-active'));
          tile.classList.toggle('is-active', !was);
        });
      }
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
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && body.classList.contains('gallery-open')) closeBtn.click(); });

  if (location.hash === '#gallery') { load(); setOpen(true); }
})();
