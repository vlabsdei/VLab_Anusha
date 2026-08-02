/* global THREE */

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

// ============================================================
// Combined simulator script for Exp 6 - Non-Thermal 4D
// Actuation. Five sub-calculators, one per page, selected by a
// unique canvas id present only on that page. Each module gives
// rigorous physics (azobenzene photoisomerisation, NIR
// photothermal heating, magnetic torque, wireless-coil design,
// multi-stimulus speed comparison), an animated Three.js scene,
// publication-grade 2D plots, a play/pause sweep timeline, and
// live governing-equation substitution + comparison tables.
// The shared HG plotting/scene toolkit is identical across exps.
// ============================================================

// ============================================================
// SHARED 2D-PLOT + 3D-SCENE TOOLKIT (namespace HG)
// ============================================================
const HG = {};

// Build a plot frame: clear, paint background, draw grid + axes +
// tick labels + rotated axis titles. Returns mapping helpers.
HG.frame = function (ctx, W, H, o) {
    LabLegend.resetLabels(ctx);
    const pl = o.padL != null ? o.padL : 52;
    const pr = o.padR != null ? o.padR : 16;
    const pt = o.padT != null ? o.padT : 18;
    const pb = o.padB != null ? o.padB : 30;
    const w = W - pl - pr, h = H - pt - pb;
    const xMin = o.xMin, xMax = o.xMax, yMin = o.yMin, yMax = o.yMax;
    const gx = (x) => pl + (x - xMin) / (xMax - xMin) * w;
    const gy = (y) => pt + h - (y - yMin) / (yMax - yMin) * h;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = o.bg || '#ffffff';
    ctx.fillRect(0, 0, W, H);
    const nx = o.xTicks || 6, ny = o.yTicks || 5;
    ctx.strokeStyle = '#eef2f7'; ctx.lineWidth = 1;
    for (let i = 0; i <= nx; i++) { const x = pl + i / nx * w; ctx.beginPath(); ctx.moveTo(x, pt); ctx.lineTo(x, pt + h); ctx.stroke(); }
    for (let i = 0; i <= ny; i++) { const y = pt + i / ny * h; ctx.beginPath(); ctx.moveTo(pl, y); ctx.lineTo(pl + w, y); ctx.stroke(); }
    ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(pl, pt); ctx.lineTo(pl, pt + h); ctx.lineTo(pl + w, pt + h); ctx.stroke();
    ctx.fillStyle = '#475569'; ctx.font = '9px sans-serif';
    const xFmt = o.xFmt || ((v) => Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));
    const yFmt = o.yFmt || ((v) => Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(1));
    ctx.textAlign = 'center';
    for (let i = 0; i <= nx; i++) { const v = xMin + i / nx * (xMax - xMin); ctx.fillText(xFmt(v), pl + i / nx * w, pt + h + 12); }
    ctx.textAlign = 'right';
    for (let i = 0; i <= ny; i++) { const v = yMin + i / ny * (yMax - yMin); ctx.fillText(yFmt(v), pl - 5, pt + h - i / ny * h + 3); }
    if (o.xLabel) { ctx.fillStyle = o.axisColor || '#334155'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(o.xLabel, pl + w / 2, H - 3); }
    if (o.yLabel) { ctx.save(); ctx.translate(12, pt + h / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillStyle = o.axisColor || '#334155'; ctx.font = 'bold 10px sans-serif'; ctx.fillText(o.yLabel, 0, 0); ctx.restore(); }
    return { gx, gy, pl, pr, pt, pb, w, h, xMin, xMax, yMin, yMax };
};

// Shade a vertical band [x1,x2]; optional diagonal hatching.
HG.shadeX = function (ctx, fr, x1, x2, color, hatch) {
    const a = fr.gx(Math.max(x1, fr.xMin)), b = fr.gx(Math.min(x2, fr.xMax));
    ctx.fillStyle = color; ctx.fillRect(a, fr.pt, b - a, fr.h);
    if (hatch) {
        ctx.save(); ctx.beginPath(); ctx.rect(a, fr.pt, b - a, fr.h); ctx.clip();
        ctx.strokeStyle = hatch; ctx.lineWidth = 1;
        for (let off = a - fr.h; off < b + fr.h; off += 11) { ctx.beginPath(); ctx.moveTo(off, fr.pt); ctx.lineTo(off + fr.h, fr.pt + fr.h); ctx.stroke(); }
        ctx.restore();
    }
};
HG.shadeYBand = function (ctx, fr, y1, y2, color) {
    const a = fr.gy(Math.min(y2, fr.yMax)), b = fr.gy(Math.max(y1, fr.yMin));
    ctx.fillStyle = color; ctx.fillRect(fr.pl, a, fr.w, b - a);
};
// Dashed vertical / horizontal reference lines with optional label.
HG.vLine = function (ctx, fr, x, color, label, top) {
    const px = fr.gx(x);
    ctx.strokeStyle = color; ctx.lineWidth = 1.4; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(px, fr.pt); ctx.lineTo(px, fr.pt + fr.h); ctx.stroke(); ctx.setLineDash([]);
    if (label) { ctx.fillStyle = color; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(label, px + 3, fr.pt + (top || 9)); }
};
HG.hLine = function (ctx, fr, y, color, label) {
    const py = fr.gy(y);
    ctx.strokeStyle = color; ctx.lineWidth = 1.2; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(fr.pl, py); ctx.lineTo(fr.pl + fr.w, py); ctx.stroke(); ctx.setLineDash([]);
    if (label) { ctx.fillStyle = color; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'right'; ctx.fillText(label, fr.pl + fr.w - 2, py - 3); }
};
// Plot a polyline from [{x,y}] clamped into the frame.
HG.curve = function (ctx, fr, pts, color, width) {
    ctx.strokeStyle = color; ctx.lineWidth = width || 2.4; ctx.beginPath();
    let started = false;
    pts.forEach((p) => {
        if (p == null || isNaN(p.y)) { started = false; return; }
        const x = fr.gx(p.x), y = fr.gy(Math.max(fr.yMin, Math.min(fr.yMax, p.y)));
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
    });
    ctx.stroke();
};
// Live tracker dot with a faint linking vertical line + value label.
HG.tracker = function (ctx, fr, x, y, label, color) {
    const px = fr.gx(x), py = fr.gy(Math.max(fr.yMin, Math.min(fr.yMax, y)));
    ctx.strokeStyle = 'rgba(239,68,68,0.28)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px, fr.pt); ctx.lineTo(px, fr.pt + fr.h); ctx.stroke();
    ctx.fillStyle = color || '#ef4444'; ctx.beginPath(); ctx.arc(px, py, 5, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
    // Markers often sit close together, so the label finds its own clear spot.
    LabLegend.label(ctx, px, py, label, {
        color: color || '#ef4444', font: 'bold 9px sans-serif', size: 9, gap: 5,
        bounds: { l: fr.pl, t: fr.pt, r: fr.pl + fr.w, b: fr.pt + fr.h }
    });
};
// Legends now live in a collapsible chip over the plot instead of being
// painted on it, so they can no longer sit on top of the curves.
HG.legend = function (ctx, x, y, items) {
    LabLegend.fromPoint(ctx, x, y, items);
};

// Standard lit scene (camera, renderer, OrbitControls, lights).
HG.scene3D = function (containerId, camPos) {
    const c = document.getElementById(containerId);
    if (!c) return null;
    c.innerHTML = '';
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xF4F5F3);
    const camera = new THREE.PerspectiveCamera(45, c.clientWidth / c.clientHeight, 0.1, 100);
    camera.position.set(camPos[0], camPos[1], camPos[2]);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(c.clientWidth, c.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    c.appendChild(renderer.domElement);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = 0.06;
    controls.minDistance = 1.5; controls.maxDistance = 9;
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const d = new THREE.DirectionalLight(0xffffff, 0.6); d.position.set(5, 9, 6);
    d.castShadow = true; d.shadow.mapSize.width = 1024; d.shadow.mapSize.height = 1024; scene.add(d);
    const d2 = new THREE.DirectionalLight(0xffffff, 0.16); d2.position.set(-5, 3, -6); scene.add(d2);
    const onResize = () => {
        if (!renderer) return;
        camera.aspect = c.clientWidth / c.clientHeight; camera.updateProjectionMatrix();
        renderer.setSize(c.clientWidth, c.clientHeight);
    };
    window.addEventListener('resize', onResize);
    return { container: c, scene, camera, renderer, controls };
};
// Orient a unit-height cylinder so it spans v1->v2.
HG.placeCyl = function (cyl, v1, v2) {
    const dir = new THREE.Vector3().subVectors(v2, v1);
    const len = dir.length();
    cyl.scale.set(1, Math.max(len, 1e-4), 1);
    cyl.position.copy(v1).add(v2).multiplyScalar(0.5);
    if (len > 1e-6) cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
};
// Translucent bath / enclosure box with edge outline.
HG.bathBox = function (scene, sx, sy, sz, color) {
    const g = new THREE.BoxGeometry(sx, sy, sz);
    const m = new THREE.Mesh(g, new THREE.MeshPhysicalMaterial({ color: color || 0x60a5fa, transparent: true, opacity: 0.06, roughness: 0.1, transmission: 0.7, thickness: 0.2, side: THREE.DoubleSide }));
    scene.add(m);
    scene.add(new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({ color: 0xcbd5e1 })));
    return m;
};
// Lerp two hex colors -> THREE.Color.
HG.mix = function (a, b, t) { return new THREE.Color(a).lerp(new THREE.Color(b), Math.max(0, Math.min(1, t))); };
// Color a result span and set text.
HG.put = function (el, txt, color) { if (!el) return; el.innerText = txt; if (color) el.style.color = color; };

