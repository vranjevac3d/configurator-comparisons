const CATEGORIES = [
  {
    id: 'textures', label: 'Textures',
    options: ['JPG', 'WebP', 'KTX2', 'AVIF'], default: 'JPG',
  },
  {
    id: 'resolution', label: 'Texture Resolution',
    options: ['2K', '1K', '512px'], default: '2K',
  },
  {
    id: 'modelComplexity', label: 'Model Complexity',
    options: ['High poly', 'Low poly + Normal', 'Low poly + AO'], default: 'High poly',
  },
  {
    id: 'fabrics', label: 'Fabrics',
    options: ['Full PBR', 'Diffuse', 'Normal Map', 'AO Map'], default: 'Full PBR',
  },
  {
    id: 'format', label: '3D Format',
    options: ['GLB', 'gITF', 'FBX', 'OBJ', 'USDZ'], default: 'GLB',
  },
  {
    id: 'compression', label: 'Compression',
    options: ['Draco', 'MeshOpt', 'None'], default: 'Draco',
  },
  {
    id: 'lod', label: 'LOD',
    options: ['Static high-res', 'Dynamic LOD'], default: 'Static high-res',
  },
  {
    id: 'envLighting', label: 'Env Lighting',
    options: ['HDR map', 'Flat ambient', 'Baked lightmaps'], default: 'HDR map',
  },
  {
    id: 'modelShadows', label: 'Model Shadows',
    options: ['Real-time', 'None'], default: 'Real-time',
  },
  {
    id: 'floorShadows', label: 'Floor Shadows',
    options: ['Contact', 'Real-time', 'Baked', 'None'], default: 'Contact',
  },
  {
    id: 'gtao', label: 'GTAO',
    options: ['Off', 'On'], default: 'Off',
  },
  {
    id: 'renderer', label: 'Renderer',
    options: ['WebGL2', 'WebGPU'], default: 'WebGL2',
  },
  {
    id: 'anisotropy', label: 'Anisotropy',
    options: ['1x', '2x', '4x', '8x', 'MAX'], default: '4x',
  },
  {
    id: 'drawCallBatching', label: 'Draw Call Batching',
    options: ['Merged', 'Separate', 'BatchedMesh'], default: 'Separate',
  },
  {
    id: 'textureFiles', label: 'Texture Files',
    options: ['Texture atlas', 'Separate'], default: 'Separate',
  },
];

const WOODS = [
  'HF Custom Natural',
  'HF Custom Bramble',
  'HF Custom Java',
];

const LEATHERS = [
  '901200-87',
  '901200-48', '901200-99',
  '906700-45', '906700-81', '906700-84', '906700-88', '906700-97',
  '907200-45',
];

