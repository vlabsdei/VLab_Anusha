# Procedure: 4D-Printed Soft Robots

This lab takes a soft actuator from a single pneumatic bend all the way to a closed-loop controlled finger. Each sub-calculator is gated: set your parameters first, press **Start Experiment** on the 3D viewport, then run the cycle. Follow the five procedures below.

---

## Sub-Calc A: Pneumatic Soft Actuator & the Bending Finger
**Objective:** Drive an eccentric air cavity to bend a strain-limited elastomer finger and watch the linear curvature law saturate as geometric stiffening takes over.

1. **Set the drive pressure:** Move the **P (kPa)** slider (0-100 kPa) to set the cavity gauge pressure.
2. **Set the geometry:** Adjust **L (mm)** finger length (20-80), **A_cross (mm&sup2;)** cavity cross-section (10-60), and **d_ecc (mm)** wall eccentricity (1-6). The moment arm d and area A both scale the bending moment.
3. **Start the experiment**, then click **Pressurise the Finger**. The segmented finger integrates its uniform curvature and curls to the corrected angle.
4. **Read the plots:** the main panel overlays the linear prediction &theta;_lin = &kappa;L against the corrected &theta;; the lower panel tracks curvature &kappa; against pressure.
5. **Record:** note the bending moment M, curvature &kappa;, linear angle &theta;_lin, corrected angle &theta;, and whether the regime reads *linear* or *nonlinear (saturating)*.
6. **Advance:** move on to Sub-Calc B.

---

## Sub-Calc B: Shape-Memory Stiffness Switching
**Objective:** Bend the finger warm, cool it through T_g to vitrify the material, then release pressure, and see whether the shape locks at zero power or springs back.

1. **Set the hold temperature:** Use the **T (&deg;C)** slider (20-70) to place the finish temperature above or below T_g = 40 &deg;C.
2. **Set the material:** Adjust **E_active (MPa)** warm modulus (1-10) and **P_bend (kPa)** bending pressure (0-100). Set the shape fixity **R_f (%)** (70-100), the fraction of bend retained.
3. **Start the experiment**, then click **Run Lock Cycle**. The finger pressurises, cools (colour shifts from blue to dark as it stiffens), and releases.
4. **Watch the outcome:** if T finished below 40 &deg;C the finger holds its bend; if it stayed warm it springs straight back on release.
5. **Record:** read the stiffness ratio SR = E_passive/E_active, the held angle &theta;_held, and the hold power saved (locked hold is 0 W versus the leaking pneumatic hold).
6. **Advance:** move on to Sub-Calc C.

---

## Sub-Calc C: Earthworm Crawling Locomotion
**Objective:** Show that a peristaltic worm only travels when its ground friction is directionally asymmetric.

1. **Set the stroke:** Move **&epsilon;_active (%)** (5-40) to set the peristaltic segment strain.
2. **Set directional friction:** Adjust **&mu;_forward** (0.1-1.0) for slip while advancing and **&mu;_backward** (0.1-1.2) for grip while anchoring. Their ratio is &mu;_asym.
3. **Set the pace:** Move **f (Hz)** (0.1-1.5) for cycles per second.
4. **Start the experiment**, then click **Run the Gait**. The soft-body worm extends and contracts, translating by the solved &delta;_net each cycle.
5. **Observe direction:** &mu;_asym &gt; 1 inches forward, &mu;_asym = 1 oscillates in place (no net travel), &mu;_asym &lt; 1 backs up. Compare the surface-type table (smooth, textured, angled legs).
6. **Record:** extension stroke &delta;_ext, net displacement &delta;_net, &mu;_asym, crawl speed v, and direction.
7. **Advance:** move on to Sub-Calc D.

---

## Sub-Calc D: Three-Finger Gripper & Force Closure
**Objective:** Close three fingers on an object and test whether the force-closure condition holds it or lets it drop.

1. **Set the drive pressure:** Move **P (kPa)** (0-150) for fingertip force.
2. **Set the finger angle:** Adjust **&theta; (&deg;)** (0-90). Because F scales with cos&theta;, angles near 90&deg; kill the normal force.
3. **Set the object:** Choose object mass **m (g)** (50-500), contact friction **&mu;_contact** (0.2-1.2), and finger length **L_finger (mm)** (30-90) which sets the reachable workspace.
4. **Start the experiment**, then click **Close the Gripper**. The three fingers close from open to &theta; around a sphere sized to the object mass.
5. **Watch closure:** if F&middot;&mu; &gt; mg/3 the object stays seated; otherwise it falls out. Cross-check the &theta; = 30&deg;/60&deg;/90&deg; table for HOLD/DROP.
6. **Record:** grasp force per finger F, min/max graspable radius, max holdable mass, and the closure verdict.
7. **Advance:** move on to Sub-Calc E.

---

## Sub-Calc E: Closed-Loop Bending Control
**Objective:** Wrap a PID loop around the pneumatic plant from Sub-Calc A and tune it to hit the target bend angle cleanly.

1. **Set the target:** Move **&theta;_set (&deg;)** (10-90) to the desired bend angle.
2. **Set the plant lag:** Adjust **&tau;_p (s)** (0.1-1.5), the valve/cavity fill time constant.
3. **Tune the gains:** Set **K_p** (0.1-8), **T_i (s)** (0.2-10), and **T_d (s)** (0-1.5).
4. **Start the experiment**, then click **Run Step Response**. The step response is drawn out in simulated time by a sweeping cursor; the right panels show the pressure command u(t) and the tracking error e(t).
5. **Check the targets:** the performance table flags overshoot (&lt; 15 %), settling time to 2 % (&lt; 2 s), damping &zeta;, and steady error. Poor gains ring, saturate the 150 kPa valve limit, or never settle.
6. **Record:** plant gain K_plant, &tau;_p, overshoot, settling time, and closed-loop bandwidth &omega;_cl.