// ============================================================
// SUB-CALC A : THE LIGHT-DRIVEN ACTUATOR STRIP (AZOBENZENE)
// (Page check: document.getElementById('plotCanvasAzo'))
// A 4D-printed strip carries azobenzene dye. Violet 365 nm light
// flips the dye trans->cis and the strip bends toward the light;
// blue 450 nm flips it back and the strip relaxes. Rigorous
// Beer-Lambert + first-order photokinetics fix how far and how
// fast it bends. Pick a light recipe that actuates quickly.
// ============================================================
(function () {
    if (!document.getElementById('plotCanvasAzo')) return;

    const intInput = document.getElementById('intInput');
    const concInput = document.getElementById('concInput');
    const valInt = document.getElementById('valInt');
    const valConc = document.getElementById('valConc');
    const btnRun = document.getElementById('btnRun');
    const stateLabel = document.getElementById('stateLabel');
    const liveInsight = document.getElementById('liveInsight');
    const plotAzo = document.getElementById('plotCanvasAzo');
    const ctxAzo = plotAzo.getContext('2d');
    const plotBL = document.getElementById('plotCanvasBL');
    const ctxBL = plotBL.getContext('2d');
    const resWl = document.getElementById('resWl'), resIabs = document.getElementById('resIabs'), resCis = document.getElementById('resCis'), resBend = document.getElementById('resBend'), resT90 = document.getElementById('resT90');
    const azoBody = document.querySelector('#azoTable tbody');
    const formula = document.getElementById('azoFormulaContainer');

    const EPS = 1250, XPATH = 0.1, KRATE = 0.002709, LN10 = Math.LN10;
    const BEND_MAX = 70;                                         // deg the strip bends at full (PSS) cis under UV
    // ---------- physics ----------
    const OD = (C) => EPS * (C / 1000) * XPATH;                  // optical depth (C in mmol/L)
    const fabs = (C) => 1 - Math.exp(-OD(C));                    // absorbed fraction (Beer-Lambert)
    const Iabs = (I0, C) => I0 * fabs(C);
    const cisPss = (wl) => wl === 365 ? 0.85 : 0.12;            // photostationary cis fraction
    const kEff = (I0, C) => KRATE * I0 * (fabs(C) / fabs(8));    // first-order approach rate
    const t90 = (I0, C) => LN10 / kEff(I0, C);                  // time to 90% conversion (= 90% of bend)
    const cisAt = (t, I0, C, wl) => cisPss(wl) * (1 - Math.exp(-kEff(I0, C) * t));
    const bendOf = (cis) => BEND_MAX * cis / 0.85;             // strip bend angle (deg), proportional to cis content

    let wl = 365, I0 = parseFloat(intInput.value), C = parseFloat(concInput.value);
    let dispCis = 0, targCis = cisPss(365), running = false, tau = 0, tEnd = 100, tAnim = 0;

    // ---------- Three.js: a printed cantilever strip that bends toward the light ----------
    let S = null, segs = [], tip, beam, lamp, clamp;
    const NB = 16, SEGL = 0.16, XBASE = -1.25, YBASE = 0.1;
    function init3D() {
        S = HG.scene3D('viewport3D', [0.3, 0.6, 4.6]);
        if (!S) return;
        const floor = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.06, 2.4), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9 }));
        floor.position.y = -1.1; floor.receiveShadow = true; S.scene.add(floor);
        clamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.7), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 }));
        clamp.position.set(XBASE - 0.22, YBASE, 0); clamp.castShadow = true; S.scene.add(clamp);
        for (let i = 0; i < NB; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1, 0.55), new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4 })); m.castShadow = true; S.scene.add(m); segs.push(m); }
        tip = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 14), new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4 })); S.scene.add(tip);
        // tinted light beam + lamp shining down onto the strip
        beam = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.95, 2.6, 26, 1, true), new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.16, side: THREE.DoubleSide }));
        beam.position.set(0.25, 1.15, 0); S.scene.add(beam);
        lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), new THREE.MeshBasicMaterial({ color: 0x8b5cf6 }));
        lamp.position.set(0.25, 2.35, 0); S.scene.add(lamp);
    }
    function update3D() {
        if (!S) return;
        const theta = bendOf(dispCis) * Math.PI / 180;            // total arc the strip curls through
        const dphi = theta / NB;
        const col = HG.mix(0x94a3b8, 0x7c3aed, dispCis / 0.85);    // pale -> violet as the dye switches
        let ang = 0, prev = new THREE.Vector3(XBASE, YBASE, 0);   // strip leaves the clamp horizontally (+x)
        const pts = [prev.clone()];
        for (let i = 0; i < NB; i++) { ang += dphi; const np = new THREE.Vector3(prev.x + SEGL * Math.cos(ang), prev.y + SEGL * Math.sin(ang), 0); pts.push(np); prev = np; }
        segs.forEach((s, i) => { HG.placeCyl(s, pts[i], pts[i + 1]); s.material.color.copy(col); s.scale.x = 1; s.scale.z = 1; });
        tip.position.copy(pts[NB]); tip.material.color.copy(col);
        const uv = wl === 365;
        beam.material.color.set(uv ? 0x8b5cf6 : 0x3b82f6);
        lamp.material.color.set(uv ? 0x8b5cf6 : 0x3b82f6);
        beam.material.opacity = 0.09 + 0.10 * (0.5 + 0.5 * Math.sin(tAnim * 3)) * (running ? 1 : 0.55);
    }

    // ---------- plots ----------
    function drawAzoPlot(curT) {
        const W = plotAzo.width, H = plotAzo.height;
        const pss = cisPss(wl);
        const pts = [];
        for (let t = 0; t <= tEnd + 1e-6; t += tEnd / 200) pts.push({ x: t, y: cisAt(t, I0, C, wl) });
        const fr = HG.frame(ctxAzo, W, H, { xMin: 0, xMax: tEnd, yMin: 0, yMax: 1, xTicks: 6, yTicks: 5, xLabel: 'Time under the light (s)', yLabel: 'How much it has bent (cis)', axisColor: '#7c3aed', xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(1) });
        HG.hLine(ctxAzo, fr, 0.9 * pss, '#16a34a', '90% of full bend');
        HG.vLine(ctxAzo, fr, t90(I0, C), '#dc2626', 't90');
        HG.curve(ctxAzo, fr, pts, '#7c3aed', 2.6);
        const ct = curT == null ? tEnd : curT;
        HG.tracker(ctxAzo, fr, Math.min(ct, tEnd), cisAt(ct, I0, C, wl), bendOf(cisAt(ct, I0, C, wl)).toFixed(0) + ' deg', '#ef4444');
        HG.legend(ctxAzo, fr.pl + fr.w - 158, fr.pt + 6, [{ color: '#7c3aed', text: 'Bend builds up over time' }, { color: '#dc2626', dash: true, text: 't90 (90% bent)' }]);
    }
    function drawBLPlot() {
        const W = plotBL.width, H = plotBL.height;
        let yMax = 5;
        const pts = [];
        for (let I = 5; I <= 60.001; I += 1) { const t = t90(I, C); pts.push({ x: I, y: t }); if (t > yMax) yMax = t; }
        yMax = Math.ceil(yMax / 20) * 20;
        const fr = HG.frame(ctxBL, W, H, { padT: 14, padB: 26, xMin: 5, xMax: 60, yMin: 0, yMax: yMax, xTicks: 5, yTicks: 4, xLabel: 'Light brightness I0 (mW/cm2)', yLabel: 'Time to actuate t90 (s)', axisColor: '#1E40AF', xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(0) });
        HG.curve(ctxBL, fr, pts, '#1E40AF', 2.4);
        HG.tracker(ctxBL, fr, I0, t90(I0, C), t90(I0, C).toFixed(0) + 's', '#ef4444');
        ctxBL.fillStyle = '#1E40AF'; ctxBL.font = 'bold 8px sans-serif'; ctxBL.textAlign = 'left'; ctxBL.fillText('Brighter light = faster bend (t90 ~ 1/I)', fr.pl + 8, fr.pt + 11);
    }
    function fillAzo() {
        if (!azoBody) return;
        const Is = [5, 10, 20, 40, 60];
        azoBody.innerHTML = Is.map((I) => { const near = Math.abs(I - I0) < 3; return '<tr style="' + (near ? 'background:rgba(124,58,237,0.10);font-weight:bold;' : '') + '"><td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;">' + I + '</td><td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;text-align:right;">' + t90(I, C).toFixed(0) + '</td></tr>'; }).join('');
    }
    function updateEq() {
        const pss = cisPss(wl);
        formula.innerHTML = '<div style="line-height:1.7;color:#1e293b;font-size:15px;font-weight:bold;">' +
            '<div><strong>Light soaked up (Beer-Lambert):</strong> I<sub>abs</sub> = I<sub>0</sub>(1 - e<sup>-&epsilon;Cx</sup>) = ' + Iabs(I0, C).toFixed(1) + ' mW/cm&sup2; (' + (fabs(C) * 100).toFixed(0) + '% absorbed)</div>' +
            '<div style="margin-left:18px;font-style:italic;color:#475569;font-size:0.95em;">Dye switches first-order: [cis](t) = [cis]<sub>PSS</sub>(1 - e<sup>-kt</sup>), [cis]<sub>PSS</sub> = ' + (pss * 100).toFixed(0) + '%</div>' +
            '<div style="margin-top:6px;"><strong>Time to actuate:</strong> t<sub>90</sub> = ln(10)/k = ' + t90(I0, C).toFixed(0) + ' s &nbsp;(&prop; 1/I<sub>0</sub>) &nbsp;|&nbsp; <strong>bend</strong> &theta; &asymp; ' + BEND_MAX + '&deg;&middot;([cis]/0.85) = ' + bendOf(pss).toFixed(0) + '&deg;</div></div>';
    }
    function refresh(curT) {
        const pss = cisPss(wl);
        tEnd = Math.max(20, t90(I0, C) * 1.5);
        if (!running) targCis = pss;
        const bendPss = bendOf(pss);
        HG.put(resWl, wl + ' nm - ' + (wl === 365 ? 'bends it' : 'relaxes it'));
        HG.put(resIabs, Iabs(I0, C).toFixed(1) + ' mW/cm2');
        HG.put(resCis, (pss * 100).toFixed(0) + ' % switched', '#7c3aed');
        HG.put(resBend, bendPss.toFixed(0) + ' deg', wl === 365 ? '#7c3aed' : '#16a34a');
        HG.put(resT90, t90(I0, C).toFixed(0) + ' s');
        const curCis = (curT == null ? pss : cisAt(curT, I0, C, wl));
        const bent = curCis > 0.4;
        stateLabel.innerText = bent ? 'Strip: bent ' + bendOf(curCis).toFixed(0) + ' deg' : 'Strip: relaxed (flat)';
        stateLabel.style.background = bent ? '#ede9fe' : '#fef3c7'; stateLabel.style.color = bent ? '#5b21b6' : '#92400e';
        liveInsight.innerHTML = '<strong>Live Insight:</strong> ' +
            (wl === 365 ? 'Violet 365 nm light flips the dye to its bent shape, so the printed strip curls to <strong>' + bendPss.toFixed(0) + ' deg</strong> toward the light - a tiny light-powered actuator. '
                : 'Blue 450 nm light flips the dye back, so the strip <strong>relaxes flat</strong> (only ' + bendPss.toFixed(0) + ' deg). ') +
            'It soaks up ' + (fabs(C) * 100).toFixed(0) + '% of the light and reaches 90% of its bend in <strong>' + t90(I0, C).toFixed(0) + ' s</strong>. ' +
            '<em>Design rule: brighter light actuates faster (t90 ~ 1/intensity) - UV bends, visible relaxes.</em>';
        drawAzoPlot(curT); drawBLPlot(); fillAzo(); updateEq();
    }

    // ---------- shine-the-light animation ----------
    function startRun() { if (running) { stopRun(); return; } running = true; tau = 0; dispCis = 0; btnRun.innerText = 'Pause'; btnRun.style.background = '#475569'; }
    function stopRun(done) { running = false; btnRun.innerText = 'Shine the Light'; btnRun.style.background = '#E2570F'; if (done) { const nx = document.getElementById('btnNextCalc'); if (nx) nx.style.display = 'block'; } }
    function stepRun(dt) { tau += dt * (tEnd / 6); targCis = cisAt(tau, I0, C, wl); if (tau >= tEnd) { tau = tEnd; refresh(tau); stopRun(true); return; } refresh(tau); }

    // ---------- events ----------
    document.querySelectorAll('input[name="wl"]').forEach((r) => r.addEventListener('change', () => { if (running) stopRun(); wl = parseInt(document.querySelector('input[name="wl"]:checked').value, 10); refresh(); }));
    intInput.addEventListener('input', () => { if (running) stopRun(); I0 = parseFloat(intInput.value); valInt.innerText = I0.toFixed(0) + ' mW/cm2'; refresh(); });
    concInput.addEventListener('input', () => { if (running) stopRun(); C = parseFloat(concInput.value); valConc.innerText = C.toFixed(0) + ' mmol/L'; refresh(); });
    btnRun.addEventListener('click', startRun);

    // ---------- render loop ----------
    let last = performance.now();
    function loop(now) {
        requestAnimationFrame(loop);
        const dt = Math.min((now - last) / 1000, 0.05); last = now; tAnim += dt;
        if (running) stepRun(dt);
        dispCis += (targCis - dispCis) * 0.08;
        update3D();
        if (S) { S.controls.update(); S.renderer.render(S.scene, S.camera); }
    }

    // ---------- init ----------
    LabGate.arm(function () {
        init3D();
        valInt.innerText = I0.toFixed(0) + ' mW/cm2'; valConc.innerText = C.toFixed(0) + ' mmol/L';
        refresh(); dispCis = targCis;
        requestAnimationFrame(loop);
    });
})();

