# Procedure: Shape Memory Polymer Thermomechanical Cycle

The five sub-calculators below take a shape memory polymer through one full cycle: transition, programming, recovery, multi-shape behaviour, and actuation. Each panel is gated. Set your parameters first, then press **Start Experiment** on the viewport before the controls unlock. The material you pick and the strain you program carry forward from one sub-calc to the next, so work through them in order.

---

## Sub-Calc A: Glass Transition & Viscoelasticity
**Objective:** Heat a polymer through T<sub>g</sub> and read the WLF shift factor log(a<sub>T</sub>), the viscosity ratio a<sub>T</sub>, and the DSC heat-capacity step.

1. Under **Material Structure**, pick a base polymer: **PU-SMP** (T<sub>g</sub> = 45&deg;C), **PLA-SMP** (60&deg;C), or **PMMA-SMP** (105&deg;C). Your choice is remembered by the later sub-calcs.
2. Set the two sliders under **Simulation Variables** - **Heating Rate (&deg;C/min)** (1-20) sets how fast the ramp animates, and **Test Temperature (&deg;C)** picks the endpoint the run heats toward. The temperature range auto-rescales to [T<sub>g</sub>-20, T<sub>g</sub>+40] for the selected material.
3. Press **Run Thermal Cycle**. The molecular viewport ramps from the glassy baseline up to your target temperature.
4. Watch the chains. Below T<sub>g</sub> they only vibrate in place (slate grey); once past T<sub>g</sub> they writhe and drift, and the colour warms toward rust as mobility climbs.
5. Read the linked plots. The WLF curve tracks log(a<sub>T</sub>) (undefined in the shaded glassy zone) and the lower panel shows the C<sub>p</sub> sigmoid with its inflection sitting on T<sub>g</sub>.
6. In the **Readouts** card, note log(a<sub>T</sub>), the viscosity ratio a<sub>T</sub>, the active regime, and &Delta;T from T<sub>g</sub>. The bio-suitability table rates each material against 37&deg;C body actuation.
7. Use the next-step control in the left rail (or the link that appears once the run finishes) to move on to Sub-Calc B.

---

## Sub-Calc B: Strain Fixity
**Objective:** Program a temporary shape by loading the rubbery polymer, cooling under stress, and unloading, then read the strain fixity ratio R<sub>f</sub>.

1. Confirm the inherited material in the **Active Material** card. Its T<sub>g</sub>, crystallinity limit X<sub>c</sub>, and rubbery modulus E<sub>r</sub> are carried over from Sub-Calc A.
2. Set the programming temperature. Either tap a **Programming Temp Preset** (**T<sub>g</sub> + 10&deg;**, **+ 30&deg;**, or **+ 60&deg;**) or drag the **Programming Temp (&deg;C)** slider directly.
3. Adjust **Applied Stress &sigma; (MPa)** (0.5-4.0) and the **Cooling Rate (&deg;C/min)** (5-30).
4. Press **Execute Programming Cycle**. The run steps through three phases by itself: tensile loading at the rubbery modulus, cooling and quenching under held stress, then unloading. The specimen in the UTM grips stretches, changes colour as it freezes, and locks the deformation.
5. Track the stress-strain loop on the upper plot and the R<sub>f</sub> saturating curve on the lower one. The current programming margin sits as a dot on that curve, with the X<sub>c</sub> ceiling drawn as a dashed asymptote.
6. Read **Max loading strain &epsilon;<sub>load</sub>**, **Fixed strain &epsilon;<sub>u</sub>**, and **Shape fixity ratio R<sub>f</sub>** from the readouts. The fixed strain &epsilon;<sub>u</sub> is what Sub-Calc C inherits.
7. Advance to Sub-Calc C.

---

## Sub-Calc C: Shape Recovery
**Objective:** Reheat the programmed specimen and measure the relaxation time, recovery ratio, blocking stress, and t<sub>95</sub> under free and constrained conditions.

