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
// Combined simulator script for Exp 5 - Multi-Material 4D
// Structure Design. Five sub-calculators, one per page,
// selected by a unique canvas id present only on that page.
// Each module shows a recognizable 4D-printed DEVICE transforming
// (self-folding box, self-closing gripper, self-folding sheet,
// deployable Miura panel, living-hinge cycle test), driven by the
// real mechanics (stiffness contrast, Grubler-Kutzbach mobility,
// fold kinematics, Miura-ori geometry, Basquin fatigue), with an
// animated Three.js scene, publication-grade 2D plots, a play
// timeline, and live governing-equation substitution + tables.
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
// SUB-CALC A : THE SELF-FOLDING FLAT-PACK BOX (STIFFNESS CONTRAST)
// (Page check: document.getElementById('plotCanvasSC'))
// A flat-printed sheet folds itself into a box along a soft printed
// living hinge. Each layer's rigidity is EI = E b h^3/12; the stiffness
// contrast SC = E_passive/E_active decides whether the fold localises
// cleanly in the maroon hinge or smears across the stiff slate panels.
// ============================================================
(function () {
    if (!document.getElementById('plotCanvasSC')) return;

    const hInput = document.getElementById('hInput');
    const thetaInput = document.getElementById('thetaInput');
    const valH = document.getElementById('valH');
    const valTheta = document.getElementById('valTheta');
    const btnRun = document.getElementById('btnRun');
    const stateLabel = document.getElementById('stateLabel');
    const liveInsight = document.getElementById('liveInsight');
    const plotSC = document.getElementById('plotCanvasSC');
    const ctxSC = plotSC.getContext('2d');
    const plotLoc = document.getElementById('plotCanvasLoc');
    const ctxLoc = plotLoc.getContext('2d');
    const resSC = document.getElementById('resSC');
    const resLh = document.getElementById('resLh');
    const resLoc = document.getElementById('resLoc');
    const resClean = document.getElementById('resClean');
    const cleanBody = document.querySelector('#foldTable tbody');
    const formula = document.getElementById('scFormulaContainer');

    const B = 10.0;        // panel width (mm)
    const M = 0.12;        // representative actuation moment (N.mm)
    const R_GEOM = 100;    // panel/hinge length ratio for the localisation model
    const ACT = [{ name: 'Hydrogel', E: 1 }, { name: 'Elastomer', E: 5 }, { name: 'Soft SMP', E: 20 }];
    const nameOf = (E) => { const m = ACT.find((x) => Math.abs(x.E - E) < 1e-6); return m ? m.name : 'soft layer'; };
    // ---------- physics (composite-beam bending) ----------
    const Imom = (h) => B * h * h * h / 12;                       // mm^4
    const Lhinge = (h, thetaDeg, Ea) => (thetaDeg * Math.PI / 180) * Ea * Imom(h) / M; // mm
    const localisation = (SC) => SC / (SC + R_GEOM);              // fraction of rotation in hinge
    const cleanFold = (SC) => SC >= 1000;

    let Ea = 1, Ep = 2000, h = parseFloat(hInput.value), thetaDeg = parseFloat(thetaInput.value);
    let dispFold = 1, targFold = 1, sweeping = false, sweepT = 0, tAnim = 0;

    // ---------- Three.js: a flat sheet that folds itself into a box ----------
    let S = null, plates = [];
    const baseY = -0.55, DEPTH = 1.5;
    const NB = 6, NH = 4, NW = 11;                 // base / hinge / wall segments per side
    const KS = NB + NH + NW;                        // segments per side
    const segB = 0.18, segH = 0.07, segW = 0.16;
    function init3D() {
        S = HG.scene3D('viewport3D', [0.0, 1.25, 4.9]);
        if (!S) return;
        const table = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.08, 2.4), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9 }));
        table.position.y = baseY - 0.10; table.receiveShadow = true; S.scene.add(table);
        for (let side = 0; side < 2; side++) {
            for (let i = 0; i < KS; i++) {
                const kind = i < NB ? 'base' : (i < NB + NH ? 'hinge' : 'wall');
                const thk = kind === 'hinge' ? 0.05 : 0.09;
                const col = kind === 'hinge' ? 0xE2570F : 0x64748b;
                const m = new THREE.Mesh(new THREE.BoxGeometry(1, thk, DEPTH), new THREE.MeshStandardMaterial({ color: col, roughness: 0.5, metalness: 0.05 }));
                m.castShadow = true; m.receiveShadow = true; S.scene.add(m);
                plates.push({ mesh: m, kind: kind });
            }
        }
    }
    function halfPts(sign, theta, loc) {
        const dPhiH = loc * theta / NH, dPhiW = (1 - loc) * theta / NW;
        let phi = 0, x = 0, y = baseY;
        const pts = [{ x: x, y: y }];
        for (let i = 0; i < NB; i++) { x += sign * segB * Math.cos(phi); y += segB * Math.sin(phi); pts.push({ x: x, y: y }); }
        for (let i = 0; i < NH; i++) { phi += dPhiH; x += sign * segH * Math.cos(phi); y += segH * Math.sin(phi); pts.push({ x: x, y: y }); }
        for (let i = 0; i < NW; i++) { phi += dPhiW; x += sign * segW * Math.cos(phi); y += segW * Math.sin(phi); pts.push({ x: x, y: y }); }
        return pts;
    }
    function placePlate(mesh, p1, p2) {
        const dx = p2.x - p1.x, dy = p2.y - p1.y, len = Math.hypot(dx, dy);
        mesh.position.set((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, 0);
        mesh.scale.x = Math.max(len, 1e-3);
        mesh.rotation.z = Math.atan2(dy, dx);
    }
    function update3D() {
        if (!S) return;
        const SC = Ep / Ea, loc = localisation(SC), clean = cleanFold(SC);
        const theta = (thetaDeg * Math.PI / 180) * dispFold;
        const right = halfPts(1, theta, loc), left = halfPts(-1, theta, loc);
        const wallCol = clean ? HG.mix(0x64748b, 0x16a34a, 0.32 * dispFold) : new THREE.Color(0x94a3b8);
        let idx = 0;
        [right, left].forEach((pts) => {
            for (let i = 0; i < KS; i++) {
                const pl = plates[idx++];
                placePlate(pl.mesh, pts[i], pts[i + 1]);
                pl.mesh.material.color.copy(pl.kind === 'hinge' ? new THREE.Color(0xE2570F) : wallCol);
            }
        });
    }

    // ---------- plots ----------
    function drawSCPlot() {
        const W = plotSC.width, H = plotSC.height;
        const yMax = Math.max(5, Math.ceil(Lhinge(2.0, thetaDeg, Ea) / 10) * 10);
        const pts = [];
        for (let hh = 0.2; hh <= 2.001; hh += 0.02) pts.push({ x: hh, y: Lhinge(hh, thetaDeg, Ea) });
        const fr = HG.frame(ctxSC, W, H, { xMin: 0.2, xMax: 2.0, yMin: 0, yMax: yMax, xTicks: 6, yTicks: 5, xLabel: 'Hinge thickness h (mm)', yLabel: 'Hinge length needed (mm)', axisColor: '#E2570F', xFmt: (v) => v.toFixed(1), yFmt: (v) => v.toFixed(0) });
        HG.curve(ctxSC, fr, pts, '#E2570F', 2.6);
        HG.tracker(ctxSC, fr, h, Lhinge(h, thetaDeg, Ea), 'L=' + Lhinge(h, thetaDeg, Ea).toFixed(1) + ' mm', '#ef4444');
        HG.legend(ctxSC, fr.pl + 8, fr.pt + 6, [{ color: '#E2570F', text: 'L for ' + thetaDeg.toFixed(0) + ' deg fold (L ~ h cubed)' }, { color: '#ef4444', text: 'Your hinge' }]);
    }
    function drawLocPlot() {
        const W = plotLoc.width, H = plotLoc.height;
        const pts = [];
        for (let lx = 0; lx <= 4.001; lx += 0.04) { const sc = Math.pow(10, lx); pts.push({ x: lx, y: localisation(sc) * 100 }); }
        const fr = HG.frame(ctxLoc, W, H, { padT: 14, padB: 26, xMin: 0, xMax: 4, yMin: 0, yMax: 100, xTicks: 4, yTicks: 5, xLabel: 'Stiffness contrast SC (panel vs hinge)', yLabel: '% fold in hinge', axisColor: '#1E40AF', xFmt: (v) => '1e' + v.toFixed(0), yFmt: (v) => v.toFixed(0) });
        HG.shadeX(ctxLoc, fr, 3, 4, 'rgba(16,185,129,0.10)');
        HG.vLine(ctxLoc, fr, 3, '#16a34a', 'SC=1000');
        HG.hLine(ctxLoc, fr, 90, '#cbd5e1', '90%');
        HG.curve(ctxLoc, fr, pts, '#1E40AF', 2.4);
        const SC = Ep / Ea;
        HG.tracker(ctxLoc, fr, Math.log10(SC), localisation(SC) * 100, (localisation(SC) * 100).toFixed(0) + '%', '#ef4444');
    }
    function fillTable() {
        if (!cleanBody) return;
        cleanBody.innerHTML = ACT.map((m) => { const SC = Ep / m.E, clean = cleanFold(SC), sel = Math.abs(m.E - Ea) < 1e-6; return '<tr style="' + (sel ? 'background:rgba(138,17,52,0.08);font-weight:bold;' : '') + '"><td style="padding:7px 4px;border-bottom:1px solid #e2e8f0;">' + m.name + ' (' + m.E + ' MPa)</td><td style="padding:7px 4px;border-bottom:1px solid #e2e8f0;">' + SC.toFixed(0) + '</td><td style="padding:7px 4px;border-bottom:1px solid #e2e8f0;text-align:right;color:' + (clean ? '#16a34a' : '#dc2626') + ';font-weight:700;">' + (clean ? 'Clean' : 'Smears') + '</td></tr>'; }).join('');
    }
    function updateEq() {
        const SC = Ep / Ea, I = Imom(h);
        formula.innerHTML = '<div style="line-height:1.7;color:#1e293b;font-size:15px;font-weight:bold;">' +
            '<div><strong>Panel rigidity:</strong> EI = E&middot;b&middot;h&sup3;/12 &nbsp;|&nbsp; <strong>Stiffness contrast:</strong> SC = E<sub>passive</sub>/E<sub>active</sub> = ' + SC.toFixed(0) + '</div>' +
            '<div style="margin-left:18px;font-style:italic;color:#475569;font-size:0.95em;">Substitution: E<sub>a</sub> = ' + Ea + ' MPa, b = ' + B + ' mm, h = ' + h.toFixed(2) + ' mm &rArr; I = ' + I.toFixed(3) + ' mm&#8308;</div>' +
            '<div style="margin-top:6px;"><strong>Hinge rotation:</strong> &theta; = M&middot;L<sub>hinge</sub>/(E<sub>a</sub>I) &rArr; L<sub>hinge</sub> = &theta;&middot;E<sub>a</sub>&middot;I/M = ' + Lhinge(h, thetaDeg, Ea).toFixed(2) + ' mm</div></div>';
    }
    function refresh() {
        const SC = Ep / Ea, Lh = Lhinge(h, thetaDeg, Ea), loc = localisation(SC), clean = cleanFold(SC);
        HG.put(resSC, SC.toFixed(0), clean ? '#16a34a' : (SC >= 100 ? '#b45309' : '#dc2626'));
        HG.put(resLh, Lh.toFixed(2) + ' mm');
        HG.put(resLoc, (loc * 100).toFixed(0) + ' %', loc >= 0.9 ? '#16a34a' : '#b45309');
        HG.put(resClean, clean ? 'Yes - clean box' : 'No - panels bend', clean ? '#16a34a' : '#dc2626');
        const folded = dispFold > 0.5;
        stateLabel.innerText = folded ? (clean ? 'Box folded - crisp corners' : 'Box folded - panels bowed') : 'Flat sheet (just printed)';
        stateLabel.style.background = folded ? (clean ? '#dcfce7' : '#fef3c7') : '#f1f5f9';
        stateLabel.style.color = folded ? (clean ? '#166534' : '#92400e') : '#475569';
        liveInsight.innerHTML = '<strong>Live Insight:</strong> A soft ' + nameOf(Ea).toLowerCase() + ' hinge (' + Ea + ' MPa) against a stiff ' + (Ep / 1000).toFixed(1) + ' GPa panel gives a stiffness contrast SC = ' + SC.toFixed(0) + '. To fold ' + thetaDeg.toFixed(0) + ' deg the printed living hinge needs to be ' + Lh.toFixed(1) + ' mm long, and ' + (loc * 100).toFixed(0) + '% of the bending stays in the hinge. ' +
            (clean ? 'The stiff panels stay flat, so the sheet snaps into a <strong>clean box</strong> with sharp corners.' : 'The panels are not stiff enough - they bow along with the hinge, so the box comes out <strong>rounded and sloppy</strong>.') +
            ' <em>Design rule: a high stiffness contrast (SC &gt; 1000) localises the fold in the hinge.</em>';
        drawSCPlot(); drawLocPlot(); fillTable(); updateEq();
    }

    // ---------- self-folding animation ----------
    function startRun() { if (sweeping) { stopRun(); return; } sweeping = true; sweepT = 0; dispFold = 0; btnRun.innerText = 'Folding...'; btnRun.style.background = '#475569'; stateLabel.innerText = 'Folding the sheet...'; stateLabel.style.background = '#dbeafe'; stateLabel.style.color = '#1e40af'; }
    function stopRun(done) { sweeping = false; btnRun.innerText = 'Fold the Box'; btnRun.style.background = '#E2570F'; targFold = 1; if (done) { dispFold = 1; const nx = document.getElementById('btnNextCalc'); if (nx) nx.style.display = 'block'; } refresh(); }

    // ---------- events ----------
    document.querySelectorAll('input[name="act"]').forEach((rd) => rd.addEventListener('change', () => { if (sweeping) stopRun(); Ea = parseFloat(document.querySelector('input[name="act"]:checked').value); refresh(); }));
    document.querySelectorAll('input[name="pas"]').forEach((rd) => rd.addEventListener('change', () => { if (sweeping) stopRun(); Ep = parseFloat(document.querySelector('input[name="pas"]:checked').value); refresh(); }));
    hInput.addEventListener('input', () => { if (sweeping) stopRun(); h = parseFloat(hInput.value); valH.innerText = h.toFixed(2) + ' mm'; refresh(); });
    thetaInput.addEventListener('input', () => { if (sweeping) stopRun(); thetaDeg = parseFloat(thetaInput.value); valTheta.innerText = thetaDeg.toFixed(0) + ' deg'; refresh(); });
    btnRun.addEventListener('click', startRun);

    // ---------- render loop ----------
    let last = performance.now();
    function loop(now) {
        requestAnimationFrame(loop);
        const dt = Math.min((now - last) / 1000, 0.05); last = now; tAnim += dt;
        if (sweeping) { sweepT += dt; dispFold = Math.min(sweepT / 3, 1); if (dispFold >= 1 && sweepT > 3.2) stopRun(true); }
        else { dispFold += (targFold - dispFold) * 0.1; }
        update3D();
        if (S) { S.controls.update(); S.renderer.render(S.scene, S.camera); }
    }

    // ---------- init ----------
    LabGate.arm(function () {
        init3D();
        valH.innerText = h.toFixed(2) + ' mm'; valTheta.innerText = thetaDeg.toFixed(0) + ' deg';
        refresh(); dispFold = 1;
        requestAnimationFrame(loop);
    });
})();

