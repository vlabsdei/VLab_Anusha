# Theory: Integrated 4D Design Review

## 1. What a Design Review Adds to 4D Printing
The earlier experiments each isolated one physics of a shape-changing part: the glass transition, the bilayer bend, the bioprinting window. A real project can't stop there. Before a 4D-printed structure ships you have to answer five blunt engineering questions in sequence: *which material, does the transformation actually verify, is it worth the energy, does it scale, and is it ready?* This capstone is that review. Each sub-calc is a decision gate, and several deliberately inherit numbers from earlier experiments (SMP recovery ratio R<sub>r</sub> from Exp 1, the Timoshenko bilayer from Exp 2, the bioprinting constraints from Exp 7) so the review closes the loop rather than starting from scratch.

---

## 2. Design as a Chain of Contradictions
No stage is decided in isolation. A material that wins on recovery stress loses on stiffness; a transformation that verifies at small strain fails at large strain; a free trigger that saves energy carries a biocompatibility risk. The review is honest about these trade-offs: every sub-calc surfaces a *contradiction* it can't fully resolve, and the final TRL assessment traces each application's readiness barrier back to the specific sub-calc that owns that contradiction.

---

## 3. Ashby Materials Selection (Sub-Calc A)
Five 4D-active materials, SMP-PLA, SMP-PU, SMA (NiTi), a PAA hydrogel, and PNIPAM, are scored on three performance indices, each written so that **larger is better**:

<div align="center" style="font-size: 1.1em; font-weight: bold;">M<sub>1</sub> = &radic;E / &rho; &nbsp;&nbsp; M<sub>2</sub> = &sigma;<sub>recovery</sub> / &rho; &nbsp;&nbsp; M<sub>3</sub> = &eta; &middot; E<sub>stored</sub> / Q<sub>trigger</sub></div>

M<sub>1</sub> is the classic bending-stiffness-per-mass index for a light actuator, M<sub>2</sub> the recovery (actuation) stress per unit mass, and M<sub>3</sub> the thermal-trigger efficiency. Because the three indices span many orders of magnitude, each is min-max normalized across the five candidates to a common [0,1] scale:

<div align="center" style="font-size: 1.1em; font-weight: bold;">M&#770;<sub>i</sub> = (M<sub>i</sub> &minus; M<sub>min</sub>) / (M<sub>max</sub> &minus; M<sub>min</sub>)</div>

The application enters through three weights, which the tool auto-normalizes so they sum to one:

<div align="center" style="font-size: 1.1em; font-weight: bold;">M<sub>total</sub> = w<sub>1</sub>&middot;M&#770;<sub>1</sub> + w<sub>2</sub>&middot;M&#770;<sub>2</sub> + w<sub>3</sub>&middot;M&#770;<sub>3</sub></div>

The key result: the winner is a function of the weighting, not of the material. Weight recovery stress and NiTi wins the stent; weight stiffness and SMP-PLA wins the gripper. The linear weighted sum ignores property correlations (stiff often means brittle), so it's a *screening* tool, not the final word.

<p align="center"><img src="images/subcalc_a.svg" alt="Ashby chart of stiffness index versus recovery index for five 4D-active materials" width="620"/></p>
<p align="center"><em>Figure 1: The Ashby map of M<sub>1</sub> = &radic;E/&rho; against M<sub>2</sub> = &sigma;<sub>recovery</sub>/&rho;: NiTi dominates recovery, the SMPs dominate stiffness-per-mass, and the weighted winner slides between them with the application (Sub-Calc A).</em></p>

---

## 4. Transformation Verification (Sub-Calc B)
Design intent is a target radius R, giving a predicted curvature

<div align="center" style="font-size: 1.1em; font-weight: bold;">&kappa;<sub>pred</sub> = 1 / R</div>

The finite-strain simulation returns a different curvature &kappa;<sub>sim</sub>, and verification is the comparison of the two through a shape error with a hard acceptance band:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&epsilon;<sub>shape</sub> = |&kappa;<sub>sim</sub> &minus; &kappa;<sub>pred</sub>| / &kappa;<sub>pred</sub> &times; 100 % &nbsp;&nbsp; (ACCEPT if &epsilon;<sub>shape</sub> &lt; 10 %)</div>

