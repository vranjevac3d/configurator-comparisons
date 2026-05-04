const CATEGORIES = [
  {
    id: 'textures', label: 'Textures',
    options: ['JPG', 'WebP', 'KTX2', 'AVIF'], default: 'JPG',
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
    id: 'instancing', label: 'Instancing',
    options: ['InstancedMesh', 'Cloning'], default: 'InstancedMesh',
  },
  {
    id: 'shadows', label: 'Shadows',
    options: ['Real-time', 'Baked', 'Contact only', 'None'], default: 'Contact only',
  },
  {
    id: 'renderer', label: 'Renderer',
    options: ['WebGL2', 'WebGPU'], default: 'WebGL2',
  },
  {
    id: 'resolution', label: 'Texture Resolution',
    options: ['4K', '2K', '1K', '512px'], default: '2K',
  },
  {
    id: 'mipmaps', label: 'Mipmaps',
    options: ['On', 'Off'], default: 'On',
  },
  {
    id: 'drawCallBatching', label: 'Draw Call Batching',
    options: ['Merged', 'Separate', 'BatchedMesh'], default: 'Separate',
  },
  {
    id: 'transparency', label: 'Transparency',
    options: ['Alpha blend', 'Alpha test', 'Dithered alpha'], default: 'Alpha blend',
  },
  {
    id: 'postprocessing', label: 'Post Processing',
    options: ['Bloom', 'SSAO', 'DOF', 'Minimal', 'None'], default: 'None',
  },
  {
    id: 'textureFiles', label: 'Texture Files',
    options: ['Texture atlas', 'Separate'], default: 'Separate',
  },
];

const LEATHERS = [
  '901200-87',
  '901200-48', '901200-99',
  '906700-45', '906700-81', '906700-84', '906700-88', '906700-97',
  '907200-45',
];

export function initSidebar(onChange) {
  const sidebar = document.getElementById('sidebar');

  // Header
  const header = document.createElement('div');
  header.className = 'sb-header';
  header.textContent = 'Configurator Compare';
  sidebar.appendChild(header);

  // Config scroll area
  const configEl = document.createElement('div');
  configEl.className = 'sb-config';

  const configLabel = document.createElement('div');
  configLabel.className = 'sb-section-label';
  configLabel.textContent = 'Config';
  configEl.appendChild(configLabel);

  CATEGORIES.forEach((cat) => {
    const row = document.createElement('div');
    row.className = 'sb-row';

    const label = document.createElement('div');
    label.className = 'sb-row-label';
    label.textContent = cat.label;
    row.appendChild(label);

    const opts = document.createElement('div');
    opts.className = 'sb-row-opts';

    cat.options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.className = 'sb-opt' + (opt === cat.default ? ' active' : '');
      btn.textContent = opt;
      btn.addEventListener('click', () => {
        opts.querySelectorAll('.sb-opt').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        onChange?.(cat.id, opt);
      });
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
    btn.className = 'sb-swatch' + (i === 0 ? ' active' : '');
    btn.title = sku;

    const img = document.createElement('img');
    img.src = `/leathers/${sku}/${sku}_icon.webp`;
    img.alt = sku;
    btn.appendChild(img);

    if (i === 0) activeBtn = btn;

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

  sidebar.appendChild(configEl);

  // Metrics section
  const metricsEl = document.createElement('div');
  metricsEl.className = 'sb-metrics';

  const metricsLabel = document.createElement('div');
  metricsLabel.className = 'sb-section-label';
  metricsLabel.textContent = 'Metrics';
  metricsEl.appendChild(metricsLabel);

  const grid = document.createElement('div');
  grid.className = 'sb-metrics-grid';
  metricsEl.appendChild(grid);

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
    },
  };
}
