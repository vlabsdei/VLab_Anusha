# Procedure: Timoshenko Bimetal & Bilayer Actuator Design

This lab covers the mechanics of stimulus-responsive bilayer actuators, starting from the classic bimetal bending formula and moving through anisotropic swelling, print-path programming, diffusion timescales, and finally the useful work an actuator can deliver. Work through the five sub-calculators in order.

---

## Sub-Calc A: Timoshenko Bimetal Formula
**Objective:** Bend a bilayer cantilever with a thermal or moisture stimulus and read out its curvature, neutral-axis position, through-thickness stress, and stored strain energy.

1. **Pick a Solver Model:** From the **Solver Model** dropdown choose **Timoshenko (1925) - Linear**, or compare against **Suo & Hutchinson - Transformed Section**, **Nonlinear Elastica**, or **1D Euler-Bernoulli Beam FEM**.
2. **Assign Layers:** Set the **Active Layer (Top)** (e.g. 4D-Print PLA, T<sub>g</sub> = 55&deg;C) and **Passive Layer (Bottom)** (e.g. Standard PLA, E = 3.5 GPa).
3. **Set Geometry:** Adjust the **Active Thickness (h<sub>1</sub>)**, **Passive Thickness (h<sub>2</sub>)**, **Total Length (L)**, and **Beam Width (b)** sliders. The thickness ratio m = h<sub>1</sub>/h<sub>2</sub> drives the curvature.
4. **Choose the Stimulus:** Toggle **Thermal** or **Moisture**, then set the **Target Temp Change (&Delta;T)** (or **Relative Humidity Change &Delta;H**) and the **Stimulus Ramp Rate**.
5. **Run:** Click **Run Simulation**. Scrub the timeline to watch the cantilever bend and the bending-stress colour map develop across the thickness.
6. **Record:** Read the modulus ratio m, neutral axis y<sub>na</sub>, curvature &kappa;, tip angle, and strain energy from the readout table. Watch for the &kappa;L &gt; 0.3 warning that flags where the linear model breaks down.
7. **Advance:** Use the next-step control to move to Sub-Calc B.

---

## Sub-Calc B: Hygroscopic Swelling Model
**Objective:** Drive bending, and off-axis twist, with the anisotropic swelling of a cellulose-fibre layer.

1. **Solver Model:** Keep **Timoshenko (Linear)**, or check the result against **Nonlinear Elastica** / **FEM Validation**.
2. **Select Materials:** Choose the **Active Layer** (Cellulose NFC, A<sub>s</sub> = 7.0, or Wood Spruce, A<sub>s</sub> = 10.0) and a constrained **Passive Layer** (&beta; = 0). The anisotropy index A<sub>s</sub> = &beta;<sub>2</sub>/&beta;<sub>1</sub> is shown in the chips.
3. **Set Swelling:** Adjust **Moisture Uptake (&Delta;C<sub>target</sub>)** (0.05-0.50 g/g) and the **Fibre Orientation (&theta;<sub>f</sub>)** slider (0-90&deg;).
4. **Set Geometry:** Tune h<sub>1</sub>, h<sub>2</sub>, L, and b as in Sub-Calc A.
5. **Run:** Click **Run Simulation**. Toggle **Specimen Swelling** vs **Bilayer Bending** views. Push &theta;<sub>f</sub> toward 45&deg; and watch the coupon twist; return it to 0&deg; or 90&deg; for pure bending.
6. **Record:** Note &epsilon;<sub>&parallel;</sub>, &epsilon;<sub>&perp;</sub>, the anisotropy A<sub>s</sub>, curvature &kappa;, bend angle, and twist angle.
7. **Advance:** Move on to Sub-Calc C.

---

## Sub-Calc C: Print Path Programming & Anisotropy
**Objective:** Program bending, twisting, or a helix purely by choosing the FDM raster angle in each layer.

1. **Try a Preset:** Click a print-path preset: **0&deg;/90&deg; (Bend)**, **45&deg;/-45&deg; (Twist)**, **0&deg;/45&deg; (Helix)**, or **45&deg;/90&deg; (Helix)**.
2. **Fine-Tune Rasters:** Adjust **Top Layer Raster (&theta;<sub>top</sub>)** and **Bottom Layer Raster (&theta;<sub>bot</sub>)** sliders (&minus;90&deg; to 90&deg;). The material chips fix &alpha;<sub>&parallel;</sub> = 10&times;10<sup>&minus;6</sup>/K and &alpha;<sub>&perp;</sub> = 100&times;10<sup>&minus;6</sup>/K.
3. **Set Load:** Adjust the **Thermal Load (&Delta;T)** slider (0-100&deg;C).
4. **Simulate:** Click **Simulate Actuation**. The state label reports the deformation mode (pure cylindrical bending, pure twisting, or helical morphing).
5. **Record:** Read the effective CTEs &alpha;<sub>eff,top</sub> / &alpha;<sub>eff,bot</sub>, the curvature &kappa;, and the classified deformation mode.
6. **Advance:** Move on to Sub-Calc D.

---

## Sub-Calc D: Diffusion & Swelling Timescale
**Objective:** Show that moisture actuation is diffusion-limited and that response time scales with the square of layer thickness.

1. **Choose Active Material:** From the dropdown pick Cellulose (D = 5&times;10<sup>&minus;12</sup> m&sup2;/s), PVA Hydrogel, PNIPAM, or Hydrogel (D = 2&times;10<sup>&minus;10</sup> m&sup2;/s). The chips echo the diffusivity and a short description.
2. **Set Thickness:** Use a **Preset Thickness** button (0.2 / 0.5 / 1.0 mm) or the **Layer Thickness (L)** slider (0.1-2.0 mm).
3. **Simulate:** Click **Simulate Diffusion** and scrub the timeline to watch the concentration front penetrate the slab (Fourier time &tau; = Dt/L&sup2;).
4. **Record:** Read the characteristic time t<sub>diff</sub>, the time to 90% saturation t<sub>90</sub>, and the penetration depth.
5. **Compare:** Halve the thickness and confirm t<sub>90</sub> drops by roughly a factor of four.
6. **Advance:** Move on to Sub-Calc E.

---

## Sub-Calc E: Actuator Work & Blocking Force
**Objective:** Size a hygromorph and quantify its free deflection, blocking force, mechanical work, and energy density against SMA/SMP benchmarks.

1. **Set Materials:** Pick the **Active Layer** (Cellulose NFC / Wood Spruce) and **Passive Layer** (Cellulose Constrained / Standard PLA).
2. **Set Environment:** Use a **RH preset** (40 / 60 / 80% RH) or the **Target Humidity** slider. Relative humidity is converted to equilibrium moisture content internally.
3. **Set Geometry:** Adjust **Width b**, **Length L**, **Active Layer h<sub>1</sub>**, and **Passive Layer h<sub>2</sub>**.
4. **Simulate:** Click **Simulate Actuation**. Toggle **Show Free Deflection (ghost)** and **Show Force Vector** to see the actuator both unloaded and blocked against a rigid stop.
5. **Record:** Read the free-tip deflection, blocking force F, mechanical work W, and energy density; compare the energy density with the SMA (~1.0 J/cm&sup3;) and SMP (~0.1 J/cm&sup3;) reference bars.
