# Theory: Shape Memory Alloys (SMAs) & Nitinol Actuator Design

Shape Memory Alloys (SMAs), particularly Nitinol (Ni-Ti), are active materials capable of undergoing large reversible deformations. They are widely used in biomedical stents, aerospace morphing structures, and robotic actuators. This behavior is driven by a reversible solid-state phase transformation between a high-temperature parent phase (Austenite) and a low-temperature product phase (Martensite).

---

## 1. Martensite Phase Transformation (Sub-Calc A)

Nitinol transformation temperatures depend strongly on composition. A variation of just 0.1 at% in Nickel content can shift the transformation start temperature by about 10°C.
The Martensite Start temperature (M_s) can be estimated using the **Duerig Empirical Formula**:

<div align="center" style="font-size: 1.25em; font-weight: bold; margin: 15px 0;">M_s (°C) = 1020 - 99.3 × (at% Ni - 40.91)</div>

Other transformation boundaries are related to M_s by characteristic offsets:
* **M_f (Martensite Finish):** M_f = M_s - 20°C
* **A_s (Austenite Start):** A_s = M_s + 30°C
* **A_f (Austenite Finish):** A_f = A_s + 20°C

During heating, the Martensite phase fraction (x_M) transforms to Austenite according to a cosine kinetics profile:

<div align="center" style="font-size: 1.25em; font-weight: bold; margin: 15px 0;">x_M = 0.5 × cos[π × (T - A_s) / (A_f - A_s)] + 0.5 &nbsp;&nbsp;&nbsp;&nbsp; for A_s ≤ T ≤ A_f</div>

Where:
* x_M = 1.0 for T < A_s
* x_M = 0.0 for T > A_f

The recoverable shape memory strain (e_SMA) corresponds to the fraction of transformed martensite:

<div align="center" style="font-size: 1.25em; font-weight: bold; margin: 15px 0;">e_SMA = e_max × (1 - x_M)</div>

where e_max is the maximum lattice recovery strain (8% for NiTi).