The inherited **Timoshenko bilayer** (Exp 2) gives the small-strain curvature from the mismatch strain &Delta;&epsilon;, thickness ratio m = h<sub>1</sub>/h<sub>2</sub>, and modulus ratio n = E<sub>1</sub>/E<sub>2</sub>:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&kappa; = 6&Delta;&epsilon;(1 + m)<sup>2</sup> / (h &middot; &phi;), &nbsp;&nbsp; &phi; = 3(1 + m)<sup>2</sup> + (1 + mn)(m<sup>2</sup> + 1/(mn))</div>

which the tool inverts to back-solve the total thickness h. Because Timoshenko is linear (&kappa; &prop; &Delta;&epsilon;), &kappa;<sub>sim</sub> pulls away from &kappa;<sub>pred</sub> as &Delta;&epsilon; grows or as m,n leave the calibrated band. The alternative **SMP-recovery** source (Exp 7) instead scales &kappa;<sub>sim</sub> by the inherited recovery ratio R<sub>r</sub> = 92 %: incomplete recovery drags the simulated curvature below target while finite strain overshoots, and the two compete. When the gate fails, the module reports the dominant culprit term.

<p align="center"><img src="images/subcalc_b.svg" alt="Shape error versus mismatch strain with a ten percent acceptance band" width="620"/></p>
<p align="center"><em>Figure 2: Shape error &epsilon;<sub>shape</sub> climbing with mismatch strain &Delta;&epsilon;; below the 10 % line the folded &kappa;<sub>sim</sub> matches the &kappa;<sub>pred</sub> = 1/R target and the part is accepted (Sub-Calc B).</em></p>

---

## 5. Lifecycle Energy Budget (Sub-Calc C)
A 4D part is printed once and cycled many times; a conventional part is moulded once and driven by a powered actuator every cycle. The three 4D terms are:

<div align="center" style="font-size: 1.1em; font-weight: bold;">E<sub>print</sub> = P &middot; t<sub>print</sub>, &nbsp;&nbsp; E<sub>program</sub> = m&middot;C<sub>p</sub>&middot;&Delta;T, &nbsp;&nbsp; E<sub>trigger</sub> per cycle</div>

with C<sub>p</sub> = 1800 J/(kg&middot;K) and &Delta;T = 35 K for PLA. The trigger term is the decisive contradiction: body-heat &asymp; 0 J, Joule/SMA I&sup2;Rt &asymp; 200 J, photo/magnetic Q &asymp; 500 J per cycle. Over N cycles the two routes are:

<div align="center" style="font-size: 1.1em; font-weight: bold;">E<sub>4D</sub>(N) = E<sub>print</sub> + E<sub>program</sub> + E<sub>trigger</sub>&middot;N &nbsp;&nbsp; vs &nbsp;&nbsp; E<sub>conv</sub>(N) = E<sub>mould</sub> + E<sub>actuator</sub>&middot;N</div>

with E<sub>actuator</sub> = 100 J/cycle. Setting the two equal gives the break-even cycle count:

<div align="center" style="font-size: 1.1em; font-weight: bold;">N<sub>break</sub> = (E<sub>mould</sub> &minus; E<sub>print</sub> &minus; E<sub>program</sub>) / (E<sub>trigger</sub> &minus; E<sub>actuator</sub>)</div>

If E<sub>trigger</sub> &lt; E<sub>actuator</sub>, the body-heat case, the 4D line never gets overtaken and 4D wins for every N. That free biological trigger is why body-temperature SMPs are so compelling in biomedicine.

<p align="center"><img src="images/subcalc_c.svg" alt="Lifecycle energy of the 4D and conventional routes crossing at a break-even cycle count" width="620"/></p>
<p align="center"><em>Figure 3: Lifecycle energy versus actuation cycles N: a per-cycle trigger cost lets the moulded-plus-actuator route catch the 4D part at N<sub>break</sub>, unless the trigger is free (Sub-Calc C).</em></p>

---

## 6. Manufacturing Scalability (Sub-Calc D)
Additive manufacturing has no tooling cost but no economy of scale, so its cost per part is flat, while injection moulding amortizes a large fixed mould over the run. The print time follows the volumetric FDM rate (&asymp; 4 mm&sup3;/s):

<div align="center" style="font-size: 1.1em; font-weight: bold;">t<sub>print</sub> = V<sub>part</sub> / (A<sub>layer</sub>&middot;v<sub>print</sub>&middot;h<sub>layer</sub>)</div>

