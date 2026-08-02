# EXP 10 - Integrated 4D Design Review (Capstone)
**Ashby Selection · Shape Verification · Energy Budget · Scalability · TRL** - ME + MAT + EE + BIO

Built on the shared instrument system (see `../../LAYOUT-SPEC.md`). Copy `exp7/simulation/`
verbatim as the structural template (same `.lab/.rail/.stage/.dock` skeleton, `BP.*` helpers,
shared `css/main.css` - already copied here). Navy `#1E40AF` = data, rust `#E2570F` = live/active.

**Rail identity:** eyebrow "Experiment 10", title "Integrated 4D Design Review",
meta "Ashby · Shape check · Energy · Scalability · TRL". 5 sub-calcs A-E. This is the capstone - 
it validates and situates the whole lab.

## Non-negotiable: viewports are SOLVERS / live decision tools, not looped video
Every visual redraws from the current slider state and can show a **wrong/failed** outcome
(the losing material, a shape error > 10 %, 4D losing the energy break-even, a TRL gap). No
scripted loops. Where the insight is a chart or ranking (A, C, D, E), a clean labelled 2D canvas
is correct (§4) - only B needs real 3D.

---

## Sub-Calc A - Ashby Materials Selection  (guard `plotCanvasAshby`)
Performance indices (maximize):
- Bending-actuator stiffness: `M1 = √E / ρ`
- Recovery/actuation: `M2 = σ_recovery / ρ`
- Thermal-trigger efficiency: `M3 = η_SMP · E_stored / Q_trigger` (normalize each to [0,1])
- Weighted score: `M_total = w1·M1̂ + w2·M2̂ + w3·M3̂` (hats = min-max normalized across candidates)