// ============================================================
// SUB-CALC B : THE NIR SKIN-ACTIVATED IMPLANT
// (Page check: document.getElementById('plotCanvasNIR'))
// A printed implant sits under the skin. An 808 nm laser shines
// THROUGH the skin and heats a nanoparticle spot to switch the
// implant on - no surgery. Rigorous photothermal heating sets the
// temperature rise, the time to trigger, and how tightly the hot
// spot stays confined. Pick a dose that activates yet stays local.
// ============================================================
(function () {
    if (!document.getElementById('plotCanvasNIR')) return;

    const powInput = document.getElementById('powInput');
    const aunrInput = document.getElementById('aunrInput');
    const valPow = document.getElementById('valPow');
    const valAunr = document.getElementById('valAunr');
    const btnRun = document.getElementById('btnRun');
    const stateLabel = document.getElementById('stateLabel');
    const liveInsight = document.getElementById('liveInsight');
    const plotNIR = document.getElementById('plotCanvasNIR');
    const ctxNIR = plotNIR.getContext('2d');
    const plotTemp = document.getElementById('plotCanvasTemp');
    const ctxTemp = plotTemp.getContext('2d');
    const resRate = document.getElementById('resRate'), resDT = document.getElementById('resDT'), resTact = document.getElementById('resTact'), resD = document.getElementById('resD'), resPmin = document.getElementById('resPmin');
    const nirBody = document.querySelector('#nirTable tbody');
    const formula = document.getElementById('nirFormulaContainer');

    const DT_REQ = 25, TAU_H = 15, D_TH = 0.0053; // activation rise (C), thermal time const (s), diffusivity (mm2/s)
    // ---------- physics ----------
    const DTss = (P, load) => 560 * P * load;                       // steady temperature rise (C)
    const rate0 = (P, load) => DTss(P, load) / TAU_H;               // initial dT/dt (C/s)
    const tAct = (P, load) => { const d = DTss(P, load); return d <= DT_REQ ? Infinity : -TAU_H * Math.log(1 - DT_REQ / d); };
    const dRes = (P, load) => { const t = tAct(P, load); return isFinite(t) ? 2 * Math.sqrt(D_TH * t) : NaN; };
    function pMinForRes(load, dLimit) { const tLim = (dLimit / 2) * (dLimit / 2) / D_TH; const need = DT_REQ / (1 - Math.exp(-tLim / TAU_H)); return need / (560 * load); }

    let P = parseFloat(powInput.value), load = parseFloat(aunrInput.value);
    let dispHeat = 1, targHeat = 1, running = false, tau = 0, tEnd = 40, tAnim = 0;

    // ---------- Three.js: skin layer + sub-dermal implant + NIR laser heating a spot ----------
    let S = null, slab, slab0, beam, marker, skin, body;
    const SEG = 34, SP = 2.0;
    function init3D() {
        S = HG.scene3D('viewport3D', [0.0, 2.0, 3.7]);
        if (!S) return;
        // the printed implant body (sits below the skin)
        body = new THREE.Mesh(new THREE.BoxGeometry(SP, 0.32, SP), new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7 })); body.position.y = -0.34; S.scene.add(body);
        // implant top face carries the heat field (vertex colours)
        const g = new THREE.PlaneGeometry(SP, SP, SEG, SEG); g.rotateX(-Math.PI / 2);
        const cols = new Float32Array((SEG + 1) * (SEG + 1) * 3);
        g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
        slab = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, side: THREE.DoubleSide }));
        slab.position.y = -0.17; slab.receiveShadow = true; S.scene.add(slab);
        slab0 = g.attributes.position.array.slice();
        // translucent skin layer on top - the laser must pass through it
        skin = new THREE.Mesh(new THREE.BoxGeometry(SP * 1.25, 0.18, SP * 1.25), new THREE.MeshPhysicalMaterial({ color: 0xf2a7a0, transparent: true, opacity: 0.34, roughness: 0.5, transmission: 0.4, thickness: 0.3, side: THREE.DoubleSide }));
        skin.position.y = 0.95; S.scene.add(skin);
        S.scene.add(new THREE.LineSegments(new THREE.EdgesGeometry(skin.geometry), new THREE.LineBasicMaterial({ color: 0xfecaca })));
        // NIR laser beam from above, through the skin, to the implant spot
        beam = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.16, 2.6, 20, 1, true), new THREE.MeshBasicMaterial({ color: 0xb91c1c, transparent: true, opacity: 0.25, side: THREE.DoubleSide }));
        beam.position.set(0, 1.05, 0); S.scene.add(beam);
        // glowing activation marker at the heated spot
        marker = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), new THREE.MeshStandardMaterial({ color: 0xfca5a5, emissive: 0x000000 })); marker.position.set(0, -0.06, 0); S.scene.add(marker);
    }
    function update3D() {
        if (!S) return;
        const heat = dispHeat;                                       // 0..1 normalised heat
        const peak = Math.min(DTss(P, load) / 60, 1) * heat;         // colour intensity
        const sig = 0.18 + 0.5 * (dRes(P, load) || 1.0) / 3;         // hot-zone blur radius (visual)
        const pos = slab.geometry.attributes.position.array, col = slab.geometry.attributes.color.array;
        for (let i = 0; i < (SEG + 1) * (SEG + 1); i++) {
            const x = slab0[3 * i], z = slab0[3 * i + 2], r2 = x * x + z * z;
            const t = peak * Math.exp(-r2 / (2 * sig * sig));
            const c = HG.mix(0x93a3b8, 0xdc2626, t);
            col[3 * i] = c.r; col[3 * i + 1] = c.g; col[3 * i + 2] = c.b;
            pos[3 * i + 1] = t * 0.16;                                 // slight thermal bulge
        }
        slab.geometry.attributes.color.needsUpdate = true; slab.geometry.attributes.position.needsUpdate = true; slab.geometry.computeVertexNormals();
        beam.material.opacity = 0.15 + 0.18 * (0.5 + 0.5 * Math.sin(tAnim * 5)) * (running ? 1 : 0.5);
        const act = DTss(P, load) * heat >= DT_REQ;
        marker.material.emissive.set(act ? 0xdc2626 : 0x000000); marker.scale.setScalar(0.6 + peak);
    }

    // ---------- plots ----------
    function drawNIRPlot() {
        const W = plotNIR.width, H = plotNIR.height;
        const pts = [];
        for (let p = 0.1; p <= 6.001; p += 0.1) { const d = dRes(p, load); pts.push({ x: p, y: isFinite(d) ? d : NaN }); }
        const fr = HG.frame(ctxNIR, W, H, { xMin: 0, xMax: 6, yMin: 0, yMax: 3, xTicks: 6, yTicks: 6, xLabel: 'Laser power P (W)', yLabel: 'Heated-zone size d (mm)', axisColor: '#E2570F', xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(1) });
        HG.shadeYBand(ctxNIR, fr, 0, 0.5, 'rgba(16,185,129,0.10)');
        HG.hLine(ctxNIR, fr, 0.5, '#16a34a', 'stays local < 0.5 mm');
        const pmin = pMinForRes(load, 0.5); if (pmin >= 0.1 && pmin <= 6) HG.vLine(ctxNIR, fr, pmin, '#1E40AF', 'P_min');
        HG.curve(ctxNIR, fr, pts, '#E2570F', 2.6);
        const dc = dRes(P, load); if (isFinite(dc)) HG.tracker(ctxNIR, fr, P, dc, 'd=' + dc.toFixed(2), '#ef4444');
        HG.legend(ctxNIR, fr.pl + fr.w - 158, fr.pt + 6, [{ color: '#E2570F', text: 'Hot-zone size vs power' }, { color: '#16a34a', dash: true, text: 'Localised < 0.5 mm' }, { color: '#1E40AF', dash: true, text: 'Min power needed' }]);
    }
    function drawTempPlot() {
        const W = plotTemp.width, H = plotTemp.height;
        const yMax = Math.max(40, Math.ceil(DTss(6, load) / 20) * 20);
        const pts = [];
        for (let p = 0.1; p <= 6.001; p += 0.1) pts.push({ x: p, y: Math.min(DTss(p, load), yMax) });
        const fr = HG.frame(ctxTemp, W, H, { padT: 14, padB: 26, xMin: 0, xMax: 6, yMin: 0, yMax: yMax, xTicks: 6, yTicks: 4, xLabel: 'Laser power P (W)', yLabel: 'Temperature rise (C)', axisColor: '#1E40AF', xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(0) });
        HG.hLine(ctxTemp, fr, DT_REQ, '#16a34a', 'switch-on +25C');
        HG.curve(ctxTemp, fr, pts, '#1E40AF', 2.4);
        HG.tracker(ctxTemp, fr, P, Math.min(DTss(P, load), yMax), DTss(P, load).toFixed(0) + 'C', '#ef4444');
    }
    function fillNIR() {
        if (!nirBody) return;
        const Ps = [0.5, 1, 2, 4, 6];
        nirBody.innerHTML = Ps.map((p) => { const d = dRes(p, load); const near = Math.abs(p - P) < 0.3; return '<tr style="' + (near ? 'background:rgba(138,17,52,0.08);font-weight:bold;' : '') + '"><td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;">' + p.toFixed(1) + '</td><td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;">' + DTss(p, load).toFixed(0) + '</td><td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;text-align:right;">' + (isFinite(d) ? d.toFixed(2) : '-') + '</td></tr>'; }).join('');
    }
    function updateEq() {
        formula.innerHTML = '<div style="line-height:1.7;color:#1e293b;font-size:15px;font-weight:bold;">' +
            '<div><strong>How fast it heats:</strong> dT/dt = h<sub>abs</sub> I<sub>0</sub> A<sub>p</sub> / (m C<sub>p</sub>) &rArr; ' + rate0(P, load).toFixed(1) + ' C/s at first</div>' +
            '<div style="margin-left:18px;font-style:italic;color:#475569;font-size:0.95em;">Steady &Delta;T = h<sub>abs</sub> P /(h<sub>conv</sub> A<sub>s</sub>) = ' + DTss(P, load).toFixed(0) + ' C (P=' + P.toFixed(1) + ' W, ' + load.toFixed(2) + ' wt% nanorods)</div>' +
            '<div style="margin-top:6px;"><strong>Hot-zone size:</strong> d = 2&radic;(D<sub>th</sub> t<sub>act</sub>) = ' + (isFinite(dRes(P, load)) ? dRes(P, load).toFixed(2) + ' mm' : 'no activation') + ' &nbsp;(switch-on at &Delta;T &ge; ' + DT_REQ + ' C)</div></div>';
    }
    function refresh() {
        const t = tAct(P, load), d = dRes(P, load), pmin = pMinForRes(load, 0.5);
        if (!running) targHeat = 1;
        HG.put(resRate, rate0(P, load).toFixed(1) + ' C/s');
        HG.put(resDT, DTss(P, load).toFixed(0) + ' C', DTss(P, load) >= DT_REQ ? '#dc2626' : '#475569');
        HG.put(resTact, isFinite(t) ? t.toFixed(0) + ' s' : 'never (too cool)');
        HG.put(resD, isFinite(d) ? d.toFixed(2) + ' mm' : '-', isFinite(d) && d < 0.5 ? '#16a34a' : '#b45309');
        HG.put(resPmin, pmin.toFixed(2) + ' W');
        const act = DTss(P, load) >= DT_REQ, loc = isFinite(d) && d < 0.5;
        stateLabel.innerText = act ? (loc ? 'Implant: ON, heat stays local' : 'Implant: ON, heat spreading') : 'Implant: off (too cool)';
        stateLabel.style.background = act ? (loc ? '#dcfce7' : '#fef3c7') : '#e2e8f0';
        stateLabel.style.color = act ? (loc ? '#166534' : '#92400e') : '#475569';
        liveInsight.innerHTML = '<strong>Live Insight:</strong> An 808 nm laser shines through the skin and warms the implant spot by <strong>' + DTss(P, load).toFixed(0) + ' C</strong>. ' +
            (act ? 'That clears the +25 C switch-on threshold in <strong>' + t.toFixed(0) + ' s</strong> - the implant activates with no surgery. ' : 'That stays below the +25 C threshold - turn up the power or nanorod loading. ') +
            (act ? (loc ? 'The hot spot stays tight (d = ' + d.toFixed(2) + ' mm), so only the implant - not nearby tissue - is triggered. ' : 'But the hot zone has spread to d = ' + d.toFixed(2) + ' mm; use at least ' + pmin.toFixed(2) + ' W so it stays under 0.5 mm. ') : '') +
            '<em>Design rule: enough power to cross +25 C, but enough to keep the heated zone small - faster heating means a tighter spot.</em>';
        drawNIRPlot(); drawTempPlot(); fillNIR(); updateEq();
    }

    // ---------- fire-the-laser animation ----------
    function startRun() { if (running) { stopRun(); return; } running = true; tau = 0; dispHeat = 0; btnRun.innerText = 'Pause'; btnRun.style.background = '#475569'; }
    function stopRun(done) { running = false; btnRun.innerText = 'Fire the Laser'; btnRun.style.background = '#E2570F'; if (done) { const nx = document.getElementById('btnNextCalc'); if (nx) nx.style.display = 'block'; } }
    function stepRun(dt) { const t = tAct(P, load); tEnd = isFinite(t) ? t * 1.4 : 40; tau += dt * (tEnd / 6); targHeat = 1 - Math.exp(-tau / TAU_H); if (tau >= tEnd) { tau = tEnd; refresh(); stopRun(true); return; } refresh(); }

    // ---------- events ----------
    powInput.addEventListener('input', () => { if (running) stopRun(); P = parseFloat(powInput.value); valPow.innerText = P.toFixed(1) + ' W'; refresh(); });
    aunrInput.addEventListener('input', () => { if (running) stopRun(); load = parseFloat(aunrInput.value); valAunr.innerText = load.toFixed(2) + ' wt%'; refresh(); });
    btnRun.addEventListener('click', startRun);

    // ---------- render loop ----------
    let last = performance.now();
    function loop(now) {
        requestAnimationFrame(loop);
        const dt = Math.min((now - last) / 1000, 0.05); last = now; tAnim += dt;
        if (running) stepRun(dt);
        dispHeat += (targHeat - dispHeat) * 0.08;
        update3D();
        if (S) { S.controls.update(); S.renderer.render(S.scene, S.camera); }
    }

    // ---------- init ----------
    LabGate.arm(function () {
        init3D();
        valPow.innerText = P.toFixed(1) + ' W'; valAunr.innerText = load.toFixed(2) + ' wt%';
        refresh(); dispHeat = 1;
        requestAnimationFrame(loop);
    });
})();

