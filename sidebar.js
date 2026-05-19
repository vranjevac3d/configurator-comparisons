const CATEGORIES = [
  {
    id: 'format', label: '3D Format',
    options: ['GLB', 'gITF', 'FBX', 'OBJ'], default: 'gITF',
  },
  {
    id: 'modelComplexity', label: 'Model Complexity',
    options: ['High poly', 'Low poly + Normal + AO', 'Low poly + Normal', 'Low poly + AO', 'Low poly'], default: 'Low poly + Normal + AO',
  },
  {
    id: 'compression', label: 'Compression',
    options: ['Draco', 'None'], default: 'Draco',
  },
  {
    id: 'meshStructure', label: 'Mesh Structure',
    options: ['Separate', 'Merged'], default: 'Separate',
  },
  {
    id: 'textures', label: 'Texture Format',
    options: ['JPG', 'WebP', 'KTX2', 'AVIF'], default: 'JPG',
  },
  {
    id: 'resolution', label: 'Texture Resolution',
    options: ['2K', '1K', '512px'], default: '2K',
  },
  {
    id: 'fabrics', label: 'Material',
    options: ['Full PBR', 'Diffuse', 'Normal Map', 'Roughness Map', 'AO Map'], default: 'Full PBR',
    multiSelect: true,
  },
  {
    id: 'anisotropy', label: 'Anisotropy',
    options: ['1x', '2x', '4x', '8x', 'MAX'], default: '4x',
  },
  {
    id: 'textureFiles', label: 'Texture Files',
    options: ['Texture atlas', 'Separate'], default: 'Separate',
  },
  {
    id: 'envLighting', label: 'Env Lighting',
    options: ['HDR map', 'Flat ambient'], default: 'HDR map',
  },
  {
    id: 'modelShadows', label: 'Model Shadows',
    options: ['Real-time', 'GTAO', 'Baked', 'None'], default: 'Real-time',
  },
  {
    id: 'floorShadows', label: 'Floor Shadows',
    options: ['Contact', 'Real-time', 'Baked', 'None'], default: 'Contact',
  },
  {
    id: 'pixelRatio', label: 'Pixel Ratio',
    options: ['1x', '2x'], default: '2x',
  },
];

const WOODS = [
  'HF Custom Natural',
  'HF Custom Bramble',
  'HF Custom Java',
];

const FABRICS = [
  'HD40000-19', 'HD40000-29', 'HD40000-38',
  'HD40000-47', 'HD40000-49', 'HD40000-60',
];

const LEATHERS = [
  '901200-87', '901200-48', '901200-99',
  '906700-45', '906700-81', '906700-84',
];