// ============================================================
// SUB-CALC B : THE SELF-CLOSING GRIPPER MECHANISM (GRUBLER-KUTZBACH)
// (Page check: document.getElementById('plotCanvasDOF'))
// Does the printed gripper have the right number of working joints to
// actually open and close? Planar mobility F = 3(n-1) - 2j1 - j2 decides:
// F<=0 locked/rigid, F=2 a controllable open/close gripper, F>2 floppy.
// ============================================================
(function () {
    if (!document.getElementById('plotCanvasDOF')) return;

    const nInput = document.getElementById('nInput');
    const j1Input = document.getElementById('j1Input');
    const j2Input = document.getElementById('j2Input');
    const valN = document.getElementById('valN');
    const valJ1 = document.getElementById('valJ1');
    const valJ2 = document.getElementById('valJ2');
    const btnRun = document.getElementById('btnRun');
    const stateLabel = document.getElementById('stateLabel');
    const liveInsight = document.getElementById('liveInsight');
    const plotDOF = document.getElementById('plotCanvasDOF');
    const ctxDOF = plotDOF.getContext('2d');
    const plotReg = document.getElementById('plotCanvasReg');
    const ctxReg = plotReg.getContext('2d');
    const resN = document.getElementById('resN');
    const resJ = document.getElementById('resJ');
    const resF = document.getElementById('resF');
    const resReg = document.getElementById('resReg');
    const resNeed = document.getElementById('resNeed');
    const dofBody = document.querySelector('#dofTable tbody');
    const formula = document.getElementById('dofFormulaContainer');

    // ---------- physics (planar Grubler-Kutzbach) ----------
    const mobility = (n, j1, j2) => 3 * (n - 1) - 2 * j1 - j2;
    const linksForF = (F, j1, j2) => (F + 2 * j1 + j2) / 3 + 1;
    function regime(F) {
        if (F < 0) return { txt: 'Locked (jammed solid)', col: '#dc2626', amp: 0 };
        if (F === 0) return { txt: 'Rigid (will not move)', col: '#ea580c', amp: 0 };
        if (F === 1) return { txt: 'One motion only', col: '#1E40AF', amp: 0.5 };
        if (F === 2) return { txt: 'Opens & closes (works!)', col: '#16a34a', amp: 1.0 };
        return { txt: 'Floppy (too loose)', col: '#b45309', amp: 1.5 };
    }

    let n = parseFloat(nInput.value), j1 = parseFloat(j1Input.value), j2 = parseFloat(j2Input.value);
    let sweeping = false, tAnim = 0, sweepJ1 = 0;
    let viewJ1 = j1; // animated preview of j1 during the joint-count test; never overrides the slider's j1

    // ---------- Three.js: 2-jaw gripper that closes on a workpiece ----------
    let S = null, base, jawL, jawR, tipL, tipR, coupler, work, pinMeshes = [];
    const PL = new THREE.Vector3(-0.25, -0.2, 0), PR = new THREE.Vector3(0.25, -0.2, 0), JAW = 1.05;
    function init3D() {
        S = HG.scene3D('viewport3D', [0.0, 0.6, 4.6]);
        if (!S) return;
        base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.35, 0.5), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 }));
        base.position.set(0, -0.45, 0); base.castShadow = true; S.scene.add(base);
        work = new THREE.Mesh(new THREE.SphereGeometry(0.24, 20, 20), new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4, emissive: 0x14532d, emissiveIntensity: 0.12 }));
        work.position.set(0, 0.82, 0); work.castShadow = true; S.scene.add(work);
        const jmat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.4 });
        jawL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 12), jmat.clone()); jawL.castShadow = true; S.scene.add(jawL);
        jawR = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 12), jmat.clone()); jawR.castShadow = true; S.scene.add(jawR);
        coupler = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 10), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4 })); S.scene.add(coupler);
        const tg = new THREE.SphereGeometry(0.1, 14, 14);
        tipL = new THREE.Mesh(tg, jmat.clone()); S.scene.add(tipL);
        tipR = new THREE.Mesh(tg, jmat.clone()); S.scene.add(tipR);
        for (let i = 0; i < 12; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 10), new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x7f1d1d, emissiveIntensity: 0.3 })); m.visible = false; S.scene.add(m); pinMeshes.push(m); }
    }
    function update3D() {
        if (!S) return;
        const F = mobility(n, Math.round(viewJ1), Math.round(j2)), rg = regime(F);
        let open = 0.32;
        if (rg.amp > 0) open = 0.32 + rg.amp * 0.30 * (0.5 + 0.5 * Math.sin(tAnim * 1.7));
        if (F > 2) open += (Math.random() - 0.5) * 0.07; // floppy jitter
        const tl = new THREE.Vector3(PL.x - Math.sin(open) * JAW, PL.y + Math.cos(open) * JAW, 0);
        const tr = new THREE.Vector3(PR.x + Math.sin(open) * JAW, PR.y + Math.cos(open) * JAW, 0);
        HG.placeCyl(jawL, PL, tl); HG.placeCyl(jawR, PR, tr);
        tipL.position.copy(tl); tipR.position.copy(tr);
        HG.placeCyl(coupler, PL, PR);
        const col = new THREE.Color(rg.col);
        [jawL, jawR, tipL, tipR].forEach((m) => m.material.color.copy(col));
        const gripped = (F === 2) && (open < 0.45);          // working gripper actually closing
        work.material.color.copy(gripped ? new THREE.Color(0x16a34a) : new THREE.Color(0x94a3b8));
        work.material.emissiveIntensity = gripped ? 0.5 : 0.12;
        const total = Math.round(viewJ1) + Math.round(j2);
        pinMeshes.forEach((m, i) => { m.visible = i < total; if (i < total) { m.position.set(-0.55 + (i % 6) * 0.22, -0.18 - Math.floor(i / 6) * 0.22, 0.28); m.material.color.set(i < Math.round(j1) ? 0xef4444 : 0xf59e0b); } });
    }

    // ---------- plots ----------
    function drawDOFPlot() {
        const W = plotDOF.width, H = plotDOF.height;
        const fHi = mobility(n, 0, j2), fLo = mobility(n, 10, j2);
        const yMax = Math.ceil((fHi + 1) / 2) * 2, yMin = Math.floor((fLo - 1) / 2) * 2;
        const pts = [];
        for (let jj = 0; jj <= 10.001; jj += 0.2) pts.push({ x: jj, y: mobility(n, jj, j2) });
        const fr = HG.frame(ctxDOF, W, H, { xMin: 0, xMax: 10, yMin: yMin, yMax: yMax, xTicks: 5, yTicks: 6, xLabel: 'Working joints j1 added to the gripper', yLabel: 'Freedom to move (F)', axisColor: '#E2570F', xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(0) });
        HG.shadeYBand(ctxDOF, fr, yMin, 0, 'rgba(220,38,38,0.08)');
        HG.hLine(ctxDOF, fr, 2, '#16a34a', 'F=2 works');
        HG.hLine(ctxDOF, fr, 0, '#ea580c', 'F=0 locked');
        HG.curve(ctxDOF, fr, pts, '#E2570F', 2.6);
        HG.tracker(ctxDOF, fr, j1, mobility(n, j1, j2), 'F=' + mobility(n, j1, j2), '#ef4444');
        HG.legend(ctxDOF, fr.pl + fr.w - 158, fr.pt + 6, [{ color: '#E2570F', text: 'F at n=' + n + ', j2=' + j2 }, { color: '#16a34a', dash: true, text: 'Gripper works at F=2' }, { color: '#ea580c', dash: true, text: 'Locked solid at F=0' }]);
    }
    function drawRegPlot() {
        const W = plotReg.width, H = plotReg.height, ctx = ctxReg;
        ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
        const pl = 24, pr = 18, pt = 34, pb = 30, w = W - pl - pr, h = 26;
        const fMin = -3, fMax = 7, fx = (f) => pl + (f - fMin) / (fMax - fMin) * w;
        const zones = [[-3, 0, '#fecaca'], [0, 0.5, '#fed7aa'], [0.5, 2.5, '#bbf7d0'], [2.5, 7, '#fde68a']];
        zones.forEach((z) => { ctx.fillStyle = z[2]; ctx.fillRect(fx(z[0]), pt, fx(z[1]) - fx(z[0]), h); });
        ctx.strokeStyle = '#94a3b8'; ctx.strokeRect(pl, pt, w, h);
        ctx.fillStyle = '#475569'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
        for (let f = fMin; f <= fMax; f++) { ctx.fillText(f.toString(), fx(f), pt + h + 13); }
        ctx.fillStyle = '#334155'; ctx.font = 'bold 10px sans-serif'; ctx.fillText('Locked  -  Rigid  -  Works (F=2)  -  Floppy', pl + w / 2, 16);
        const F = mobility(n, j1, j2), mx = Math.max(pl, Math.min(pl + w, fx(F)));
        ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.moveTo(mx, pt - 4); ctx.lineTo(mx - 6, pt - 13); ctx.lineTo(mx + 6, pt - 13); ctx.closePath(); ctx.fill();
        ctx.fillStyle = regime(F).col; ctx.font = 'bold 11px sans-serif'; ctx.fillText('F = ' + F, mx, pt - 16 < 22 ? pt + h + 26 : pt - 16);
    }
    function fillDOF() {
        if (!dofBody) return;
        const lo = Math.max(0, Math.round(j1) - 2), hi = Math.round(j1) + 2;
        let rows = '';
        for (let jj = lo; jj <= hi; jj++) { const F = mobility(n, jj, j2), rg = regime(F), cur = jj === Math.round(j1); rows += '<tr style="' + (cur ? 'background:rgba(138,17,52,0.08);font-weight:bold;' : '') + '"><td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;">' + jj + ' / ' + j2 + '</td><td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;">' + F + '</td><td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;text-align:right;color:' + rg.col + ';font-weight:700;">' + rg.txt.split(' ')[0] + '</td></tr>'; }
        dofBody.innerHTML = rows;
    }

    function updateEq() {
        const F = mobility(n, j1, j2), need = linksForF(2, j1, j2);
        formula.innerHTML = '<div style="line-height:1.7;color:#1e293b;font-size:15px;font-weight:bold;">' +
            '<div><strong>Grubler-Kutzbach (planar):</strong> F = 3(n-1) - 2j<sub>1</sub> - j<sub>2</sub></div>' +
            '<div style="margin-left:18px;font-style:italic;color:#475569;font-size:0.95em;">Substitution: n = ' + n + ', j<sub>1</sub> = ' + j1 + ', j<sub>2</sub> = ' + j2 + ' &rArr; F = 3(' + (n - 1) + ') - ' + (2 * j1) + ' - ' + j2 + ' = ' + F + '</div>' +
            '<div style="margin-top:6px;"><strong>Links for a working gripper (F=2):</strong> n = (F + 2j<sub>1</sub> + j<sub>2</sub>)/3 + 1 = ' + need.toFixed(1) + '</div></div>';
    }
    function refresh() {
        const F = mobility(n, j1, j2), rg = regime(F), need = linksForF(2, j1, j2);
        HG.put(resN, String(n));
        HG.put(resJ, j1 + ' / ' + j2);
        HG.put(resF, String(F), rg.col);
        HG.put(resReg, rg.txt, rg.col);
        HG.put(resNeed, need.toFixed(1) + ' links');
        stateLabel.innerText = 'Gripper: ' + rg.txt;
        stateLabel.style.background = F === 2 ? '#dcfce7' : (F < 1 ? '#fee2e2' : '#fef3c7');
        stateLabel.style.color = rg.col;
        liveInsight.innerHTML = '<strong>Live Insight:</strong> This printed gripper has ' + n + ' links, ' + j1 + ' full joints and ' + j2 + ' half joints, giving it a freedom of motion F = ' + F + '. ' +
            (F === 2 ? 'That is exactly right: the two jaws <strong>open and close on the object</strong> in a controlled way - a working self-closing gripper.' :
                (F <= 0 ? 'With F &le; 0 the linkage is <strong>locked solid</strong> - it cannot move no matter how hard the material pushes.' :
                    (F === 1 ? 'F = 1 gives only one stiff motion; add one joint or link to reach the F = 2 gripper.' :
                        'F &gt; 2 leaves the jaws <strong>floppy and uncontrollable</strong> - remove a link or add a joint to get back to F = 2.'))) +
            ' For a working gripper with these joints you need ' + need.toFixed(1) + ' links. <em>Design rule: aim for exactly F = 2 (open/close plus lateral) for a controllable gripper.</em>';
        drawDOFPlot(); drawRegPlot(); fillDOF(); updateEq();
    }

    // ---------- joint-count sweep (builds up to the CHOSEN j1, never past it) ----------
    function startRun() { if (sweeping) { stopRun(); return; } sweeping = true; sweepJ1 = 0; viewJ1 = 0; btnRun.innerText = 'Testing...'; btnRun.style.background = '#475569'; }
    function stopRun(done) { sweeping = false; viewJ1 = j1; btnRun.innerText = 'Test the Gripper'; btnRun.style.background = '#E2570F'; if (done) { const nx = document.getElementById('btnNextCalc'); if (nx) nx.style.display = 'block'; } }
    function stepRun(dt) {
        sweepJ1 += dt * 1.7;
        if (sweepJ1 >= j1) { viewJ1 = j1; stopRun(true); }
        else { viewJ1 = sweepJ1; }
    }

    // ---------- events ----------
    nInput.addEventListener('input', () => { if (sweeping) stopRun(); n = parseInt(nInput.value, 10); valN.innerText = String(n); refresh(); });
    j1Input.addEventListener('input', () => { if (sweeping) stopRun(); j1 = parseInt(j1Input.value, 10); viewJ1 = j1; valJ1.innerText = String(j1); refresh(); });
    j2Input.addEventListener('input', () => { if (sweeping) stopRun(); j2 = parseInt(j2Input.value, 10); valJ2.innerText = String(j2); refresh(); });
    btnRun.addEventListener('click', startRun);

    // ---------- render loop ----------
    let last = performance.now();
    function loop(now) {
        requestAnimationFrame(loop);
        const dt = Math.min((now - last) / 1000, 0.05); last = now; tAnim += dt;
        if (sweeping) stepRun(dt);
        update3D();
        if (S) { S.controls.update(); S.renderer.render(S.scene, S.camera); }
    }

    // ---------- init ----------
    LabGate.arm(function () {
        init3D();
        valN.innerText = String(n); valJ1.innerText = String(j1); valJ2.innerText = String(j2);
        refresh();
        requestAnimationFrame(loop);
    });
})();

