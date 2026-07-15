# EXP 09 — 4D-Printed Soft Robots
**Pneumatic Actuation · Bending Finger · SMP Stiffness · Locomotion · Control** — ME + ECE

Built on the shared instrument system (see `../../LAYOUT-SPEC.md`). Copy `exp7/simulation/`
verbatim as the structural template (same `.lab/.rail/.stage/.dock` skeleton, the same `BP.*`
helpers in `js/main.js`, shared `css/main.css` — already copied here). Navy `#1E40AF` = data,
rust `#E2570F` = live/active.

**Rail identity:** eyebrow "Experiment 09", title "4D-Printed Soft Robots",
meta "Pneumatic bending · SMP locking · Crawling · Grasping · PID control". 5 sub-calcs A–E.

## Non-negotiable: the 3D viewport is a SOLVER, not a looped video
Geometry each frame = the **output of integrating the governing equations** from the current
slider state, and it must be able to **visibly fail**. No `Math.sin(phase)` breathing loops, no
scripted motion that always ends the same. Gate on the Run button (`BP.playX`), advance
simulated time / pressure, settle at the computed answer. Bad inputs → visible failure (finger
that won't close, gripper that drops the object at θ=90°, robot that crawls backward, PID that
oscillates).

---

## Sub-Calc A — Pneumatic Soft Actuator (Pressure→Bending)  (guard `plotCanvasBend`)
Moulded elastomeric finger with a strain-limiting layer:
- Bending moment from pressure: `M = P · A_cross · d_ecc`  (d_ecc = distance cavity→neutral axis)
- Curvature: `κ = M / (E_elast · I_eff)`
- Bending angle: `θ = κ · L_finger`  (linear region)
- **Override for large-angle accuracy:** the constant-moment-arm linear model is only valid
  θ ≲ 30°. Add geometric stiffening so θ saturates: use `θ = θ_lin / (1 + β·θ_lin²)` (soft
  neo-Hookean-style rolloff), or explicitly show the **linear→nonlinear divergence** on the plot
  (plot both the linear prediction and the corrected curve, diverging past ~30–60°).

`E_elast ≈ 0.5–2 MPa` (silicone). **Calibration:** 20 kPa → ≈28°, 80 kPa → ≈94° (≈3.4× pressure
gives ≈4× angle, i.e. slightly super-linear then saturating). **Controls:** pressure P 0–100 kPa ·
finger length L 20–80 mm · cavity cross-section A_cross · wall/d_ecc. **Readouts:**
`resMoment resKappa resThetaLin resTheta resRegime` (linear/nonlinear); table `#bendTable`
(5 pressures). Right cell = θ vs P curve (linear vs corrected). 
**3D solver:** a segmented finger that **curls to the computed θ** (chain of segments each rotated
κ·segLen), holds there. Past ~60° the segments visibly bunch (geometric stiffening) so equal
pressure steps add less angle — the nonlinearity is *shown*, not stated.

## Sub-Calc B — SMP Stiffness Switching (4D lock-and-hold)  (guard `plotCanvasStiff`)
The genuine 4D advantage: bend a soft SMP finger warm, cool it to lock the shape, release
pressure — the shape holds at **zero** actuation energy.
- Active (T > T_g): `E_active ≈ 1–10 MPa`; Passive (T < T_g): `E_passive ≈ 1–2 GPa`
- Stiffness ratio `SR = E_passive / E_active` (100–1000×)
- Cycle states: **bend (P on, warm) → cool below T_g → lock → release P → held**.
- Holding energy: pneumatic hold power ∝ P (continuous) vs SMP-locked = **0 W**.

Pull R_f (shape fixity) from Exp 1 concept: locked angle `θ_held = R_f · θ_bent` (≈100 %).
**Controls:** T (sweep across T_g) · E_active · P_bend · R_f. **Readouts:**
`resEactive resEpassive resSR resThetaHeld resEnergySaved`; table `#stiffTable` (state timeline).
**3D solver:** finger runs the real cycle on `btnRun`: pressurize→bend to θ, then temperature
drops through T_g (color blue→dark = stiffening), pressure released — **finger stays bent**.
If T never crosses T_g (SMP still soft), releasing pressure lets it **spring back** (fails to hold).

