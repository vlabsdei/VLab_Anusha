/* global THREE */
/* ============================================================================
   EXP 07 - 4D BIOPRINTING
   Bioink Printability · Gelation Kinetics · Cell Viability · Scaffold
   Degradation · Tracheal-Stent Capstone
   Five sub-calculators, one per page, each guarded by a page-unique canvas id.
   Physics is solved live with literature-grade constants and SI units.
   Palette: navy #1E40AF (data) · rust #E2570F (live/active).
   ============================================================================ */

/* =====================================================================
   CANONICAL SNIPPET - paste verbatim near the top of every
   expN/simulation/js/main.js (before any drawing code that uses it).
   Do not edit it per-experiment; every copy must stay identical.
   ===================================================================== */

/* Collapsible chart legend.
   Everything that labels a plot now lives in a header bar above the canvas -
   the chart's name on the left, the Legend toggle on the right - so nothing
   sits on top of the curves. The legend body drops down from the button,
   closed by default; click to open, click again to close. */
window.LabLegend = (function () {
  var boxes = new WeakMap();
  var heads = new WeakMap();
  var styled = false;

  function addStyle() {
    if (styled) return;
    styled = true;
    var s = document.createElement('style');
    s.textContent =
      /* the strip above the plot */
      '.lg-head{display:flex;align-items:center;justify-content:space-between;gap:10px;' +
      'flex:0 0 auto;position:relative;z-index:12;padding:5px 10px;background:#fff;' +
      'border-bottom:1px solid #e2e8f0}' +
      /* one line only: the strip is stealing height from the plot, and a wrapped
         caption squeezes the axis ticks together. Full text is on the tooltip. */
      '.lg-head .sim-label{position:static;top:auto;left:auto;right:auto;bottom:auto;' +
      'z-index:auto;background:none;backdrop-filter:none;border:0;box-shadow:none;' +
      'border-radius:0;padding:0!important;margin:0;flex:1 1 auto;min-width:0;' +
      'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;' +
      'font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:10.5px;font-weight:500;' +
      'line-height:1.5;color:#334155}' +
      /* the canvas gives up the header's height instead of being covered by it */
      '.lg-chart{display:flex;flex-direction:column}' +
      '.lg-chart>canvas.lg-canvas{flex:1 1 auto;min-height:0;display:block;' +
      'width:100%!important;height:auto!important}' +
      /* legend chip, anchored in the header */
      '.lg-legend{position:relative;flex:0 0 auto;line-height:0;' +
      'font-family:"IBM Plex Mono",ui-monospace,monospace}' +
      '.lg-toggle{display:inline-flex;align-items:center;gap:5px;' +
      'background:#fff;border:1px solid #cbd5e1;border-radius:4px;' +
      'color:#475569;font:600 9px/1 "IBM Plex Mono",ui-monospace,monospace;' +
      'letter-spacing:.04em;text-transform:uppercase;padding:4px 7px;cursor:pointer}' +
      '.lg-toggle:hover{background:#f8fafc;border-color:#94a3b8;color:#1e293b}' +
      '.lg-toggle::after{content:"+";font-size:11px;line-height:1;color:#E2570F}' +
      '.lg-legend.lg-open .lg-toggle::after{content:"\\2212"}' +
      '.lg-body{display:none;position:absolute;top:calc(100% + 5px);right:0;z-index:30;' +
      'width:max-content;max-width:230px;text-align:left;background:rgba(255,255,255,.98);' +
      'border:1px solid #cbd5e1;border-radius:4px;padding:6px 8px;' +
      'box-shadow:0 6px 16px rgba(15,23,42,.12)}' +
      '.lg-legend.lg-open .lg-body{display:block}' +
      '.lg-row{display:flex;align-items:center;gap:6px;font:500 9px/1.5 "IBM Plex Mono",ui-monospace,monospace;color:#55606f}' +
      '.lg-row+.lg-row{margin-top:3px}' +
      '.lg-swatch{flex:0 0 14px;height:8px;border-radius:1px}' +
      '.lg-swatch.lg-dash{height:0;border-top:2px dashed currentColor;background:none!important}';
    document.head.appendChild(s);
  }

  /* The header strip for one plot: created just above the canvas, with the
     caption that used to float over the plot moved into it. */
  function head(canvas) {
    if (!canvas || !canvas.parentElement) return null;
    var el = heads.get(canvas);
    if (el && el.parentElement) return el;
    addStyle();

    var host = canvas.parentElement;
    host.classList.add('lg-chart');
    canvas.classList.add('lg-canvas');

    el = document.createElement('div');
    el.className = 'lg-head';
    host.insertBefore(el, canvas);

    /* Pull in the caption sitting over this plot, if the page has one. */
    var label = null;
    Array.prototype.some.call(host.children, function (sib) {
      if (sib !== el && sib.classList && sib.classList.contains('sim-label')) {
        label = sib;
        return true;
      }
      return false;
    });
    if (label) {
      if (!label.title) label.title = label.textContent.trim();
      el.appendChild(label);
    } else {
      el.appendChild(document.createElement('span'));
    }

    heads.set(canvas, el);
    return el;
  }

  /* items: [{ color, text, dash }]   corner: kept for call-site compatibility */
  function attach(canvas, items, corner) {
    if (!canvas || !canvas.parentElement || !items || !items.length) return;
    var bar = head(canvas);
    if (!bar) return;

    var el = boxes.get(canvas);
    if (!el || !el.parentElement) {
      el = document.createElement('div');
      el.className = 'lg-legend';
      el.innerHTML = '<button type="button" class="lg-toggle">Legend</button><div class="lg-body"></div>';
      el.querySelector('.lg-toggle').addEventListener('click', function () {
        el.classList.toggle('lg-open');
      });
      bar.appendChild(el);
      boxes.set(canvas, el);
    }

    var rows = items.map(function (it) {
      var c = it.color || '#475569';
      var sw = it.dash
        ? '<span class="lg-swatch lg-dash" style="color:' + c + '"></span>'
        : '<span class="lg-swatch" style="background:' + c + '"></span>';
      return '<div class="lg-row">' + sw + '<span>' + it.text + '</span></div>';
    }).join('');
    el.querySelector('.lg-body').innerHTML = rows;
  }

  /* Existing call sites pass the x/y they used to paint the old canvas box.
     The chip has a fixed home in the header now, so the point is ignored. */
  function fromPoint(ctx, x, y, items) {
    attach(ctx.canvas, items);
  }

  /* ---- marker labels ------------------------------------------------------
     Several plots drop three or four markers close together and label each one,
     which used to print the names on top of each other. Every label goes
     through here instead: it remembers what it has already put on this canvas
     this frame and takes the first offset that lands clear. */
  var marks = new WeakMap();

  function slots(canvas) {
    var a = marks.get(canvas);
    if (!a) { a = []; marks.set(canvas, a); }
    return a;
  }

  function resetLabels(ctx) {
    if (ctx && ctx.canvas) marks.set(ctx.canvas, []);
  }

  /* candidates: [dx, dy, textAlign, textBaseline], tried in order */
  var SPOTS = [
    [9, -6, 'left', 'bottom'], [-9, -6, 'right', 'bottom'],
    [9, 8, 'left', 'top'], [-9, 8, 'right', 'top'],
    [0, -9, 'center', 'bottom'], [0, 11, 'center', 'top'],
    [9, -20, 'left', 'bottom'], [-9, -20, 'right', 'bottom'],
    [0, -22, 'center', 'bottom'], [0, 24, 'center', 'top'],
    [0, -35, 'center', 'bottom'], [0, 37, 'center', 'top']
  ];

  function boxOf(x, y, w, h, align, base) {
    var l = align === 'right' ? x - w : align === 'center' ? x - w / 2 : x;
    var t = base === 'bottom' ? y - h : base === 'top' ? y : y - h / 2;
    return { l: l, t: t, r: l + w, b: t + h };
  }

  function clashes(a, b) {
    return !(a.r + 2 < b.l || a.l > b.r + 2 || a.b + 2 < b.t || a.t > b.b + 2);
  }

  /* opts: { font, color, size, bounds:{l,t,r,b}, gap } */
  function label(ctx, x, y, text, opts) {
    if (!text) return;
    opts = opts || {};
    ctx.font = opts.font || '700 11px "IBM Plex Mono", monospace';
    var w = ctx.measureText(text).width;
    var h = opts.size || 11;
    var gap = opts.gap || 0;                 // marker radius to clear
    var taken = slots(ctx.canvas);
    var lim = opts.bounds;
    var pick = null, fallback = null, least = Infinity;

    for (var i = 0; i < SPOTS.length && !pick; i++) {
      var s = SPOTS[i];
      var dy = s[1] < 0 ? s[1] - gap : s[1] + gap;
      var bx = x + s[0], by = y + dy;
      var box = boxOf(bx, by, w, h, s[2], s[3]);
      var spot = { x: bx, y: by, align: s[2], base: s[3], box: box };
      var cost = 0;
      if (lim) {
        cost += Math.max(0, lim.l - box.l) + Math.max(0, box.r - lim.r) +
                Math.max(0, lim.t - box.t) + Math.max(0, box.b - lim.b);
      }
      for (var j = 0; j < taken.length; j++) {
        if (clashes(box, taken[j])) cost += 100;
      }
      if (cost === 0) pick = spot;
      else if (cost < least) { least = cost; fallback = spot; }
    }
    /* Nothing was completely clear, so take the least crowded spot rather than
       dropping a label the reader may be relying on. */
    pick = pick || fallback;
    if (!pick) return;

    taken.push(pick.box);
    if (opts.color) ctx.fillStyle = opts.color;
    ctx.textAlign = pick.align;
    ctx.textBaseline = pick.base;
    ctx.fillText(text, pick.x, pick.y);
  }

  /* Frames start a new plot, so what was on the old one no longer blocks. */
  var proto = window.CanvasRenderingContext2D && CanvasRenderingContext2D.prototype;
  if (proto && !proto.__lgReset) {
    var rawClear = proto.clearRect;
    proto.clearRect = function () {
      marks.set(this.canvas, []);
      return rawClear.apply(this, arguments);
    };
    proto.__lgReset = true;
  }

  /* Charts without a legend still have a caption to lift off the plot. */
  function hoistCaptions() {
    var labels = document.querySelectorAll('.sim-label');
    Array.prototype.forEach.call(labels, function (label) {
      var host = label.parentElement;
      if (!host || label.closest('.lg-head')) return;
      var canvas = null;
      Array.prototype.some.call(host.children, function (sib) {
        if (sib.tagName === 'CANVAS') { canvas = sib; return true; }
        return false;
      });
      if (canvas) head(canvas);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hoistCaptions);
  } else {
    hoistCaptions();
  }

  return { attach: attach, fromPoint: fromPoint, label: label, resetLabels: resetLabels };
})();

// ---------------------------------------------------------------------------
// Shared 2-D plotting helper (BP namespace)
// ---------------------------------------------------------------------------
const BP = {};
BP.dpr = Math.min(window.devicePixelRatio || 1, 2);
BP.fit = function (canvas) {
  const r = canvas.getBoundingClientRect();
  const w = Math.max(2, r.width | 0), h = Math.max(2, r.height | 0);
  if (canvas.width !== w * BP.dpr || canvas.height !== h * BP.dpr) {
    canvas.width = w * BP.dpr; canvas.height = h * BP.dpr;
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(BP.dpr, 0, 0, BP.dpr, 0, 0);
  return { ctx, w, h };
};
BP.frame = function (ctx, W, H, o) {
  LabLegend.resetLabels(ctx);
  const pl = o.padL ?? 52, pr = o.padR ?? 14, pt = o.padT ?? 16, pb = o.padB ?? 40;
  const w = W - pl - pr, h = H - pt - pb;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
  const logX = !!o.logX, logY = !!o.logY;
  const lx = (v) => logX ? Math.log10(v) : v;
  const ly = (v) => logY ? Math.log10(v) : v;
  const xMin = lx(o.xMin), xMax = lx(o.xMax), yMin = ly(o.yMin), yMax = ly(o.yMax);
  const gx = (v) => pl + (lx(v) - xMin) / (xMax - xMin) * w;
  const gy = (v) => pt + h - (ly(v) - yMin) / (yMax - yMin) * h;
  // grid + ticks
  ctx.strokeStyle = '#eef1f4'; ctx.fillStyle = '#8b929b';
  ctx.lineWidth = 1; ctx.font = '10px "IBM Plex Mono", monospace';
  const xt = o.xTicks || 5, yt = o.yTicks || 5;
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let i = 0; i <= xt; i++) {
    const fx = pl + w * i / xt, vv = xMin + (xMax - xMin) * i / xt;
    ctx.beginPath(); ctx.moveTo(fx, pt); ctx.lineTo(fx, pt + h); ctx.stroke();
    const val = logX ? Math.pow(10, vv) : vv;
    ctx.fillText(o.xFmt ? o.xFmt(val) : (Math.abs(val) >= 100 ? val.toFixed(0) : val.toFixed(val < 1 && val !== 0 ? 2 : 1)), fx, pt + h + 6);
  }
  ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
  for (let i = 0; i <= yt; i++) {
    const fy = pt + h - h * i / yt, vv = yMin + (yMax - yMin) * i / yt;
    ctx.beginPath(); ctx.moveTo(pl, fy); ctx.lineTo(pl + w, fy); ctx.stroke();
    const val = logY ? Math.pow(10, vv) : vv;
    ctx.fillText(o.yFmt ? o.yFmt(val) : (Math.abs(val) >= 100 ? val.toFixed(0) : val.toFixed(val < 1 && val !== 0 ? 2 : 1)), pl - 6, fy);
  }
  // axis lines
  ctx.strokeStyle = o.axisColor || '#1E40AF'; ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(pl, pt); ctx.lineTo(pl, pt + h); ctx.lineTo(pl + w, pt + h); ctx.stroke();
  // labels
  ctx.fillStyle = '#55606f'; ctx.font = '600 11px "IBM Plex Mono", monospace';
  if (o.xLabel) { ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(o.xLabel, pl + w / 2, H - 2); }
  if (o.yLabel) { ctx.save(); ctx.translate(11, pt + h / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(o.yLabel, 0, 0); ctx.restore(); }
  return { pl, pt, w, h, gx, gy, xMin, xMax, yMin, yMax };
};
BP.curve = function (ctx, fr, pts, color, lw) {
  ctx.strokeStyle = color; ctx.lineWidth = lw || 2.4; ctx.lineJoin = 'round';
  ctx.beginPath();
  let started = false;
  pts.forEach((p) => {
    if (!isFinite(p.x) || !isFinite(p.y)) { started = false; return; }
    const X = fr.gx(p.x), Y = fr.gy(p.y);
    if (!started) { ctx.moveTo(X, Y); started = true; } else ctx.lineTo(X, Y);
  });
  ctx.stroke();
};
BP.shadeY = function (ctx, fr, y1, y2, color) {
  ctx.fillStyle = color;
  const a = fr.gy(y2), b = fr.gy(y1);
  ctx.fillRect(fr.pl, a, fr.w, b - a);
};
BP.hLine = function (ctx, fr, y, color, label) {
  ctx.strokeStyle = color; ctx.lineWidth = 1.3; ctx.setLineDash([5, 4]);
  const Y = fr.gy(y); ctx.beginPath(); ctx.moveTo(fr.pl, Y); ctx.lineTo(fr.pl + fr.w, Y); ctx.stroke();
  ctx.setLineDash([]);
  if (label) { ctx.fillStyle = color; ctx.font = '600 10px "IBM Plex Mono", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(label, fr.pl + 4, Y - 2); }
};
BP.vLine = function (ctx, fr, x, color, label) {
  ctx.strokeStyle = color; ctx.lineWidth = 1.3; ctx.setLineDash([5, 4]);
  const X = fr.gx(x); ctx.beginPath(); ctx.moveTo(X, fr.pt); ctx.lineTo(X, fr.pt + fr.h); ctx.stroke();
  ctx.setLineDash([]);
  if (label) { ctx.fillStyle = color; ctx.font = '600 10px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(label, X, fr.pt + 2); }
};
BP.dot = function (ctx, fr, x, y, color, label) {
  const X = fr.gx(x), Y = fr.gy(y);
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(X, Y, 4.5, 0, 7); ctx.fill();
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(X, Y, 4.5, 0, 7); ctx.stroke();
  // Markers often sit close together, so the label finds its own clear spot.
  LabLegend.label(ctx, X, Y, label, {
    color: color, gap: 5, size: 11,
    bounds: { l: fr.pl, t: fr.pt, r: fr.pl + fr.w, b: fr.pt + fr.h }
  });
};
// Legends now live in a collapsible chip over the plot instead of being
// painted on it, so they can no longer sit on top of the curves.
BP.legend = function (ctx, x, y, items) {
  LabLegend.fromPoint(ctx, x, y, items);
};
BP.put = function (el, txt, color) { if (el) { el.textContent = txt; if (color) el.style.color = color; } };

// Shared THREE bootstrap → returns {scene,camera,renderer,controls,raf}
BP.three = function (mountId) {
  const mount = document.getElementById(mountId);
  if (!mount) return null;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xF4F5F3);
  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  camera.position.set(3.4, 2.2, 4.2);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(BP.dpr);
  mount.appendChild(renderer.domElement);
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.enablePan = false; controls.minDistance = 3; controls.maxDistance = 9;
  scene.add(new THREE.AmbientLight(0xffffff, 0.72));
  const key = new THREE.DirectionalLight(0xffffff, 0.85); key.position.set(4, 6, 5); scene.add(key);
  const fill = new THREE.DirectionalLight(0x99b3ff, 0.35); fill.position.set(-4, 2, -3); scene.add(fill);
  function resize() {
    const r = mount.getBoundingClientRect();
    const w = Math.max(2, r.width | 0), h = Math.max(2, r.height | 0);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  resize();
  const ro = new ResizeObserver(resize); ro.observe(mount);
  return { scene, camera, renderer, controls, resize };
};
BP.disc = 0;

/* ---- LabGate: gate the whole experiment behind a Start click ---- */
window.LabGate = (function () {
  let armed = false;
  function disableControls() {
    document.querySelectorAll('.dock input, .dock button#btnRun')
      .forEach(el => { el.disabled = true; });
  }
  function enableControls() {
    document.querySelectorAll('.dock input, .dock button#btnRun')
      .forEach(el => { el.disabled = false; });
  }
  // startFn = the deferred init sequence for the active sub-calc module.
  function arm(startFn) {
    if (armed) return; armed = true;
    const host = document.getElementById('viewport3D')
              || document.querySelector('.sim-viewport-fluid');
    disableControls();
    const ov = document.createElement('div');
    ov.className = 'labgate';
    ov.innerHTML =
      '<div class="labgate__panel">' +
      '<div class="labgate__title">Experiment idle</div>' +
      '<div class="labgate__sub">Set parameters, then start the simulation.</div>' +
      '<button type="button" class="labgate__btn">Start Experiment</button>' +
      '</div>';
    const anchor = host.closest('.sim-viewport-fluid > div') || host;
    anchor.style.position = anchor.style.position || 'relative';
    anchor.appendChild(ov);
    ov.querySelector('.labgate__btn').addEventListener('click', () => {
      ov.remove();
      enableControls();
      startFn();
    });
  }
  return { arm: arm };   // modules call LabGate.arm(...)
})();

// ===========================================================================
// SUB-CALC A - BIOINK VISCOSITY & PRINTABILITY WINDOW
//   Power-law (Ostwald-de Waele):  η(γ̇) = K · γ̇^(n-1),  n<1 shear-thinning
//   Wall shear rate (Newtonian ref):  γ̇ = 4Q/(πR³) = 4·v_print/R
//   Printability window: 1 Pa·s < η(γ̇_print) < 100 Pa·s
//   Recovery (thixotropy): η(t) = η0·(1 - e^(-t/τ)); 90% at t = τ·ln(10)
// (Page check: document.getElementById('plotCanvasEta'))
// ===========================================================================
(function () {
  const cvEta = document.getElementById('plotCanvasEta');
  if (!cvEta) return;
  const cvRec = document.getElementById('plotCanvasRecovery');
  const kIn = document.getElementById('kInput'), nIn = document.getElementById('nInput'), vIn = document.getElementById('vInput'), tauIn = document.getElementById('tauInput');
  const valK = document.getElementById('valK'), valN = document.getElementById('valN'), valV = document.getElementById('valV'), valTau = document.getElementById('valTau');
  const btnRun = document.getElementById('btnRun');
  const NOZZLES = [{ d: 200, c: '#E2570F' }, { d: 400, c: '#1E40AF' }, { d: 610, c: '#15803D' }];

  const eta = (K, n, g) => K * Math.pow(g, n - 1);           // Pa·s
  const gammaPrint = (v_mm_s, d_um) => 4 * (v_mm_s / 1000) / (d_um * 1e-6 / 2); // s⁻¹ ; = 4v/R
  let K = 2.1, n = 0.38, v = 10, tau = 6;

  function refresh() {
    K = parseFloat(kIn.value); n = parseFloat(nIn.value); v = parseFloat(vIn.value); tau = parseFloat(tauIn.value);
    BP.put(valK, K.toFixed(2) + ' Pa·sⁿ'); BP.put(valN, n.toFixed(2)); BP.put(valV, v.toFixed(0) + ' mm/s'); BP.put(valTau, tau.toFixed(1) + ' s');

    // Main plot: η vs γ̇ log-log
    const F = BP.fit(cvEta);
    const fr = BP.frame(F.ctx, F.w, F.h, {
      logX: true, logY: true, xMin: 0.1, xMax: 1e4, yMin: 0.01, yMax: 1e4,
      xTicks: 5, yTicks: 6, axisColor: '#1E40AF',
      xLabel: 'Shear rate  γ̇  (s⁻¹)', yLabel: 'Viscosity  η  (Pa·s)',
      xFmt: (x) => x >= 1 ? x.toFixed(0) : x.toFixed(2), yFmt: (y) => y >= 1 ? y.toFixed(0) : y.toFixed(2)
    });
    BP.shadeY(F.ctx, fr, 1, 100, 'rgba(21,128,61,0.10)');    // printability window band
    BP.hLine(F.ctx, fr, 1, '#94a3b8', ''); BP.hLine(F.ctx, fr, 100, '#94a3b8', 'window 1-100 Pa·s');
    const pts = [];
    for (let lg = -1; lg <= 4.001; lg += 0.05) { const g = Math.pow(10, lg); pts.push({ x: g, y: eta(K, n, g) }); }
    BP.curve(F.ctx, fr, pts, '#E2570F', 2.6);
    // nozzle operating points
    NOZZLES.forEach((nz) => { const g = gammaPrint(v, nz.d); const e = eta(K, n, g); BP.dot(F.ctx, fr, g, Math.min(Math.max(e, 0.01), 1e4), nz.c, nz.d + 'µm'); });
    BP.legend(F.ctx, fr.pl + 14, fr.pt + 12, [{ color: '#E2570F', text: 'η = K·γ̇^(n-1),  slope n-1 = ' + (n - 1).toFixed(2) }, { color: 'rgba(21,128,61,0.6)', text: 'printable window' }]);

    // Recovery plot
    if (cvRec) {
      const R = BP.fit(cvRec);
      const t90 = tau * Math.log(10);
      const rfr = BP.frame(R.ctx, R.w, R.h, { padB: 30, xMin: 0, xMax: Math.max(t90 * 1.4, 8), yMin: 0, yMax: 100, xTicks: 5, yTicks: 4, axisColor: '#1E40AF', xLabel: 'Time after extrusion  t  (s)', yLabel: 'η recovered (%)' });
      const rpts = [];
      for (let t = 0; t <= rfr.xMax + 1e-6; t += rfr.xMax / 120) rpts.push({ x: t, y: 100 * (1 - Math.exp(-t / tau)) });
      BP.hLine(R.ctx, rfr, 90, '#94a3b8', '90%');
      BP.curve(R.ctx, rfr, rpts, '#1E40AF', 2.4);
      BP.vLine(R.ctx, rfr, t90, '#E2570F', 't90');
    }

    // Table: printability for 3 nozzles
    const tb = document.querySelector('#nozzleTable tbody');
    if (tb) {
      tb.innerHTML = NOZZLES.map((nz) => {
        const g = gammaPrint(v, nz.d), e = eta(K, n, g), ok = e >= 1 && e <= 100;
        return '<tr><td style="color:' + nz.c + ';font-weight:600;">' + nz.d + ' µm</td><td>' + g.toFixed(0) + '</td><td>' + (e >= 1 ? e.toFixed(1) : e.toFixed(2)) + '</td><td style="text-align:right;color:' + (ok ? '#15803D' : '#B42318') + ';font-weight:600;">' + (ok ? 'PRINTABLE' : (e < 1 ? 'too thin' : 'too thick')) + '</td></tr>';
      }).join('');
    }

    // Readouts (report the 400 µm reference nozzle)
    const gRef = gammaPrint(v, 400), eRef = eta(K, n, gRef), t90 = tau * Math.log(10);
    BP.put(document.getElementById('resSlope'), (n - 1).toFixed(2));
    BP.put(document.getElementById('resGamma'), gRef.toFixed(0) + ' s⁻¹');
    BP.put(document.getElementById('resEta'), (eRef >= 1 ? eRef.toFixed(1) : eRef.toFixed(2)) + ' Pa·s', '#E2570F');
    const nOk = NOZZLES.filter((nz) => { const e = eta(K, n, gammaPrint(v, nz.d)); return e >= 1 && e <= 100; }).length;
    BP.put(document.getElementById('resPrintable'), nOk + ' / 3 nozzles');
    BP.put(document.getElementById('resT90'), t90.toFixed(1) + ' s');

    const li = document.getElementById('liveInsight');
    if (li) li.innerHTML = '<strong>Live Insight:</strong> This ink is <strong>' + (n < 1 ? 'shear-thinning' : 'shear-thickening') + '</strong> (n = ' + n.toFixed(2) + ', slope ' + (n - 1).toFixed(2) + ' on the log-log plot). At the 400 µm nozzle it thins to <strong>' + (eRef >= 1 ? eRef.toFixed(1) : eRef.toFixed(2)) + ' Pa·s</strong> - ' + (eRef >= 1 && eRef <= 100 ? 'inside' : 'outside') + ' the 1-100 Pa·s printability window. After extrusion it rebuilds 90% of its rest viscosity in <strong>' + t90.toFixed(1) + ' s</strong> to hold the printed shape.';
    updateEq();
  }
  function updateEq() {
    const box = document.getElementById('eqBox'); if (!box) return;
    const gRef = gammaPrint(v, 400), eRef = eta(K, n, gRef);
    box.innerHTML = '<div style="line-height:1.85;">' +
      '<div><strong>Power-law (Ostwald-de Waele):</strong> η(γ̇) = K·γ̇<sup>(n-1)</sup> = ' + K.toFixed(2) + '·γ̇<sup>' + (n - 1).toFixed(2) + '</sup></div>' +
      '<div><strong>Print shear rate:</strong> γ̇<sub>print</sub> = 4Q/(πR³) = 4·v/R = ' + gRef.toFixed(0) + ' s⁻¹ &nbsp;(400 µm, v = ' + v.toFixed(0) + ' mm/s)</div>' +
      '<div><strong>Nozzle viscosity:</strong> η = ' + (eRef >= 1 ? eRef.toFixed(1) : eRef.toFixed(2)) + ' Pa·s &rArr; ' + (eRef >= 1 && eRef <= 100 ? '<span style="color:#15803D;font-weight:700;">printable</span>' : '<span style="color:#B42318;font-weight:700;">outside window</span>') + '</div>' +
      '<div><strong>Thixotropic recovery:</strong> η(t) = η₀(1 - e<sup>-t/τ</sup>); &nbsp; t<sub>90</sub> = τ·ln10 = ' + (tau * Math.log(10)).toFixed(1) + ' s</div></div>';
  }
  [kIn, nIn, vIn, tauIn].forEach((el) => el && el.addEventListener('input', refresh));
  if (btnRun) btnRun.addEventListener('click', refresh);
  window.addEventListener('resize', () => refresh());

  // 3D: the ink is deposited as a CONTINUOUS extruded filament (a tube grown
  // along the toolpath), and its fate is integrated live from the solved
  // viscosity - printable ink holds one clean road, too-thin ink spreads and
  // flattens into a puddle over time, too-thick ink under-extrudes into broken,
  // lumpy segments. Idle = a single hanging drop previewing the current ink.
  let bootRaf = null;
  const V = BP.three('viewport3D');
  if (V) {
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.12, 1.4, 32), new THREE.MeshStandardMaterial({ color: 0x9aa4b2, metalness: 0.6, roughness: 0.35 }));
    nozzle.position.y = 1.5; V.scene.add(nozzle);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.06, 0.35, 24), new THREE.MeshStandardMaterial({ color: 0x6b7686, metalness: 0.6, roughness: 0.3 }));
    V.scene.add(tip);
    const bed = new THREE.Mesh(new THREE.BoxGeometry(4, 0.16, 3), new THREE.MeshStandardMaterial({ color: 0xe8eaee, roughness: 0.9 }));
    bed.position.y = -0.9; V.scene.add(bed);
    const BED_TOP = -0.9 + 0.08;   // top face of the bed - the road sits flush on this
    const drop = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), new THREE.MeshStandardMaterial({ color: 0xE2570F, roughness: 0.5 }));
    V.scene.add(drop);
    // toolpath the head follows - what happens to the ink laid along it is not fixed
    const PATH = []; const rows = 4, span = 1.5;
    for (let r = 0; r < rows; r++) { const z = -span * 0.7 + r * (2 * span * 0.7 / (rows - 1)); const dir = r % 2 === 0 ? 1 : -1; for (let s = 0; s <= 40; s++) { const x = dir * (-span + s * (2 * span / 40)); PATH.push({ x, z }); } }
    function inkState() {
      const gRef = gammaPrint(v, 400), eRef = eta(K, n, gRef);
      const printable = eRef >= 1 && eRef <= 100;
      const tooThin = eRef < 1;
      const r0 = Math.max(0.05, Math.min(0.22, 0.06 + 0.1 * Math.log10(eRef + 1)));
      const col = printable ? 0xE2570F : (tooThin ? 0xE0A44B : 0x7c1d1d);
      return { r0, col, printable, tooThin, eRef };
    }
    // the printed road is a list of segments, each a polyline of deposited points;
    // continuous ink = one long segment, under-extrusion = many broken segments,
    // each rebuilt as a real tube so the filament reads as a road, not a bead chain.
    const roadGroup = new THREE.Group(); V.scene.add(roadGroup);
    let segs = [], curSeg = null, needsRebuild = false, doneT = 0;
    function clearRoad() {
      roadGroup.children.slice().forEach((c) => { roadGroup.remove(c); c.geometry.dispose(); c.material.dispose(); });
      segs = []; curSeg = null; doneT = 0; needsRebuild = false;
    }
    function rebuildRoad(st, radMul, flat) {
      roadGroup.children.slice().forEach((c) => { roadGroup.remove(c); c.geometry.dispose(); c.material.dispose(); });
      const R = st.r0 * radMul;
      segs.forEach((seg) => {
        if (seg.length < 2) return;
        const curve = new THREE.CatmullRomCurve3(seg);
        const g = new THREE.TubeGeometry(curve, Math.max(2, (seg.length - 1) * 3), R, 12, false);
        const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: st.col, roughness: 0.5, transparent: true, opacity: st.printable ? 0.96 : 0.72 }));
        roadGroup.add(m);
      });
      roadGroup.scale.set(1, flat, 1);
      roadGroup.position.y = BED_TOP + R * flat;   // stay flush on the bed as it flattens
    }
    let playing = false, idx = 0, acc = 0;
    BP.playA = function () { clearRoad(); playing = true; idx = 0; acc = 0; };
    const raf = () => {
      requestAnimationFrame(raf);
      const st = inkState();
      const head = playing && idx < PATH.length ? PATH[idx] : { x: 0, z: 1.15 };
      nozzle.position.set(head.x, 1.5, head.z); tip.position.set(head.x, 0.62, head.z);
      drop.position.set(head.x, 0.30, head.z); drop.visible = !playing && segs.length === 0;
      drop.material.color.setHex(st.col); drop.scale.setScalar(Math.max(0.4, st.r0 / 0.1));
      const dt = 1 / 60;
      if (playing) {
        const stutter = !st.printable && !st.tooThin;   // too-thick: under-extrusion tears the line
        const speed = 0.4 + (v / 40) * 1.6;
        acc += speed;
        while (acc >= 1 && idx < PATH.length) {
          acc -= 1; const p = PATH[idx]; idx++;
          if (stutter && idx % 4 === 0) { curSeg = null; continue; }   // dropped deposit → real gap in the road
          if (!curSeg) { curSeg = []; segs.push(curSeg); }
          curSeg.push(new THREE.Vector3(p.x, 0, p.z));
          needsRebuild = true;
        }
        if (idx >= PATH.length) playing = false;
      }
      // spreading is integrated AFTER the pass, only for too-thin ink
      let radMul = 1, flat = 1;
      if (st.tooThin && !playing && segs.length) {
        doneT += dt;
        const grow = Math.min(1, doneT / 1.8);
        radMul = 1 + 1.6 * grow;                  // widens laterally
        flat = Math.max(0.28, 1 - 0.65 * grow);   // flattens into a puddle
        needsRebuild = true;
      } else if (!st.printable && !st.tooThin) {
        radMul = 1.25;                            // too-thick: fat, lumpy road
      }
      if (needsRebuild) { rebuildRoad(st, radMul, flat); needsRebuild = false; }
      const sl = document.getElementById('stateLabel');
      if (sl) sl.textContent = segs.length === 0 ? 'Ink at nozzle tip' : playing ? 'Extruding filament...' : st.printable ? 'Clean printed road' : st.tooThin ? 'Too thin - spreading into a puddle' : 'Too thick - broken under-extrusion';
      V.controls.update(); V.renderer.render(V.scene, V.camera);
    };
    bootRaf = raf;
  }
  if (btnRun) btnRun.addEventListener('click', () => BP.playA && BP.playA());
  LabGate.arm(function () {
    refresh();
    if (bootRaf) bootRaf();
  });
})();

