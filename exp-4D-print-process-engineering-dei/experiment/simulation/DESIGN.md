# EXP 08 — 4D Print Process Engineering
**Layer Bonding · Anisotropy · Residual Stress · Dimensional Accuracy** — ME + MAT

Built on the shared instrument system (see `../../LAYOUT-SPEC.md`). Copy `exp7/simulation/`
verbatim as the structural template: same `.lab / .rail / .stage / .dock` skeleton, the same
`BP.*` helper namespace in `js/main.js`, and the shared `css/main.css` (already copied here).
Palette: navy `#1E40AF` = data, rust `#E2570F` = live/active.

**Rail identity:** eyebrow "Experiment 08", title "4D Print Process Engineering",
meta "Bonding · Crystallinity · Residual Stress · Anisotropy · Tolerance". 5 sub-calcs A–E.

## Non-negotiable: the 3D viewport is a SOLVER, not a looped video
The geometry each frame must be the **output of integrating the governing equations**, driven
by the current slider state, and it must be able to **visibly fail**. No free-running
`Math.sin(phase)` breathing loops, no scripted motion that always lands in the same tidy end
state. Gate motion behind the Run button (`BP.playX`), advance **simulated time or a design
action**, and settle at the computed answer. A bad parameter set must produce broken geometry
on screen (delaminated crack, warped/peeled plate, sheared fracture along the road).

---

## Sub-Calc A — Neck Growth & Inter-Layer Bonding  (guard `plotCanvasNeck`)
**Accurate model (override): reptation/healing weld, not metallic sintering.**
The source's surface-diffusion sintering law is for metal powder; polymer FDM bonds by
**chain interdiffusion (reptation)**. Use the polymer weld-healing model:

- Diffusion time available at the interface: `t_avail = L_h / v_print`  (mm / (mm/s) = s)
- Reptation time (Arrhenius, drops fast with T): `t_rep(T) = t0 · exp(Ea/R · (1/Tk − 1/Tref))`,
  `Ea ≈ 60 kJ/mol`, `R = 8.314`, `Tref = 503.15 K (230 °C)`, `t0 ≈ 0.0148 s`.
- Bonding / healing degree: `D_b = min(1, (t_avail / t_rep)^(1/4))`   (reptation ¼-power law)
- Weld strength: `σ_bond = D_b · σ_bulk`,  `σ_bulk ≈ 47 MPa` (PLA).

**Calibration targets (from source):** (230 °C, 30 mm/s) → D_b ≈ 0.82, σ ≈ 38.5 MPa;
(190 °C, 60 mm/s) → D_b ≈ 0.51, σ ≈ 24 MPa. Tune `t0`/`Ea` to hit these.

**Controls:** T_print 190–240 °C · layer height L_h 0.10–0.40 mm · print speed v 20–90 mm/s.
**Readouts:** `resTavail resTrep resDb resSigma resBulkPct`; table `#neckTable` compares 3
temp×speed combos → "isotropic / anisotropic" verdict.
**Contradiction (KEEP, amber `.model-note`):** sintering vs reptation — the ¼-power healing law
*is* the accurate model; note the source's sintering exponent is only qualitatively correct.

**3D solver:** cross-section of two stacked deposited roads (cylinders). A **neck** between
them grows over simulated diffusion time to width ∝ `D_b`. Low D_b → a visible crack/notch
remains at the interface (weak, translucent join); D_b→1 → roads fully coalesce into one solid
bead. On demand via `btnRun`; state label shows healing %.

## Sub-Calc B — Crystallisation During Printing  (guard `plotCanvasCryst`)
Newtonian cooling of a deposited road, then crystallinity from time spent in the growth window:
- `τ_cool = m·Cp / (h_conv·A)` → `T(t) = T_amb + (T_print − T_amb)·e^(−t/τ_cool)`
- Time in crystallization window (T_g..T_m): `t_x = τ_cool · ln((T_m − T_amb)/(T_g − T_amb))`
- Crystallinity: `X_c = X_c_max · (1 − e^(−t_x / t_half))`  (slower cooling → larger t_x → higher X_c)
- Stiffening: `E = E_amorphous · (1 + 1.5·X_c)`  (source form)

`X_c_max ≈ 0.45` (PLA), `T_g = 60 °C`, `T_m = 170 °C`. **Calibration:** T_amb 25 °C → X_c ≈ 12 %;
chamber 50 °C → X_c ≈ 28 %; E rises ≈ 24 %. **4D insight:** higher X_c = stiffer but *reduces*
shape-memory recovery (crystalline domains pin the network) — a genuine trade-off.
**Controls:** T_print 190–240 · ambient/chamber T_amb 20–80 °C · road diameter (→ A/m). 
**Readouts:** `resTauCool resTx resXc resE resRecoveryPenalty`; table `#crystTable` (3 ambient temps).
**3D solver:** a road cools (color hot→cold along real T(t)); **spherulites nucleate and grow**
inside it at a rate set by t_x — slow cooling seeds many/large crystallites, rapid cooling few.
The crystallite volume fraction on screen equals the computed X_c.