**Candidates (with real-ish props):** SMP-PLA, SMP-PU, SMA (NiTi), PAA hydrogel, PNIPAM.
The winner **changes with the weighting** - no universally optimal material (that's the lesson).
**Calibration:** stent weighting (σ_recovery + biocompatibility dominant) → NiTi 1st, SMP-PU 2nd;
gripper weighting (locked stiffness dominant) → SMP-PLA 1st.
**Controls:** three weight sliders w1/w2/w3 (auto-normalize to 1) · application preset
(tracheal-stent / soft-gripper / deployable). **Readouts:** `resWinner resScore resRunnerUp
resSpread resNote`; ranked table `#ashbyTable`. **Viewport:** an **Ashby bar/bubble chart** of the
5 materials that **re-ranks live** as weights change (winner highlighted rust). No THREE.
**Contradiction (KEEP, amber):** linear weighted sum ignores property correlations (strong⇔brittle);
this is a screening tool, real selection uses the Ashby chart's empirical bands.

## Sub-Calc B - Transformation Verification: Predicted vs Simulated  (guard `plotCanvasShape`)
The most important validation step - reconcile theory with the simulation output.
- Predicted curvature `κ_pred` from Timoshenko bilayer (Exp 2) **or** SMP recovery (Exp 7),
  entered from all material parameters.
- Simulated curvature `κ_sim` from a live geometric bend using those same parameters.
- Shape error: `ε_shape = |κ_sim - κ_pred| / κ_pred × 100 %`; **acceptance ε_shape < 10 %.**
- If ε_shape > 10 %, trace back which upstream simplification (Timoshenko small-strain, constant
  moment arm, etc.) is responsible - the module names the likely culprit.

**Controls:** target shape (radius) · bilayer m=h1/h2 · Δε · E-ratio · model source (Timoshenko/SMP).
**Readouts:** `resKpred resKsim resError resVerdict resCulprit`; table `#shapeTable`.
**3D solver (real THREE here):** the bilayer strip **folds to κ_sim** and holds; overlay/ghost the
**κ_pred target arc**. Divergence between the two arcs is the visible ε_shape - push Δε or m out
of the small-strain range and the strip visibly overshoots the target (error > 10 %, red verdict).

## Sub-Calc C - Energy Budget of a Complete 4D Cycle  (guard `plotCanvasEnergy`)
- Print energy: `E_print = P_printer · t_print` (P_printer ≈ 100-200 W FDM)
- Program energy: `E_program = m·Cp·(T_program - T_amb)`
- Trigger energy **depends on mechanism** (this is a KEEP contradiction):
  body-heat-triggered biomedical → `E_trigger ≈ 0` (free); Joule/SMA → `E_trigger = I²·R·t_act`;
  photo/magnetic → `Q_photo/Q_mag`.
- Lifecycle: `E_total = E_print + E_program + E_trigger · N_cycles`.
- Compare to injection-moulded + separate actuator (`E_mould + E_actuator·N_cycles`); find the
  **break-even N_cycles** where the two cross.

**Controls:** trigger mechanism (body-heat / Joule / photo) · N_cycles (log 1-10⁴) · part mass ·
printer power. **Readouts:** `resEprint resEtrigger resEtotal resBreakeven resWinner`; `#energyTable`.
**Viewport:** two **E_total-vs-N_cycles lines** (4D vs conventional) that **cross at N_break**,
redrawn live; shade which regime wins. Body-heat trigger makes 4D win at all N. No THREE.

## Sub-Calc D - Scalability: Lab → Manufacturing  (guard `plotCanvasScale`)
- Print time vs volume: `t_print = V_part / (A_layer · v_print · h_layer)`
- Cost per part, low volume (N=10): `C_10 = (C_machine + C_material·N)/N`
- Cost per part, high volume (N=10⁴): `C_10000 = C_material + C_labour_per_part`
- Injection moulding: `C_inj = C_mould/N + C_material` - **break-even** `N_break = C_mould/(C_inj_marginal - C_print)`.

**Controls:** part volume · production volume N (log) · mould tooling cost C_mould · machine rate.
**Readouts:** `resTprint resC10 resC10000 resNbreak resVerdict`; table `#scaleTable`.
**Viewport:** **cost-per-part vs N** curves for 4D-print vs injection-moulding, crossing at
`N_break`; 4D wins for customised/low-volume (N < N_break). Live redraw. No THREE.

## Sub-Calc E - Future Roadmap: TRL Assessment  (guard `plotCanvasTRL`)
NASA/ISRO Technology Readiness Level 1-9:
- TRL 1-3 basic principles/analytical proof · 4-6 lab→relevant-environment validation ·
  7-9 system prototype/operational/flight-proven.
- Map each 4D application to its current TRL and the **barrier blocking the next level**:
  biomedical stents TRL 5-6 · aerospace morphing TRL 4-5 · soft robots TRL 4 · consumer TRL 3.
- Each barrier links to a specific earlier sub-calc contradiction (e.g. cell-kill uncertainty,
  Tsai-Hill anisotropy, friction-asymmetry mechanism).

**Controls:** application selector · (optional) target TRL. **Readouts:** `resTRL resNext resBarrier
resSource resProposal`; table `#trlTable` mapping app → TRL → barrier → responsible experiment.
**Viewport:** a **TRL ladder (1-9)** with the selected application's marker and a highlighted gap
to the next rung; annotate the blocking barrier. Live on selection. No THREE.
**Contradiction (KEEP):** TRL is qualitative/contested - cite the assessment as a reference, not fact.

---
### Shared requirements
- Each page: rail (A-E, `is-active` + step N/5 + arrows), stage head (tag/title/objective),
  `#liveInsight`, `.sim-viewport-fluid` (viewport + analytics canvas), `.datacard` table,
  `.collapsible-derivation` with `#eqBox` (open). Dock: Controls (sliders/radios/selects + Run +
  Reset) and navy Readouts card.
- Axes labelled with quantity + SI unit; shade regimes; normalize indices 0-1; amber `.model-note`
  for every simplified/weighted relation. Solve live. `node --check js/main.js` passes; zero console errors.
- **Capstone linkage:** where a value comes from an earlier experiment (Timoshenko from Exp 2, SMP
  R_f/T_g from Exp 1, bioprinting from Exp 7), label it as inherited so the integration is explicit.