// ===========================================================================
// SUB-CALC B - THERMAL GELATION KINETICS (AVRAMI)
//   α(t) = 1 - exp(-k_Av · t^m);  t_gel: α = 0.5 → t_gel = (ln2 / k_Av)^(1/m)
//   G'(t) = G'_inf · α(t)
//   Temperature dependence of k_Av via Arrhenius, calibrated so that collagen
//   at 37°C gels in ~18 min with G'_inf ≈ 220 Pa (doc expected observation).
// (Page check: document.getElementById('plotCanvasAvrami'))
// ===========================================================================
(function () {
  const cvA = document.getElementById('plotCanvasAvrami');
  if (!cvA) return;
  const cvG = document.getElementById('plotCanvasGp');
  const tIn = document.getElementById('tempInput'), mIn = document.getElementById('mInput'), gIn = document.getElementById('ginfInput');
  const valT = document.getElementById('valTemp'), valM = document.getElementById('valM'), valG = document.getElementById('valGinf');
  const btnRun = document.getElementById('btnRun');

  // Arrhenius calibration: k_Av(37°C) chosen so t_gel = 18 min at m = 2.
  // t_gel = (ln2/k)^(1/m) → k37 = ln2 / t_gel^m ; t_gel = 1080 s, m=2 → k37 = 0.693/1080² = 5.94e-7
  const R_GAS = 8.314, Ea = 62000;            // J/mol, collagen self-assembly activation energy (lit. ~50-70 kJ/mol)
  const T37 = 310.15, k37 = 5.94e-7;
  const kAv = (Tc, m) => {
    const Tk = Tc + 273.15;
    // hold t_gel(37°C,m=2)=1080 s as anchor; scale k with Arrhenius, re-anchor exponent for arbitrary m
    const kArr = k37 * Math.exp(-Ea / R_GAS * (1 / Tk - 1 / T37));
    // convert the m=2 anchor to the requested m so t_gel stays ~18 min at 37°C
    const tgel37 = 1080; return Math.log(2) / Math.pow(tgel37, m) * Math.exp(-Ea / R_GAS * (1 / Tk - 1 / T37));
  };
  const alpha = (t, k, m) => 1 - Math.exp(-k * Math.pow(t, m));
  const tGel = (k, m) => Math.pow(Math.log(2) / k, 1 / m);
  let Tc = 37, m = 2, Ginf = 220;

  function refresh() {
    Tc = parseFloat(tIn.value); m = parseFloat(mIn.value); Ginf = parseFloat(gIn.value);
    BP.put(valT, Tc.toFixed(0) + ' °C'); BP.put(valM, m.toFixed(1)); BP.put(valG, Ginf.toFixed(0) + ' Pa');
    const k = kAv(Tc, m), tg = tGel(k, m);
    const tMax = Math.min(Math.max(tg * 3, 600), 7200);

    // α(t)
    const F = BP.fit(cvA);
    const fr = BP.frame(F.ctx, F.w, F.h, { xMin: 0, xMax: tMax / 60, yMin: 0, yMax: 1, xTicks: 6, yTicks: 5, axisColor: '#1E40AF', xLabel: 'Time  t  (min)', yLabel: 'Conversion  α' });
    BP.hLine(F.ctx, fr, 0.5, '#94a3b8', 'α = 0.5 (gel point)');
    const pts = []; for (let t = 0; t <= tMax; t += tMax / 200) pts.push({ x: t / 60, y: alpha(t, k, m) });
    BP.curve(F.ctx, fr, pts, '#E2570F', 2.6);
    BP.vLine(F.ctx, fr, tg / 60, '#1E40AF', 't_gel');
    BP.dot(F.ctx, fr, tg / 60, 0.5, '#1E40AF', (tg / 60).toFixed(1) + ' min');

    // G'(t)
    if (cvG) {
      const G = BP.fit(cvG);
      const gfr = BP.frame(G.ctx, G.w, G.h, { padB: 30, xMin: 0, xMax: tMax / 60, yMin: 0, yMax: Ginf * 1.1, yTicks: 4, xTicks: 6, axisColor: '#1E40AF', xLabel: 'Time  t  (min)', yLabel: "G′  (Pa)" });
      const gpts = []; for (let t = 0; t <= tMax; t += tMax / 200) gpts.push({ x: t / 60, y: Ginf * alpha(t, k, m) });
      BP.hLine(G.ctx, gfr, Ginf, '#94a3b8', "G′∞");
      BP.curve(G.ctx, gfr, gpts, '#1E40AF', 2.4);
      BP.vLine(G.ctx, gfr, tg / 60, '#E2570F', '');
    }

    // Table: t_gel at 3 temperatures
    const tb = document.querySelector('#gelTable tbody');
    if (tb) {
      tb.innerHTML = [4, 21, 37].map((TT) => {
        const kk = kAv(TT, m), tt = tGel(kk, m), sel = Math.abs(TT - Tc) < 0.5;
        return '<tr style="' + (sel ? 'background:rgba(226,87,15,0.08);font-weight:700;' : '') + '"><td>' + TT + ' °C</td><td>' + (tt / 60).toFixed(1) + ' min</td><td style="text-align:right;">' + (tt < 120 ? 'fast' : tt < 1800 ? 'usable' : 'too slow') + '</td></tr>';
      }).join('');
    }

    BP.put(document.getElementById('resK'), k.toExponential(2) + ' /sᵐ');
    BP.put(document.getElementById('resTgel'), (tg / 60).toFixed(1) + ' min', '#E2570F');
    BP.put(document.getElementById('resTgelS'), tg.toFixed(0) + ' s');
    BP.put(document.getElementById('resGinf'), Ginf.toFixed(0) + ' Pa');
    BP.put(document.getElementById('resShape'), tg < 1200 ? 'holds shape' : 'may slump');

    const li = document.getElementById('liveInsight');
    if (li) li.innerHTML = '<strong>Live Insight:</strong> At <strong>' + Tc.toFixed(0) + ' °C</strong> the bioink reaches its gel point (α = 0.5) in <strong>' + (tg / 60).toFixed(1) + ' min</strong>. G′ builds sigmoidally toward ' + Ginf.toFixed(0) + ' Pa. ' + (tg < 1200 ? 'Fast enough to support the next layer before it slumps.' : 'This is slow - the printed layer may collapse before it sets; raise the temperature.');
    updateEq(k, tg);
  }
  function updateEq(k, tg) {
    const box = document.getElementById('eqBox'); if (!box) return;
    box.innerHTML = '<div style="line-height:1.85;">' +
      '<div><strong>Avrami gelation:</strong> α(t) = 1 - exp(-k<sub>Av</sub>·t<sup>m</sup>),&nbsp; k<sub>Av</sub> = ' + k.toExponential(2) + ' /sᵐ, m = ' + m.toFixed(1) + '</div>' +
      '<div><strong>Gel point:</strong> α(t<sub>gel</sub>) = 0.5 &rArr; t<sub>gel</sub> = (ln2 / k<sub>Av</sub>)<sup>1/m</sup> = ' + (tg / 60).toFixed(1) + ' min</div>' +
      '<div><strong>Modulus buildup:</strong> G′(t) = G′<sub>∞</sub>·α(t),&nbsp; G′<sub>∞</sub> = ' + Ginf.toFixed(0) + ' Pa</div>' +
      '<div style="color:#8b929b;font-size:0.92em;">k<sub>Av</sub>(T) via Arrhenius (Eₐ ≈ 62 kJ/mol), anchored to collagen: t<sub>gel</sub>(37 °C) ≈ 18 min.</div></div>';
  }
  [tIn, mIn, gIn].forEach((el) => el && el.addEventListener('input', refresh));
  if (btnRun) btnRun.addEventListener('click', refresh);
  window.addEventListener('resize', () => refresh());

  // 3D: strands sag under gravity while G′(t) builds - the sag rate is
  // integrated live from the real Avrami modulus every frame, not a scripted
  // morph. Fast gelation freezes the strand upright; slow gelation lets it
  // visibly slump and fuse into its neighbour before it sets. Idle = liquid.
  let bootRaf = null;
  const V = BP.three('viewport3D');
  if (V) {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(4, 0.16, 3), new THREE.MeshStandardMaterial({ color: 0xe8eaee, roughness: 0.9 })); bed.position.y = -0.9; V.scene.add(bed);
    const strands = []; const baseY = [];
    for (let i = 0; i < 5; i++) {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 3, 20), new THREE.MeshStandardMaterial({ color: 0x6aa0ff, roughness: 0.4, transparent: true, opacity: 0.5 }));
      s.rotation.z = Math.PI / 2; s.position.set(0, -0.68 + i * 0.02, -1 + i * 0.5); V.scene.add(s); strands.push(s); baseY.push(-0.68 + i * 0.02);
    }
    const liquid = new THREE.Color(0x6aa0ff), solid = new THREE.Color(0x14306e);
    const ANIM_S = 8, GRAV = 1.0, G_SCALE = 60;   // G_SCALE: sag-resistance scale, larger G′ resists sag more
    let simT = 0, sag = 0, playing = false;
    BP.playB = function () { simT = 0; sag = 0; playing = true; };
    const raf = () => {
      requestAnimationFrame(raf);
      const k = kAv(Tc, m), tg = tGel(k, m);
      const timeScale = Math.max(tg / ANIM_S, 1);   // real gel-seconds per animation-second
      const dt = 1 / 60;
      if (playing) {
        simT += dt * timeScale;
        const Gp = Ginf * alpha(simT, k, m);
        sag += GRAV * dt / (1 + Gp / G_SCALE);
        sag = Math.min(sag, 0.5);
        if (simT >= tg * 2 || sag >= 0.5) playing = false;
      }
      const a = Math.min(1, simT / tg);
      strands.forEach((s, i) => {
        s.material.opacity = 0.5 + 0.48 * a;
        s.material.color.lerpColors(liquid, solid, a);
        s.position.y = baseY[i] - sag * (1 - 0.15 * i);   // sagging droops & fuses strands
        s.scale.set(1, 1 + sag * 0.6, 1 - sag * 0.35);
      });
      const sl = document.getElementById('stateLabel');
      if (sl) sl.textContent = simT < 0.02 * tg ? 'Liquid (just printed)' : a < 0.98 ? 'Gelling... ' + (a * 100).toFixed(0) + '%' + (sag > 0.3 ? ' - slumping' : '') : (sag > 0.3 ? 'Gelled (slumped/fused)' : 'Gelled (holds shape)');
      V.controls.update(); V.renderer.render(V.scene, V.camera);
    };
    bootRaf = raf;
  }
  if (btnRun) btnRun.addEventListener('click', () => BP.playB && BP.playB());
  LabGate.arm(function () {
    refresh();
    if (bootRaf) bootRaf();
  });
})();