## Sub-Calc C — Residual Stress & Warpage  (guard `plotCanvasWarp`)
**Override the stress form for accuracy** (source's `×(1−ν)` under-predicts; constrained
thermal stress is `/(1−ν)`):
- Mismatch strain: `ε_mis = α·(T_print − T_bed)`
- Residual (biaxial constrained) stress: `σ_res = E·α·(T_print − T_bed) / (1 − ν)`
- Warpage (curl from differential contraction, κ = ε/h, tip of length L): `δ_warp = ε_mis·L²/(2h)`
- Delamination when `σ_res > σ_bond` (use A's σ_bond, or a fixed 30 MPa reference).

`α ≈ 70e-6 /°C` (PLA), `E ≈ 3 GPa`, `ν ≈ 0.35`. **Calibration:** no bed heat → δ ≈ 2.8 mm;
T_bed 60 °C → δ ≈ 0.6 mm (≈79 % reduction). A heated bed shrinks ΔT and warpage.
**Controls:** T_print · T_bed 20–80 °C · layer thickness h 0.1–0.4 mm · part length L 20–120 mm.
**Readouts:** `resEps resSigmaRes resWarp resDelam resBedEffect`; table `#warpTable` (3 bed temps).
**3D solver:** a printed rectangular plate on the bed **curls up at the corners** with the real
computed curvature κ. If `σ_res > σ_bond`, the plate **peels/delaminates** off the bed (lifts
free) — a distinct failure state, not just more curl.

## Sub-Calc D — Print Anisotropy (Raster Angle)  (guard `plotCanvasAniso`)
Tsai-Hill off-axis strength for a unidirectional (road-aligned) layer:
`σ_θ = [ cos⁴θ/σ_L² + (1/τ_LT² − 1/σ_L²)·sin²θ·cos²θ + sin⁴θ/σ_T² ]^(−1/2)`
- `σ_L` = along-road (strong, ≈ σ_bulk), `σ_T` = across-road (weak inter-road bond, from A),
  `τ_LT` = shear. Anisotropy ratio `AR = σ_L/σ_T > 1` always for FDM.
- Minimum strength near **θ ≈ 45–55°** (counter-intuitive; source: 53°). Report `θ_min`.

**Controls:** raster angle θ 0–90° · material (σ_L, σ_T presets: PLA/ABS/PETG) · applied load.
**Readouts:** `resSigmaTheta resSigmaL resSigmaT resAR resThetaMin`; table `#anisoTable` (0/45/90°).
Left cell = 3D; right cell = **polar plot** of σ(θ). 4D insight: align raster with the active
bending axis to maximize transformation force.
**3D solver:** a tensile bar with visible raster lines at angle θ; pull it (Run) and it **fractures
along the weakest plane** — at 0° roads carry load (survives high load), at ~50° it **shears
along the road interfaces** at low load. Fracture appears where `σ_applied ≥ σ_θ`.

## Sub-Calc E — Dimensional Accuracy & Tolerance Stack-up  (guard `plotCanvasCpk`)
- Systematic shrinkage: `δ_mean = k_shrink·L·ΔT`
- Random process σ: `σ_proc = k_vib·v_print + k_temp·ΔT_nozzle`
- Stack-up of 3 features — **show BOTH** (this is the teaching point):
  RSS `δ_RSS = √(δ1²+δ2²+δ3²)` vs worst-case `δ_WC = δ1+δ2+δ3` (correlated errors in 4D).
- Capability: `Cpk = (USL − μ)/(3σ_proc)`; target **Cpk ≥ 1.33**.

**Controls:** print speed v · nozzle temp stability ΔT_nozzle · feature length L · tolerance band USL.
**Readouts:** `resDeltaMean resSigmaProc resRSS resWC resCpk` (+ pass/fail badge); table `#cpkTable`.
**Contradiction (KEEP):** RSS assumes independent errors; 4D thermal/vibration errors are
correlated → worst-case is the honest bound. Flag when RSS says capable but WC does not.
**Viewport (2D is fine here — §4):** left cell = a **process-distribution bell curve** vs the
USL/LSL spec limits with the out-of-spec tails shaded; it redraws live from σ_proc and δ_mean.
No THREE needed for E; use a plain canvas `#viewport3D`→ replace with `#distCanvas` in the left cell.

---
### Shared requirements
- Each page: rail (A–E, correct `is-active` + step N/5 + prev/next arrows), stage head
  (tag/title/one-line objective), `#liveInsight` strip, `.sim-viewport-fluid` (left viewport +
  right analytics canvas), `.datacard` table, `.collapsible-derivation` with `#eqBox` (open by
  default). Dock: Controls card (sliders/radios + Run + Reset) and navy Readouts card.
- Every axis labelled with quantity + SI unit; shade out-of-model regions; clamp ratios 0–1,
  no negative times. Amber `.model-note` wherever a simplified/empirical relation is used.
- All physics solved live in SI. `node --check js/main.js` must pass; zero console errors.