## Sub-Calc C — Crawling Locomotion (Friction-Asymmetry Gait)  (guard `plotCanvasCrawl`)
Earthworm-style: net displacement per cycle from friction asymmetry.
- `δ_net = δ_extend − δ_contract`, with `δ_extend = L·ε_active`
- Anchoring by friction asymmetry: forward slip only if `μ_forward < μ_backward`
  (`F_forward = μ_forward·m·g`, `F_backward = μ_backward·m·g`); **net motion requires μ_asym = μ_back/μ_fwd > 1**
- Speed: `v = δ_net · f_actuation`   (f = actuation cycles/s)

**Controls:** segment strain ε_active · μ_forward · μ_backward (→ asym) · frequency f 0.1–1.5 Hz.
**Readouts:** `resDeltaExt resDeltaNet resAsym resSpeed resDir` (forward/stuck/back); `#crawlTable`.
**Contradiction (KEEP, amber):** a smooth 4D-printed surface has μ_fwd ≈ μ_back → **no net motion**;
asymmetry needs printed surface features/angled legs. When μ_asym ≈ 1, the readout must say the
robot **oscillates in place**.
**3D solver:** a multi-segment worm actually **translates across the ground** by the computed
δ_net each cycle (peristaltic extend/anchor/contract). μ_asym=1 → it stretches and recoils with
**zero net displacement** (visibly stuck); μ_asym>1 → it inches forward; misconfigured → backward.

## Sub-Calc D — Grasping Force & Workspace  (guard `plotCanvasGrasp`)
3-finger pneumatic gripper:
- Grasp force per finger: `F_grasp = P · A_tip · cos(θ_finger)`  ← the cos term is the point
- Workspace: `R_min = r_palm`, `R_max = r_palm + L_finger·sin(θ_max)`; graspable Ø ∈ [2R_min, 2R_max]
- Force closure (won't drop): `F_grasp·μ_contact > m_object·g / 3`  (3 fingers share weight)
- **cos(90°) = 0** ⇒ at θ=90° normal force → 0 ⇒ **force closure fails regardless of pressure.**

**Controls:** pressure P · finger angle θ 0–90° · object mass m 50–500 g · μ_contact · L_finger.
**Readouts:** `resFgrasp resRmin resRmax resMaxMass resClosure` (HOLD/DROP); table `#graspTable`
(θ = 30/60/90°). **3D solver:** three fingers close to angle θ around a sphere sized to the object;
compute F_grasp and force-closure. If closure holds → object stays; if `F_grasp·μ ≤ m·g/3` (e.g.
θ→90° or object too heavy) → **the object falls out** of the gripper. The drop is the failure.

## Sub-Calc E — Pressure–Position PID Control  (guard `plotCanvasPID`)
First-order plant from A's slope:
- `K_plant = dθ/dP` (from A) ; pneumatic time constant `τ_p = V_cavity/(A_valve·C_d·√(2ΔP/ρ))`
- Plant `G(s) = K_plant/(τ_p·s + 1)`; PID `C(s) = Kp(1 + 1/(Ti·s) + Td·s)`
- Closed-loop step response θ(t) to a target angle; report overshoot, settling time, `ω_cl`.
- Targets: **OS < 15 %, t_s < 2 s**.

**Controls:** Kp · Ti · Td · target θ_set · (τ_p via valve/cavity). **Readouts:**
`resKplant resTauP resOvershoot resSettle resBandwidth` (+ tuned badge); table `#pidTable`.
**Contradiction (KEEP):** first-order model over-predicts for large steps (real finger is
nonlinear/hysteretic) — gains are a starting point.
**Viewport (2D fine — §4):** left cell = the **closed-loop step response** θ(t) vs the setpoint,
redrawn live from Kp/Ti/Td (overshoot, ringing, settling visible). Poorly tuned gains →
**sustained oscillation / instability** on screen. Use a plain canvas (`#stepCanvas`) — no THREE.

---
### Shared requirements
- Each page: rail (A–E, `is-active` + step N/5 + arrows), stage head (tag/title/objective),
  `#liveInsight`, `.sim-viewport-fluid` (viewport + analytics canvas), `.datacard` table,
  `.collapsible-derivation` with `#eqBox` (open). Dock: Controls (sliders/radios + Run + Reset)
  and navy Readouts card.
- Axes labelled with quantity + SI unit; shade out-of-model/undefined regions; clamp angles to
  0–90°/physical bounds; amber `.model-note` for every simplified relation.
- Solve live in SI. `node --check js/main.js` passes; zero console errors.
