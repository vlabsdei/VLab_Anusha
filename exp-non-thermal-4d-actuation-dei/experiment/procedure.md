# Procedure: Non-Thermal 4D Actuation

Welcome to the Non-Thermal 4D Actuation lab. Here you drive printed active structures with light and magnetic fields instead of bulk heat, then measure how fast and how far each one responds. Work through the five sub-calculators below; each opens behind a **Start Experiment** gate — set your parameters first, then start the solver.

---

## Sub-Calc A: The Light-Driven Actuator Strip
**Objective:** Bend an azobenzene-loaded strip with UV light and read off how quickly it actuates as you change brightness and dye loading.

1. **Pick the light colour:** Choose **365 nm UV – makes it bend** or **450 nm visible – lets it relax**. UV switches the dye trans&rarr;cis (bending); visible reverses it.
2. **Set the brightness:** Drag **Light brightness I&#8320; (mW/cm&sup2;)** (range 5–60).
3. **Set the dye:** Drag **Dye loading C (mmol/L)** (range 1–30). More dye raises the absorbed fraction toward saturation.
4. **Actuate:** Click **Shine the Light** to run the animation; the strip curls toward the lamp as the cis fraction builds.
5. **Read the outcome:** In Readouts, note *Light reaching the strip* (I<sub>abs</sub>), *How much the dye switches* (cis %), *Bend angle*, and *Time to actuate (t90)*. The lower plot shows t90 falling as 1/I<sub>0</sub>.
6. **Advance:** Use the **&rsaquo;** arrow (Next sub-calc) at the bottom of the rail.

---

## Sub-Calc B: The NIR Skin-Activated Implant
**Objective:** Fire an 808 nm laser through skin onto a nanorod implant and find a dose that switches it on while keeping the hot zone local.

1. **Set laser power:** Drag **Laser power P (W)** (range 0.1–6.0).
2. **Set nanoparticle loading:** Drag **Nanorod loading (wt%)** (range 0.02–0.50). Steady temperature rise scales with power &times; loading.
3. **Fire:** Click **Fire the Laser**. The heat field spreads across the implant's top face and the activation marker glows once it crosses threshold.
4. **Check activation:** Watch *Temperature rise* against the **+25 &deg;C switch-on** line and *Time to switch on (+25&deg;C)*.
5. **Check confinement:** Read *Heated-zone size d* and *Min power to stay local (d&lt;0.5mm)*. If d has spread past 0.5 mm, raise the power toward P<sub>min</sub> for a tighter spot.
6. **Advance:** Click the **&rsaquo;** arrow.

---

## Sub-Calc C: The Magnetic Micro-Gripper / Catheter Tip
**Objective:** Steer a particle-loaded tip with an external magnet and find the loading that lets a gentle field do the job.

1. **Set particle loading:** Drag **Particle loading (vol%)** (range 1–10).
2. **Set field strength:** Drag **Field B (mT)** (range 0–150).
3. **Apply the field:** Click **Apply the Magnet**. The field ramps up to your dialled-in B and the tip curls toward the magnet arrows; the green torus marks the branch it should steer into.
4. **Read the mechanics:** Note *Magnetic strength in the tip* (M<sub>eff</sub>), *Twisting force (torque)*, and *Tip bend* (angle and arc deflection).
5. **Read the design targets:** Check *Magnet to steer 45&deg;* and *Magnet to steer 90&deg;* (B<sub>crit</sub>). The lower plot shows the field needed dropping as 1/(vol-fraction).
6. **Advance:** Click the **&rsaquo;** arrow.

---

## Sub-Calc D: The Wireless Coil Driving an In-Body Robot
**Objective:** Size an external drive coil for an implant at depth, and locate the depth past which a battery becomes the better choice.

1. **Set coil turns:** Drag **Number of turns n** (range 50–2000).
2. **Set coil radius:** Drag **Coil radius R (mm)** (range 20–120).
3. **Set implant depth:** Drag **Implant depth r (mm)** (range 10–150).
4. **Power up:** Click **Power the Coil** to energise the coil and light the in-body robot.
5. **Read the budget:** Note *Field reaching the device*, *Current the coil needs* (I), and *Coil power* (P) — flagged green while under the 300 W wireless budget, red once over it.
6. **Find the crossover:** Read *Crossover depth (battery wins past here)*. The main plot shades the depth band where the coil exceeds budget.
7. **Advance:** Click the **&rsaquo;** arrow.

---

## Sub-Calc E: Pick the Right Trigger for the Job
**Objective:** Race magnetic, light, and thermal actuation side by side and match each trigger to the application its speed suits.

1. **Set magnet strength:** Drag **Field B (mT)** (range 10–150).
2. **Set light brightness:** Drag **Brightness I (mW/cm&sup2;)** (range 5–60).
3. **Set heat response:** Drag **Thermal time-constant (s)** (range 60–900).
4. **Race:** Click **Race the Actuators**. Three identical strips bend under their respective triggers; the bar chart plots each response time on a log scale.
5. **Compare:** Read *Magnetic / Light / Heat response time* and the ratios *Light slower than magnetic by* and *Heat slower than magnetic by*. Use the trigger-to-application map to pick the right stimulus.
6. **Finish:** This is the last sub-calc — the **&rsaquo;** arrow is disabled.