// ============================================================
// SUB-CALC C : FOLDING A FLAT SHEET INTO A TARGET SHAPE (KINEMATICS)
// (Page check: document.getElementById('plotCanvasKin'))
// A printed strip folds at its hinges to reach a target 3D point.
// Forward kinematics maps chosen hinge angles to where the tip lands;
// inverse kinematics (CCD) solves the hinge angles for a target marker.
// ============================================================
(function () {
    if (!document.getElementById('plotCanvasKin')) return;

    const rowFwd = document.getElementById('rowFwd');
    const rowInv = document.getElementById('rowInv');
    const t1Input = document.getElementById('t1Input'), t2Input = document.getElementById('t2Input'), t3Input = document.getElementById('t3Input');
    const valT1 = document.getElementById('valT1'), valT2 = document.getElementById('valT2'), valT3 = document.getElementById('valT3');
    const txInput = document.getElementById('txInput'), tyInput = document.getElementById('tyInput');
    const valTx = document.getElementById('valTx'), valTy = document.getElementById('valTy');
    const btnRun = document.getElementById('btnRun');
    const stateLabel = document.getElementById('stateLabel');
    const liveInsight = document.getElementById('liveInsight');
    const plotKin = document.getElementById('plotCanvasKin');
    const ctxKin = plotKin.getContext('2d');
    const plotAng = document.getElementById('plotCanvasAng');
    const ctxAng = plotAng.getContext('2d');
    const resMode = document.getElementById('resMode'), resEnd = document.getElementById('resEnd'), resTgt = document.getElementById('resTgt'), resAng = document.getElementById('resAng'), resErr = document.getElementById('resErr'), resReach = document.getElementById('resReach');
    const kinBody = document.querySelector('#kinTable tbody');
    const formula = document.getElementById('kinFormulaContainer');

    const L = 10;                 // each panel length (mm)
    const segs = [L, L, L];
    // ---------- physics ----------
    function fk(ang) {            // forward kinematics -> 4 points (mm), cumulative angles
        let phi = 0, x = 0, y = 0; const pts = [{ x: 0, y: 0 }]; const cum = [];
        for (let i = 0; i < 3; i++) { phi += ang[i]; cum.push(phi); x += segs[i] * Math.cos(phi); y += segs[i] * Math.sin(phi); pts.push({ x: x, y: y }); }
        return { pts: pts, end: pts[3], cum: cum };
    }
    function ik(tx, ty) {          // CCD inverse kinematics with +/-90 deg hinge limits
        const ang = [0.5, 0.5, 0.5];
        for (let it = 0; it < 80; it++) {
            for (let j = 2; j >= 0; j--) {
                const f = fk(ang); const jp = f.pts[j]; const end = f.end;
                const aE = Math.atan2(end.y - jp.y, end.x - jp.x);
                const aT = Math.atan2(ty - jp.y, tx - jp.x);
                let d = aT - aE; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
                ang[j] = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, ang[j] + d * 0.5));
            }
        }
        return ang;
    }
    const deg = (r) => r * 180 / Math.PI, rad = (d) => d * Math.PI / 180;

    let mode = 'fwd';
    let ang = [rad(40), rad(40), rad(40)];
    let tx = 20, ty = 15;
    let dispFold = 1, targFold = 1, sweeping = false, sweepT = 0, tAnim = 0;

    // ---------- Three.js: flat strip of 3 panels folding at its hinges ----------
    let S = null, joints = [], panels = [], endMesh, tgtMesh;
    const SC3 = 0.1, PANELW = 0.7;               // mm -> world, panel depth
    function init3D() {
        S = HG.scene3D('viewport3D', [0.4, 0.6, 4.9]);
        if (!S) return;
        const gp = new THREE.Mesh(new THREE.BoxGeometry(5, 0.04, 2.2), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.9 })); gp.position.y = -1.2; gp.receiveShadow = true; S.scene.add(gp);
        for (let i = 0; i < 4; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 14), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 })); m.castShadow = true; S.scene.add(m); joints.push(m); }
        const cols = [0xE2570F, 0xb91c4a, 0xd6336c];
        for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.08, PANELW), new THREE.MeshStandardMaterial({ color: cols[i], roughness: 0.45, metalness: 0.05 })); m.castShadow = true; S.scene.add(m); panels.push(m); }
        endMesh = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x7f1d1d, emissiveIntensity: 0.3 })); S.scene.add(endMesh);
        tgtMesh = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 16), new THREE.MeshStandardMaterial({ color: 0x16a34a, transparent: true, opacity: 0.5 })); S.scene.add(tgtMesh);
    }
    function update3D() {
        if (!S) return;
        const a = ang.map((v) => v * dispFold);
        const f = fk(a);
        const base = new THREE.Vector3(-1.5, -0.7, 0);
        const wp = f.pts.map((p) => new THREE.Vector3(base.x + p.x * SC3, base.y + p.y * SC3, 0));
        for (let i = 0; i < 4; i++) joints[i].position.copy(wp[i]);
        for (let i = 0; i < 3; i++) {
            const p1 = wp[i], p2 = wp[i + 1], dx = p2.x - p1.x, dy = p2.y - p1.y, len = Math.hypot(dx, dy);
            panels[i].position.set((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, 0);
            panels[i].scale.x = Math.max(len, 1e-3);
            panels[i].rotation.z = Math.atan2(dy, dx);
        }
        endMesh.position.copy(wp[3]);
        tgtMesh.visible = mode === 'inv';
        if (mode === 'inv') tgtMesh.position.set(base.x + tx * SC3, base.y + ty * SC3, 0);
    }

    // ---------- plots ----------
    function drawKinPlot() {
        const W = plotKin.width, H = plotKin.height;
        const f = fk(ang);
        const fr = HG.frame(ctxKin, W, H, { xMin: -32, xMax: 32, yMin: -8, yMax: 32, xTicks: 8, yTicks: 5, xLabel: 'x (mm)', yLabel: 'y (mm)', axisColor: '#E2570F', xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(0) });
        ctxKin.strokeStyle = 'rgba(148,163,184,0.5)'; ctxKin.setLineDash([3, 3]); ctxKin.beginPath();
        for (let a = -10; a <= 100; a += 4) { const x = 30 * Math.cos(rad(a)), y = 30 * Math.sin(rad(a)); const px = fr.gx(x), py = fr.gy(y); a === -10 ? ctxKin.moveTo(px, py) : ctxKin.lineTo(px, py); } ctxKin.stroke(); ctxKin.setLineDash([]);
        HG.curve(ctxKin, fr, f.pts.map((p) => ({ x: p.x, y: p.y })), '#E2570F', 3);
        f.pts.forEach((p, i) => { ctxKin.fillStyle = i === 0 ? '#334155' : '#64748b'; ctxKin.beginPath(); ctxKin.arc(fr.gx(p.x), fr.gy(p.y), 4, 0, 7); ctxKin.fill(); });
        ctxKin.fillStyle = '#ef4444'; ctxKin.beginPath(); ctxKin.arc(fr.gx(f.end.x), fr.gy(f.end.y), 5.5, 0, 7); ctxKin.fill();
        if (mode === 'inv') { const px = fr.gx(tx), py = fr.gy(ty); ctxKin.strokeStyle = '#16a34a'; ctxKin.lineWidth = 2; ctxKin.beginPath(); ctxKin.moveTo(px - 6, py); ctxKin.lineTo(px + 6, py); ctxKin.moveTo(px, py - 6); ctxKin.lineTo(px, py + 6); ctxKin.stroke(); ctxKin.fillStyle = '#16a34a'; ctxKin.font = 'bold 9px sans-serif'; ctxKin.textAlign = 'left'; ctxKin.fillText('target', px + 8, py); }
        HG.legend(ctxKin, fr.pl + fr.w - 158, fr.pt + 6, [{ color: '#E2570F', text: 'Folded sheet (3 panels)' }, { color: '#ef4444', text: 'Tip of the sheet' }, { color: '#16a34a', text: 'Target shape point' }]);
    }
    function drawAngPlot() {
        const W = plotAng.width, H = plotAng.height, ctx = ctxAng;
        ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
        const pl = 44, pr = 16, pt = 16, pb = 28, w = W - pl - pr, h = H - pt - pb, mid = pt + h / 2;
        ctx.strokeStyle = '#94a3b8'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(pl, pt); ctx.lineTo(pl, pt + h); ctx.stroke();
        ctx.strokeStyle = '#cbd5e1'; ctx.beginPath(); ctx.moveTo(pl, mid); ctx.lineTo(pl + w, mid); ctx.stroke();
        ctx.fillStyle = '#475569'; ctx.font = '9px sans-serif'; ctx.textAlign = 'right';
        [-90, -45, 0, 45, 90].forEach((v) => { const y = mid - v / 90 * (h / 2); ctx.fillText(v.toString(), pl - 5, y + 3); });
        ctx.save(); ctx.translate(12, mid); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.fillStyle = '#7c3aed'; ctx.font = 'bold 10px sans-serif'; ctx.fillText('fold angle (deg)', 0, 0); ctx.restore();
        const cols = ['#E2570F', '#b91c4a', '#d6336c'];
        for (let i = 0; i < 3; i++) {
            const a = deg(ang[i]); const bx = pl + (i + 0.5) * (w / 3) - 16; const bh = -a / 90 * (h / 2);
            ctx.fillStyle = cols[i]; ctx.fillRect(bx, mid, 32, bh);
            ctx.fillStyle = '#1e293b'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center'; ctx.fillText(a.toFixed(0) + 'deg', bx + 16, mid + bh + (bh < 0 ? -4 : 11));
            ctx.fillStyle = '#475569'; ctx.fillText('hinge ' + (i + 1), bx + 16, pt + h + 12);
        }
    }
    function fillKin() {
        if (!kinBody) return;
        const f = fk(ang);
        kinBody.innerHTML = ang.map((a, i) => '<tr><td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;">hinge ' + (i + 1) + '</td><td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;">' + deg(a).toFixed(1) + '</td><td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;text-align:right;">' + deg(f.cum[i]).toFixed(1) + '</td></tr>').join('');
    }

    function updateEq() {
        const f = fk(ang);
        formula.innerHTML = '<div style="line-height:1.7;color:#1e293b;font-size:15px;font-weight:bold;">' +
            '<div><strong>Forward fold:</strong> x<sub>tip</sub> = &Sigma; L<sub>i</sub> cos(&Sigma;&theta;<sub>j</sub>), &nbsp; y<sub>tip</sub> = &Sigma; L<sub>i</sub> sin(&Sigma;&theta;<sub>j</sub>)</div>' +
            '<div style="margin-left:18px;font-style:italic;color:#475569;font-size:0.95em;">L = ' + L + ' mm each, &theta; = (' + ang.map((a) => deg(a).toFixed(0)).join(', ') + ') deg &rArr; tip = (' + f.end.x.toFixed(1) + ', ' + f.end.y.toFixed(1) + ') mm</div>' +
            '<div style="margin-top:6px;"><strong>Inverse fold:</strong> solve &theta;<sub>i</sub> for a target (x, y) by cyclic coordinate descent (CCD), hinges limited to &plusmn;90 deg</div></div>';
    }
    function refresh() {
        const f = fk(ang);
        const err = mode === 'inv' ? Math.hypot(f.end.x - tx, f.end.y - ty) : 0;
        const reaches = err < 1.0;
        HG.put(resMode, mode === 'fwd' ? 'Forward (set angles)' : 'Inverse (set target)');
        HG.put(resEnd, '(' + f.end.x.toFixed(1) + ', ' + f.end.y.toFixed(1) + ') mm');
        HG.put(resTgt, mode === 'inv' ? '(' + tx.toFixed(0) + ', ' + ty.toFixed(0) + ') mm' : '-');
        HG.put(resAng, ang.map((a) => deg(a).toFixed(0)).join(', ') + ' deg');
        HG.put(resErr, mode === 'inv' ? err.toFixed(2) + ' mm' : 'n/a (forward)', mode === 'inv' ? (reaches ? '#16a34a' : '#b45309') : '#475569');
        HG.put(resReach, mode === 'inv' ? (reaches ? 'Yes' : 'No - out of reach') : 'n/a (forward)', mode === 'inv' ? (reaches ? '#16a34a' : '#dc2626') : '#475569');
        stateLabel.innerText = mode === 'fwd' ? 'Folding to set angles' : 'Solving fold for target';
        stateLabel.style.background = '#ede9fe'; stateLabel.style.color = '#5b21b6';
        liveInsight.innerHTML = '<strong>Live Insight:</strong> ' + (mode === 'fwd' ?
            'Forward kinematics turns the hinge angles (' + ang.map((a) => deg(a).toFixed(0)).join(', ') + ') deg into a folded shape whose tip lands at (' + f.end.x.toFixed(1) + ', ' + f.end.y.toFixed(1) + ') mm - this is how a flat printed sheet reaches its folded 3D form.' :
            'Inverse kinematics (CCD) solved the hinge angles that fold the sheet toward the target (' + tx.toFixed(0) + ', ' + ty.toFixed(0) + ') mm. The tip lands within ' + err.toFixed(2) + ' mm' + (reaches ? ' - it reaches the target.' : ' - the target sits near or beyond the 30 mm reach.')) +
            ' <em>Design rule: inverse kinematics gives you the exact fold angles to print for a desired shape.</em>';
        drawKinPlot(); drawAngPlot(); fillKin(); updateEq();
    }
    function recompute() { if (mode === 'inv') ang = ik(tx, ty); else ang = [rad(parseFloat(t1Input.value)), rad(parseFloat(t2Input.value)), rad(parseFloat(t3Input.value))]; refresh(); }

    // ---------- fold animation ----------
    function startRun() { if (sweeping) { stopRun(); return; } sweeping = true; sweepT = 0; dispFold = 0; btnRun.innerText = 'Folding...'; btnRun.style.background = '#475569'; }
    function stopRun(done) { sweeping = false; btnRun.innerText = 'Fold the Sheet'; btnRun.style.background = '#E2570F'; targFold = 1; if (done) { const nx = document.getElementById('btnNextCalc'); if (nx) nx.style.display = 'block'; } }

    // ---------- events ----------
    document.querySelectorAll('input[name="mode"]').forEach((r) => r.addEventListener('change', () => { if (sweeping) stopRun(); mode = document.querySelector('input[name="mode"]:checked').value; rowFwd.style.display = mode === 'fwd' ? '' : 'none'; rowInv.style.display = mode === 'inv' ? '' : 'none'; recompute(); }));
    [t1Input, t2Input, t3Input].forEach((el, i) => el.addEventListener('input', () => { if (sweeping) stopRun(); [valT1, valT2, valT3][i].innerText = el.value; recompute(); }));
    txInput.addEventListener('input', () => { if (sweeping) stopRun(); tx = parseFloat(txInput.value); valTx.innerText = txInput.value; recompute(); });
    tyInput.addEventListener('input', () => { if (sweeping) stopRun(); ty = parseFloat(tyInput.value); valTy.innerText = tyInput.value; recompute(); });
    btnRun.addEventListener('click', startRun);

    // ---------- render loop ----------
    let last = performance.now();
    function loop(now) {
        requestAnimationFrame(loop);
        const dt = Math.min((now - last) / 1000, 0.05); last = now; tAnim += dt;
        if (sweeping) { sweepT += dt; dispFold = Math.min(sweepT / 2.6, 1); if (dispFold >= 1 && sweepT > 2.8) stopRun(true); }
        else { dispFold += (targFold - dispFold) * 0.1; }
        update3D();
        if (S) { S.controls.update(); S.renderer.render(S.scene, S.camera); }
    }

    // ---------- init ----------
    LabGate.arm(function () {
        init3D();
        recompute(); dispFold = 1;
        requestAnimationFrame(loop);
    });
})();

