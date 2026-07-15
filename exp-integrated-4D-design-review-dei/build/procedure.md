# Procedure: Integrated 4D Design Review

Welcome to the capstone bench of the 4D Printing Virtual Laboratory. This experiment reviews a 4D-printed active structure the way a design team would — one decision at a time. Each of the five sub-calculators is gated behind a **Start Experiment** panel; set your parameters first, then start the solver. Work through the sub-calcs in order.

---

## Sub-Calc A: Which 4D Material Wins? (Ashby Selection)
**Objective:** Rank five 4D-active materials on three competing performance indices and watch the winner change as you re-weight the application priorities.

1. **Pick an application preset:** Click **Tracheal stent**, **Soft gripper**, or **Deployable** to load a sensible starting weighting — or skip and set the weights by hand.
2. **Set the three weights:** Drag **Weight w<sub>1</sub> — stiffness** (M<sub>1</sub> = &radic;E/&rho;), **Weight w<sub>2</sub> — recovery** (M<sub>2</sub> = &sigma;<sub>recovery</sub>/&rho;), and **Weight w<sub>3</sub> — trigger eff.** (M<sub>3</sub> = &eta;&middot;E<sub>stored</sub>/Q<sub>trigger</sub>). The weights auto-normalize, so the readout shows each as a percentage.
3. **Re-rank:** Click **Re-rank Materials**. The left Ashby bubble chart plots M<sub>1</sub> against M<sub>2</sub> (log-log, bubble area &prop; trigger efficiency) and the right bar chart shows the live weighted score M<sub>total</sub>.
4. **Read the verdict:** Note the **Winner**, its **M<sub>total</sub>**, the **Runner-up**, and the **Score spread**. A small spread means the choice is fragile.
5. **Test the claim:** Push the recovery weight up and NiTi should take the stent; push stiffness up and SMP-PLA should take the gripper. Confirm that no single material wins under every weighting.
6. **Advance:** Use the **&rsaquo;** arrow to move to Sub-Calc B.

---

## Sub-Calc B: Predicted vs Simulated Curvature (Transformation Verification)
**Objective:** Check whether the curvature the design asked for (&kappa;<sub>pred</sub> = 1/R) survives the finite-strain simulation, and if not, name the assumption that broke.

1. **Choose the model source:** Select **Timoshenko bilayer (Exp 2)** or **SMP recovery (Exp 7)** with the radio buttons.
2. **Set the target radius:** Drag **Target radius R** (3&ndash;20 mm). The predicted curvature is &kappa;<sub>pred</sub> = 1/R.
3. **Set the bilayer geometry:** Adjust the **Thickness ratio m = h<sub>1</sub>/h<sub>2</sub>** (0.1&ndash;4), the **Mismatch strain &Delta;&epsilon;** (0.5&ndash;15 %), and the **Modulus ratio n = E<sub>1</sub>/E<sub>2</sub>** (0.1&ndash;10).
4. **Fold and verify:** Click **Fold & Verify**. In the 3D viewport the flat strip folds to &kappa;<sub>sim</sub> and holds, with a dashed grey ghost arc marking the &kappa;<sub>pred</sub> target — the gap between them is the visible shape error.
5. **Read the gate:** Check &kappa;<sub>pred</sub>, &kappa;<sub>sim</sub>, and the **shape error &epsilon;<sub>shape</sub>**. Below 10 % the verdict is **ACCEPT** (green); above it, **REJECT** (red) and the **Likely culprit** field names the offending simplification.
6. **Break it on purpose:** Crank &Delta;&epsilon; toward 15 % or push m far from 1 and watch the strip overshoot the ghost arc as the linear theory diverges.
7. **Advance:** Click **&rsaquo;**.

---

## Sub-Calc C: Is 4D Worth the Energy? (Lifecycle Budget)
**Objective:** Add up the whole-life energy of a 4D part against a moulded part with a powered actuator, and find where the two totals cross.

1. **Choose the trigger mechanism:** Select **Body-heat (~0 J)**, **Joule / SMA (I&sup2;Rt)**, or **Photo / magnetic (Q)**. This single choice usually decides the winner.
2. **Set the cycle count:** Drag **Actuation cycles N** (logarithmic, 1 to 10<sup>4</sup>).
3. **Set the part and printer:** Adjust **Part mass** (5&ndash;200 g) and **Printer power** (50&ndash;300 W).
4. **Compute:** Click **Compute Budget**. The left plot draws E<sub>4D</sub>(N) against E<sub>conv</sub>(N) with the break-even marked; the right bar shows the stacked breakdown (print / program / trigger vs mould / actuator) at the current N.
5. **Read the verdict:** Note **E<sub>print</sub>**, **E<sub>trigger</sub>**, the 4D lifecycle **E<sub>total</sub> @ N**, the **break-even N<sub>break</sub>**, and the **Winner @ N**. With a body-heat trigger the 4D route wins for all N; a Joule or photo trigger lets the efficient moulded actuator catch up.
6. **Advance:** Click **&rsaquo;**.

---

## Sub-Calc D: Lab → Manufacturing (Scalability)
**Objective:** Compare cost-per-part for flat 4D-printing against injection moulding, whose tooling cost amortizes over the production run.

1. **Set the part volume:** Drag **Part volume V<sub>part</sub>** (1&ndash;100 cm&sup3;). This sets the print time via the volumetric FDM rate.
2. **Set the production volume:** Adjust **Production volume N** (logarithmic, 1 to 10<sup>4</sup>).
3. **Set the moulding economics:** Adjust **Mould tooling cost C<sub>mould</sub>** ($1,000&ndash;$50,000) and the **Machine rate** ($5&ndash;$120/hr).
4. **Compute the crossover:** Click **Compute Crossover**. The left log-log plot holds the flat 4D cost against the falling injection cost; the right plot shows print time vs part volume.
5. **Read the verdict:** Note **t<sub>print</sub>**, the mould cost per part at N = 10 and N = 10<sup>4</sup>, the **break-even N<sub>break</sub>**, and the **Winner @ N**. 4D wins the customised low-volume regime below N<sub>break</sub>; moulding wins at volume.
6. **Advance:** Click **&rsaquo;**.

---

## Sub-Calc E: Future Roadmap — Is It Ready? (TRL Assessment)
**Objective:** Locate each 4D application on the NASA/ISRO readiness ladder and trace its blocking barrier back to an earlier sub-calc contradiction.

1. **Select an application:** Choose **Biomedical stent**, **Aerospace morphing**, **Soft robotics**, or **Consumer 4D goods**.
2. **Set a target rung (optional):** Drag **Target TRL** (1&ndash;9) to mark where you want the technology to reach.
3. **Assess:** Click **Assess Readiness**. The left ladder shades the three readiness bands (basic / lab / system) and marks the current rung and the gap to target; the right bar compares all four applications.
4. **Read the roadmap:** Note the **Current TRL**, the **Next rung**, the **Blocking barrier**, the **Responsible experiment** that owns the contradiction, and the **Proposed action**.
5. **Close the loop:** Confirm that each barrier links to a specific earlier result — the stent to the Sub-Calc B shape-error gate, consumer goods to the Sub-Calc D scalability crossover, and so on. This is the review's final judgement on whether the technology is ready.
