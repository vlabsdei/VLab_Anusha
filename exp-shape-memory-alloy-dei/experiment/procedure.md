# Procedure: Shape Memory Alloy Instrument Lab

This is the Shape Memory Alloys bench of the 4D Printing Virtual Laboratory. Each sub-calculator is a working lab instrument for Nitinol (NiTi). Set the parameters, click **Start Experiment** on the viewport to arm the rig, then run the cycle. Work through the five stations in order below.

---

## Sub-Calc A: DSC Machine (Differential Scanning Calorimetry)
**Objective:** Read the four transformation temperatures off the heat-flow trace and watch the martensite fraction x<sub>M</sub> collapse as the Nitinol wire recovers its printed shape.

1. **Arm the stage:** Click **Start Experiment** on the 3D viewport to release the controls.
2. **Set composition:** Drag the **Nickel Content (at%)** slider (50.5-51.5 at%). This drives the Duerig formula for M<sub>s</sub>, so every transformation temperature shifts with it.
3. **Pick a soak temperature:** Set the **Test Temperature (&deg;C)** slider anywhere from &minus;40 to 100 &deg;C.
4. **Run the scan:** Click **Initiate Thermal Cycle**. The stage ramps from &minus;20 &deg;C up to your target while the heater platen and coil grooves glow.
5. **Read the trace:** The rust curve is the endothermic heating scan, the navy curve the exothermic cooling scan, and the shaded band marks the hysteresis window. The amber marker rides the active temperature.
6. **Record results:** Note M<sub>s</sub>, M<sub>f</sub>, A<sub>s</sub>, A<sub>f</sub>, the hysteresis A<sub>f</sub> &minus; M<sub>s</sub>, the phase fractions x<sub>M</sub> / x<sub>A</sub>, and the recoverable strain at A<sub>s</sub>+5/10/15 &deg;C.
7. **Advance** to the UTM station.

---

## Sub-Calc B: Universal Testing Machine (UTM)
**Objective:** Pull a Nitinol dog-bone coupon and compare the shape-memory-effect loop (cold) against the superelastic loop (hot), reading off plateau stress, dissipated work, and damping.

1. **Start Experiment** to arm the crosshead.
2. **Set the test temperature:** Use the **Test Temp relative to A<sub>f</sub> (T &minus; A<sub>f</sub>) (&deg;C)** slider (&minus;20 to +40). Negative values put the specimen below A<sub>f</sub> (Shape Memory Effect); zero or positive gives Superelasticity.
3. **Set the strain limit:** Drag **Applied Maximum Strain (%)** between 2 and 8 %.
4. **Run the test:** Click **Run Stress-Strain Test**. The crosshead loads the coupon to the strain limit, then unloads.
5. **Interpret the loop:** Below A<sub>f</sub> the specimen detwins and keeps a permanent set on unloading; above A<sub>f</sub> the stress-induced transformation closes the loop and the strain recovers fully.
6. **Record:** Operating regime, plateau stress &sigma;<sub>AM</sub>, max stress reached, energy dissipated W<sub>hyst</sub>, and the damping capacity Q<sup>&minus;1</sup> versus steel and rubber.
7. **Advance** to the bench supply.

---

## Sub-Calc C: Bench Power Supply & Thermocouple
**Objective:** Joule-heat a clamped Nitinol wire with a controlled current and measure how fast, and how hot, it drives the austenite transformation.

1. **Start Experiment** to arm the supply.
2. **Choose the wire:** Set **Wire Diameter (&micro;m)** (100-500). Thinner wire has more resistance and less thermal mass.
3. **Dial the current:** Set **Applied Current (I) (A)** between 0.10 and 1.50 A.
4. **Energise:** Click **Run Electrical Actuation**. The wire heats, transforms through A<sub>s</sub>-A<sub>f</sub>, and contracts against the bias spring while the temperature-time curve builds live.
5. **Watch the limits:** Dashed lines mark A<sub>s</sub> (48 &deg;C) and A<sub>f</sub> (68 &deg;C). If the steady-state temperature never clears A<sub>f</sub>, the readout flags "Never Actuates".
6. **Record:** Activation time t<sub>act</sub>, steady-state temperature T<sub>ss</sub>, the operational status (safe vs. >150 &deg;C oxidation risk), martensite/austenite resistances, and peak power.
7. **Advance** to the actuator rig.

---

## Sub-Calc D: Actuator Rig with Load Cell & Ruler
**Objective:** Size a wire actuator: turn a length, diameter, and pre-strain into a stroke, a blocking force, and a mass-specific work you can benchmark.

1. **Start Experiment** to arm the scissor gripper.
2. **Set the geometry:** Adjust **Wire Active Length (mm)** (50-500) and **Wire Diameter (&micro;m)** (100-500).
3. **Set the pre-strain:** Use **Applied Pre-Strain (%)** (1-6 %). This fixes the recoverable stroke.
4. **Run:** Click **Execute Actuator Sizing**. The heated wire contracts, closing the jaws onto the work-piece and loading the ruler-mounted load cell.
5. **Read the F-d line:** The force-stroke plot fills as the actuation progresses; area under it's the delivered work.
6. **Record:** Actuator stroke d, blocking force F<sub>block</sub>, mechanical work W, specific work w<sub>sp</sub>, and the comparison against SMP, pneumatic, and hydraulic actuators.
7. **Advance** to the fatigue rig.

---

## Sub-Calc E: Fatigue Testing Rig (Rotating Bending)
**Objective:** Spin an hourglass specimen under a fixed bending-strain amplitude and predict both its fracture life and its loss of recoverable strain.

1. **Start Experiment** to arm the R.R. Moore rig.
2. **Set the amplitude:** Drag **Applied Strain Amplitude (%)** (2-8 %). Higher amplitude drops the cycle life steeply.
3. **Run:** Click **Initiate Fatigue Cycling**. The specimen spins, the cycle counter climbs, and a crack initiates near 70 % of the predicted life before fracture.
4. **Read the S-N curve:** The log-scale plot shows N = C/&epsilon;<sup>2</sup>; the amber marker sits at your amplitude.
5. **Record:** Fatigue life N, design status (durable vs. low-cycle), recoverable strain remaining at 10 000 cycles, and the functional degradation loss.
6. The bench is complete. Review all five instrument readouts against the theory page.