<p align="center"><img src="images/subcalc_a.svg" alt="Martensite-austenite transformation hysteresis and recoverable strain" width="620"/></p>
<p align="center"><em>Figure 1: NiTi transforms between a low-temperature martensite and a high-temperature austenite; the heating (M&#8594;A) and cooling (A&#8594;M) branches form a hysteresis loop set by M_f, M_s, A_s, A_f, and the recoverable strain follows e_SMA = e_max(1 &#8722; x_M) (Sub-Calc A).</em></p>

---

## 2. Stress-Strain Behavior: SME vs Superelasticity (Sub-Calc B)

Operating temperatures relative to the Austenite Finish temperature (A_f) define the mechanical response:
* **T < A_f: Shape Memory Effect (SME).** Deforming the low-temperature martensite phase results in detwinning (apparent plastic strain). This strain (permanent set) is stable after unloading, but is completely recovered by heating the material above A_f to transform it back to austenite.
* **T > A_f: Superelasticity (SE).** Deforming the high-temperature austenite phase triggers stress-induced martensite (SIM) transformation. Unloading releases this unstable martensite, allowing the material to return completely to its original shape, forming a closed superelastic hysteresis loop.

The superelastic plateau stress (σ_AM) rises linearly with temperature above A_f according to the **Clausius-Clapeyron relation**:

<div align="center" style="font-size: 1.25em; font-weight: bold; margin: 15px 0;">σ_AM = σ_0 + (dσ/dT) × (T - A_f)</div>

Where:
* σ_0 = 150 MPa (base plateau stress at A_f).
* dσ/dT = 7 MPa/°C (stress-temperature phase boundary slope for NiTi).

The energy dissipated per volume during a full cycle is the area enclosed by the hysteresis loop:

<div align="center" style="font-size: 1.25em; font-weight: bold; margin: 15px 0;">W_hysteresis = ∫ σ de</div>

The damping capacity (Q<sup>-1</sup>) is evaluated as:

<div align="center" style="font-size: 1.25em; font-weight: bold; margin: 15px 0;">Q<sup>-1</sup> = W_hysteresis / (π × σ_max × e_max)</div>

Typical values: structural steel (Q<sup>-1</sup> ≈ 0.001), superelastic SMA (Q<sup>-1</sup> ≈ 0.052), and rubber (Q<sup>-1</sup> ≈ 0.1).

<p align="center"><img src="images/subcalc_b.svg" alt="Shape memory effect versus superelastic stress-strain response" width="620"/></p>
<p align="center"><em>Figure 2: Below A_f the alloy shows the shape-memory effect (residual strain recovered on heating); above A_f it is superelastic, tracing a closed stress-strain loop whose enclosed area is the dissipated energy W_hys (Sub-Calc B).</em></p>

---

## 3. Joule Heating & Electro-Thermal Actuation (Sub-Calc C)

Actuation is commonly triggered by electrical current. Joule heating generates heat, while convection cools the wire. The time-varying temperature (T) is described by a first-order thermal ODE:

<div align="center" style="font-size: 1.25em; font-weight: bold; margin: 15px 0;">dT/dt = [ I² × R(T) - h × A_surface × (T - T_amb) ] / (m × Cp)</div>

Where:
* **Current (I):** Applied electrical input.
* **Resistance (R):** Temperature-dependent electrical resistance. R(T) drops by ~20% during transition from Martensite to Austenite:
  <div align="center" style="font-weight: bold; margin: 5px 0;">R(T) = R_austenite + (R_martensite - R_austenite) × x_M(T)</div>
  where R_austenite = ρ_A × L / A_wire and R_martensite = ρ_M × L / A_wire.
* **Resistivity (ρ):** ρ_A = 82 × 10<sup>-8</sup> Ω·m, ρ_M = 100 × 10<sup>-8</sup> Ω·m.
* **Surface Area (A_surface):** π × d_w × L.
* **Cross-Section Area (A_wire):** π × d_w² / 4.
* **Convective Coefficient (h):** 25 W/(m²·°C).
* **Specific Heat (Cp):** 320 J/(kg·°C).
* **Mass (m):** ρ_density × A_wire × L (density ρ_density = 6450 kg/m³).

Integrating this ODE yields the activation time (t_act) required to heat the wire to A_f.

<p align="center"><img src="images/subcalc_c.svg" alt="Joule heating versus convective cooling and the activation time" width="620"/></p>
<p align="center"><em>Figure 3: Passing a current Joule-heats the wire while convection cools it; solving the first-order thermal ODE gives the temperature rise and the activation time t_act needed to reach A_f (Sub-Calc C).</em></p>

---

## 4. Actuator Stroke & Force Sizing (Sub-Calc D)

To size an SMA wire for a robotic gripper or actuator:
* **Stroke (d):** Linear contraction displacement:
  <div align="center" style="font-size: 1.25em; font-weight: bold; margin: 15px 0;">d = e_pre × L_wire</div>
  where e_pre is the applied pre-strain.
* **Blocking Force (F_block):** The maximum force developed by the wire when fully constrained:
  <div align="center" style="font-size: 1.25em; font-weight: bold; margin: 15px 0;">F_block = σ_recovery × A_wire</div>
  where σ_recovery = σ_AM at operating temperature.
* **Work Output (W):** Assuming a linear spring retraction:
  <div align="center" style="font-size: 1.25em; font-weight: bold; margin: 15px 0;">W = (F_block × d) / 2 &nbsp;&nbsp;&nbsp;&nbsp; (Joules)</div>
* **Specific Work (w_sp):**
  <div align="center" style="font-size: 1.25em; font-weight: bold; margin: 15px 0;">w_sp = W / m_wire &nbsp;&nbsp;&nbsp;&nbsp; (J/kg)</div>

Comparison: SMP actuators (5 J/kg), pneumatics (100 J/kg), hydraulics (1000 J/kg), and SMA wires (>1000 J/kg).

<p align="center"><img src="images/subcalc_d.svg" alt="Actuator stroke, blocking force and work output" width="620"/></p>
<p align="center"><em>Figure 4: On heating the wire contracts by a stroke d and can lift a load; the blocking force F_block and the force-displacement work W size the actuator and set its specific work (Sub-Calc D).</em></p>

---

## 5. Fatigue Life & Stability (Sub-Calc E)

Repeated thermomechanical cycles lead to functional degradation and structural fatigue.
The structural fatigue life (N_cycles) is governed by the **Coffin-Manson Fatigue Law**:

<div align="center" style="font-size: 1.25em; font-weight: bold; margin: 15px 0;">N_cycles = C / e_applied²</div>

where C = 1000 for standard Nitinol.
Functional fatigue results in a gradual loss of recoverable strain due to accumulated dislocation networks:

<div align="center" style="font-size: 1.25em; font-weight: bold; margin: 15px 0;">e_recoverable(N) = e_applied × exp(-0.00001 × N)</div>

For a target fatigue life of N > 100,000 cycles, the applied strain must be strictly limited.

<p align="center"><img src="images/subcalc_e.svg" alt="Structural and functional fatigue of Nitinol" width="620"/></p>
<p align="center"><em>Figure 5: Structural fatigue life falls steeply as 1/e&#178; (Coffin-Manson), while functional fatigue slowly erodes the recoverable strain with cycle count - both push the design toward a low applied strain (Sub-Calc E).</em></p>