// ===========================================================================
// SUB-CALC C - CELL VIABILITY THROUGH PRINT SHEAR STRESS
//   τ_wall = 4·η·Q/(πR³) = η·γ̇_wall  (γ̇_wall = 4v/R)
//   S = exp(-k_kill · τ_wall · t_residence);  t_res = L_nozzle / v_print
//   k_kill ≈ 0.01 Pa⁻¹s⁻¹ (mammalian);  target S > 0.85
// (Page check: document.getElementById('plotCanvasViab'))
// ===========================================================================
(function () {
  const cvV = document.getElementById('plotCanvasViab');
  if (!cvV) return;
  const cvT = document.getElementById('plotCanvasTau');
  const vIn = document.getElementById('vInput'), etaIn = document.getElementById('etaInput'), lIn = document.getElementById('lInput'), kIn = document.getElementById('kkillInput');
  const valV = document.getElementById('valV'), valEta = document.getElementById('valEta'), valL = document.getElementById('valL'), valK = document.getElementById('valKkill');
  const btnRun = document.getElementById('btnRun');
  const NOZZLES = [{ d: 200, c: '#B42318' }, { d: 400, c: '#1E40AF' }, { d: 610, c: '#15803D' }];

  const gammaWall = (v_mm_s, d_um) => 4 * (v_mm_s / 1000) / (d_um * 1e-6 / 2);   // s⁻¹
  const tauWall = (etaP, v, d) => etaP * gammaWall(v, d);                         // Pa
  const tRes = (L_mm, v_mm_s) => (L_mm) / (v_mm_s);                               // s (both mm & mm/s)
  const surv = (kk, tau, tr) => Math.exp(-kk * tau * tr);
  let v = 10, etaP = 0.3, L = 2, kk = 0.01;

  function refresh() {
    v = parseFloat(vIn.value); etaP = parseFloat(etaIn.value); L = parseFloat(lIn.value); kk = parseFloat(kIn.value);
    BP.put(valV, v.toFixed(0) + ' mm/s'); BP.put(valEta, etaP.toFixed(2) + ' Pa·s'); BP.put(valL, L.toFixed(1) + ' mm'); BP.put(valK, kk.toFixed(3) + ' Pa⁻¹s⁻¹');
    const tr = tRes(L, v);

    // S vs τ_wall
    const F = BP.fit(cvV);
    const fr = BP.frame(F.ctx, F.w, F.h, { xMin: 0, xMax: 200, yMin: 0, yMax: 100, xTicks: 5, yTicks: 5, axisColor: '#1E40AF', xLabel: 'Wall shear stress  τ_wall  (Pa)', yLabel: 'Cell survival  S  (%)' });
    BP.shadeY(F.ctx, fr, 85, 100, 'rgba(21,128,61,0.10)');
    BP.hLine(F.ctx, fr, 85, '#94a3b8', 'target S > 85%');
    const pts = []; for (let t = 0; t <= 200; t += 2) pts.push({ x: t, y: 100 * surv(kk, t, tr) });
    BP.curve(F.ctx, fr, pts, '#E2570F', 2.6);
    NOZZLES.forEach((nz) => { const tau = tauWall(etaP, v, nz.d), S = 100 * surv(kk, tau, tr); BP.dot(F.ctx, fr, Math.min(tau, 200), S, nz.c, nz.d + 'µm'); });

    // τ_wall vs nozzle diameter
    if (cvT) {
      const T = BP.fit(cvT);
      const tfr = BP.frame(T.ctx, T.w, T.h, { padB: 30, xMin: 150, xMax: 700, yMin: 0, yMax: Math.max(tauWall(etaP, v, 200) * 1.15, 40), yTicks: 4, xTicks: 5, axisColor: '#1E40AF', xLabel: 'Nozzle diameter  d  (µm)', yLabel: 'τ_wall (Pa)' });
      const tpts = []; for (let d = 150; d <= 700; d += 10) tpts.push({ x: d, y: tauWall(etaP, v, d) });
      BP.curve(T.ctx, tfr, tpts, '#1E40AF', 2.4);
      NOZZLES.forEach((nz) => BP.dot(T.ctx, tfr, nz.d, tauWall(etaP, v, nz.d), nz.c, ''));
    }

    const tb = document.querySelector('#viabTable tbody');
    if (tb) {
      tb.innerHTML = NOZZLES.map((nz) => {
        const tau = tauWall(etaP, v, nz.d), S = surv(kk, tau, tr) * 100, ok = S >= 85;
        return '<tr><td style="color:' + nz.c + ';font-weight:600;">' + nz.d + ' µm</td><td>' + tau.toFixed(0) + ' Pa</td><td>' + S.toFixed(0) + '%</td><td style="text-align:right;color:' + (ok ? '#15803D' : '#B42318') + ';font-weight:600;">' + (ok ? 'PASS' : 'FAIL') + '</td></tr>';
      }).join('');
    }

    const tau400 = tauWall(etaP, v, 400), S400 = surv(kk, tau400, tr) * 100;
    BP.put(document.getElementById('resTres'), tr.toFixed(3) + ' s');
    BP.put(document.getElementById('resTau'), tau400.toFixed(0) + ' Pa');
    BP.put(document.getElementById('resSurv'), S400.toFixed(0) + ' %', S400 >= 85 ? '#15803D' : '#B42318');
    const nOk = NOZZLES.filter((nz) => surv(kk, tauWall(etaP, v, nz.d), tr) * 100 >= 85).length;
    BP.put(document.getElementById('resPass'), nOk + ' / 3 pass');
    // smallest passing nozzle
    const passSmall = NOZZLES.filter((nz) => surv(kk, tauWall(etaP, v, nz.d), tr) * 100 >= 85).map((nz) => nz.d);
    BP.put(document.getElementById('resMinNoz'), passSmall.length ? Math.min.apply(null, passSmall) + ' µm' : 'none');

    const li = document.getElementById('liveInsight');
    if (li) li.innerHTML = '<strong>Live Insight:</strong> Cells spend <strong>' + tr.toFixed(2) + ' s</strong> in the nozzle. A 200 µm tip gives the best resolution but drives τ_wall to <strong>' + tauWall(etaP, v, 200).toFixed(0) + ' Pa</strong> (survival ' + (surv(kk, tauWall(etaP, v, 200), tr) * 100).toFixed(0) + '%), while a 610 µm tip drops τ_wall to ' + tauWall(etaP, v, 610).toFixed(0) + ' Pa. <em>The resolution-viability trade-off is the constraint unique to bioprinting.</em>';
    updateEq(tr, tau400, S400);
  }
  function updateEq(tr, tau, S) {
    const box = document.getElementById('eqBox'); if (!box) return;
    box.innerHTML = '<div style="line-height:1.85;">' +
      '<div><strong>Wall shear stress:</strong> τ_wall = 4ηQ/(πR³) = η·(4v/R) = ' + tau.toFixed(0) + ' Pa &nbsp;(400 µm)</div>' +
      '<div><strong>Residence time:</strong> t_res = L_nozzle / v_print = ' + tr.toFixed(3) + ' s</div>' +
      '<div><strong>Survival (first-order shear kill):</strong> S = exp(-k_kill·τ_wall·t_res) = ' + S.toFixed(0) + '%</div>' +
      '<div style="color:#8b929b;font-size:0.92em;">Screening model (±20%): k_kill lumps cell type & shear mode. Always confirm with LIVE/DEAD staining.</div></div>';
  }
  [vIn, etaIn, lIn, kIn].forEach((el) => el && el.addEventListener('input', refresh));
  if (btnRun) btnRun.addEventListener('click', refresh);
  window.addEventListener('resize', () => refresh());

  // 3D: cells traverse the actual print nozzle over the real residence time;
  // death is drawn from the same survival probability as the plot/table (400 µm
  // reference nozzle, matching the readouts) - not a fixed 200 µm coin-flip, and
  // fall speed reacts to the real t_res rather than a random constant.
  let bootRaf = null;
  const V = BP.three('viewport3D');
  if (V) {
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.28, 2.6, 32, 1, true), new THREE.MeshStandardMaterial({ color: 0x9aa4b2, metalness: 0.5, roughness: 0.4, side: THREE.DoubleSide, transparent: true, opacity: 0.35 }));
    tube.position.y = 0.5; V.scene.add(tube);
    const cells = [];
    let playing = false;
    BP.playC = function () { playing = true; };
    const Y_TOP = 1.8, Y_BOT = -1.7, SPAN = Y_TOP - Y_BOT;
    const raf = () => {
      requestAnimationFrame(raf);
      if (playing) {
        const tau400 = tauWall(etaP, v, 400);
        const tr = tRes(L, v);
        const speed = SPAN / Math.max(tr, 0.05) / 60;   // real t_res sets fall speed
        if (Math.random() < 0.25) {
          const dead = Math.random() > surv(kk, tau400, tr);
          const c = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), new THREE.MeshStandardMaterial({ color: dead ? 0xB42318 : 0x15803D, roughness: 0.5 }));
          c.position.set((Math.random() - 0.5) * 0.5, Y_TOP, (Math.random() - 0.5) * 0.5);
          c.userData.v = speed; c.userData.dead = dead; c.userData.lysed = false;
          V.scene.add(c); cells.push(c);
        }
        cells.forEach((c) => {
          c.position.y -= c.userData.v;
          if (c.userData.dead && !c.userData.lysed && c.position.y < 0.5) {   // lyses mid-nozzle
            c.userData.lysed = true; c.scale.setScalar(1.4); c.material.transparent = true; c.material.opacity = 0.6;
          }
        });
      }
      for (let i = cells.length - 1; i >= 0; i--) { if (cells[i].position.y < Y_BOT) { V.scene.remove(cells[i]); cells.splice(i, 1); } }
      V.controls.update(); V.renderer.render(V.scene, V.camera);
    };
    bootRaf = raf;
  }
  if (btnRun) btnRun.addEventListener('click', () => BP.playC && BP.playC());
  LabGate.arm(function () {
    refresh();
    if (bootRaf) bootRaf();
  });
})();