// ============================================================
// SUB-CALC D : THE DEPLOYABLE SOLAR PANEL / STENT (MIURA FOLD)
// (Page check: document.getElementById('plotCanvasMiura'))
// A Miura-ori sheet packs flat-compact for launch and pops open with a
// single pull. Rigid-fold geometry sets the mountain-valley angle, the
// pack ratio (folded area %), and a negative (auxetic) Poisson's ratio.
// ============================================================
(function () {
    if (!document.getElementById('plotCanvasMiura')) return;

    const alphaInput = document.getElementById('alphaInput');
    const phiInput = document.getElementById('phiInput');
    const valAlpha = document.getElementById('valAlpha');
    const valPhi = document.getElementById('valPhi');
    const btnRun = document.getElementById('btnRun');
    const stateLabel = document.getElementById('stateLabel');
    const liveInsight = document.getElementById('liveInsight');
    const plotM = document.getElementById('plotCanvasMiura');
    const ctxM = plotM.getContext('2d');
    const plotNu = document.getElementById('plotCanvasNu');
    const ctxNu = plotNu.getContext('2d');
    const resAng = document.getElementById('resAng');
    const resThetaM = document.getElementById('resThetaM');
    const resAratio = document.getElementById('resAratio');
    const resNu = document.getElementById('resNu');
    const resAux = document.getElementById('resAux');
    const miuraBody = document.querySelector('#miuraTable tbody');
    const formula = document.getElementById('miuraFormulaContainer');

    const rad = (d) => d * Math.PI / 180, deg = (r) => r * 180 / Math.PI;
    // ---------- physics (rigid Miura-ori, self-consistent contraction model) ----------
    const thetaM = (a, p) => Math.atan(Math.tan(a) * Math.sin(p));          // mountain-valley dihedral
    const lamL = (p) => Math.cos(p);                                        // straight-fold contraction
    const lamW = (a, p) => Math.sqrt(Math.max(1e-6, 1 - Math.sin(a) * Math.sin(a) * Math.sin(p) * Math.sin(p))); // zigzag contraction
    const Aratio = (a, p) => lamL(p) * lamW(a, p);                          // folded / flat area
    function poisson(a, p) {                                                // in-plane Poisson ratio (numeric)
        const d = 0.001;
        const dL = (Math.log(lamL(p + d)) - Math.log(lamL(p - d))) / (2 * d);
        const dW = (Math.log(lamW(a, p + d)) - Math.log(lamW(a, p - d))) / (2 * d);
        return -dW / dL;
    }

    let alpha = parseFloat(alphaInput.value), phi = parseFloat(phiInput.value);
    let dispFold = 1, targFold = 1, sweeping = false, sweepT = 0, tAnim = 0;

    // ---------- Three.js: deployable Miura-ori panel ----------
    let S = null, sheet, NC = 8, NR = 6, A3 = 0.5, B3 = 0.62, SKEW = 0.34, DEPTH = 0.52;
    function vtx(i, j, c, s) {
        const x = (i - NC / 2) * B3 * (0.42 + 0.58 * c);
        const y = (j - NR / 2) * A3 + (i % 2) * SKEW * s;
        const z = (j % 2 === 0 ? 1 : -1) * DEPTH * s;
        return new THREE.Vector3(x, y, z);
    }
    function init3D() {
        S = HG.scene3D('viewport3D', [0.2, 2.8, 4.8]);
        if (!S) return;
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(NC * NR * 18), 3));
        sheet = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({ color: 0xE2570F, roughness: 0.45, metalness: 0.1, side: THREE.DoubleSide, flatShading: true }));
        sheet.castShadow = true; S.scene.add(sheet);
        sheet.add(new THREE.LineSegments(new THREE.WireframeGeometry(geom), new THREE.LineBasicMaterial({ color: 0xfecdd3, transparent: true, opacity: 0.35 })));
    }
    function update3D() {
        if (!S) return;
        const p = rad(phi) * dispFold, c = Math.cos(p), s = Math.sin(p);
        const arr = sheet.geometry.attributes.position.array;
        let k = 0;
        for (let i = 0; i < NC; i++) for (let j = 0; j < NR; j++) {
            const a = vtx(i, j, c, s), b = vtx(i + 1, j, c, s), cc = vtx(i + 1, j + 1, c, s), d = vtx(i, j + 1, c, s);
            const tri = [a, b, cc, a, cc, d];
            tri.forEach((v) => { arr[k++] = v.x; arr[k++] = v.y; arr[k++] = v.z; });
        }
        sheet.geometry.attributes.position.needsUpdate = true;
        sheet.geometry.computeVertexNormals();
        const child = sheet.children[0];
        if (child) { child.geometry.dispose(); child.geometry = new THREE.WireframeGeometry(sheet.geometry); }
    }

    // ---------- plots ----------
    function drawMiuraPlot() {
        const W = plotM.width, H = plotM.height;
        const a = rad(alpha);
        const pts = [];
        for (let pd = 5; pd <= 85.001; pd += 1) pts.push({ x: pd, y: Aratio(a, rad(pd)) * 100 });
        const fr = HG.frame(ctxM, W, H, { xMin: 5, xMax: 85, yMin: 0, yMax: 100, xTicks: 8, yTicks: 5, xLabel: 'Fold angle phi (deg) - more folded ->', yLabel: 'Folded area (% of flat)', axisColor: '#E2570F', xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(0) });
        HG.hLine(ctxM, fr, 100, '#94a3b8', 'flat = 100%');
        HG.curve(ctxM, fr, pts, '#E2570F', 2.6);
        HG.tracker(ctxM, fr, phi, Aratio(a, rad(phi)) * 100, (Aratio(a, rad(phi)) * 100).toFixed(0) + '%', '#ef4444');
        HG.legend(ctxM, fr.pl + fr.w - 158, fr.pt + 6, [{ color: '#E2570F', text: 'Pack ratio at alpha=' + alpha.toFixed(0) + ' deg' }, { color: '#ef4444', text: 'Current fold' }]);
    }
    function drawNuPlot() {
        const W = plotNu.width, H = plotNu.height;
        const a = rad(alpha);
        let lo = -1.6;
        const pts = [];
        for (let pd = 5; pd <= 85.001; pd += 1) { const v = poisson(a, rad(pd)); pts.push({ x: pd, y: v }); if (v < lo) lo = v; }
        lo = Math.floor(lo * 2) / 2;
        const fr = HG.frame(ctxNu, W, H, { padT: 14, padB: 26, xMin: 5, xMax: 85, yMin: lo, yMax: 0.3, xTicks: 8, yTicks: 4, xLabel: 'phi (deg)', yLabel: 'Poisson nu_x', axisColor: '#1E40AF', xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(1) });
        HG.shadeYBand(ctxNu, fr, lo, 0, 'rgba(16,185,129,0.10)');
        HG.hLine(ctxNu, fr, 0, '#dc2626', 'nu=0');
        HG.curve(ctxNu, fr, pts, '#1E40AF', 2.4);
        HG.tracker(ctxNu, fr, phi, poisson(a, rad(phi)), 'nu=' + poisson(a, rad(phi)).toFixed(2), '#ef4444');
        ctxNu.fillStyle = '#16a34a'; ctxNu.font = 'bold 8px sans-serif'; ctxNu.textAlign = 'left'; ctxNu.fillText('auxetic (nu < 0): expands both ways', fr.pl + 6, fr.pt + 11);
    }
    function fillMiura() {
        if (!miuraBody) return;
        const a = rad(alpha), phis = [30, 45, 60, 75];
        miuraBody.innerHTML = phis.map((pd) => { const near = Math.abs(pd - phi) < 8; return '<tr style="' + (near ? 'background:rgba(138,17,52,0.08);font-weight:bold;' : '') + '"><td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;">' + pd + '</td><td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;">' + (Aratio(a, rad(pd)) * 100).toFixed(0) + '%</td><td style="padding:6px 4px;border-bottom:1px solid #e2e8f0;text-align:right;color:#1E40AF;">' + poisson(a, rad(pd)).toFixed(2) + '</td></tr>'; }).join('');
    }

    function updateEq() {
        const a = rad(alpha), p = rad(phi);
        formula.innerHTML = '<div style="line-height:1.7;color:#1e293b;font-size:15px;font-weight:bold;">' +
            '<div><strong>Mountain-valley angle:</strong> tan(&theta;<sub>M</sub>) = tan(&alpha;)&middot;sin(&phi;) &rArr; &theta;<sub>M</sub> = ' + deg(thetaM(a, p)).toFixed(1) + ' deg</div>' +
            '<div style="margin-left:18px;font-style:italic;color:#475569;font-size:0.95em;">Pack ratio = cos&phi; &middot; sqrt(1 - sin&sup2;&alpha; sin&sup2;&phi;) = ' + (Aratio(a, p) * 100).toFixed(0) + '% of flat area (&alpha;=' + alpha.toFixed(0) + ', &phi;=' + phi.toFixed(0) + ' deg)</div>' +
            '<div style="margin-top:6px;"><strong>Poisson\'s ratio:</strong> &nu;<sub>x</sub> = -d&epsilon;<sub>y</sub>/d&epsilon;<sub>x</sub> = ' + poisson(a, p).toFixed(2) + ' &lt; 0 (auxetic - expands in both directions)</div></div>';
    }
    function refresh() {
        const a = rad(alpha), p = rad(phi), nu = poisson(a, p), pack = Aratio(a, p);
        HG.put(resAng, alpha.toFixed(0) + ' / ' + phi.toFixed(0) + ' deg');
        HG.put(resThetaM, deg(thetaM(a, p)).toFixed(1) + ' deg');
        HG.put(resAratio, (pack * 100).toFixed(0) + '% of flat', '#E2570F');
        HG.put(resNu, nu.toFixed(2), nu < 0 ? '#16a34a' : '#dc2626');
        HG.put(resAux, nu < 0 ? 'Auxetic (nu < 0)' : 'Non-auxetic', nu < 0 ? '#16a34a' : '#dc2626');
        const deployed = dispFold > 0.5;
        stateLabel.innerText = deployed ? 'Panel deployed (open)' : 'Panel packed flat-compact';
        stateLabel.style.background = '#fce7f3'; stateLabel.style.color = '#9d174d';
        liveInsight.innerHTML = '<strong>Live Insight:</strong> Folded to ' + phi.toFixed(0) + ' deg (sector angle ' + alpha.toFixed(0) + ' deg), the deployable panel packs down to ' + (pack * 100).toFixed(0) + '% of its open area, with mountain-valley creases at ' + deg(thetaM(a, p)).toFixed(0) + ' deg. ' +
            'Its in-plane Poisson ratio is ' + nu.toFixed(2) + ' - <strong>negative (auxetic)</strong>, so as it opens it grows in both directions at once and the whole sheet deploys from a single pull. This is how packed solar arrays and self-expanding stents work. <em>Design rule: one fold deploys the whole panel; auxetic means it expands both ways together.</em>';
        drawMiuraPlot(); drawNuPlot(); fillMiura(); updateEq();
    }

    // ---------- deploy animation ----------
    function startRun() { if (sweeping) { stopRun(); return; } sweeping = true; sweepT = 0; dispFold = 0; btnRun.innerText = 'Deploying...'; btnRun.style.background = '#475569'; }
    function stopRun(done) { sweeping = false; btnRun.innerText = 'Deploy the Panel'; btnRun.style.background = '#E2570F'; targFold = 1; if (done) { const nx = document.getElementById('btnNextCalc'); if (nx) nx.style.display = 'block'; } }

    // ---------- events ----------
    alphaInput.addEventListener('input', () => { if (sweeping) stopRun(); alpha = parseFloat(alphaInput.value); valAlpha.innerText = alpha.toFixed(0) + ' deg'; refresh(); });
    phiInput.addEventListener('input', () => { if (sweeping) stopRun(); phi = parseFloat(phiInput.value); valPhi.innerText = phi.toFixed(0) + ' deg'; refresh(); });
    btnRun.addEventListener('click', startRun);

    // ---------- render loop ----------
    let last = performance.now();
    function loop(now) {
        requestAnimationFrame(loop);
        const dt = Math.min((now - last) / 1000, 0.05); last = now; tAnim += dt;
        if (sweeping) { sweepT += dt; dispFold = Math.min(sweepT / 3, 1); if (dispFold >= 1 && sweepT > 3.2) stopRun(true); }
        else { dispFold += (targFold - dispFold) * 0.08; }
        update3D();
        if (S) { S.controls.update(); S.renderer.render(S.scene, S.camera); }
    }

    // ---------- init ----------
    LabGate.arm(function () {
        init3D();
        valAlpha.innerText = alpha.toFixed(0) + ' deg'; valPhi.innerText = phi.toFixed(0) + ' deg';
        refresh(); dispFold = 1;
        requestAnimationFrame(loop);
    });
})();