// ============================================================
// SUB-CALC C : THE MAGNETIC MICRO-GRIPPER / CATHETER TIP
// (Page check: document.getElementById('plotCanvasMag'))
// A printed strip loaded with magnetic particles bends when an
// external magnet is brought close - wireless steering for a
// catheter tip or micro-gripper. Rigorous magnetic torque sets
// the bend; the critical field falls as 1/particle-content.
// Pick a loading that steers with a gentle, safe magnet.
// ============================================================
(function () {
    if (!document.getElementById('plotCanvasMag')) return;

    const volInput = document.getElementById('volInput');
    const bInput = document.getElementById('bInput');
    const valVol = document.getElementById('valVol');
    const valB = document.getElementById('valB');
    const btnRun = document.getElementById('btnRun');
    const stateLabel = document.getElementById('stateLabel');
    const liveInsight = document.getElementById('liveInsight');
    const plotMag = document.getElementById('plotCanvasMag');
    const ctxMag = plotMag.getContext('2d');
    const plotBc = document.getElementById('plotCanvasBcrit');
    const ctxBc = plotBc.getContext('2d');
    const resMs = document.getElementById('resMs'), resTau = document.getElementById('resTau'), resDef = document.getElementById('resDef'), resB45 = document.getElementById('resB45'), resB90 = document.getElementById('resB90');
    const magBody = document.querySelector('#magTable tbody');
    const formula = document.getElementById('magFormulaContainer');

    const KMAG = 0.18, LBEAM = 10, MS = 4.8e5, VBEAM = 3e-9; // deg/(vol%.mT), mm, A/m (Fe3O4), m^3
    const rad = (d) => d * Math.PI / 180;
    // ---------- physics ----------
    const thetaDeg = (B, phi) => Math.min(90, KMAG * phi * B);             // tip angle
    const deflection = (B, phi) => { const th = rad(thetaDeg(B, phi)); return th < 1e-4 ? 0 : LBEAM * (1 - Math.cos(th)) / th; }; // mm (arc)
    const Bcrit = (deg, phi) => deg / (KMAG * phi);                        // mT for a target angle
    const mEff = (phi) => MS * phi / 100;                                  // A/m
    const torque = (B, phi) => mEff(phi) * VBEAM * (B / 1000);             // N.m (m_total * B)

    let phi = parseFloat(volInput.value), B = parseFloat(bInput.value);
    let dispAng = 0, targAng = 0, sweeping = false, appliedB = B, tAnim = 0;

    // ---------- Three.js: magnetic catheter tip that bends toward an external magnet ----------
    let S = null, joints = [], segs = [], parts = [], arrows = [], target;
    const NB = 22;
    function init3D() {
        S = HG.scene3D('viewport3D', [1.4, 0.6, 4.2]);
        if (!S) return;
        const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 0.5), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 })); clamp.position.set(0, -1.15, 0); S.scene.add(clamp);
        for (let i = 0; i <= NB; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), new THREE.MeshStandardMaterial({ color: 0x64748b })); S.scene.add(m); joints.push(m); }
        for (let i = 0; i < NB; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1, 12), new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.4 })); m.castShadow = true; S.scene.add(m); segs.push(m); }
        for (let i = 0; i < 8; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.7, roughness: 0.3 })); S.scene.add(m); parts.push(m); }
        // target branch the tip should steer into
        target = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.05, 12, 28), new THREE.MeshStandardMaterial({ color: 0x16a34a, transparent: true, opacity: 0.55 }));
        target.position.set(1.45, 0.95, 0); target.rotation.y = Math.PI / 2; S.scene.add(target);
        // external-magnet field-direction arrows (+x)
        for (let i = 0; i < 4; i++) { const g = new THREE.Group(); const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8), new THREE.MeshBasicMaterial({ color: 0x16a34a })); shaft.rotation.z = -Math.PI / 2; shaft.position.x = 0.25; const head = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.14, 12), new THREE.MeshBasicMaterial({ color: 0x16a34a })); head.rotation.z = -Math.PI / 2; head.position.x = 0.55; g.add(shaft, head); g.position.set(-1.6, -0.9 + i * 0.55, 0); S.scene.add(g); arrows.push(g); }
    }
    function update3D() {
        if (!S) return;
        const theta = dispAng;                                   // total arc angle (rad)
        const dphi = theta / NB;
        let ang = Math.PI / 2, x = 0, y = -1.0, prev = new THREE.Vector3(x, y, 0);
        const pts = [prev.clone()];
        for (let i = 0; i < NB; i++) { ang -= dphi; const np = new THREE.Vector3(prev.x + (LBEAM / NB / 5) * Math.cos(ang), prev.y + (LBEAM / NB / 5) * Math.sin(ang), 0); pts.push(np); prev = np; }
        for (let i = 0; i <= NB; i++) joints[i].position.copy(pts[i]);
        segs.forEach((s, i) => { HG.placeCyl(s, pts[i], pts[i + 1]); });
        parts.forEach((p, i) => { const idx = Math.floor((i + 0.5) / parts.length * NB); p.position.copy(pts[idx]); });
        const strength = Math.min(appliedB / 150, 1);
        arrows.forEach((a) => { a.scale.setScalar(0.5 + strength); a.children.forEach((c) => { c.material.color.set(HG.mix(0xcbd5e1, 0x16a34a, strength)); }); });
        const steered = thetaDeg(appliedB, phi) >= 45;
        if (target) { target.material.color.set(steered ? 0x16a34a : 0x94a3b8); target.material.opacity = steered ? 0.8 : 0.4; }
    }

    // ---------- plots ----------
    function drawMagPlot() {
        const W = plotMag.width, H = plotMag.height;
        const pts = [];
        for (let b = 0; b <= 150.001; b += 2) pts.push({ x: b, y: deflection(b, phi) });
        const fr = HG.frame(ctxMag, W, H, { xMin: 0, xMax: 150, yMin: 0, yMax: 7, xTicks: 5, yTicks: 7, xLabel: 'External magnet strength B (mT)', yLabel: 'Tip bend (mm)', axisColor: '#E2570F', xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(0) });
        const b45 = Bcrit(45, phi), b90 = Bcrit(90, phi);
        if (b45 <= 150) HG.vLine(ctxMag, fr, b45, '#1E40AF', 'steer 45');
        if (b90 <= 150) HG.vLine(ctxMag, fr, b90, '#16a34a', 'steer 90');
        HG.curve(ctxMag, fr, pts, '#E2570F', 2.6);
        HG.tracker(ctxMag, fr, B, deflection(B, phi), deflection(B, phi).toFixed(1) + 'mm', '#ef4444');
        HG.legend(ctxMag, fr.pl + fr.w - 158, fr.pt + 6, [{ color: '#E2570F', text: 'Tip bend vs magnet' }, { color: '#1E40AF', dash: true, text: 'Field to steer 45 deg' }, { color: '#16a34a', dash: true, text: 'Field to steer 90 deg' }]);
    }
    function drawBcPlot() {
        const W = plotBc.width, H = plotBc.height;
        const pts = [];
        for (let v = 1; v <= 10.001; v += 0.2) pts.push({ x: v, y: Bcrit(45, v) });
        const fr = HG.frame(ctxBc, W, H, { padT: 14, padB: 26, xMin: 1, xMax: 10, yMin: 0, yMax: 260, xTicks: 9, yTicks: 4, xLabel: 'Particles printed in (vol%)', yLabel: 'Magnet for 45 deg (mT)', axisColor: '#1E40AF', xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(0) });
        HG.curve(ctxBc, fr, pts, '#1E40AF', 2.4);
        HG.tracker(ctxBc, fr, phi, Bcrit(45, phi), Bcrit(45, phi).toFixed(0) + 'mT', '#ef4444');
        ctxBc.fillStyle = '#1E40AF'; ctxBc.font = 'bold 8px sans-serif'; ctxBc.textAlign = 'left'; ctxBc.fillText('More particles = weaker magnet needed', fr.pl + 8, fr.pt + 11);
    }
    function fillMag() {
        if (!magBody) return;
        const vs = [1, 2, 5, 8, 10];
        magBody.innerHTML = vs.map((v) => { const near = Math.abs(v - phi) < 0.6; return '<tr style="' + (near ? 'background:rgba(138,17,52,0.08);font-weight:bold;' : '') + '"><td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;">' + v + '</td><td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;text-align:right;">' + Bcrit(45, v).toFixed(0) + '</td></tr>'; }).join('');
    }
    function updateEq() {
        formula.innerHTML = '<div style="line-height:1.7;color:#1e293b;font-size:15px;font-weight:bold;">' +
            '<div><strong>Magnetic torque:</strong> &tau; = mB sin&theta;, &nbsp; m = M<sub>s</sub> V<sub>particle</sub> &rArr; m_eff = ' + mEff(phi).toExponential(2) + ' A/m</div>' +
            '<div style="margin-left:18px;font-style:italic;color:#475569;font-size:0.95em;">Tip bend &delta; = &tau; L&sup2;/(2EI); current &theta; = ' + thetaDeg(B, phi).toFixed(0) + ' deg, &delta; = ' + deflection(B, phi).toFixed(2) + ' mm</div>' +
            '<div style="margin-top:6px;"><strong>Field to steer 45 deg:</strong> B<sub>crit</sub> = EI&pi;/(4 M<sub>s</sub> V L&sup2;) = ' + Bcrit(45, phi).toFixed(0) + ' mT &nbsp;(&prop; 1/particle-content)</div></div>';
    }
    function refresh() {
        const th = thetaDeg(B, phi), df = deflection(B, phi);
        if (!sweeping) { targAng = rad(th); appliedB = B; }
        HG.put(resMs, mEff(phi).toExponential(2) + ' A/m');
        HG.put(resTau, (torque(B, phi) * 1e6).toFixed(2) + ' uN.m');
        HG.put(resDef, df.toFixed(2) + ' mm @ ' + th.toFixed(0) + ' deg', '#E2570F');
        HG.put(resB45, Bcrit(45, phi).toFixed(0) + ' mT', '#1E40AF');
        HG.put(resB90, Bcrit(90, phi).toFixed(0) + ' mT', '#16a34a');
        const steers = th >= 45;
        stateLabel.innerText = steers ? 'Tip steered ' + th.toFixed(0) + ' deg (enough)' : 'Tip bent ' + th.toFixed(0) + ' deg (not yet)';
        stateLabel.style.background = steers ? '#dcfce7' : '#e0f2fe'; stateLabel.style.color = steers ? '#166534' : '#075985';
        liveInsight.innerHTML = '<strong>Live Insight:</strong> With ' + phi.toFixed(1) + ' vol% magnetic particles printed into the tip, an external magnet of ' + B.toFixed(0) + ' mT bends it <strong>' + th.toFixed(0) + ' deg</strong> (' + df.toFixed(2) + ' mm) in milliseconds - ' +
            (steers ? 'enough to <strong>steer into the side branch</strong>. ' : 'not yet enough to steer; add particles or a stronger magnet. ') +
            'Steering 45 deg needs about ' + Bcrit(45, phi).toFixed(0) + ' mT, and because torque grows with particle content the field needed drops as 1/(vol-fraction). ' +
            '<em>Design rule: print in more particles to steer with a gentler magnet - steering stays wireless and millisecond-fast.</em>';
        drawMagPlot(); drawBcPlot(); fillMag(); updateEq();
    }

    // ---------- apply-the-magnet ramp: bring the field up to the slider-set B ----------
    // (ramps 0 -> the currently dialled-in Field B, so the "Field B" slider always
    // drives the outcome, instead of always sweeping to a fixed 150 mT)
    function startRun() { if (sweeping) { stopRun(); return; } sweeping = true; appliedB = 0; btnRun.innerText = 'Pause Sweep'; btnRun.style.background = '#475569'; }
    function stopRun(done) { sweeping = false; btnRun.innerText = 'Apply the Magnet'; btnRun.style.background = '#E2570F'; if (done) { const nx = document.getElementById('btnNextCalc'); if (nx) nx.style.display = 'block'; } }
    function stepRun(dt) {
        appliedB = Math.min(B, appliedB + dt * Math.max(20, B * 0.9));
        targAng = rad(thetaDeg(appliedB, phi));
        refresh();
        if (appliedB >= B) { appliedB = B; stopRun(true); }
    }

    // ---------- events ----------
    volInput.addEventListener('input', () => { if (sweeping) stopRun(); phi = parseFloat(volInput.value); valVol.innerText = phi.toFixed(1) + ' vol%'; refresh(); });
    bInput.addEventListener('input', () => { if (sweeping) stopRun(); B = parseFloat(bInput.value); valB.innerText = B.toFixed(0) + ' mT'; refresh(); });
    btnRun.addEventListener('click', startRun);

    // ---------- render loop ----------
    let last = performance.now();
    function loop(now) {
        requestAnimationFrame(loop);
        const dt = Math.min((now - last) / 1000, 0.05); last = now; tAnim += dt;
        if (sweeping) stepRun(dt);
        dispAng += (targAng - dispAng) * 0.1;
        update3D();
        if (S) { S.controls.update(); S.renderer.render(S.scene, S.camera); }
    }

    // ---------- init ----------
    LabGate.arm(function () {
        init3D();
        valVol.innerText = phi.toFixed(1) + ' vol%'; valB.innerText = B.toFixed(0) + ' mT';
        refresh(); dispAng = targAng;
        requestAnimationFrame(loop);
    });
})();

