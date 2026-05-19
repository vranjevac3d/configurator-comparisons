const SAMPLE_WINDOW = 120; // frames

export class MetricsTracker {
  constructor(renderer) {
    this.renderer = renderer;
    this._samples   = [];
    this._last      = performance.now();
    this._loadStart = null;
    this._loadEnd   = null;
    this._firstRenderTime = null;
    this._modelLoaded     = false;
  }

  markLoadStart() { this._loadStart = performance.now(); }
  markLoadEnd()   { this._loadEnd   = performance.now(); }

  reset() {
    this._savedIcons = performance.getEntriesByType('resource')
      .filter(e => e.name.includes('_icon'))
      .map(e => ({
        name:    decodeURIComponent(e.name.split('/').pop().split('?')[0]),
        url:     e.name,
        kb:      (e.transferSize || e.encodedBodySize) / 1024,
        ms:      Math.round(e.duration),
        cached:  e.transferSize === 0 && e.encodedBodySize > 0,
        isModel: false,
        isIcon:  true,
      }));
    performance.clearResourceTimings?.();
    this._samples         = [];
    this._loadStart       = null;
    this._loadEnd         = null;
    this._firstRenderTime = null;
    this._modelLoaded     = false;
  }

  tick() {
    const now = performance.now();
    const fps = 1000 / (now - this._last);
    this._last = now;

    this._samples.push(fps);
    if (this._samples.length > SAMPLE_WINDOW) this._samples.shift();

    // Capture TTFR on first frame after model load
    if (this._modelLoaded && !this._firstRenderTime) {
      this._firstRenderTime = now;
    }
  }

  markModelLoaded() { this._modelLoaded = true; }

  get avgFPS() {
    if (!this._samples.length) return 0;
    return this._samples.reduce((a, b) => a + b) / this._samples.length;
  }

  get minFPS() {
    return this._samples.length ? Math.min(...this._samples) : 0;
  }

  // Network + parse time (before GPU upload)
  get loadTime() {
    return this._loadEnd !== null && this._loadStart !== null
      ? this._loadEnd - this._loadStart
      : null;
  }

  // GPU upload ≈ time between parse done and first rendered frame
  get gpuUploadTime() {
    return this._firstRenderTime !== null && this._loadEnd !== null
      ? this._firstRenderTime - this._loadEnd
      : null;
  }

  // Time from page navigation to first rendered frame
  get ttfr() {
    return this._firstRenderTime !== null
      ? this._firstRenderTime
      : null;
  }

  get jsHeapMB() {
    return performance.memory
      ? performance.memory.usedJSHeapSize / 1048576
      : null;
  }

  // Rough GPU VRAM estimate: ~4 MB per full-res texture, ~0.1 MB per geometry buffer
  get gpuEstMB() {
    const { textures, geometries } = this.renderer.info.memory;
    return textures * 4 + geometries * 0.1;
  }

  get drawCalls()  { return this.renderer.info.render.calls; }
  get triangles()  { return this.renderer.info.render.triangles; }
  get geometries() { return this.renderer.info.memory.geometries; }
  get textures()   { return this.renderer.info.memory.textures; }

  get resources() {
    const dynamic = performance.getEntriesByType('resource')
      .filter(e => /\.(gltf|glb|bin|jpg|jpeg|webp|ktx2|avif|png)(\?|$)/i.test(e.name))
      .sort((a, b) => b.duration - a.duration)
      .map(e => ({
        name:    decodeURIComponent(e.name.split('/').pop().split('?')[0]),
        url:     e.name,
        kb:      (e.transferSize || e.encodedBodySize) / 1024,
        ms:      Math.round(e.duration),
        cached:  e.transferSize === 0 && e.encodedBodySize > 0,
        isModel: /\.(gltf|glb|bin)/i.test(e.name),
        isIcon:  e.name.includes('_icon'),
      }));
    const saved = (this._savedIcons || []).filter(icon => !dynamic.some(d => d.name === icon.name));
    return [...dynamic, ...saved];
  }

  snapshot() {
    const fmt = (n, dec = 1) => n !== null ? n.toFixed(dec) : '—';
    const ms  = (n) => n === null ? '—' : n >= 1000 ? `${(n / 1000).toFixed(2)} s` : `${n.toFixed(0)} ms`;
    const mb  = (n) => n === null ? '—' : n >= 1 ? `${n.toFixed(1)} MB` : `${(n * 1024).toFixed(0)} KB`;

    return {
      avgFPS:     fmt(this.avgFPS),
      minFPS:     fmt(this.minFPS),
      loadTime:   ms(this.loadTime),
      gpuUpload:  ms(this.gpuUploadTime),
      ttfr:       ms(this.ttfr),
      jsHeap:     mb(this.jsHeapMB),
      gpuEst:     `~${this.gpuEstMB.toFixed(0)} MB`,
      drawCalls:  this.drawCalls,
      triangles:  this.triangles.toLocaleString(),
      textures:   this.textures,
      geometries: this.geometries,
      resources:  this.resources,
    };
  }
}