<div align="center" style="font-size: 1.1em; font-weight: bold;">C<sub>4D</sub> = rate&middot;t<sub>print</sub> + C<sub>material</sub> &nbsp;&nbsp; (flat), &nbsp;&nbsp; C<sub>inj</sub>(N) = C<sub>mould</sub>/N + C<sub>marginal</sub></div>

with the material price at $0.025/g and the injection marginal cost (material + labour) lumped at $0.40/part. The two cost curves cross at:

<div align="center" style="font-size: 1.1em; font-weight: bold;">N<sub>break</sub> = C<sub>mould</sub> / (C<sub>4D</sub> &minus; C<sub>marginal</sub>)</div>

Below N<sub>break</sub>, customised low-volume work belongs to 4D-printing; above it, moulding wins on unit cost. This crossover, not any physics of the material, is what keeps mass-market 4D goods stuck at a low readiness level.

<p align="center"><img src="images/subcalc_d.svg" alt="Flat 4D cost per part crossing the falling injection-moulding cost at a break-even volume" width="620"/></p>
<p align="center"><em>Figure 4: Cost per part versus production volume: flat for 4D-printing, falling as C<sub>mould</sub>/N for moulding, crossing at the volume where the two manufacturing routes swap places (Sub-Calc D).</em></p>

---

## 7. Technology Readiness Assessment (Sub-Calc E)
The final gate is qualitative. Each application is placed on the NASA/ISRO **Technology Readiness Level** ladder, grouped into three bands: TRL 1-3 basic principles and analytical proof, TRL 4-6 lab-to-relevant-environment validation, and TRL 7-9 system prototype through flight-proven operation. The four review applications sit at:

<div align="center" style="font-size: 1.1em; font-weight: bold;">Biomedical stent TRL 6 &nbsp;&middot;&nbsp; Aerospace morphing TRL 5 &nbsp;&middot;&nbsp; Soft robotics TRL 4 &nbsp;&middot;&nbsp; Consumer 4D goods TRL 3</div>

Each barrier to the next rung traces to an earlier contradiction: the stent's in-vivo uncertainty to the Sub-Calc B shape-error gate and the Exp 7 shear-kill window, consumer goods to the Sub-Calc D scalability crossover, soft robotics to the Sub-Calc A trigger mechanism and cyclic repeatability. TRL is a contested, self-assessed scale, so it's cited as a reference position rather than a measured fact.

<p align="center"><img src="images/subcalc_e.svg" alt="TRL ladder from one to nine with four 4D applications placed on their current rungs" width="620"/></p>
<p align="center"><em>Figure 5: The TRL 1-9 ladder with each application on its current rung and the barrier blocking the next step, the review's closing judgement on whether the technology is ready (Sub-Calc E).</em></p>

---

## 8. Time and Volume Close the 4D Case

The final review integrates every earlier experiment over the life of the product. Lifecycle energy is a
running sum, E<sub>4D</sub>(N) = E<sub>print</sub> + E<sub>program</sub> + E<sub>trigger</sub>&middot;N,
weighed against a conventional route with a break-even at N<sub>break</sub>; cost follows the same shape.
The fourth dimension here's scale: the technology only pays off across enough transformation cycles N and
enough production volume, so "does it transform" has to become "does it transform economically, at a fleet
level, for its whole service life."

<div align="center" style="font-size: 1.1em; font-weight: bold;">design is ACCEPTED only if  &epsilon;<sub>shape</sub> = |&kappa;<sub>sim</sub> &minus; &kappa;<sub>pred</sub>|/&kappa;<sub>pred</sub> &times; 100% &lt; 10%</div>

**Selection and maturity.** The Ashby indices M<sub>1</sub> = &radic;E/&rho;, M<sub>2</sub> =
&sigma;<sub>recovery</sub>/&rho;, M<sub>3</sub> = &eta;E<sub>stored</sub>/Q<sub>trigger</sub> rank candidate
materials, while the TRL ladder places maturity honestly: a self-deploying stent near TRL 6, consumer 4D
goods nearer TRL 3. The review is allowed to reject.

**Bench bridge.** The Young's modulus E that feeds the stiffness index M<sub>1</sub> = &radic;E/&rho; is
measured in the Strength of Materials *beam-deflection / Young's modulus* experiment (IARE), E =
WL&sup3;/48&delta;I. Mapped page in `screenshots_references/`.
