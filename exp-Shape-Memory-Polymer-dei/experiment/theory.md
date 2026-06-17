# Theory: 4D Printing & Viscoelastic Shape Memory Polymers

## 1. Introduction to 4D Printing
4D Printing is an additive manufacturing paradigm where a 3D-printed structure can alter its geometry, properties, or functionality over time in response to an external stimulus (such as heat, humidity, light, or magnetic fields). The "fourth dimension" represents this dynamic, autonomous shape transformation. In thermal 4D printing, shape-change is programmed into a **Shape Memory Polymer (SMP)** matrix.

---

## 2. Shape Memory Polymers (SMPs)
SMPs are active materials capable of "remembering" a primary, permanent shape. They can be deformed into a secondary, temporary shape under stress, locked in that state by cooling, and subsequently triggered by reheating to recover their original, permanent shape. This cycle relies on a dual-segment network:
1. **Netpoints (Crosslinks):** Determine the permanent shape and provide the entropic elastic restoring force.
2. **Switching Segments:** Undergo a thermal transition (T<sub>g</sub>) allowing chains to become mobile or rigid.

---

## 3. Viscoelasticity and WLF Shift Factor (Sub-Calc A)
The mechanical response of SMPs is highly time-temperature dependent. The transition from a hard, glassy state to a soft, rubbery state occurs at the **Glass Transition Temperature (T<sub>g</sub>)**:
* **Below T<sub>g</sub>:** Segmental chain motion is frozen, and the material exhibits high elastic modulus (E<sub>glassy</sub> &sim; 1.5–3 GPa).
* **Above T<sub>g</sub>:** Thermal activation increases chain mobility, causing the modulus to drop by several orders of magnitude into a compliant rubbery state (E<sub>rubbery</sub> &sim; 15–30 MPa).

The relationship between temperature T and molecular relaxation time shift factor a<sub>T</sub> is governed by the **Williams-Landel-Ferry (WLF) Equation**:

<div align="center" style="font-size: 1.1em; font-weight: bold;">log(a<sub>T</sub>) = -C<sub>1</sub>(T - T<sub>g</sub>) / (C<sub>2</sub> + (T - T<sub>g</sub>)) &nbsp;&nbsp; for T &ge; T<sub>g</sub></div>

Where:
* a<sub>T</sub> = &tau;(T) / &tau;(T<sub>g</sub>) is the shift factor (viscosity ratio).
* C<sub>1</sub> = 17.44 and C<sub>2</sub> = 51.6 K are material empirical constants.
* For glassy temperatures (T &lt; T<sub>g</sub>), the relaxation time is considered infinite (glassy zone).

---

## 4. Programming Cycle and Strain Fixity (Sub-Calc B)
During the programming stage, the polymer is heated above T<sub>g</sub> to its rubbery state, stretched under applied stress &sigma;<sub>applied</sub>, and cooled down to freeze the deformation.

* **Loading Strain (&epsilon;<sub>load</sub>):** Under rubbery equilibrium, the loading strain is calculated as:
  <div align="center" style="font-size: 1.1em; font-weight: bold;">&epsilon;<sub>load</sub> = (&sigma;<sub>applied</sub> / E<sub>rubbery</sub>) &times; 100%</div>

* **Strain Fixity Ratio (R<sub>f</sub>):** Quantifies the material's ability to retain the programmed deformation after the stress is removed. It is modeled using a crystallization-kinetics-based saturating exponential:
  <div align="center" style="font-size: 1.1em; font-weight: bold;">R<sub>f</sub> = X<sub>c</sub> &times; [1 - exp(-(T<sub>prog</sub> - T<sub>g</sub>) / 10)] &times; 100% &nbsp;&nbsp; for T<sub>prog</sub> &ge; T<sub>g</sub></div>
  where X<sub>c</sub> is the maximum crystallinity limit (0.85 for PU, 0.70 for PLA, and 0.60 for PMMA).

* **Programmed Strain (&epsilon;<sub>u</sub>):** The resulting temporary shape strain is:
  <div align="center" style="font-size: 1.1em; font-weight: bold;">&epsilon;<sub>u</sub> = &epsilon;<sub>load</sub> &times; R<sub>f</sub></div>

---