// ============================================================
// SUB-CALC D : THE WIRELESS COIL DRIVING AN IN-BODY ROBOT
// (Page check: document.getElementById('plotCanvasCoil'))
// An external coil must deliver enough magnetic field at the
// implanted robot's depth to drive it. Rigorous on-axis coil
// physics + tissue attenuation fix the current and power needed;
// past a crossover depth a tiny on-board battery wins. Pick a
// coil that powers the device without overheating.
// ============================================================
(function () {
    if (!document.getElementById('plotCanvasCoil')) return;

    const turnsInput = document.getElementById('turnsInput');
    const radInput = document.getElementById('radInput');
    const distInput = document.getElementById('distInput');
    const valTurns = document.getElementById('valTurns');
    const valRad = document.getElementById('valRad');
    const valDist = document.getElementById('valDist');
    const btnRun = document.getElementById('btnRun');
    const stateLabel = document.getElementById('stateLabel');
    const liveInsight = document.getElementById('liveInsight');
    const plotCoil = document.getElementById('plotCanvasCoil');
    const ctxCoil = plotCoil.getContext('2d');
    const plotField = document.getElementById('plotCanvasField');
    const ctxField = plotField.getContext('2d');
    const resBd = document.getElementById('resBd'), resBt = document.getElementById('resBt'), resI = document.getElementById('resI'), resP = document.getElementById('resP'), resCross = document.getElementById('resCross');
    const coilBody = document.querySelector('#coilTable tbody');
    const formula = document.getElementById('coilFormulaContainer');

    const MU0 = 4e-7 * Math.PI, B_CRIT = 0.05, RHO = 0.001, DELTA = 50, P_MAX = 300, I_FIX = 20;
    // ---------- physics (on-axis solenoid field) ----------
    const m2 = (mm) => (mm / 1000) * (mm / 1000);
    const Baxis = (n, R, r, I) => MU0 * n * I * m2(R) / (2 * Math.pow(m2(R) + m2(r), 1.5));        // Tesla
    // Biological tissue has relative magnetic permeability ~= 1 (weakly diamagnetic) at these
    // field strengths/frequencies, so it does NOT absorb a magnetostatic field the way it absorbs
    // light or RF power. The only real loss is the coil's own geometric 1/r^3 falloff, already
    // captured by Baxis - so the field "after tissue" equals the field at the device, not a
    // further exponential decay.
    const Btissue = (n, R, r, I) => Baxis(n, R, r, I);
    const Ireq = (n, R, r) => B_CRIT * 2 * Math.pow(m2(R) + m2(r), 1.5) / (MU0 * n * m2(R));        // A to reach B_crit at r
    const Pcoil = (n, R, r) => { const I = Ireq(n, R, r); return I * I * RHO * n; };                 // W
    function crossover(n, R) { for (let r = 10; r <= 250; r += 0.5) if (Pcoil(n, R, r) > P_MAX) return r; return 250; }

    let n = parseFloat(turnsInput.value), R = parseFloat(radInput.value), r = parseFloat(distInput.value);
    let dispField = 1, targField = 1, running = false, tAnim = 0;

    // ---------- Three.js: external coil + skin/tissue + in-body robot at depth ----------
    let S = null, coil, tissue, device, beam;
    const depthWorld = (rr) => 0.4 - (rr / 150) * 2.4;
    function init3D() {
        S = HG.scene3D('viewport3D', [2.4, 0.8, 3.6]);
        if (!S) return;
        coil = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.09, 16, 40), new THREE.MeshStandardMaterial({ color: 0xb45309, metalness: 0.7, roughness: 0.3 }));
        coil.rotation.x = Math.PI / 2; coil.position.y = 0.8; S.scene.add(coil);
        tissue = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 2.2), new THREE.MeshPhysicalMaterial({ color: 0xfca5a5, transparent: true, opacity: 0.28, roughness: 0.6 }));
        tissue.position.y = 0.4; S.scene.add(tissue);
        device = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.4), new THREE.MeshStandardMaterial({ color: 0x16a34a, emissive: 0x064e3b, emissiveIntensity: 0.5 }));
        S.scene.add(device);
        beam = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.7, 2.6, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.14, side: THREE.DoubleSide }));
        S.scene.add(beam);
    }
    function update3D() {
        if (!S) return;
        const dy = depthWorld(r);
        device.position.set(0, dy, 0);
        const ok = Pcoil(n, R, r) <= P_MAX;
        const lit = dispField * (ok ? 1 : 0.3);
        device.material.color.copy(HG.mix(0x64748b, ok ? 0x22c55e : 0xef4444, lit));
        device.material.emissive.copy(HG.mix(0x000000, ok ? 0x16a34a : 0x7f1d1d, lit));
        beam.position.set(0, (0.8 + dy) / 2, 0); beam.scale.y = Math.abs(0.8 - dy) / 2.6;
        beam.material.opacity = (0.06 + 0.12 * (0.5 + 0.5 * Math.sin(tAnim * 4))) * dispField;
        coil.scale.setScalar(R / 50); coil.material.emissive = new THREE.Color(0x000000);
    }

    // ---------- plots ----------
    function drawCoilPlot() {
        const W = plotCoil.width, H = plotCoil.height;
        const pts = [];
        for (let rr = 10; rr <= 150.001; rr += 1) pts.push({ x: rr, y: Math.min(Pcoil(n, R, rr), 1000) });
        const fr = HG.frame(ctxCoil, W, H, { xMin: 10, xMax: 150, yMin: 0, yMax: 1000, xTicks: 7, yTicks: 5, xLabel: 'Implant depth r (mm)', yLabel: 'Coil power needed (W)', axisColor: '#E2570F', xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(0) });
        const cr = crossover(n, R);
        HG.shadeX(ctxCoil, fr, cr, 150, 'rgba(239,68,68,0.08)', 'rgba(239,68,68,0.14)');
        HG.hLine(ctxCoil, fr, P_MAX, '#16a34a', 'wireless budget');
        if (cr <= 150) HG.vLine(ctxCoil, fr, cr, '#dc2626', 'crossover');
        HG.curve(ctxCoil, fr, pts, '#E2570F', 2.6);
        HG.tracker(ctxCoil, fr, r, Math.min(Pcoil(n, R, r), 1000), Pcoil(n, R, r).toFixed(0) + 'W', '#ef4444');
        HG.legend(ctxCoil, fr.pl + 8, fr.pt + 6, [{ color: '#E2570F', text: 'Power to reach the device' }, { color: '#16a34a', dash: true, text: 'Practical wireless budget' }, { color: '#dc2626', dash: true, text: 'Battery wins beyond' }]);
    }
    function drawFieldPlot() {
        const W = plotField.width, H = plotField.height;
        const ax = [];
        for (let rr = 10; rr <= 150.001; rr += 2) { ax.push({ x: rr, y: Baxis(n, R, rr, I_FIX) * 1000 }); }
        const fr = HG.frame(ctxField, W, H, { padT: 14, padB: 26, xMin: 10, xMax: 150, yMin: 0, yMax: 120, xTicks: 7, yTicks: 4, xLabel: 'Depth r (mm)', yLabel: 'Field reaching it (mT)', axisColor: '#1E40AF', xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(0) });
        HG.hLine(ctxField, fr, B_CRIT * 1000, '#16a34a', 'needs 50mT');
        HG.curve(ctxField, fr, ax, '#1E40AF', 2.4);
        HG.tracker(ctxField, fr, r, Baxis(n, R, r, I_FIX) * 1000, '', '#ef4444');
        ctxField.fillStyle = '#475569'; ctxField.font = 'bold 8px sans-serif'; ctxField.textAlign = 'left'; ctxField.fillText('field falls off geometrically as 1/r' + String.fromCharCode(179) + ' (tissue does not absorb it)', fr.pl + 8, fr.pt + 11);
    }
    function fillCoil() {
        if (!coilBody) return;
        const rs = [20, 40, 60, 100, 150];
        coilBody.innerHTML = rs.map((rr) => { const near = Math.abs(rr - r) < 8; return '<tr style="' + (near ? 'background:rgba(138,17,52,0.08);font-weight:bold;' : '') + '"><td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;">' + rr + '</td><td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;text-align:right;">' + Pcoil(n, R, rr).toFixed(0) + '</td></tr>'; }).join('');
    }
    function updateEq() {
        formula.innerHTML = '<div style="line-height:1.7;color:#1e293b;font-size:15px;font-weight:bold;">' +
            '<div><strong>Field from the coil:</strong> B = &mu;<sub>0</sub> n I R&sup2; / (2(R&sup2;+r&sup2;)<sup>3/2</sup>)</div>' +
            '<div style="margin-left:18px;font-style:italic;color:#475569;font-size:0.95em;">Current to reach 50 mT: I = B_crit&middot;2(R&sup2;+r&sup2;)<sup>3/2</sup>/(&mu;<sub>0</sub> n R&sup2;) = ' + Ireq(n, R, r).toFixed(1) + ' A &rArr; P = I&sup2;R_coil = ' + Pcoil(n, R, r).toFixed(0) + ' W</div>' +
            '<div style="margin-top:6px;"><strong>Tissue is magnetically transparent:</strong> unlike light or RF, biological tissue has relative permeability &approx; 1, so B is not absorbed - it only falls off geometrically as B &prop; 1/r&sup3; &rArr; ' + (Baxis(n, R, r, I_FIX) * 1000).toFixed(1) + ' mT at ' + r.toFixed(0) + ' mm (20 A)</div></div>';
    }
    function refresh() {
        const cr = crossover(n, R), P = Pcoil(n, R, r);
        HG.put(resBd, (Baxis(n, R, r, I_FIX) * 1000).toFixed(1) + ' mT');
        HG.put(resBt, 'None (~0%) - tissue is magnetically transparent');
        HG.put(resI, Ireq(n, R, r).toFixed(1) + ' A');
        HG.put(resP, P.toFixed(0) + ' W', P <= P_MAX ? '#16a34a' : '#dc2626');
        HG.put(resCross, cr.toFixed(0) + ' mm');
        const ok = P <= P_MAX;
        stateLabel.innerText = ok ? 'Wireless powering works' : 'Too deep - use a battery';
        stateLabel.style.background = ok ? '#dcfce7' : '#fee2e2'; stateLabel.style.color = ok ? '#166534' : '#b91c1c';
        liveInsight.innerHTML = '<strong>Live Insight:</strong> To drive the implanted robot at ' + r.toFixed(0) + ' mm depth, a ' + n + '-turn, ' + R.toFixed(0) + ' mm coil must push <strong>' + Ireq(n, R, r).toFixed(1) + ' A</strong>, drawing <strong>' + P.toFixed(0) + ' W</strong>. ' +
            'The field itself is not absorbed by tissue (magnetic permeability &approx; 1) - it only falls off geometrically as 1/r&sup3; with the coil-to-implant distance, so deeper implants need far more current and power. ' +
            'Past the crossover depth of <strong>' + cr.toFixed(0) + ' mm</strong> the coil exceeds the ' + P_MAX + ' W budget, so a mW-scale on-board battery becomes the better choice. ' +
            '<em>Design rule: power climbs steeply with depth - wireless wins when shallow, battery wins when deep.</em>';
        drawCoilPlot(); drawFieldPlot(); fillCoil(); updateEq();
    }

    // ---------- power-the-coil ramp: current builds up at the fixed, slider-set
    // depth/turns/radius (r, n, R are never overridden - they always drive the solver) ----------
    let tRun = 0;
    function startRun() { if (running) { stopRun(); return; } running = true; tRun = 0; targField = 1; dispField = 0; btnRun.innerText = 'Pause'; btnRun.style.background = '#475569'; }
    function stopRun(done) { running = false; btnRun.innerText = 'Power the Coil'; btnRun.style.background = '#E2570F'; if (done) { const nx = document.getElementById('btnNextCalc'); if (nx) nx.style.display = 'block'; } }
    function stepRun(dt) { tRun += dt; if (tRun >= 1.6 && dispField > 0.98) stopRun(true); }

    // ---------- events ----------
    turnsInput.addEventListener('input', () => { if (running) stopRun(); n = parseFloat(turnsInput.value); valTurns.innerText = String(n); refresh(); });
    radInput.addEventListener('input', () => { if (running) stopRun(); R = parseFloat(radInput.value); valRad.innerText = R.toFixed(0) + ' mm'; refresh(); });
    distInput.addEventListener('input', () => { if (running) stopRun(); r = parseFloat(distInput.value); valDist.innerText = r.toFixed(0) + ' mm'; refresh(); });
    btnRun.addEventListener('click', startRun);

    // ---------- render loop ----------
    let last = performance.now();
    function loop(now) {
        requestAnimationFrame(loop);
        const dt = Math.min((now - last) / 1000, 0.05); last = now; tAnim += dt;
        if (running) stepRun(dt);
        dispField += (targField - dispField) * 0.08;
        update3D();
        if (S) { S.controls.update(); S.renderer.render(S.scene, S.camera); }
    }

    // ---------- init ----------
    LabGate.arm(function () {
        init3D();
        valTurns.innerText = String(n); valRad.innerText = R.toFixed(0) + ' mm'; valDist.innerText = r.toFixed(0) + ' mm';
        refresh();
        requestAnimationFrame(loop);
    });
})();

