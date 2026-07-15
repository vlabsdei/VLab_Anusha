# Procedure: 4D Printing and Shape Memory Cycle

Welcome to the 4D Printing Virtual Laboratory. This lab guides you through the full thermomechanical programming and recovery cycle of Shape Memory Polymers (SMPs). Follow the step-by-step procedures below for the five sub-calculators.

---

## Sub-Calc A: Glass Transition & Viscoelasticity
**Objective:** Observe the transition from a glassy state to a rubbery state and calculate the temperature-dependent molecular relaxation shift factor log(a<sub>T</sub>).

1. **Select Base Material:** In the left sidebar, choose a base polymer preset (e.g., **PU-SMP**, **PLA-SMP**, or **PMMA-SMP**). Each has a unique Glass Transition Temperature (T<sub>g</sub>).
2. **Set Variables:** Adjust the **Heating Rate (°C/min)** and **Test Temperature (°C)** sliders.
3. **Initiate Cycle:** Click **Run Thermal Cycle**.
4. **Observe Kinetics:**
   * Watch the 3D viewport: polymer chains will transitions from rigid vibration (blue-grey) to wave-like writhing and high mobility (warm burgundy) as the temperature crosses T<sub>g</sub>.
   * Analyze the plots: the linked cursor tracks WLF log(a<sub>T</sub>) shift factor and DSC heat capacity inflection points in real-time.
5. **Record Results:** Observe the calculated WLF shift factor (a<sub>T</sub>) and the active thermal regime.
6. **Advance:** Click **Next Experiment ->** at the bottom right.

---

## Sub-Calc B: Viscoelastic Programming & Strain Fixity
**Objective:** Program a temporary shape by deforming the rubbery polymer and rapidly cooling it under stress to freeze the chain deformation.

1. **Deformation Temp:** Set the **Programming Temp (°C)** slider above the material's T<sub>g</sub>.
2. **Apply Stress:** Adjust the **Applied Stress (MPa)** slider (range: 0.5–4.0 MPa).
3. **Deformation Step:** Click **Run Creep Cycle**. The 3D specimen inside the UTM grips will stretch along the tensile axis and contract laterally (Poisson effect).
4. **Thermal Quenching:** Once stretching completes, click **Cool to Lock Shape**. The system will cool down, freezing the chains in their high-energy, aligned glassy conformation (specimen turns cool slate grey).
5. **Verify Fixity:** Observe the calculated **Strain Fixity Ratio (R<sub>f</sub>)** and the locked **Programmed Strain (&epsilon;<sub>u</sub>)**.
6. **Advance:** Click **Next Experiment ->**.

---

## Sub-Calc C: Thermodynamic Shape Recovery
**Objective:** Reheat the programmed specimen to activate molecular relaxation, observing shape recovery under free and constrained boundary conditions.

1. **Select Scenario:** Choose either **Free Recovery** (zero opposing load) or **Constrained Recovery** (opposing load &gt; 0).
2. **Set Opposing Load:** If Constrained, adjust the **Opposing Stress (MPa)** slider (range: 0.0–5.0 MPa).
3. **Set Actuation Variables:** Adjust the **Recovery Temp (°C)** and **Reference Relaxation Time &tau;<sub>ref</sub> (s)**.
4. **Run Actuation:** Click **Run Recovery Cycle**.
5. **Observe Retraction:**
   * In **Free Recovery**, the specimen fully recovers to its initial flat length.
   * In **Constrained Recovery**, the specimen retracts until it hits a solid constraint wall. Once blocked, a red stress-arrow grows at the contact point, representing the generated blocking recovery stress.
6. **Record Parameters:** Check the Shape Recovery Ratio (R<sub>r</sub>), blocking recovery stress, and timescale to 95% recovery (t<sub>95</sub>).
7. **Advance:** Click **Next Experiment ->**.

---

## Sub-Calc D: Multi-Shape Memory & Fox Equation
**Objective:** Explore complex multi-shape recovery profiles in copolymer blends using immiscible phase-separated and miscible morphology modes.

1. **Set Blend Fraction:** Use the weight fraction slider to adjust the PU polymer weight fraction w<sub>1</sub> (which dynamically calculates PMMA weight fraction w<sub>2</sub>).
2. **Select Morphology:** Toggle between **Triple-Shape Mode (Phase-Separated)** and **Dual-Shape Mode (Miscible Blend)**.
3. **Initiate Phase Transition:** Click **Run Cycle**.
4. **Observe Recovery Profile:**
   * In **Phase-Separated Mode**, the specimen starts as a double-bent S-curve. During heating, it releases in two distinct thermal stages (transitioning first to a single-bend U-bow shape as PU melts, then to a flat bar as PMMA melts), creating a distinct recovery strain plateau.
   * In **Miscible Blend Mode**, the specimen displays a single-stage, rapid recovery transition at a unified blend glass transition temperature (T<sub>g,blend</sub>).
5. **Advance:** Click **Next Experiment ->**.

---

## Sub-Calc E: Thermodynamics & Efficiency
**Objective:** Quantify the thermodynamic energy budget (stored elastic energy, heat input, mechanical work output, and efficiency) of a shape memory actuator.

1. **Setup Actuator Dimensions:** Adjust the **Muscle Length (cm)** and **Muscle Thickness (cm)** sliders.
2. **Set Thermal Properties:** Adjust the **Specific Heat Capacity (C<sub>p</sub>)** and **Material Density (&rho;)** sliders.
3. **Trigger Actuation:** Click **Run Load Cycle**.
4. **Observe Output:** Watch the 3D actuator heat up to trigger temperature (45°C), lift a mechanical load block, and perform work.
5. **Record Energy Budget:** Note the output values in the results panel:
   * **Programmed Stored Energy (U<sub>stored</sub>)**
   * **Thermal Trigger Heat Input (Q)**
   * **Mechanical Work Output (W)**
   * **Thermodynamic Efficiency (&eta;)**
