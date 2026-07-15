# Procedure: Shape Memory Alloys Virtual Laboratory

Welcome to the Shape Memory Alloys (SMAs) Virtual Laboratory. This lab guides you through phase transformations, superelastic mechanical behavior, electro-thermal Joule heating, actuator sizing, and fatigue life evaluation of Nitinol (NiTi) wires. Follow the procedures below for each sub-calculation.

---

## Sub-Calc A: Martensite Phase Transformation & Temperatures
**Objective:** Characterize composition-dependent phase transition temperatures and martensite fraction transformation kinetics.

1. **Adjust Composition:** Adjust the **Nickel Content (at%)** slider (range: 50.5–51.5 at%). Observe how small shifts in composition change the transformation start temperature (M_s).
2. **Observe Transformations:** Note the calculated phase transformation temperatures (M_s, M_f, A_s, A_f) and the hysteresis temperature window (A_f - M_s).
3. **Execute Cycle:** Click **Initiate Thermal Cycle** to heat the specimen.
4. **Observe Phase Fraction:** 
   * In the 3D viewport, watch the Nitinol wire transition from a low-temperature martensite phase (monoclinic lattice, blue color) to the high-temperature austenite phase (cubic lattice, red color).
   * Review the cosine transformation curve plotting Martensite Phase Fraction (x_M) vs Temperature.
5. **Record Recoverable Strain:** Observe the calculated recoverable strain (e_SMA) at three temperatures during recovery.
6. **Advance:** Click **Next Experiment ->** at the bottom right.

---

## Sub-Calc B: Stress-Strain Behavior: SME vs Superelasticity
**Objective:** Compare the mechanical stress-strain loop of Nitinol under Shape Memory and Superelasticity regimes.

1. **Set Test Temperature:** Adjust the **Test Temperature (T) relative to A_f** slider.
2. **Select Regime:**
   * **Below A_f (T < A_f):** Activates the Shape Memory Effect (SME) regime.
   * **Above A_f (T ≥ A_f):** Activates the Superelastic (SE) regime.
3. **Run Mechanical Test:** Click **Run Stress-Strain Test** to load the specimen to 8% strain and then unload it.
4. **Observe Hysteresis:**
   * Watch the UTM tensile test animation.
   * Below A_f, notice the permanent deformation (detwinning set) remaining after unloading.
   * Above A_f, watch the closed superelastic loop, showing full elastic strain recovery due to stress-induced martensite (SIM) transformation.
5. **Evaluate Damping:** Compare the calculated hysteresis loop energy dissipation (W_hysteresis) and damping capacity (Q<sup>-1</sup>) to steel and rubber references.
6. **Advance:** Click **Next Experiment ->**.

---

## Sub-Calc C: Joule Heating Actuation: Current & Activation Time
**Objective:** Solve the electro-thermal ODE to determine wire heating response, steady-state temperatures, and activation time (t_act).

1. **Set Actuator Parameters:** Adjust the **Wire Diameter (μm)** slider (range: 100–500 μm) and the **Applied Current (I) (A)** slider.
2. **Run Actuation:** Click **Run Electrical Actuation**.
3. **Observe Temperature Rise:**
   * The 3D viewport shows the SMA wire heating up and glowing as its temperature rises.
   * The live plot tracks Temperature vs Time, illustrating the exponential curve heading to steady state.
4. **Analyze Output:** Record the activation time (t_act) required to reach A_f and the steady-state temperature.
5. **Check Current Limits:** Varies the current and wire diameter to find the minimum current required for activation and the maximum current to stay safely below 150°C (oxidation limit).
6. **Advance:** Click **Next Experiment ->**.

---

## Sub-Calc D: SMA Wire Stroke & Blocking Force
**Objective:** Size a Nitinol wire actuator to meet stroke and force requirements for a soft robotic gripper.

1. **Set Sizing Parameters:** Adjust the **Wire Length (mm)**, **Wire Diameter (μm)**, and **Applied Pre-strain (%)** sliders.
2. **Initiate Actuation:** Click **Execute Actuator Sizing**.
3. **Observe Gripper Motion:** The 3D viewport shows the SMA wire contract under Joule heating, pulling the mechanical arm to close/deploy a robotic gripper finger.
4. **Evaluate Sizing:** Check the computed **Actuator Stroke (d)** and **Blocking Force (F_block)**.
5. **Analyze Actuator Density:** Note the mechanical work output (W) and specific work (w_sp). Compare the energy density to hydraulic, pneumatic, and shape memory polymer muscles.
6. **Advance:** Click **Next Experiment ->**.

---

## Sub-Calc E: Fatigue Life & Cycling Stability
**Objective:** Predict structural fatigue life using the Coffin-Manson relation and analyze functional strain degradation over cycling.

1. **Set Strain Amplitude:** Adjust the **Applied Strain Amplitude (%)** slider (range: 2% to 8%).
2. **Run Fatigue Cycle:** Click **Initiate Fatigue Cycling**.
3. **Analyze Life Bounds:**
   * The log-log scale plot verifies the Coffin-Manson fatigue relationship, illustrating the inverse power-law slope of -2.
   * Watch the cycle counter advance to the fatigue limit and check the degradation curve.
4. **Observe Degradation:** Note the calculated structural fatigue life (N_cycles) and the remaining recoverable strain (e_recoverable) after 10,000 cycles.
