# Procedure: 4D Print Process Engineering

Welcome to the 4D Printing Virtual Laboratory. This lab walks the fused-deposition print process from the first welded interface through to the finished part's tolerance. Each of the five sub-calculators is a live solver: set the parameters, press **Start Experiment** on the viewport, then run the cycle. Work through them in order — the across-road bond strength you build in Sub-Calc A is the same &sigma;<sub>T</sub> that limits the anisotropy in Sub-Calc D.

---

## Sub-Calc A: Neck Growth & Inter-Layer Bonding
**Objective:** Watch two deposited roads weld by chain reptation and read off how much of the 47 MPa bulk strength the interface actually recovers.

1. **Set the nozzle temperature:** Drag **T_print (°C)** (190–240, default 230). Hotter melt reptates faster, so the reptation time t<sub>rep</sub> drops.
2. **Set the layer height:** Adjust **L_h (mm)** (0.10–0.40). This fixes how long the interface has to diffuse.
3. **Set the print speed:** Move **v_print (mm/s)** (20–90). Faster deposition means less dwell — t<sub>avail</sub> = L_h / v_print shrinks.
4. **Start and run:** Click **Start Experiment** on the viewport, then **Grow the Weld**. The two cylindrical roads coalesce; the neck bridging them grows on the &frac14;-power law toward the computed D<sub>b</sub>. A low D<sub>b</sub> leaves a visible dark crack at the interface.
5. **Record results:** Note the diffusion time t<sub>avail</sub>, reptation time t<sub>rep</sub>, bonding degree D<sub>b</sub>, weld strength &sigma;<sub>bond</sub>, and the isotropy verdict (D<sub>b</sub> &ge; 0.80 reads as isotropic). Cross-check the temperature × speed table.

---

## Sub-Calc B: Crystallisation During Printing
**Objective:** Follow a road as it cools through the crystallisation window and see how the resulting crystallinity trades stiffness against shape-memory recovery.

1. **Set the nozzle temperature:** Drag **T_print (°C)** (190–240, default 220) — the starting road temperature.
2. **Set the chamber temperature:** Adjust **T_amb (°C)** (20–80). A warmer chamber slows Newtonian cooling and lengthens the dwell.
3. **Set the road diameter:** Move **d_road (mm)** (0.20–0.80). Thicker roads carry more mass per unit surface, so &tau;<sub>cool</sub> rises.
4. **Start and run:** Click **Start Experiment**, then **Cool the Road**. The road colour shifts hot→cold along the real T(t) curve while spherulites nucleate and grow; the on-screen crystallite fraction settles at the computed X<sub>c</sub>.
5. **Record results:** Read the cooling constant &tau;<sub>cool</sub>, the dwell t<sub>x</sub> in the 60–170 °C window, the crystallinity X<sub>c</sub>, the stiffened modulus E, and the recovery penalty. Compare the three chamber temperatures in the table.

---

## Sub-Calc C: Residual Stress & Warpage
**Objective:** Cool a constrained plate on the bed, lock in residual stress, and find whether the corners curl or the whole part delaminates.

1. **Set the print temperature:** Drag **T_print (°C)** (190–240, default 210).
2. **Set the bed temperature:** Adjust **T_bed (°C)** (20–80). A heated bed relaxes stress near T<sub>g</sub> through the f<sub>relax</sub> factor.
3. **Set the layer thickness and part length:** Use **h (mm)** (0.10–0.40) and **L (mm)** (20–120). Warpage scales as L&sup2;/2h, so long thin plates curl hardest.
4. **Start and run:** Click **Start Experiment**, then **Cool & Warp**. The plate contracts; corners rise with the real curvature &kappa; = &epsilon;/h. If &sigma;<sub>res</sub> beats the 30 MPa bond, the whole plate peels off the bed and turns red.
5. **Record results:** Note the mismatch strain &epsilon;<sub>mis</sub>, residual stress &sigma;<sub>res</sub>, corner warpage &delta;, the delamination check, and the heated-bed warp reduction versus an unheated bed.

---

## Sub-Calc D: Print Anisotropy (Raster Angle)
**Objective:** Treat the print as a unidirectional composite and map how off-axis strength collapses with raster angle.

1. **Choose a material:** Select **PLA**, **ABS**, or **PETG** — each loads its own &sigma;<sub>L</sub> / &sigma;<sub>T</sub> / &tau;<sub>LT</sub> preset.
2. **Set the raster angle:** Drag **&theta; (°)** (0–90, default 45), the angle between the roads and the load axis.
3. **Set the applied load:** Adjust **&sigma;_applied (MPa)** (5–50).
4. **Start and run:** Click **Start Experiment**, then **Pull to Failure**. The tensile bar shows its raster lines and ramps the load; where &sigma;<sub>applied</sub> reaches &sigma;<sub>&theta;</sub> the bar splits along the road plane at angle &theta;.
5. **Record results:** Read the off-axis strength &sigma;<sub>&theta;</sub>, the along- and across-road strengths &sigma;<sub>L</sub> and &sigma;<sub>T</sub>, the anisotropy ratio AR, and the weakest angle &theta;<sub>min</sub>. The 0/45/90° table shows which orientations survive the load.

---

## Sub-Calc E: Dimensional Accuracy & Tolerance Stack-up
**Objective:** Split systematic shrinkage from random process noise, stack three features two ways, and decide capability with C<sub>pk</sub>.

1. **Set the print speed:** Drag **v_print (mm/s)** (20–120, default 60) — the main vibration-noise source.
2. **Set the nozzle stability:** Adjust **&Delta;T_nozzle (°C)** (0.5–12), the thermal-noise contribution to &sigma;<sub>proc</sub>.
3. **Set the feature length:** Use **L (mm)** (10–100), which drives the shrinkage mean shift &delta;<sub>mean</sub>.
4. **Set the tolerance band:** Adjust **USL (mm)** (0.05–0.60), the &plusmn; spec limit.
5. **Recompute:** Click **Start Experiment**, then **Recompute**. The distribution panel draws the process bell curve against the LSL/USL limits with the out-of-spec tails shaded.
6. **Record results:** Note the mean shrinkage &delta;<sub>mean</sub>, process sigma &sigma;<sub>proc</sub>, the RSS and worst-case stack deviations, and C<sub>pk</sub>. Watch for the flagged contradiction — RSS calling the stack capable while the worst-case bound falls below 1.33.