export function initSidebar(onChange, defaults = {}) {
  const sidebar = document.getElementById('sidebar');

  // Header
  const header = document.createElement('div');
  header.className = 'sb-header';
  header.textContent = 'Configurator Compare';
  sidebar.appendChild(header);

  // Config tab header
  const configHeader = document.createElement('div');
  configHeader.className = 'sb-tab-header';
  configHeader.innerHTML = '<span class="sb-tab-arrow">▾</span><span>Config</span>';
  sidebar.appendChild(configHeader);

  // Config scroll area
  const configEl = document.createElement('div');
  configEl.className = 'sb-config';

  const WIP_IDS = new Set(['modelComplexity', 'format', 'lod', 'drawCallBatching', 'textureFiles', 'renderer']);
  const WIP_OPTS = new Set(['envLighting:Baked lightmaps', 'compression:MeshOpt']);

  CATEGORIES.forEach((cat) => {
    const row = document.createElement('div');
    const wip = WIP_IDS.has(cat.id);
    row.className = 'sb-row' + (wip ? ' sb-row-wip' : '');

    const label = document.createElement('div');
    label.className = 'sb-row-label';
    label.textContent = cat.label;
    row.appendChild(label);

    const opts = document.createElement('div');
    opts.className = 'sb-row-opts';

    if (wip) {
      const wipBadge = document.createElement('span');
      wipBadge.className = 'sb-wip-badge';
      wipBadge.textContent = 'Work in Progress';
      opts.appendChild(wipBadge);
    }

    cat.options.forEach((opt) => {
      const wipOpt = WIP_OPTS.has(`${cat.id}:${opt}`);
      const btn = document.createElement('button');
      btn.className = 'sb-opt' + (opt === cat.default ? ' active' : '') + (wipOpt ? ' sb-opt-wip' : '');
      btn.textContent = opt;
      if (!wip && !wipOpt) {
        btn.addEventListener('click', () => {
          opts.querySelectorAll('.sb-opt').forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');
          onChange?.(cat.id, opt);
        });
      }
      opts.appendChild(btn);
    });

    row.appendChild(opts);
    configEl.appendChild(row);
  });

  // Leather swatch picker
  const leatherRow = document.createElement('div');
  leatherRow.className = 'sb-row';

  const leatherLabel = document.createElement('div');
  leatherLabel.className = 'sb-row-label';
  leatherLabel.textContent = 'Leather';
  leatherRow.appendChild(leatherLabel);

  const swatchGrid = document.createElement('div');
  swatchGrid.className = 'sb-swatches';

  let activeBtn = null;

  LEATHERS.forEach((sku, i) => {
    const btn = document.createElement('button');
    const isDefault = defaults.leather ? sku === defaults.leather : i === 0;
    btn.className = 'sb-swatch' + (isDefault ? ' active' : '');
    btn.title = sku;

    const img = document.createElement('img');
    img.src = `/leathers/${sku}/${sku}_icon.webp`;
    img.alt = sku;
    btn.appendChild(img);

    if (isDefault) activeBtn = btn;

    btn.addEventListener('click', () => {
      if (activeBtn) activeBtn.classList.remove('active');
      btn.classList.add('active');
      activeBtn = btn;
      onChange?.('leather', sku);
    });

    swatchGrid.appendChild(btn);
  });

  leatherRow.appendChild(swatchGrid);
  configEl.appendChild(leatherRow);

  // Wood swatch picker
  const woodRow = document.createElement('div');
  woodRow.className = 'sb-row';

  const woodLabel = document.createElement('div');
  woodLabel.className = 'sb-row-label';
  woodLabel.textContent = 'Wood';
  woodRow.appendChild(woodLabel);

  const woodGrid = document.createElement('div');
  woodGrid.className = 'sb-swatches';

  let activeWoodBtn = null;

  WOODS.forEach((name, i) => {
    const btn = document.createElement('button');
    const isDefault = defaults.wood ? name === defaults.wood : i === 0;
    btn.className = 'sb-swatch' + (isDefault ? ' active' : '');
    btn.title = name;

    const img = document.createElement('img');
    img.src = `/wood/${name}/${name}_icon.webp`;
    img.alt = name;
    btn.appendChild(img);

    if (isDefault) activeWoodBtn = btn;

    btn.addEventListener('click', () => {
      if (activeWoodBtn) activeWoodBtn.classList.remove('active');
      btn.classList.add('active');
      activeWoodBtn = btn;
      onChange?.('wood', name);
    });

    woodGrid.appendChild(btn);
  });

  woodRow.appendChild(woodGrid);
  configEl.appendChild(woodRow);

  sidebar.appendChild(configEl);

  // Metrics tab header
  const metricsHeader = document.createElement('div');
  metricsHeader.className = 'sb-tab-header';
  metricsHeader.innerHTML = '<span class="sb-tab-arrow">▾</span><span>Metrics</span>';
  sidebar.appendChild(metricsHeader);

  // Metrics section
  const metricsEl = document.createElement('div');
  metricsEl.className = 'sb-metrics';

  const grid = document.createElement('div');
  grid.className = 'sb-metrics-grid';
  metricsEl.appendChild(grid);

  const resLabel = document.createElement('div');
  resLabel.className = 'sb-section-label';
  resLabel.textContent = 'Resources';
  metricsEl.appendChild(resLabel);

  const resTable = document.createElement('div');
  resTable.className = 'sb-resources';
  metricsEl.appendChild(resTable);

  sidebar.appendChild(metricsEl);

  function fpsClass(v) {
    const n = parseFloat(v);
    if (n >= 55) return 'good';
    if (n >= 30) return 'warn';
    return 'bad';
  }

  function row(label, value, cls = '') {
    return `<div class="m-row">
      <span class="m-label">${label}</span>
      <span class="m-val ${cls}">${value}</span>
    </div>`;
  }

  function fmtKB(kb) {
    return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
  }

  function fmtMs(ms) {
    return ms >= 1000 ? `${(ms / 1000).toFixed(2)} s` : `${ms} ms`;
  }

  const groupOpen = { models: true, images: true };

  resTable.addEventListener('click', (e) => {
    const link = e.target.closest('.res-link');
    if (link) {
      window.open(link.dataset.url, '_blank');
      return;
    }
    const hd = e.target.closest('.res-group-hd');
    if (!hd) return;
    const id = hd.dataset.group;
    groupOpen[id] = !groupOpen[id];
    hd.querySelector('.res-arrow').textContent = groupOpen[id] ? '▾' : '▸';
    resTable.querySelector(`[data-body="${id}"]`).style.display = groupOpen[id] ? '' : 'none';
  });

  function toggleSection(header, body) {
    const arrow = header.querySelector('.sb-tab-arrow');
    const open = body.style.display === 'none';
    body.style.display = open ? '' : 'none';
    arrow.textContent = open ? '▾' : '▸';
  }

  configHeader.addEventListener('click', () => toggleSection(configHeader, configEl));

  // Metrics header: drag up/down to resize, click to collapse/expand
  metricsHeader.style.cursor = 'ns-resize';

  let _dragY, _dragH, _dragging;

  metricsHeader.addEventListener('mousedown', (e) => {
    _dragY    = e.clientY;
    _dragH    = metricsEl.style.display === 'none' ? 0 : metricsEl.offsetHeight;
    _dragging = false;

    const onMove = (ev) => {
      const dy = _dragY - ev.clientY;
      if (!_dragging && Math.abs(dy) > 3) _dragging = true;
      if (!_dragging) return;

      const max = sidebar.offsetHeight - 60;
      const h   = Math.max(0, Math.min(max, _dragH + dy));

      if (h > 0) {
        metricsEl.style.display  = '';
        metricsEl.style.height   = h + 'px';
        metricsEl.style.overflow = 'hidden';
        metricsHeader.querySelector('.sb-tab-arrow').textContent = '▾';
      } else {
        metricsEl.style.display = 'none';
        metricsEl.style.height  = '';
        metricsHeader.querySelector('.sb-tab-arrow').textContent = '▸';
      }
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.userSelect = '';
      if (!_dragging) toggleSection(metricsHeader, metricsEl);
      _dragging = false;
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  function renderGroup(id, label, items) {
    if (!items.length) return '';
    const totalKB = items.reduce((sum, r) => sum + r.kb, 0);
    const open = groupOpen[id];
    const itemsHTML = items.map(r => {
      const nameEl = r.isModel
        ? `<span class="res-name" title="${r.name}">${r.name}</span>`
        : `<a class="res-name res-link" data-url="${r.url}" title="${r.name}">${r.name}</a>`;
      return `
      <div class="res-row">
        ${nameEl}
        <span class="res-size">${r.cached ? 'cached' : fmtKB(r.kb)}</span>
        <span class="res-time">${fmtMs(r.ms)}</span>
      </div>`;
    }).join('');
    return `
      <div class="res-group-hd" data-group="${id}">
        <span class="res-arrow">${open ? '▾' : '▸'}</span>
        <span class="res-group-label">${label}</span>
        <span class="res-group-count">${items.length}</span>
        <span class="res-group-size">${fmtKB(totalKB)}</span>
      </div>
      <div class="res-group-body" data-body="${id}"${open ? '' : ' style="display:none"'}>
        ${itemsHTML}
      </div>`;
  }

  return {
    updateMetrics(s) {
      grid.innerHTML =
        row('FPS avg',    s.avgFPS,    fpsClass(s.avgFPS)) +
        row('FPS min',    s.minFPS,    fpsClass(s.minFPS)) +
        row('Load',       s.loadTime) +
        row('GPU upload', s.gpuUpload) +
        row('TTFR',       s.ttfr) +
        row('JS Heap',    s.jsHeap) +
        row('GPU est.',   s.gpuEst) +
        row('Draw calls', s.drawCalls) +
        row('Triangles',  s.triangles) +
        row('Textures',   s.textures) +
        row('Geometries', s.geometries);

      const models = s.resources.filter(r => r.isModel);
      const images = s.resources.filter(r => !r.isModel);
      const totalKB = s.resources.reduce((sum, r) => sum + r.kb, 0);
      const totalMs = s.resources.reduce((sum, r) => sum + r.ms, 0);

      resTable.innerHTML = `
        <div class="res-summary">
          <span class="res-summary-label">Total</span>
          <span class="res-summary-size">${fmtKB(totalKB)}</span>
          <span class="res-summary-time">${fmtMs(totalMs)}</span>
        </div>
        ${renderGroup('models', 'Models', models)}
        ${renderGroup('images', 'Images', images)}`;
    },
  };
}