// ===========================================================================
// SUB-CALC D - SCAFFOLD DEGRADATION & MECHANICAL LIFETIME
//   M(t) = M₀·exp(-k_deg·t)                          (hydrolytic, 1st order)
//   E(t) = E₀·(M/M₀)^(4/3) = E₀·exp(-(4/3)k_deg·t)   (porous scaffold scaling)
//   t_fail: E(t_fail) = E_min  → t_fail = ln(E₀/E_min)/((4/3)k_deg)
//   Porous-scaffold E₀ (MPa-scale), not bulk polymer (GPa) - corrected.
// (Page check: document.getElementById('plotCanvasDeg'))
// ===========================================================================
(function () {
  const cvD = document.getElementById('plotCanvasDeg');
  if (!cvD) return;
  const cvM = document.getElementById('plotCanvasMass');
  const e0In = document.getElementById('e0Input'), eminIn = document.getElementById('eminInput');
  const valE0 = document.getElementById('valE0'), valEmin = document.getElementById('valEmin');
  const btnRun = document.getElementById('btnRun');
  const MATS = { PLGA: { k: 0.02, c: '#B42318' }, PLA: { k: 0.002, c: '#1E40AF' }, PCL: { k: 0.0005, c: '#15803D' } };
  const TISSUE = [{ n: 'Skin', d: 21 }, { n: 'Bone', d: 90 }, { n: 'Cartilage', d: 150 }];
  const Efn = (E0, k, t) => E0 * Math.exp(-(4 / 3) * k * t);
  const tFail = (E0, k, Emin) => Math.log(E0 / Emin) / ((4 / 3) * k);
  let mat = 'PLGA', E0 = 1.0, Emin = 0.1;

  function refresh() {
    E0 = parseFloat(e0In.value); Emin = parseFloat(eminIn.value);
    const sel = document.querySelector('input[name="mat"]:checked'); mat = sel ? sel.value : 'PLGA';
    BP.put(valE0, E0.toFixed(2) + ' MPa'); BP.put(valEmin, Emin.toFixed(2) + ' MPa');
    const k = MATS[mat].k;
    const DAYS = 180;

    // E(t)
    const F = BP.fit(cvD);
    const fr = BP.frame(F.ctx, F.w, F.h, { xMin: 0, xMax: DAYS, yMin: 0, yMax: E0 * 1.05, xTicks: 6, yTicks: 5, axisColor: '#1E40AF', xLabel: 'Time  t  (days)', yLabel: 'Modulus  E  (MPa)' });
    BP.hLine(F.ctx, fr, Emin, '#94a3b8', 'E_min = ' + Emin.toFixed(2) + ' MPa');
    Object.keys(MATS).forEach((mm) => {
      const pts = []; for (let t = 0; t <= DAYS; t += 2) pts.push({ x: t, y: Efn(E0, MATS[mm].k, t) });
      BP.curve(F.ctx, fr, pts, MATS[mm].c, mm === mat ? 3 : 1.4);
    });
    const tf = tFail(E0, k, Emin);
    if (tf <= DAYS) { BP.vLine(F.ctx, fr, tf, '#E2570F', ''); BP.dot(F.ctx, fr, tf, Emin, '#E2570F', tf.toFixed(0) + ' d'); }
    BP.legend(F.ctx, fr.pl + fr.w - 120, fr.pt + 10, Object.keys(MATS).map((mm) => ({ color: MATS[mm].c, text: mm })));

    // M(t)
    if (cvM) {
      const M = BP.fit(cvM);
      const mfr = BP.frame(M.ctx, M.w, M.h, { padB: 30, xMin: 0, xMax: DAYS, yMin: 0, yMax: 100, yTicks: 4, xTicks: 6, axisColor: '#1E40AF', xLabel: 'Time  t  (days)', yLabel: 'Mass Mₜ/M₀ (%)' });
      const mpts = []; for (let t = 0; t <= DAYS; t += 2) mpts.push({ x: t, y: 100 * Math.exp(-k * t) });
      BP.curve(M.ctx, mfr, mpts, MATS[mat].c, 2.4);
    }

    const tb = document.querySelector('#degTable tbody');
    if (tb) {
      tb.innerHTML = Object.keys(MATS).map((mm) => {
        const tt = tFail(E0, MATS[mm].k, Emin), sel2 = mm === mat;
        return '<tr style="' + (sel2 ? 'background:rgba(226,87,15,0.08);font-weight:700;' : '') + '"><td style="color:' + MATS[mm].c + ';font-weight:600;">' + mm + '</td><td>' + MATS[mm].k.toFixed(4) + '/d</td><td style="text-align:right;">' + (tt <= 3650 ? tt.toFixed(0) + ' d' : '>10 yr') + '</td></tr>';
      }).join('');
    }

    BP.put(document.getElementById('resK'), k.toFixed(4) + ' /day');
    BP.put(document.getElementById('resE90'), Efn(E0, k, 90).toFixed(3) + ' MPa');
    BP.put(document.getElementById('resTfail'), (tf <= 3650 ? tf.toFixed(0) + ' days' : '>10 yr'), '#E2570F');
    // match to tissue
    let best = TISSUE.reduce((a, b) => Math.abs(b.d - tf) < Math.abs(a.d - tf) ? b : a);
    BP.put(document.getElementById('resMatch'), tf <= 3650 ? best.n + ' (~' + best.d + ' d)' : 'long-term');
    BP.put(document.getElementById('resHalf'), (Math.log(2) / k).toFixed(0) + ' days');

    const li = document.getElementById('liveInsight');
    if (li) li.innerHTML = '<strong>Live Insight:</strong> The <strong>' + mat + '</strong> scaffold (k = ' + k.toFixed(4) + '/day) starts at ' + E0.toFixed(2) + ' MPa and, because E ∝ M<sup>4/3</sup>, drops below the ' + Emin.toFixed(2) + ' MPa tissue threshold at <strong>' + (tf <= 3650 ? tf.toFixed(0) + ' days' : 'over 10 years') + '</strong>. Match this to the tissue regeneration time so the scaffold hands off load as native tissue grows in.';
    updateEq(k, tf);
  }
  function updateEq(k, tf) {
    const box = document.getElementById('eqBox'); if (!box) return;
    box.innerHTML = '<div style="line-height:1.85;">' +
      '<div><strong>Hydrolytic mass loss:</strong> M(t) = M₀·e<sup>-k_deg·t</sup>,&nbsp; k_deg = ' + k.toFixed(4) + '/day</div>' +
      '<div><strong>Porous-scaffold modulus:</strong> E(t) = E₀·(M/M₀)<sup>4/3</sup> = E₀·e<sup>-(4/3)k_deg·t</sup></div>' +
      '<div><strong>Mechanical failure:</strong> E(t_fail) = E_min &rArr; t_fail = ln(E₀/E_min)/((4/3)k_deg) = ' + (tf <= 3650 ? tf.toFixed(0) + ' days' : '>10 yr') + '</div>' +
      '<div style="color:#8b929b;font-size:0.92em;">E₀ is the <em>porous</em> scaffold modulus (MPa-scale), not bulk polymer (GPa) - halving Mₜ cuts E by 2<sup>4/3</sup> = 2.52×.</div></div>';
  }
  [e0In, eminIn].forEach((el) => el && el.addEventListener('input', refresh));
  document.querySelectorAll('input[name="mat"]').forEach((r) => r.addEventListener('change', refresh));
  if (btnRun) btnRun.addEventListener('click', refresh);
  window.addEventListener('resize', () => refresh());

  // 3D: strut mass is integrated live from M(t) = M0·e^(-k·t) for the selected
  // polymer, and erosion halts (and flags red) at the real t_fail - it does
  // not breathe in and out.
  let bootRaf = null;
  const V = BP.three('viewport3D');
  if (V) {
    const grp = new THREE.Group(); V.scene.add(grp);
    const struts = [];
    const mmat = new THREE.MeshStandardMaterial({ color: 0x1E40AF, roughness: 0.5 });
    const N = 4, sp = 0.55, off = -(N - 1) * sp / 2;
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      const bx = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2, 0.12), mmat.clone()); bx.position.set(off + i * sp, 0, off + j * sp); grp.add(bx); struts.push(bx);
      const bz = new THREE.Mesh(new THREE.BoxGeometry(2, 0.12, 0.12), mmat.clone()); bz.position.set(0, off + i * sp, off + j * sp); grp.add(bz); struts.push(bz);
    }
    let simDay = 0, playing = false;
    const ANIM_S = 10;   // seconds of on-screen animation
    BP.playD = function () { simDay = 0; playing = true; };
    const raf = () => {
      requestAnimationFrame(raf);
      const k = MATS[mat].k, tf = tFail(E0, k, Emin);
      const DAYS = 180;
      const dayScale = Math.max(DAYS, tf * 1.1) / ANIM_S;
      if (playing) { simDay += (1 / 60) * dayScale; if (simDay >= Math.max(DAYS, tf * 1.1)) playing = false; }
      const massFrac = Math.exp(-k * simDay);
      const failed = simDay >= tf;
      grp.rotation.y += 0.003;
      struts.forEach((s) => {
        const sc = 0.3 + 0.7 * massFrac;
        s.scale.set(sc, 1, sc);
        s.material.transparent = true; s.material.opacity = 0.35 + 0.65 * massFrac;
        s.material.color.lerpColors(new THREE.Color(0xcbd5e1), new THREE.Color(failed ? 0xB42318 : 0x1E40AF), massFrac);
      });
      const sl = document.getElementById('stateLabel');
      if (sl) sl.textContent = simDay < 0.5 ? 'Fresh scaffold (day 0)' : failed ? 'Failed - below load-bearing modulus (day ' + simDay.toFixed(0) + ')' : 'Eroding - day ' + simDay.toFixed(0) + ' (' + (massFrac * 100).toFixed(0) + '% mass)';
      V.controls.update(); V.renderer.render(V.scene, V.camera);
    };
    bootRaf = raf;
  }
  if (btnRun) btnRun.addEventListener('click', () => BP.playD && BP.playD());
  LabGate.arm(function () {
    refresh();
    if (bootRaf) bootRaf();
  });
})();