## 5. Shape Recovery Kinetics and Opposing Stress (Sub-Calc C)
Reheating the polymer triggers relaxation. Depending on the loading conditions, recovery falls into two regimes:
* **Free Recovery (&sigma;<sub>opp</sub> = 0):** The specimen fully retracts to its original strain (&epsilon;<sub>eq</sub> = 0).
* **Constrained Recovery (&sigma;<sub>opp</sub> &gt; 0):** Recovery is blocked by an opposing stress, resulting in a non-zero final strain:
  <div align="center" style="font-size: 1.1em; font-weight: bold;">&epsilon;<sub>eq</sub> = max(0, &epsilon;<sub>u</sub> - (&sigma;<sub>opp</sub> / E<sub>rubbery</sub>) &times; 100%)</div>

* **Shape Recovery Ratio (R<sub>r</sub>):**
  <div align="center" style="font-size: 1.1em; font-weight: bold;">R<sub>r</sub> = (1 - &epsilon;<sub>eq</sub> / &epsilon;<sub>u</sub>) &times; 100%</div>

* **Blocking Recovery Stress (&sigma;<sub>recovery</sub>):** The stress generated against the constraint at equilibrium:
  <div align="center" style="font-size: 1.1em; font-weight: bold;">&sigma;<sub>recovery</sub> = E<sub>rubbery</sub> &times; (&epsilon;<sub>u</sub> - &epsilon;<sub>eq</sub>) / 100 &nbsp;&nbsp; (capped at &sigma;<sub>opp</sub>)</div>

* **Kinetics and Recovery Timescale (t<sub>95</sub>):**
  The first-order relaxation time is &tau;(T) = &tau;<sub>ref</sub> &times; a<sub>T</sub>. The time required to achieve 95% of the possible shape recovery is:
  <div align="center" style="font-size: 1.1em; font-weight: bold;">t<sub>95</sub> = &tau;(T) ln(20)</div>

---

## 6. Multi-Shape Memory and Fox Equation (Sub-Calc D)
Copolymers containing phase-separated domains can memorize multiple temporary shapes:
* **Phase-Separated (Immiscible Blend):** Contains distinct domains of PU (T<sub>g1</sub> = 45&deg;C) and PMMA (T<sub>g2</sub> = 90&deg;C). 
  During heating, the first transition release results in a partial strain plateau:
  <div align="center" style="font-size: 1.1em; font-weight: bold;">&epsilon;<sub>intermediate</sub> = &epsilon;<sub>total</sub> &times; w<sub>1</sub> &times; E<sub>g1,rubbery</sub> / (E<sub>g1,rubbery</sub> + w<sub>2</sub> &times; E<sub>g2,glassy,eff</sub>)</div>
  where E<sub>g1,rubbery</sub> = 15 MPa and E<sub>g2,glassy,eff</sub> = 7.5 MPa represent soft/hard phase moduli, and w<sub>1</sub> is the PU weight fraction.
* **Miscible Blend:** Forms a single phase with a single transition temperature T<sub>g,blend</sub> defined by the **Fox Equation**:
  <div align="center" style="font-size: 1.1em; font-weight: bold;">1 / T<sub>g,blend</sub> = w<sub>1</sub> / (T<sub>g1</sub> + 273.15) + w<sub>2</sub> / (T<sub>g2</sub> + 273.15) &nbsp;&nbsp; (temperatures in Kelvin)</div>

---

## 7. Thermodynamics and Efficiency (Sub-Calc E)
To actuate against a load, the polymer converts thermal heat input Q into mechanical work output W.
* **Unit Equivalence:** 1 MPa = 1 J/cm<sup>3</sup> &rArr; MPa &times; cm<sup>3</sup> = Joules.
* **Stored Elastic Energy (U<sub>stored</sub>):** The mechanical energy stored during programming:
  <div align="center" style="font-size: 1.1em; font-weight: bold;">U<sub>stored</sub> = (1/2) &times; E<sub>rubbery</sub> &times; &epsilon;<sub>u</sub><sup>2</sup> &times; V</div>
* **Thermal Trigger Heat (Q):** The heat energy required to raise the material's temperature by &Delta;T = 25&deg;C:
  <div align="center" style="font-size: 1.1em; font-weight: bold;">Q = m &times; C<sub>p</sub> &times; &Delta;T</div>
* **Mechanical Work Output (W):** The work done against the recovery stress:
  <div align="center" style="font-size: 1.1em; font-weight: bold;">W = &sigma;<sub>recovery</sub> &times; &Delta;&epsilon; &times; V</div>
* **Thermodynamic Efficiency (&eta;):**
  <div align="center" style="font-size: 1.1em; font-weight: bold;">&eta; = (W / Q) &times; 100%</div>
  Due to the high sensible heat capacity (C<sub>p</sub>) of polymers relative to their elastic strain energy capacity, the thermal-to-mechanical conversion efficiency is typically low (&eta; &sim; 1–4%).