// ============================================================
// SUB-CALC E : THE LIVING-HINGE CYCLE LIFE (BASQUIN'S LAW)
// (Page check: document.getElementById('plotCanvasFat'))
// How many open/close cycles before a printed living hinge cracks?
// Bending to radius R = L/theta strains the skin eps = h/(2R); stress
// sigma = E eps feeds Basquin N = (sigma_f/sigma)^(1/b); safe life = N/5.
// ============================================================
(function () {
    if (!document.getElementById('plotCanvasFat')) return;

    const hInput = document.getElementById('hInput');
    const thetaInput = document.getElementById('thetaInput');
    const lInput = document.getElementById('lInput');
    const valH = document.getElementById('valH');
    const valTheta = document.getElementById('valTheta');
    const valL = document.getElementById('valL');
    const btnRun = document.getElementById('btnRun');
    const stateLabel = document.getElementById('stateLabel');
    const liveInsight = document.getElementById('liveInsight');
    const plotFat = document.getElementById('plotCanvasFat');
    const ctxFat = plotFat.getContext('2d');
    const plotStr = document.getElementById('plotCanvasStr');
    const ctxStr = plotStr.getContext('2d');
    const resEps = document.getElementById('resEps');
    const resSig = document.getElementById('resSig');
    const resNlife = document.getElementById('resNlife');
    const resNsafe = document.getElementById('resNsafe');
    const resSurvive = document.getElementById('resSurvive');
    const fatBody = document.querySelector('#fatTable tbody');
    const formula = document.getElementById('fatFormulaContainer');

    const E_EFF = 400;     // effective PLA-SMP hinge modulus near actuation (MPa)
    const SIG_F = 60;      // fatigue strength coefficient (MPa)
    const BEXP = 0.1;      // Basquin exponent
    const SF = 5;          // polymer safety factor
    // ---------- physics (flexure strain + Basquin fatigue) ----------
    const Rmin = (L, thetaDeg) => L / (thetaDeg * Math.PI / 180);          // mm (arc R = L/theta)
    const eMax = (h, L, thetaDeg) => h / (2 * Rmin(L, thetaDeg));          // surface strain
    const sigMax = (h, L, thetaDeg) => E_EFF * eMax(h, L, thetaDeg);       // MPa
    const Nlife = (sig) => sig >= SIG_F ? 0.5 : Math.pow(SIG_F / sig, 1 / BEXP);
    const hForN = (N, L, thetaDeg) => 2 * Rmin(L, thetaDeg) * (SIG_F * Math.pow(N, -BEXP)) / E_EFF; // max h for target N

    let h = parseFloat(hInput.value), thetaDeg = parseFloat(thetaInput.value), L = parseFloat(lInput.value);
    let sweeping = false, tAnim = 0, sweepT = 0;
    let viewH = h; // animated preview of thickness during the cycle test; settles on the CHOSEN h, never overrides it

    // ---------- Three.js: a living hinge flexing open/close repeatedly ----------
    let S = null, joints = [], segs = [];
    const NB = 30, HIN0 = 12, HIN1 = 18;
    function init3D() {
        S = HG.scene3D('viewport3D', [0.2, 1.2, 4.6]);
        if (!S) return;
        const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.6, 0.8), new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 }));
        clamp.position.set(-1.7, -0.1, 0); clamp.castShadow = true; S.scene.add(clamp);
        for (let i = 0; i <= NB; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 10), new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4 })); S.scene.add(m); joints.push(m); }
        for (let i = 0; i < NB; i++) { const inH = i >= HIN0 && i < HIN1; const m = new THREE.Mesh(new THREE.BoxGeometry(1, 0.12, 0.9), new THREE.MeshStandardMaterial({ color: inH ? 0x16a34a : 0x64748b, roughness: 0.45 })); m.castShadow = true; S.scene.add(m); segs.push({ mesh: m, hinge: inH }); }
    }
    function utilColor(u) { return u >= 1 ? 0xdc2626 : (u >= 0.5 ? 0xf59e0b : 0x16a34a); }
    function placePlate(mesh, p1, p2) {
        const dx = p2.x - p1.x, dy = p2.y - p1.y, len = Math.hypot(dx, dy);
        mesh.position.set((p1.x + p2.x) / 2, (p1.y + p2.y) / 2, 0);
        mesh.scale.x = Math.max(len, 1e-3);
        mesh.rotation.z = Math.atan2(dy, dx);
    }
    function update3D() {
        if (!S) return;
        const util = sigMax(viewH, L, thetaDeg) / SIG_F;
        const bendNow = (thetaDeg * Math.PI / 180) * (0.5 + 0.5 * Math.sin(tAnim * 2.2)); // cyclic actuation 0..theta
        const nH = HIN1 - HIN0, dH = bendNow / nH;
        let phi = 0, x = -1.5, y = 0.0, prev = new THREE.Vector3(x, y, 0);
        const pts = [prev.clone()];
        for (let i = 0; i < NB; i++) { if (i >= HIN0 && i < HIN1) phi += dH; const np = new THREE.Vector3(prev.x + 0.1 * Math.cos(phi), prev.y + 0.1 * Math.sin(phi), 0); pts.push(np); prev = np; }
        for (let i = 0; i <= NB; i++) { joints[i].position.copy(pts[i]); joints[i].scale.setScalar(Math.max(0.5, viewH / 0.5)); }
        const hc = new THREE.Color(utilColor(util));
        segs.forEach((s, i) => { placePlate(s.mesh, pts[i], pts[i + 1]); s.mesh.material.color.copy(s.hinge ? hc : new THREE.Color(0x64748b)); s.mesh.scale.y = Math.max(0.4, viewH / 0.5); });
    }

    function fmtN(N) { return N < 1 ? 'fails (<1)' : (N >= 1e5 ? N.toExponential(1) : Math.round(N).toLocaleString()); }

    // ---------- plots ----------
    function drawFatPlot() {
        const W = plotFat.width, H = plotFat.height;
        const pts = [];
        for (let ln = 0; ln <= 7.001; ln += 0.1) { const N = Math.pow(10, ln); pts.push({ x: ln, y: SIG_F * Math.pow(N, -BEXP) }); }
        const fr = HG.frame(ctxFat, W, H, { xMin: 0, xMax: 7, yMin: 0, yMax: 70, xTicks: 7, yTicks: 7, xLabel: 'Open/close cycles before cracking, N', yLabel: 'Stress per cycle (MPa)', axisColor: '#E2570F', xFmt: (v) => '1e' + v.toFixed(0), yFmt: (v) => v.toFixed(0) });
        HG.vLine(ctxFat, fr, 3, '#16a34a', 'N=1e3');
        HG.vLine(ctxFat, fr, 5, '#1E40AF', 'N=1e5');
        HG.hLine(ctxFat, fr, SIG_F, '#94a3b8', 'sig_f');
        HG.curve(ctxFat, fr, pts, '#E2570F', 2.6);
        const sig = sigMax(h, L, thetaDeg), N = Nlife(sig);
        HG.tracker(ctxFat, fr, Math.max(0, Math.min(7, Math.log10(Math.max(N, 1)))), Math.min(sig, 69), 'N=' + fmtN(N), '#ef4444');
        HG.legend(ctxFat, fr.pl + fr.w - 158, fr.pt + 6, [{ color: '#E2570F', text: 'Basquin S-N (sig_f N^-b)' }, { color: '#ef4444', text: 'Your hinge' }]);
    }
    function drawStrPlot() {
        const W = plotStr.width, H = plotStr.height, ctx = ctxStr;
        ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H);
        const pl = 24, pr = 18, pt = 40, pb = 28, w = W - pl - pr, hh = 24;
        const util = sigMax(h, L, thetaDeg) / SIG_F, uMax = 1.6, ux = (u) => pl + Math.min(u, uMax) / uMax * w;
        const zones = [[0, 0.5, '#bbf7d0'], [0.5, 1.0, '#fde68a'], [1.0, 1.6, '#fecaca']];
        zones.forEach((z) => { ctx.fillStyle = z[2]; ctx.fillRect(ux(z[0]), pt, ux(z[1]) - ux(z[0]), hh); });
        ctx.strokeStyle = '#94a3b8'; ctx.strokeRect(pl, pt, w, hh);
        ctx.fillStyle = '#475569'; ctx.font = '9px sans-serif'; ctx.textAlign = 'center';
        [0, 0.5, 1.0, 1.5].forEach((u) => ctx.fillText(u.toFixed(1), ux(u), pt + hh + 13));
        ctx.fillStyle = '#334155'; ctx.font = 'bold 10px sans-serif'; ctx.fillText('How hard the hinge works  (stress / limit)', pl + w / 2, 16);
        const mx = Math.max(pl, Math.min(pl + w, ux(util)));
        ctx.fillStyle = '#1e293b'; ctx.beginPath(); ctx.moveTo(mx, pt - 4); ctx.lineTo(mx - 6, pt - 13); ctx.lineTo(mx + 6, pt - 13); ctx.closePath(); ctx.fill();
        ctx.fillStyle = util >= 1 ? '#dc2626' : (util >= 0.5 ? '#b45309' : '#16a34a'); ctx.font = 'bold 11px sans-serif'; ctx.fillText('working at ' + util.toFixed(2) + ' of limit  (strain = ' + (eMax(h, L, thetaDeg) * 100).toFixed(2) + '%)', pl + w / 2, pt + hh + 26);
    }
    function fillFat() {
        if (!fatBody) return;
        const rows = [['Lasts > 1,000 cycles', hForN(1000, L, thetaDeg)], ['Lasts > 100,000 cycles', hForN(1e5, L, thetaDeg)], ['Safe > 1,000 (x5 margin)', hForN(5000, L, thetaDeg)]];
        fatBody.innerHTML = rows.map((r) => '<tr><td style="padding:7px 4px;border-bottom:1px solid #e2e8f0;">' + r[0] + '</td><td style="padding:7px 4px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;">' + r[1].toFixed(2) + '</td></tr>').join('');
    }

    function updateEq() {
        const R = Rmin(L, thetaDeg), e = eMax(h, L, thetaDeg), sig = sigMax(h, L, thetaDeg), N = Nlife(sig);
        formula.innerHTML = '<div style="line-height:1.7;color:#1e293b;font-size:15px;font-weight:bold;">' +
            '<div><strong>Flexure strain:</strong> R = L/&theta; = ' + R.toFixed(2) + ' mm , &nbsp; &epsilon;<sub>max</sub> = h/(2R) = ' + (e * 100).toFixed(2) + '%</div>' +
            '<div style="margin-left:18px;font-style:italic;color:#475569;font-size:0.95em;">Substitution: h = ' + h.toFixed(2) + ' mm, L = ' + L.toFixed(1) + ' mm, &theta; = ' + thetaDeg.toFixed(0) + ' deg &rArr; &sigma;<sub>max</sub> = E&middot;&epsilon; = ' + sig.toFixed(1) + ' MPa</div>' +
            '<div style="margin-top:6px;"><strong>Basquin life:</strong> N = (&sigma;<sub>f</sub>/&sigma;<sub>max</sub>)<sup>1/b</sup> = ' + fmtN(N) + ' &nbsp; (safe N/5 = ' + fmtN(N / SF) + ')</div></div>';
    }
    function refresh() {
        const e = eMax(h, L, thetaDeg), sig = sigMax(h, L, thetaDeg), N = Nlife(sig), util = sig / SIG_F, safe = N / SF;
        const survives = safe >= 1000;
        HG.put(resEps, (e * 100).toFixed(2) + ' %', util >= 1 ? '#dc2626' : (util >= 0.5 ? '#b45309' : '#16a34a'));
        HG.put(resSig, sig.toFixed(1) + ' MPa', util >= 1 ? '#dc2626' : (util >= 0.5 ? '#b45309' : '#16a34a'));
        HG.put(resNlife, fmtN(N), N >= 5000 ? '#16a34a' : (N >= 1000 ? '#b45309' : '#dc2626'));
        HG.put(resNsafe, fmtN(safe), survives ? '#16a34a' : '#b45309');
        HG.put(resSurvive, survives ? 'Yes - long life' : 'No - cracks early', survives ? '#16a34a' : '#dc2626');
        stateLabel.innerText = util >= 1 ? 'Cycling: OVERSTRESSED - cracking' : (util >= 0.5 ? 'Cycling: working hard' : 'Cycling: safe & easy');
        stateLabel.style.background = util >= 1 ? '#fee2e2' : (util >= 0.5 ? '#fef3c7' : '#dcfce7');
        stateLabel.style.color = util >= 1 ? '#b91c1c' : (util >= 0.5 ? '#92400e' : '#166534');
        liveInsight.innerHTML = '<strong>Live Insight:</strong> Each open/close folds the ' + h.toFixed(2) + ' mm living hinge ' + thetaDeg.toFixed(0) + ' deg over ' + L.toFixed(1) + ' mm, straining its skin to ' + (e * 100).toFixed(2) + '% (stress ' + sig.toFixed(1) + ' MPa). ' +
            'Basquin predicts ' + fmtN(N) + ' cycles to crack' + (N < 1 ? ' - it breaks on the first fold.' : ('; with a x5 safety margin that is ' + fmtN(safe) + ' dependable cycles.')) + ' ' +
            (survives ? 'It survives long, repeated use.' : 'Make the hinge thinner (smaller h) or longer (larger L) to cut the stress and add cycles.') +
            ' <em>Design rule: a thinner hinge lowers the stress and buys exponentially more cycles.</em>';
        drawFatPlot(); drawStrPlot(); fillFat(); updateEq();
    }

    // ---------- thickness-preview sweep (visualizes thinning -> longer life, settles at the CHOSEN h) ----------
    function startRun() { if (sweeping) { stopRun(); return; } sweeping = true; sweepT = 0; viewH = 1.0; btnRun.innerText = 'Cycling...'; btnRun.style.background = '#475569'; }
    function stopRun(done) { sweeping = false; viewH = h; btnRun.innerText = 'Run Cycle Test'; btnRun.style.background = '#E2570F'; if (done) { const nx = document.getElementById('btnRestart'); if (nx) nx.style.display = 'block'; } }
    function stepRun(dt) { sweepT += dt; const next = 1.0 - sweepT * 0.13; if (next <= h) { viewH = h; stopRun(true); } else { viewH = next; } }

    // ---------- events ----------
    hInput.addEventListener('input', () => { if (sweeping) stopRun(); h = parseFloat(hInput.value); viewH = h; valH.innerText = h.toFixed(2) + ' mm'; refresh(); });
    thetaInput.addEventListener('input', () => { if (sweeping) stopRun(); thetaDeg = parseFloat(thetaInput.value); valTheta.innerText = thetaDeg.toFixed(0) + ' deg'; refresh(); });
    lInput.addEventListener('input', () => { if (sweeping) stopRun(); L = parseFloat(lInput.value); valL.innerText = L.toFixed(1) + ' mm'; refresh(); });
    btnRun.addEventListener('click', startRun);

    // ---------- render loop ----------
    let last = performance.now();
    function loop(now) {
        requestAnimationFrame(loop);
        const dt = Math.min((now - last) / 1000, 0.05); last = now; tAnim += dt;
        if (sweeping) stepRun(dt);
        update3D();
        if (S) { S.controls.update(); S.renderer.render(S.scene, S.camera); }
    }

    // ---------- init ----------
    LabGate.arm(function () {
        init3D();
        valH.innerText = h.toFixed(2) + ' mm'; valTheta.innerText = thetaDeg.toFixed(0) + ' deg'; valL.innerText = L.toFixed(1) + ' mm';
        refresh();
        requestAnimationFrame(loop);
    });
})();