export function initSidebar(onChange, defaults = {}) {
  const sidebar = document.getElementById('sidebar');

  // Restore persisted width
  const _savedW = localStorage.getItem('sidebar-w');
  if (_savedW) document.documentElement.style.setProperty('--sidebar-w', `${_savedW}px`);

  // Resize handle
  const resizeHandle = document.createElement('div');
  resizeHandle.id = 'sidebar-resize';
  sidebar.appendChild(resizeHandle);

  let _resizing = false;
  let _resizeX  = 0;
  let _resizeW  = 0;

  resizeHandle.addEventListener('mousedown', (e) => {
    _resizing = true;
    _resizeX  = e.clientX;
    _resizeW  = sidebar.getBoundingClientRect().width;
    resizeHandle.classList.add('dragging');
    document.body.dataset.sidebarResizing = '1';
    document.body.style.cursor     = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!_resizing) return;
    const newW = Math.max(160, Math.min(520, _resizeW + (e.clientX - _resizeX)));
    document.documentElement.style.setProperty('--sidebar-w', `${newW}px`);
  });

  document.addEventListener('mouseup', () => {
    if (!_resizing) return;
    _resizing = false;
    resizeHandle.classList.remove('dragging');
    delete document.body.dataset.sidebarResizing;
    document.body.style.cursor     = '';
    document.body.style.userSelect = '';
    const finalW = Math.round(parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--sidebar-w')));
    localStorage.setItem('sidebar-w', finalW);
    window.dispatchEvent(new CustomEvent('sidebar-resize-end'));
  });

  // Header
  const header = document.createElement('div');
  header.className = 'sb-header';
  header.textContent = 'Configurator Compare';
  sidebar.appendChild(header);

  let _matOpts = null;
  let _matSet  = null;
  let _matOnChange = null;
  let _fabricsRow = null;
  let _meshStructureRow = null;
  let _complexityBtns = [];
  let _compressionBtns = [];

  // Config tab header
  const configHeader = document.createElement('div');
  configHeader.className = 'sb-tab-header';
  configHeader.innerHTML = '<span class="sb-tab-arrow">▾</span><span>Config</span>';
  sidebar.appendChild(configHeader);

  // Config scroll area
  const configEl = document.createElement('div');
  configEl.className = 'sb-config';

  const _lockTooltip = document.createElement('div');
  _lockTooltip.className = 'sb-cursor-tooltip';
  document.body.appendChild(_lockTooltip);

  document.addEventListener('mousemove', (e) => {
    _lockTooltip.style.left = `${e.clientX + 14}px`;
    _lockTooltip.style.top  = `${e.clientY - 10}px`;
  });

  const WIP_IDS = new Set(['textureFiles']);
  const WIP_OPTS = new Set([]);

  CATEGORIES.forEach((cat) => {
    const row = document.createElement('div');
    const wip = WIP_IDS.has(cat.id);
    row.className = 'sb-row' + (wip ? ' sb-row-wip' : '');
    if (cat.id === 'meshStructure') _meshStructureRow = row;

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

    if (cat.multiSelect && !wip) {
      const VALS = { 'Full PBR': 'fullpbr', 'Diffuse': 'diffuse', 'Normal Map': 'normal', 'Roughness Map': 'roughness', 'AO Map': 'ao' };
      const rawDefault = defaults[cat.id] ?? 'fullpbr';
      // support legacy label values from old URLs
      const normalized = VALS[rawDefault] ?? rawDefault;
      const activeSet = new Set(normalized.split(','));
      if (!activeSet.has('fullpbr')) activeSet.add('diffuse');
      if (cat.id === 'fabrics') { _matOpts = opts; _matSet = activeSet; _matOnChange = () => onChange?.(cat.id, [...activeSet].join(',')); _fabricsRow = row; }

      cat.options.forEach((opt) => {
        const val = VALS[opt] ?? opt.toLowerCase().replace(/\s+/g, '');
        const btn = document.createElement('button');
        btn.className = 'sb-opt' + (activeSet.has(val) ? ' active' : '');
        btn.dataset.val = val;
        btn.textContent = opt;
        btn.addEventListener('click', () => {
          if (val === 'fullpbr') {
            activeSet.clear();
            activeSet.add('fullpbr');
          } else {
            activeSet.delete('fullpbr');
            activeSet.add('diffuse');
            if (val !== 'diffuse') {
              if (activeSet.has(val)) activeSet.delete(val);
              else activeSet.add(val);
            }
          }
          opts.querySelectorAll('.sb-opt').forEach(b => {
            b.classList.toggle('active', activeSet.has(b.dataset.val));
          });
          onChange?.(cat.id, [...activeSet].join(','));
        });
        opts.appendChild(btn);
      });
    } else {
      cat.options.forEach((opt) => {
        const wipOpt = WIP_OPTS.has(`${cat.id}:${opt}`);
        const btn = document.createElement('button');
        const activeOpt = defaults[cat.id] ?? cat.default;
        btn.className = 'sb-opt' + (opt === activeOpt ? ' active' : '') + (wipOpt ? ' sb-opt-wip' : '');
        btn.textContent = opt;
        if (cat.id === 'modelComplexity') {
          _complexityBtns.push({ btn, opt });
          btn.addEventListener('mouseenter', () => {
            if (!btn.classList.contains('sb-opt-locked')) return;
            _lockTooltip.textContent = 'OBJ does not support multiple UV sets';
            _lockTooltip.classList.add('visible');
          });
          btn.addEventListener('mouseleave', () => _lockTooltip.classList.remove('visible'));
        }
        if (cat.id === 'compression') {
          _compressionBtns.push({ btn, opt });
          btn.addEventListener('mouseenter', () => {
            if (!btn.classList.contains('sb-opt-locked')) return;
            _lockTooltip.textContent = 'Draco compression is only available for GLB and GLTF';
            _lockTooltip.classList.add('visible');
          });
          btn.addEventListener('mouseleave', () => _lockTooltip.classList.remove('visible'));
        }
        if (!wip && !wipOpt) {
          btn.addEventListener('click', () => {
            if (btn.classList.contains('sb-opt-locked')) return;
            opts.querySelectorAll('.sb-opt').forEach((b) => b.classList.remove('active'));
            btn.classList.add('active');
            onChange?.(cat.id, opt);
          });
        }
        opts.appendChild(btn);
      });
    }

    row.appendChild(opts);
    configEl.appendChild(row);
  });

  const DRACO_FORMATS = new Set(['GLB', 'gITF']);

  function applyObjConstraint(isObj) {
    _complexityBtns.forEach(({ btn, opt }) => {
      btn.classList.toggle('sb-opt-locked', isObj && opt !== 'High poly');
    });
    if (isObj) {
      _complexityBtns.forEach(({ btn, opt }) => btn.classList.toggle('active', opt === 'High poly'));
    }
  }

  function applyCompressionConstraint(format) {
    const locked = !DRACO_FORMATS.has(format);
    _compressionBtns.forEach(({ btn, opt }) => {
      btn.classList.toggle('sb-opt-locked', locked && opt === 'Draco');
    });
    if (locked) {
      _compressionBtns.forEach(({ btn, opt }) => btn.classList.toggle('active', opt === 'None'));
    }
  }

  const _initFormat = defaults.format ?? 'gITF';
  if (_initFormat === 'OBJ') applyObjConstraint(true);
  applyCompressionConstraint(_initFormat);

  // Fabric swatch picker
  const fabricRow = document.createElement('div');
  fabricRow.className = 'sb-row';

  const fabricLabel = document.createElement('div');
  fabricLabel.className = 'sb-row-label';
  fabricLabel.textContent = 'Fabric';
  fabricRow.appendChild(fabricLabel);

  const fabricGrid = document.createElement('div');
  fabricGrid.className = 'sb-swatches';

  let activeFabricBtn = null;

  FABRICS.forEach((sku, i) => {
    const btn = document.createElement('button');
    const isDefault = sku === defaults.fabricCover;
    btn.className = 'sb-swatch' + (isDefault ? ' active' : '');
    btn.title = sku;

    const img = document.createElement('img');
    img.src = `/fabrics/${sku}/${sku}_icon.webp`;
    img.alt = sku;
    btn.appendChild(img);

    if (isDefault) activeFabricBtn = btn;

    btn.addEventListener('click', () => {
      if (activeFabricBtn) activeFabricBtn.classList.remove('active');
      btn.classList.add('active');
      activeFabricBtn = btn;
      onChange?.('fabricCover', sku);
    });

    fabricGrid.appendChild(btn);
  });

  fabricRow.appendChild(fabricGrid);
  configEl.appendChild(fabricRow);

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

  const groupOpen = { models: true, images: true, icons: false };

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

  function renderItemRows(items) {
    return items.map(r => {
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
  }

  function renderSubGroup(id, label, items) {
    if (!items.length) return '';
    const totalKB = items.reduce((sum, r) => sum + r.kb, 0);
    const open = groupOpen[id];
    return `
      <div class="res-group-hd res-subgroup-hd" data-group="${id}">
        <span class="res-arrow">${open ? '▾' : '▸'}</span>
        <span class="res-group-label">${label} <span class="res-group-count">(${items.length})</span></span>
        <span class="res-group-size">${fmtKB(totalKB)}</span>
      </div>
      <div class="res-group-body" data-body="${id}"${open ? '' : ' style="display:none"'}>
        ${renderItemRows(items)}
      </div>`;
  }

  function renderGroup(id, label, items, subContent = '') {
    if (!items.length && !subContent) return '';
    const totalKB = items.reduce((sum, r) => sum + r.kb, 0);
    const open = groupOpen[id];
    return `
      <div class="res-group-hd" data-group="${id}">
        <span class="res-arrow">${open ? '▾' : '▸'}</span>
        <span class="res-group-label">${label} <span class="res-group-count">(${items.length})</span></span>
        <span class="res-group-size">${fmtKB(totalKB)}</span>
      </div>
      <div class="res-group-body" data-body="${id}"${open ? '' : ' style="display:none"'}>
        ${renderItemRows(items)}
        ${subContent}
      </div>`;
  }

  return {
    setMaterialTabEnabled(enabled) {
      if (!_fabricsRow) return;
      _fabricsRow.classList.toggle('sb-row-disabled', !enabled);
    },
    setMeshStructureEnabled(enabled) {
      if (!_meshStructureRow) return;
      _meshStructureRow.classList.toggle('sb-row-disabled', !enabled);
    },
    setMaterialCapabilities({ normal = true, roughness = true, ao = true }) {
      if (!_matOpts) return;
      const avail = { normal, roughness, ao };
      let changed = false;
      _matOpts.querySelectorAll('.sb-opt[data-val]').forEach(btn => {
        const v = btn.dataset.val;
        if (!(v in avail)) return;
        btn.disabled = !avail[v];
        if (!avail[v] && _matSet.has(v)) { _matSet.delete(v); changed = true; }
      });
      _matOpts.querySelectorAll('.sb-opt').forEach(b => b.classList.toggle('active', _matSet.has(b.dataset.val)));
      if (changed) _matOnChange?.();
    },
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
      const images = s.resources.filter(r => !r.isModel && !r.isIcon);
      const icons  = s.resources.filter(r => r.isIcon);
      const totalKB = s.resources.reduce((sum, r) => sum + r.kb, 0);
      const totalMs = s.resources.reduce((sum, r) => sum + r.ms, 0);

      resTable.innerHTML = `
        <div class="res-summary">
          <span class="res-summary-label">Total</span>
          <span class="res-summary-size">${fmtKB(totalKB)}</span>
          <span class="res-summary-time">${fmtMs(totalMs)}</span>
        </div>
        ${renderGroup('models', 'Models', models)}
        ${renderGroup('images', 'Images', images, renderSubGroup('icons', 'Icons', icons))}`;
    },
  };
}