// ===========================================================================
// SUB-CALC E - 4D TRACHEAL-STENT CAPSTONE  (integrates Exp 1 SMP + Exp 2 bilayer)
//   κ_target = 1/R_tube ;  κ_printed = 1.2·κ_target  (20% over-curvature)
//   Timoshenko bimetal:  κ = 6·Δε·(1+m)² / (h·φ)
//     φ = 3(1+m)² + (1+mn)(m² + 1/(mn)),  m = h₁/h₂,  n = E₁/E₂
//   Back-calc total thickness: h = 6·Δε·(1+m)² / (κ_printed·φ)
//   Safety: R_f>95%, R_r>90%; T_g must be 45-50°C (Contradiction 3).
// (Page check: document.getElementById('plotCanvasStent'))
// ===========================================================================
(function () {
  const cvS = document.getElementById('plotCanvasStent');
  if (!cvS) return;
  const cvK = document.getElementById('plotCanvasKappa');
  const rIn = document.getElementById('rtubeInput'), ratIn = document.getElementById('ratioInput'), epsIn = document.getElementById('epsInput');
  const valR = document.getElementById('valRtube'), valRat = document.getElementById('valRatio'), valEps = document.getElementById('valEps');
  const btnRun = document.getElementById('btnRun');
  // SMP options (from Exp 1) - R_f, R_r, T_g
  const SMPS = {
    PLA:  { name: 'PLA-SMP',  Tg: 58, Rf: 97, Rr: 92, E1: 1200, E2: 1200 },
    PU:   { name: 'PU-SMP',   Tg: 45, Rf: 96, Rr: 91, E1: 20,   E2: 20 },
    PCL:  { name: 'PCL-SMP',  Tg: 35, Rf: 94, Rr: 88, E1: 300,  E2: 300 }
  };
  const phiOf = (m, n) => 3 * Math.pow(1 + m, 2) + (1 + m * n) * (m * m + 1 / (m * n));
  let Rtube = 9, ratio = 0.333, eps = 0.19, smp = 'PLA';

  function refresh() {
    Rtube = parseFloat(rIn.value); ratio = parseFloat(ratIn.value); eps = parseFloat(epsIn.value);
    const sel = document.querySelector('input[name="smp"]:checked'); smp = sel ? sel.value : 'PLA';
    const S = SMPS[smp];
    BP.put(valR, Rtube.toFixed(1) + ' mm'); BP.put(valRat, ratio.toFixed(2)); BP.put(valEps, (eps * 100).toFixed(0) + ' %');

    const kTarget = 1 / (Rtube / 1000);          // m⁻¹
    const kPrinted = 1.2 * kTarget;              // m⁻¹
    const m = ratio, n = S.E1 / S.E2, phi = phiOf(m, n);
    const hTot = 6 * eps * Math.pow(1 + m, 2) / (kPrinted * phi);  // m
    const hTot_mm = hTot * 1000;
    const hActive = hTot_mm * m / (1 + m), hPassive = hTot_mm / (1 + m);

    // Stent fold profile (flat → tube): draw arc of curvature kPrinted
    const F = BP.fit(cvS);
    const fr = BP.frame(F.ctx, F.w, F.h, { padL: 40, xMin: -12, xMax: 12, yMin: -2, yMax: 22, xTicks: 6, yTicks: 6, axisColor: '#1E40AF', xLabel: 'x (mm)', yLabel: 'y (mm)' });
    // target tube circle (radius Rtube) centered
    F.ctx.strokeStyle = '#94a3b8'; F.ctx.setLineDash([4, 4]); F.ctx.lineWidth = 1.4; F.ctx.beginPath();
    for (let a = 0; a <= 6.3; a += 0.05) { const X = fr.gx(Rtube * Math.cos(a)), Y = fr.gy(Rtube + Rtube * Math.sin(a)); a === 0 ? F.ctx.moveTo(X, Y) : F.ctx.lineTo(X, Y); }
    F.ctx.stroke(); F.ctx.setLineDash([]);
    // printed strip curled at kPrinted (arc length = tube circumference)
    const arcLen = 2 * Math.PI * (Rtube / 1000); const kp = kPrinted;
    const cpts = []; const NSEG = 80;
    for (let i = 0; i <= NSEG; i++) { const s = arcLen * i / NSEG; const th = kp * s; const x = Math.sin(th) / kp, y = (1 - Math.cos(th)) / kp; cpts.push({ x: x * 1000, y: y * 1000 }); }
    BP.curve(F.ctx, fr, cpts, '#E2570F', 3);
    BP.legend(F.ctx, fr.pl + 10, fr.pt + 12, [{ color: '#E2570F', text: 'printed strip (κ_printed)' }, { color: '#94a3b8', text: 'target trachea Ø' }]);

    // κ vs thickness
    if (cvK) {
      const K = BP.fit(cvK);
      const kfr = BP.frame(K.ctx, K.w, K.h, { padB: 30, xMin: 0.5, xMax: 4, yMin: 0, yMax: kPrinted * 2.2, yTicks: 4, xTicks: 5, axisColor: '#1E40AF', xLabel: 'Bilayer thickness  h  (mm)', yLabel: 'κ (m⁻¹)' });
      const kpts = []; for (let hh = 0.5; hh <= 4; hh += 0.05) { const kk = 6 * eps * Math.pow(1 + m, 2) / ((hh / 1000) * phi); kpts.push({ x: hh, y: kk }); }
      BP.curve(K.ctx, kfr, kpts, '#1E40AF', 2.4);
      BP.hLine(K.ctx, kfr, kPrinted, '#94a3b8', 'κ_printed');
      BP.dot(K.ctx, kfr, hTot_mm, kPrinted, '#E2570F', hTot_mm.toFixed(2) + ' mm');
    }

    // safety gates
    const tgOk = S.Tg >= 45, rfOk = S.Rf >= 95, rrOk = S.Rr >= 90;
    const tb = document.querySelector('#stentTable tbody');
    if (tb) {
      const rows = [
        ['Glass transition Tg', S.Tg + ' °C', tgOk ? 'SAFE (≥45)' : 'UNSAFE (<45)', tgOk],
        ['Shape fixity R_f', S.Rf + ' %', rfOk ? 'PASS (>95)' : 'FAIL', rfOk],
        ['Shape recovery R_r', S.Rr + ' %', rrOk ? 'PASS (>90)' : 'FAIL', rrOk]
      ];
      tb.innerHTML = rows.map((r) => '<tr><td>' + r[0] + '</td><td>' + r[1] + '</td><td style="text-align:right;color:' + (r[3] ? '#15803D' : '#B42318') + ';font-weight:600;">' + r[2] + '</td></tr>').join('');
    }

    BP.put(document.getElementById('resKtarget'), kTarget.toFixed(0) + ' m⁻¹');
    BP.put(document.getElementById('resKprinted'), kPrinted.toFixed(0) + ' m⁻¹', '#E2570F');
    BP.put(document.getElementById('resHtot'), hTot_mm.toFixed(2) + ' mm');
    BP.put(document.getElementById('resHlayers'), hActive.toFixed(2) + ' / ' + hPassive.toFixed(2) + ' mm');
    BP.put(document.getElementById('resTg'), S.Tg + ' °C', tgOk ? '#15803D' : '#B42318');
    BP.put(document.getElementById('resVerdict'), (tgOk && rfOk && rrOk) ? 'DEPLOYABLE' : 'REVISE DESIGN', (tgOk && rfOk && rrOk) ? '#15803D' : '#B42318');

    const li = document.getElementById('liveInsight');
    if (li) {
      if (!tgOk) li.innerHTML = '<strong>Safety Contradiction:</strong> ' + S.name + ' has T_g = ' + S.Tg + ' °C. At body temp (37 °C) this is only ' + (37 - S.Tg) + ' °C from recovery, so the stent could <strong>deploy prematurely during room-temperature handling/storage</strong>. Revise to an SMP with <strong>T_g = 45-50 °C</strong>.';
      else li.innerHTML = '<strong>Live Insight:</strong> For a ' + Rtube.toFixed(1) + ' mm trachea, κ_target = ' + kTarget.toFixed(0) + ' m⁻¹ and κ_printed = ' + kPrinted.toFixed(0) + ' m⁻¹ (20% over-curvature). Timoshenko back-solves a <strong>' + hTot_mm.toFixed(2) + ' mm</strong> bilayer (' + hActive.toFixed(2) + ' mm active / ' + hPassive.toFixed(2) + ' mm passive). ' + S.name + ' clears all deployment gates (T_g ' + S.Tg + ' °C, R_f ' + S.Rf + '%, R_r ' + S.Rr + '%).';
    }
    updateEq(kTarget, kPrinted, phi, hTot_mm);
  }
  function updateEq(kt, kp, phi, h) {
    const box = document.getElementById('eqBox'); if (!box) return;
    box.innerHTML = '<div style="line-height:1.85;">' +
      '<div><strong>Target curvature:</strong> κ_target = 1/R_tube = ' + kt.toFixed(0) + ' m⁻¹; κ_printed = 1.2·κ_target = ' + kp.toFixed(0) + ' m⁻¹</div>' +
      '<div><strong>Timoshenko bilayer:</strong> κ = 6Δε(1+m)²/(h·φ),&nbsp; φ = 3(1+m)²+(1+mn)(m²+1/mn) = ' + phi.toFixed(2) + '</div>' +
      '<div><strong>Back-calculated thickness:</strong> h = 6Δε(1+m)²/(κ_printed·φ) = ' + h.toFixed(2) + ' mm</div>' +
      '<div style="color:#8b929b;font-size:0.92em;">Integrates Exp 1 (SMP R_f, R_r, T_g) and Exp 2 (Timoshenko curvature). Deployment needs R_f>95%, R_r>90%, and T_g≥45 °C for storage safety.</div></div>';
  }
  [rIn, ratIn, epsIn].forEach((el) => el && el.addEventListener('input', refresh));
  document.querySelectorAll('input[name="smp"]').forEach((r) => r.addEventListener('change', refresh));
  if (btnRun) btnRun.addEventListener('click', refresh);
  window.addEventListener('resize', () => refresh());

  // 3D: the sheet folds to the real printed curvature (κ_printed) and holds - 
  // it does not oscillate. If the chosen SMP fails the Tg safety gate, the
  // tube visibly springs back open after folding, dramatizing premature
  // deployment at room/body temperature.
  let bootRaf = null;
  const V = BP.three('viewport3D');
  if (V) {
    const W = 3.2, Hh = 2.2, segs = 48;
    const geo = new THREE.PlaneGeometry(W, Hh, segs, 1);
    const mat = new THREE.MeshStandardMaterial({ color: 0xE2570F, roughness: 0.45, metalness: 0.05, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geo, mat); V.scene.add(mesh);
    const base = geo.attributes.position.array.slice();
    let f = 0, phase = 'idle', holdT = 0;
    BP.playE = function () { f = 0; phase = 'folding'; holdT = 0; };
    const raf = () => {
      requestAnimationFrame(raf);
      const S = SMPS[smp]; const tgOk = S.Tg >= 45;
      const kPrinted = 1.2 / (Rtube / 1000);
      const R = Math.max(0.35, Math.min(1.4, (1 / kPrinted) * 90));   // scene-scaled printed radius
      if (phase === 'folding') { f = Math.min(1, f + 1 / 90); if (f >= 1) { phase = tgOk ? 'held' : 'holding'; holdT = 0; } }
      else if (phase === 'holding') { holdT += 1 / 60; if (holdT > 1.2) phase = 'springback'; }
      else if (phase === 'springback') { f = Math.max(0, f - 1 / 150); if (f <= 0) phase = 'idle'; }
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x0 = base[i * 3], y0 = base[i * 3 + 1];
        const ang = (x0 / W) * Math.PI * 2 * f;
        const rad = R / Math.max(f, 1e-3);
        const x = f < 0.02 ? x0 : rad * Math.sin(ang);
        const z = f < 0.02 ? 0 : rad * (1 - Math.cos(ang)) - rad + R;
        pos.setXYZ(i, x, y0, z);
      }
      pos.needsUpdate = true; geo.computeVertexNormals();
      mesh.rotation.y += 0.004;
      mat.color.setHex((phase === 'springback' || (!tgOk && phase === 'holding')) ? 0xB42318 : 0xE2570F);
      const sl = document.getElementById('stateLabel');
      if (sl) sl.textContent = phase === 'idle' ? 'Flat sheet (unprinted)' : phase === 'folding' ? 'Folding to κ_printed...' : phase === 'held' ? 'Deployed - holds curvature' : phase === 'holding' ? (tgOk ? 'Deployed - holds curvature' : 'Deployed - Tg too low, unwinding...') : 'Springing back open - unsafe Tg';
      V.controls.update(); V.renderer.render(V.scene, V.camera);
    };
    bootRaf = raf;
  }
  if (btnRun) btnRun.addEventListener('click', () => BP.playE && BP.playE());
  LabGate.arm(function () {
    refresh();
    if (bootRaf) bootRaf();
  });
})();