1. Check the inherited **Active Material** and **Programmed Strain &epsilon;<sub>u</sub>** cards at the top of the controls.
2. Under **Recovery Scenario**, choose **Free Recovery** (no opposing load) or **Constrained**. Selecting Constrained reveals the **Opposing Load &sigma;<sub>opp</sub> (MPa)** slider (0.1-2.0), whose upper cap is limited so the equilibrium strain never exceeds &epsilon;<sub>u</sub>.
3. Set **Recovery Temp (&deg;C)** (must be above T<sub>g</sub> for anything to move) and the **Reference Time &tau;<sub>ref</sub> (s)** (100-2000).
4. Press **Initiate Heating Cycle**.
5. Watch the retraction. In free recovery the specimen relaxes all the way back to its flat length; under constraint it retracts to the wall, and a red arrow grows to show the blocking recovery stress.
6. The plot overlays the free (dashed) and constrained (solid) exponential recovery curves; a tracer dot follows the active one. Read **Relaxation time &tau;**, **Shape recovery ratio R<sub>r</sub>**, **Generated recovery stress**, and **Time to 95% recovery t<sub>95</sub>**.
7. Advance to Sub-Calc D.

---

## Sub-Calc D: Multi-Shape Memory & the Fox Equation
**Objective:** Compare triple-shape recovery in a phase-separated blend against dual-shape recovery in a miscible blend.

1. Set the **PU / PMMA Blend Ratio** slider (0-100). The labels update the PU and PMMA weight fractions; sliding right raises the PMMA content w<sub>2</sub>.
2. Pick a **Shape Memory Mode**: **Triple-Shape (phase-separated, T<sub>g1</sub>=45&deg;C, T<sub>g2</sub>=90&deg;C)** keeps two separate domain transitions; **Dual-Shape (miscible blend)** collapses them into a single Fox-equation T<sub>g</sub>.
3. Press **Initiate Heating Cycle**.
4. Watch the specimen recover. In phase-separated mode it releases in two stages: the S-curve relaxes to a single U-bow when the PU domain melts at T<sub>g1</sub>, then flattens completely once PMMA melts at T<sub>g2</sub>, leaving a clear strain plateau. In miscible mode it recovers in one sharp step at T<sub>g,blend</sub>.
5. The strain-versus-temperature plot shows the staircase (immiscible) or single drop (miscible); the sequence-verification table flags each stage as locked, active, or complete.
6. Read **w<sub>1</sub>**, **w<sub>2</sub>**, the **Calculated T<sub>g</sub> (Fox eq.)**, and the observed recovery count. Advance to Sub-Calc E.

---

## Sub-Calc E: Actuation Energy & Efficiency
**Objective:** Size an SMP muscle and compute its stored energy, trigger heat, work output, and thermal efficiency.

1. Set the geometry and material sliders: **Length (cm)** (1-20), **Thickness (cm)** (0.1-2.0), **Density (g/cm&sup3;)** (0.5-2.0), and **Specific Heat C<sub>p</sub> (J/g&deg;C)** (0.5-3.0). The specimen width is fixed at 2.0 cm.
2. The fixed **Material & Thermal Constants** are listed in the panel: E<sub>rubbery</sub> = 15 MPa, &epsilon;<sub>u</sub> = 100%, &sigma;<sub>recovery</sub> = 1.5 MPa, T<sub>ambient</sub> = 20&deg;C, T<sub>recovery</sub> = 45&deg;C, so &Delta;T = 25&deg;C.
3. Press **Trigger Thermodynamic Actuation**. The muscle heats from 20&deg;C to 45&deg;C, contracts its recovery stroke, and drives the load block through the piston.
4. Follow the energy-balance panel as it fills in geometry, U<sub>stored</sub>, Q, W, and &eta; one line at a time, and watch the live temperature and recovered-strain readouts.
5. Record the final **Energy stored U<sub>stored</sub>**, **Thermal energy to trigger Q**, **Mechanical work output W**, and **Overall thermal efficiency &eta;**, typically a low single-digit percentage for an SMP.