// ============================================================
// SUB-CALC E : PICK THE RIGHT TRIGGER FOR THE JOB
// (Page check: document.getElementById('plotCanvasSpeed'))
// Three identical printed actuator strips race under three
// triggers - magnetic, light and heat - to show which is fastest.
// Rigorous characteristic times (magnetic ms, photo s, thermal
// min) rank them and map each trigger to the application it suits.
// Pick the trigger by the speed your device actually needs.
// ============================================================
(function () {
    if (!document.getElementById('plotCanvasSpeed')) return;

    const bInput = document.getElementById('bInput');
    const intInput = document.getElementById('intInput');
    const tauInput = document.getElementById('tauInput');
    const valB = document.getElementById('valB');
    const valInt = document.getElementById('valInt');
    const valTau = document.getElementById('valTau');
    const btnRun = document.getElementById('btnRun');
    const stateLabel = document.getElementById('stateLabel');
    const liveInsight = document.getElementById('liveInsight');
    const plotSpeed = document.getElementById('plotCanvasSpeed');
    const ctxSpeed = plotSpeed.getContext('2d');
    const plotMap = document.getElementById('plotCanvasMap');
    const ctxMap = plotMap.getContext('2d');
    const resMag = document.getElementById('resMag'), resPhoto = document.getElementById('resPhoto'), resTherm = document.getElementById('resTherm'), resR1 = document.getElementById('resR1'), resR2 = document.getElementById('resR2');
    const speedBody = document.querySelector('#speedTable tbody');
    const formula = document.getElementById('speedFormulaContainer');

    // ---------- physics (characteristic response times, s) ----------
    const tMag = (B) => 0.6 / B;                 // viscous-limited magnetic alignment
    const tPhoto = (I) => 850 / I;               // photokinetic 90% conversion
    const tTherm = (tau) => tau;                 // thermal diffusion time constant
    function fmtT(s) { return s < 1 ? (s * 1000).toFixed(0) + ' ms' : (s < 60 ? s.toFixed(1) + ' s' : (s / 60).toFixed(1) + ' min'); }
    // Map a physical response time (log scale, same -3..3 decade span as the
    // response-time bar chart) onto a watchable on-screen race duration, so the
    // B / I / tau sliders visibly change how fast each strip snaps in the 3D race
    // instead of the race always taking a fixed 0.3s/2.5s/6s regardless of input.
    const RACE_L0 = -3, RACE_L1 = 3, RACE_D_MIN = 0.3, RACE_D_MAX = 6.0;
    function raceDur(t) {
        const L = Math.max(RACE_L0, Math.min(RACE_L1, Math.log10(t)));
        return RACE_D_MIN + (L - RACE_L0) / (RACE_L1 - RACE_L0) * (RACE_D_MAX - RACE_D_MIN);
    }
    const STIM = [
        { key: 'Magnetic', col: 0x1E40AF, app: 'Surgical robots' },
        { key: 'Photo', col: 0x7c3aed, app: 'Microfluidics' },
        { key: 'Thermal', col: 0xdc2626, app: 'Implants' }
    ];

    let B = parseFloat(bInput.value), I = parseFloat(intInput.value), tau = parseFloat(tauInput.value);
    let disp = [1, 1, 1], targ = [1, 1, 1], running = false, animT = 0, tAnim = 0;

    // ---------- Three.js: three identical actuator strips racing ----------
    let S = null, strips = [];
    const NB = 12;
    function buildStrip(x, col) {
        const joints = [], segs = [];
        const base = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.5), new THREE.MeshStandardMaterial({ color: col, roughness: 0.5 }));
        base.position.set(x, -1.0, 0); S.scene.add(base);
        for (let i = 0; i <= NB; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), new THREE.MeshStandardMaterial({ color: col })); S.scene.add(m); joints.push(m); }
        for (let i = 0; i < NB; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 8), new THREE.MeshStandardMaterial({ color: col, roughness: 0.4 })); m.castShadow = true; S.scene.add(m); segs.push(m); }
        return { x: x, joints: joints, segs: segs };
    }
    function init3D() {
        S = HG.scene3D('viewport3D', [0.0, 0.4, 4.8]);
        if (!S) return;
        const gp = new THREE.Mesh(new THREE.BoxGeometry(5, 0.05, 2), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9 })); gp.position.y = -1.15; gp.receiveShadow = true; S.scene.add(gp);
        strips = [buildStrip(-1.4, 0x1E40AF), buildStrip(0, 0x7c3aed), buildStrip(1.4, 0xdc2626)];
    }
    function update3D() {
        if (!S) return;
        strips.forEach((st, k) => {
            const theta = (Math.PI / 2) * disp[k];           // bend to 90deg by progress
            const dphi = theta / NB;
            let ang = Math.PI / 2, prev = new THREE.Vector3(st.x, -0.9, 0);
            const pts = [prev.clone()];
            for (let i = 0; i < NB; i++) { ang -= dphi; const np = new THREE.Vector3(prev.x + 0.14 * Math.cos(ang), prev.y + 0.14 * Math.sin(ang), 0); pts.push(np); prev = np; }
            for (let i = 0; i <= NB; i++) st.joints[i].position.copy(pts[i]);
            st.segs.forEach((s, i) => HG.placeCyl(s, pts[i], pts[i + 1]));
        });
    }

    // ---------- plots ----------
    function drawSpeedPlot() {
        const W = plotSpeed.width, H = plotSpeed.height, ctx = ctxSpeed;
        ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
        const pl = 50, pr = 16, pt = 22, pb = 34, w = W - pl - pr, h = H - pt - pb, L0 = -3, L1 = 3;
        const ly = (L) => pt + h - (L - L0) / (L1 - L0) * h;
        ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(pl, pt); ctx.lineTo(pl, pt + h); ctx.lineTo(pl + w, pt + h); ctx.stroke();
        const labs = ['1ms', '10ms', '0.1s', '1s', '10s', '100s', '1000s'];
        ctx.font = '9px sans-serif';
        for (let L = L0; L <= L1; L++) { const y = ly(L); ctx.strokeStyle = '#eef2f7'; ctx.beginPath(); ctx.moveTo(pl, y); ctx.lineTo(pl + w, y); ctx.stroke(); ctx.fillStyle = '#475569'; ctx.textAlign = 'right'; ctx.fillText(labs[L - L0], pl - 5, y + 3); }
        ctx.save(); ctx.translate(13, pt + h / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillStyle = '#E2570F'; ctx.font = 'bold 10px sans-serif'; ctx.fillText('Response time (log scale)', 0, 0); ctx.restore();
        const ts = [tMag(B), tPhoto(I), tTherm(tau)];
        ts.forEach((t, k) => {
            const bx = pl + (k + 0.5) * (w / 3) - 26, top = ly(Math.max(L0, Math.log10(t)));
            ctx.fillStyle = '#' + STIM[k].col.toString(16).padStart(6, '0'); ctx.fillRect(bx, top, 52, pt + h - top);
            ctx.fillStyle = '#1e293b'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(fmtT(t), bx + 26, top - 5);
            ctx.fillStyle = '#475569'; ctx.font = '9px sans-serif'; ctx.fillText(STIM[k].key, bx + 26, pt + h + 13);
        });
    }
    function drawMapPlot() {
        const W = plotMap.width, H = plotMap.height, ctx = ctxMap;
        ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#334155'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'left'; ctx.fillText('Trigger -> speed -> what it is good for', 14, 16);
        const speeds = ['milliseconds', 'seconds', 'minutes'];
        STIM.forEach((s, k) => {
            const y = 36 + k * 36;
            ctx.fillStyle = '#' + s.col.toString(16).padStart(6, '0'); ctx.beginPath(); ctx.arc(24, y, 8, 0, 7); ctx.fill();
            ctx.fillStyle = '#1e293b'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left'; ctx.fillText(s.key, 40, y + 4);
            ctx.fillStyle = '#64748b'; ctx.font = '10px sans-serif'; ctx.fillText(speeds[k], 130, y + 4);
            ctx.fillStyle = '#475569'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'right'; ctx.fillText(s.app, W - 14, y + 4);
            ctx.strokeStyle = '#e2e8f0'; ctx.beginPath(); ctx.moveTo(40, y + 16); ctx.lineTo(W - 14, y + 16); ctx.stroke();
        });
    }
    function fillSpeed() {
        if (!speedBody) return;
        const speeds = ['ms', 's', 'min'];
        speedBody.innerHTML = STIM.map((s, k) => '<tr><td style="padding:7px 4px;border-bottom:1px solid #e2e8f0;"><span style="color:#' + s.col.toString(16).padStart(6, '0') + ';font-weight:700;">' + s.key + '</span></td><td style="padding:7px 4px;border-bottom:1px solid #e2e8f0;">' + speeds[k] + '</td><td style="padding:7px 4px;border-bottom:1px solid #e2e8f0;text-align:right;">' + s.app + '</td></tr>').join('');
    }
    function updateEq() {
        formula.innerHTML = '<div style="line-height:1.7;color:#1e293b;font-size:15px;font-weight:bold;">' +
            '<div><strong>Magnetic:</strong> t_mag &asymp; &eta;/(M<sub>s</sub>B) = ' + fmtT(tMag(B)) + ' &nbsp;|&nbsp; <strong>Photo:</strong> t_photo &asymp; 1/(&Phi; I &sigma;) = ' + fmtT(tPhoto(I)) + '</div>' +
            '<div style="margin-left:18px;font-style:italic;color:#475569;font-size:0.95em;"><strong>Thermal:</strong> t_thermal = &tau;_thermal = ' + fmtT(tTherm(tau)) + ' (diffusion-limited)</div>' +
            '<div style="margin-top:6px;">Ratios: photo/magnetic = ' + (tPhoto(I) / tMag(B)).toFixed(0) + 'x, &nbsp; thermal/magnetic = ' + (tTherm(tau) / tMag(B)).toFixed(0) + 'x</div></div>';
    }
    function refresh() {
        const t1 = tMag(B), t2 = tPhoto(I), t3 = tTherm(tau);
        HG.put(resMag, fmtT(t1), '#1E40AF');
        HG.put(resPhoto, fmtT(t2), '#7c3aed');
        HG.put(resTherm, fmtT(t3), '#dc2626');
        HG.put(resR1, (t2 / t1).toFixed(0) + ' x');
        HG.put(resR2, (t3 / t1).toFixed(0) + ' x');
        stateLabel.innerText = running ? 'Racing...' : 'Magnetic fastest, heat slowest';
        stateLabel.style.background = '#eef2ff'; stateLabel.style.color = '#3730a3';
        liveInsight.innerHTML = '<strong>Live Insight:</strong> Driven side by side, the magnetic strip snaps in <strong>' + fmtT(t1) + '</strong>, the light-driven strip in <strong>' + fmtT(t2) + '</strong> and the heat-driven strip in <strong>' + fmtT(t3) + '</strong>. ' +
            'Magnetic is about ' + (t2 / t1).toFixed(0) + 'x faster than light and ' + (t3 / t1).toFixed(0) + 'x faster than heat. ' +
            'Match the trigger to the job: magnetic for fast surgical micro-robots, light for precisely-addressed microfluidics, heat for simple slow implants. ' +
            '<em>Design rule: pick the trigger by the speed your device actually needs.</em>';
        drawSpeedPlot(); drawMapPlot(); fillSpeed(); updateEq();
    }

    // ---------- race animation ----------
    function startRun() { if (running) { stopRun(); return; } running = true; animT = 0; disp = [0, 0, 0]; btnRun.innerText = 'Pause'; btnRun.style.background = '#475569'; refresh(); }
    function stopRun(done) { running = false; btnRun.innerText = 'Race the Actuators'; btnRun.style.background = '#E2570F'; if (done) { const nx = document.getElementById('btnRestart'); if (nx) nx.style.display = 'block'; } refresh(); }

    // ---------- events ----------
    bInput.addEventListener('input', () => { if (running) stopRun(); B = parseFloat(bInput.value); valB.innerText = B.toFixed(0) + ' mT'; refresh(); });
    intInput.addEventListener('input', () => { if (running) stopRun(); I = parseFloat(intInput.value); valInt.innerText = I.toFixed(0) + ' mW/cm2'; refresh(); });
    tauInput.addEventListener('input', () => { if (running) stopRun(); tau = parseFloat(tauInput.value); valTau.innerText = tau.toFixed(0) + ' s'; refresh(); });
    btnRun.addEventListener('click', startRun);

    // ---------- render loop ----------
    let last = performance.now();
    function loop(now) {
        requestAnimationFrame(loop);
        const dt = Math.min((now - last) / 1000, 0.05); last = now; tAnim += dt;
        if (running) {
            animT += dt;
            const d1 = raceDur(tMag(B)), d2 = raceDur(tPhoto(I)), d3 = raceDur(tTherm(tau));
            targ = [Math.min(animT / d1, 1), Math.min(animT / d2, 1), Math.min(animT / d3, 1)];
            if (animT > Math.max(d1, d2, d3) + 0.4) stopRun(true);
        }
        else targ = [1, 1, 1];
        for (let k = 0; k < 3; k++) disp[k] += (targ[k] - disp[k]) * 0.12;
        update3D();
        if (S) { S.controls.update(); S.renderer.render(S.scene, S.camera); }
    }

    // ---------- init ----------
    LabGate.arm(function () {
        init3D();
        valB.innerText = B.toFixed(0) + ' mT'; valInt.innerText = I.toFixed(0) + ' mW/cm2'; valTau.innerText = tau.toFixed(0) + ' s';
        refresh();
        requestAnimationFrame(loop);
    });
})();
