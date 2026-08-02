# Procedure: 4D Bioprinting

This lab follows the printed construct from the syringe to a deployed device: first whether the ink extrudes, then whether it sets, whether the cells inside survive, how long the scaffold lasts, and finally a capstone that ties it all into a self-folding tracheal stent. Each sub-calculator is gated. Set your parameters, click **Start Experiment**, then run. Work through A to E in order.

---

## Sub-Calc A: Bioink Viscosity & the Printability Window
**Objective:** Tune a shear-thinning ink so its viscosity at the nozzle wall lands inside the 1-100 Pa&middot;s printable band, and check the recovery time that lets a printed road hold its shape.

1. Click **Start Experiment** to arm the viewport, then set **K (Pa&middot;s&#8319;)**, the overall thickness / consistency index (2-80).
2. Set the **flow index n** (0.2-1.0). Anything below 1 is shear-thinning; the log-log slope you get is n&minus;1.
3. Adjust **v_print (mm/s)** (2-40) and the **thixotropic recovery time &tau; (s)** (0.5-20).
4. Click **Extrude the Ink**. The nozzle lays a continuous filament along the toolpath; a printable ink holds one clean road, too-thin ink spreads into a puddle, too-thick ink tears into broken segments.
5. Read the nozzle table: for the 200, 400, and 610 µm tips it reports &gamma;&#775;, &eta;, and a PRINTABLE / too-thin / too-thick verdict.
6. In Readouts, note the log-log slope, the 400 µm shear rate and viscosity, how many nozzles print, and the 90% shape-recovery time (t90). Use **Reset Ink** to start over.

---

## Sub-Calc B: Thermal Gelation Kinetics
**Objective:** Make a printed layer gel fast enough to support the next one before it slumps, using Avrami kinetics to find the gel point and the modulus buildup.

1. **Start Experiment**, then set the **plate temperature T (&deg;C)** (4-45). Warmer gels faster through the Arrhenius scaling of k<sub>Av</sub>.
2. Set the **Avrami exponent m** (1-4), the nucleation/growth dimensionality that shapes the sigmoid.
3. Set the **plateau modulus G&prime;&infin; (Pa)** (50-800), the final network stiffness.
4. Click **Start Gelation**. In the viewport the printed strands sag under gravity while G&prime;(t) builds; fast gelation freezes them upright, slow gelation lets them slump and fuse.
5. Read the gel-time-vs-temperature table (4, 21, 37 &deg;C) and the Readouts: rate constant k<sub>Av</sub>, gel time t_gel (min and s), G&prime;&infin;, and whether the layer holds shape.

---

## Sub-Calc C: Cell Viability Through Print Shear
**Objective:** Balance nozzle resolution against the shear stress that kills cells, keeping survival above the 85% target.

1. **Start Experiment**, then set **v_print (mm/s)** (2-40).
2. Set the **nozzle viscosity &eta; (Pa&middot;s)** at print shear (0.05-2.0) and the **nozzle length L_nozzle (mm)** (0.5-10), which fixes the residence time t_res = L/v.
3. Set the **cell shear sensitivity k_kill (Pa&#8315;&sup1;s&#8315;&sup1;)** (0.002-0.03; ~0.01 for mammalian cells).
4. Click **Print the Cells**. Cells fall through the nozzle over the real residence time; red cells are the ones the survival probability lyses.
5. Read the viability table: &tau;_wall, survival, and PASS/FAIL for each of the 200, 400, and 610 µm nozzles.
6. In Readouts, note the residence time, &tau;_wall and survival at 400 µm, how many nozzles pass, and the smallest safe nozzle.

---

## Sub-Calc D: Scaffold Degradation & Mechanical Lifetime
**Objective:** Match a resorbable scaffold's stiffness loss to the tissue's regeneration time so it hands off load at the right moment.

1. **Start Experiment**, then pick the **scaffold polymer**: PLGA (fast, weeks), PLA (medium, months), or PCL (slow, years).
2. Set the **initial porous modulus E&#8320; (MPa)** (0.3-5), the as-printed stiffness, deliberately MPa-scale for a porous strut network, not GPa bulk.
3. Set the **tissue stiffness threshold E_min (MPa)** (0.02-1.0), the load-bearing floor.
4. Click **Run Degradation**. The strut lattice erodes at the real M(t) rate and flags red at t_fail.
5. Read the per-polymer table (k_deg, t_fail) and the Readouts: degradation constant, modulus at 90 days, time to mechanical failure, best-matched tissue (Skin ~21 d, Bone ~90 d, Cartilage ~150 d), and the mass half-life.

---

## Sub-Calc E: The 4D Self-Deploying Tracheal Stent
**Objective:** Back-calculate a flat-printed bilayer that curls into a tracheal stent at body temperature and clears every deployment safety gate. This capstone reuses the SMP data from Experiment 1 and the Timoshenko bilayer from Experiment 2.

1. **Start Experiment**, then set the **trachea radius R_tube (mm)** (5-14). This fixes &kappa;_target = 1/R_tube, and the print aims 20% past it.
2. Set the **layer thickness ratio m = h&#8321;/h&#8322;** (0.2-3), the active/passive split, and the **programmed mismatch strain &Delta;&epsilon;** (5-40%).
3. Choose the **shape-memory polymer**: PLA-SMP (T<sub>g</sub> 58 &deg;C), PU-SMP (T<sub>g</sub> 45 &deg;C), or PCL-SMP (T<sub>g</sub> 35 &deg;C).
4. Click **Design &amp; Deploy Stent**. The flat sheet folds to &kappa;_printed and holds; but if the SMP fails the T<sub>g</sub> gate, watch it spring back open, showing premature room-temperature deployment.
5. Read the safety-gate table (T<sub>g</sub>, R<sub>f</sub>, R<sub>r</sub>) and the Readouts: &kappa;_target, &kappa;_printed, back-calculated bilayer thickness h, the active/passive split, and the final DEPLOYABLE / REVISE DESIGN verdict.
