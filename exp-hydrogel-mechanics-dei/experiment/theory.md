# Theory: Hydrogel Mechanics, Stimuli-Response & Soft Actuator Sizing

## 1. Introduction: Hydrogels as the Biological Interface of 4D Printing
A **hydrogel** is a three-dimensional crosslinked polymer network that absorbs and retains large volumes of water (often many times its dry mass) without dissolving. Because the degree of swelling can be programmed to respond to stimuli such as solvent quality, **pH**, and **temperature**, hydrogels are the natural "soft" branch of 4D printing: a flat printed sheet can be made to fold, bend, or expand on contact with a physiological environment. This experiment quantifies five physical principles that govern hydrogel behaviour, from the thermodynamics of swelling to the kinetics of drug release.

<p align="center"><img src="images/theory_overview.svg" alt="Overview of hydrogel mechanics" width="620"/></p>
<p align="center"><em>Figure 1: One crosslinked network probed under five stimuli - solvent quality, pH, temperature, crosslink density and time (Sub-Calc A-E).</em></p>

---

## 2. Flory-Rehner Swelling Equilibrium - The Self-Folding Gripper (Sub-Calc A)
When a dry crosslinked network is placed in a solvent, two opposing free-energy contributions compete:
* **Mixing** (favourable): polymer chains gain entropy by mixing with solvent, driving swelling.
* **Elastic retraction** (unfavourable): as chains stretch, the network develops an entropic restoring force that resists further swelling.

At equilibrium these balance. The **Flory-Rehner equation** sets the total osmotic pressure to zero:

<div align="center" style="font-size: 1.1em; font-weight: bold;">ln(1 - v<sub>p</sub>) + v<sub>p</sub> + &chi;&middot;v<sub>p</sub><sup>2</sup> + (V<sub>1</sub>/V<sub>e</sub>)&middot;(v<sub>p</sub><sup>1/3</sup> - v<sub>p</sub>/2) = 0</div>

Where:
* v<sub>p</sub> = polymer volume fraction at equilibrium (0 &lt; v<sub>p</sub> &le; 1).
* &chi; = Flory-Huggins polymer-solvent interaction parameter.
* V<sub>1</sub> = molar volume of solvent (water &asymp; 18 cm<sup>3</sup>/mol).
* V<sub>e</sub> = molar volume of network strand between crosslinks (a measure of crosslink density: small V<sub>e</sub> &rArr; tight network).

The first three terms come from the **mixing** free energy; the last term is the **elastic** contribution. The **equilibrium swelling ratio** is the reciprocal of the polymer volume fraction:

<div align="center" style="font-size: 1.1em; font-weight: bold;">Q = V<sub>swollen</sub> / V<sub>dry</sub> = 1 / v<sub>p</sub></div>

<p align="center"><img src="images/subcalc_a.svg" alt="Flory-Rehner swelling equilibrium" width="600"/></p>
<p align="center"><em>Figure 2: Mixing (favourable) and elastic retraction (unfavourable) balance to set the equilibrium swelling ratio Q = 1/v_p, solved by Newton iteration.</em></p>

### 2.1 Numerical Solution (Guided Newton Iteration)
The equation is **implicit** in v<sub>p</sub> and must be solved numerically. Defining f(v<sub>p</sub>) as the left-hand side, the **Newton-Raphson** update is:

<div align="center" style="font-size: 1.05em; font-weight: bold;">v<sub>n+1</sub> = v<sub>n</sub> &minus; f(v<sub>n</sub>) / f&prime;(v<sub>n</sub>)</div>

with derivative

<div align="center" style="font-size: 1.0em;">f&prime;(v<sub>p</sub>) = &minus;1/(1 &minus; v<sub>p</sub>) + 1 + 2&chi;&middot;v<sub>p</sub> + (V<sub>1</sub>/V<sub>e</sub>)&middot;(&frac13;v<sub>p</sub><sup>&minus;2/3</sup> &minus; &frac12;)</div>

Five iterations from a sensible start (v<sub>0</sub> &asymp; 0.1) typically converge to machine precision.

### 2.2 Solvent Quality
* &chi; &lt; 0.5 &rArr; **good solvent**: strong mixing, high swelling (Q &gt; 20 for loosely crosslinked gels).
* &chi; = 0.5 &rArr; **theta solvent** (borderline).
* &chi; &gt; 0.5 &rArr; **poor solvent**: limited swelling (Q &lt; 5).

Higher crosslink density (smaller V<sub>e</sub>) always reduces Q because the elastic term grows.

---

## 3. pH-Responsive Swelling and Donnan Equilibrium - The pH-Triggered Drug Capsule (Sub-Calc B)
For a weak **polyacid** hydrogel such as poly(acrylic acid) (PAA, pK<sub>a</sub> &asymp; 4.8), the carboxyl groups ionise as the pH rises. The **degree of ionisation** follows the Henderson-Hasselbalch relation:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&alpha; = K<sub>a</sub> / (K<sub>a</sub> + [H<sup>+</sup>]) = 1 / (1 + 10<sup>(pK<sub>a</sub> &minus; pH)</sup>)</div>

where K<sub>a</sub> = 10<sup>&minus;pK<sub>a</sub></sup> and [H<sup>+</sup>] = 10<sup>&minus;pH</sup>. Ionisation creates fixed charges on the network. Mobile counter-ions are trapped inside to preserve electroneutrality, producing an extra **Donnan osmotic pressure**:

<div align="center" style="font-size: 1.05em; font-weight: bold;">&pi;<sub>ion</sub> = R&middot;T&middot;C<sub>ion,total</sub></div>

This ionic osmotic pressure swells the gel far beyond its neutral state. Using the scaling form derived from polyelectrolyte (Dobrynin) theory:

<div align="center" style="font-size: 1.1em; font-weight: bold;">Q(pH) = Q<sub>neutral</sub> &middot; (1 + &alpha;&middot;f<sub>ion</sub>)<sup>3/5</sup></div>

<p align="center"><img src="images/subcalc_b.svg" alt="pH-responsive Donnan swelling" width="600"/></p>
<p align="center"><em>Figure 3: As pH rises through pK<sub>a</sub>, carboxyl groups ionise and trapped counter-ions drive a sigmoidal swelling transition (steepest near pH = pK<sub>a</sub> + 1).</em></p>

where f<sub>ion</sub> is the fraction of monomer units bearing an ionisable group. Because &alpha; switches sharply around pH = pK<sub>a</sub>, the swelling curve Q vs pH is **sigmoidal**, with the steepest rise near **pH &asymp; pK<sub>a</sub> + 1**. A PAA gel therefore **swells in alkaline media and collapses in acid**, a property exploited to trigger drug release in the intestine rather than the stomach.

---

## 4. PNIPAM Thermoresponsive Collapse: the LCST Transition - The Body-Temperature Valve (Sub-Calc C)
Poly(N-isopropylacrylamide) (PNIPAM) has a **Lower Critical Solution Temperature (LCST)** near **32&deg;C**:
* **Below LCST:** hydrogen bonding with water dominates, the chains are hydrophilic and the gel is highly swollen (Q<sub>swollen</sub> &asymp; 30&ndash;50 g/g).
* **Above LCST:** hydrophobic interactions win, water is expelled and the gel collapses (Q<sub>collapsed</sub> &asymp; 1.1&ndash;1.5 g/g).

The transition is modelled with a logistic (sigmoidal) collapse:

<div align="center" style="font-size: 1.05em; font-weight: bold;">Q(T) = Q<sub>collapsed</sub> + (Q<sub>swollen</sub> &minus; Q<sub>collapsed</sub>) / (1 + e<sup>(T &minus; LCST)/w</sup>)</div>

The transition sharpness is described by the full width at half maximum (FWHM) of the dQ/dT peak, &Delta;T<sub>transition</sub> &asymp; 3.53&middot;w (&asymp; 2&ndash;5&deg;C for pure PNIPAM). Two performance figures follow:

<div align="center" style="font-size: 1.1em; font-weight: bold;">VCR = Q<sub>swollen</sub> / Q<sub>collapsed</sub> &nbsp;&nbsp;(typically 20&ndash;40&times;)</div>

<div align="center" style="font-size: 1.1em; font-weight: bold;">&epsilon;<sub>act</sub> = (Q<sub>swollen</sub><sup>1/3</sup> &minus; Q<sub>collapsed</sub><sup>1/3</sup>) / Q<sub>swollen</sub><sup>1/3</sup></div>

<p align="center"><img src="images/subcalc_c.svg" alt="PNIPAM LCST collapse" width="600"/></p>
<p align="center"><em>Figure 4: Across the 32 C LCST the chains switch from a hydrated swollen coil to a collapsed hydrophobic globule, giving a large volume-change ratio and actuation strain.</em></p>

The linear actuation strain &epsilon;<sub>act</sub> of a collapsing PNIPAM gel can reach 50&ndash;70%, far exceeding the ~8% recoverable strain of shape-memory polymers (SMP) or shape-memory alloys (SMA), which is why thermoresponsive gels enable large-stroke 4D actuators.

---

## 5. Network Mechanics: Shear and Young's Modulus - The Cartilage Scaffold (Sub-Calc D)
The stiffness of a swollen network is set by **rubber elasticity theory**. For an ideal network of crosslink (strand) density &nu;<sub>e</sub> (chains per unit volume):

<div align="center" style="font-size: 1.1em; font-weight: bold;">G = &nu;<sub>e</sub> &middot; k<sub>B</sub> &middot; T</div>

with k<sub>B</sub> = 1.38 &times; 10<sup>&minus;23</sup> J/K. Swelling dilutes the load-bearing strands, so the modulus of the swollen gel is reduced relative to the dry network:

<div align="center" style="font-size: 1.1em; font-weight: bold;">G<sub>swollen</sub> = G<sub>dry</sub> &middot; v<sub>p</sub><sup>1/3</sup> = G<sub>dry</sub> / Q<sup>1/3</sup></div>

Hydrogels are essentially incompressible (Poisson ratio &asymp; 0.5), so the **Young's modulus** is:

<div align="center" style="font-size: 1.1em; font-weight: bold;">E = 3&middot;G</div>

<p align="center"><img src="images/subcalc_d.svg" alt="Shear and Young's modulus vs crosslink density" width="600"/></p>
<p align="center"><em>Figure 5: Rubber elasticity sets G from crosslink density; swelling dilutes the strands so a more swollen gel is softer (G &prop; Q<sup>-1/3</sup>, E = 3G).</em></p>

Tuning &nu;<sub>e</sub> (typically 10<sup>23</sup>&ndash;10<sup>26</sup> chains/m<sup>3</sup>) lets a designer hit the modulus window of soft tissues, e.g. cartilage (0.1&ndash;1 MPa) and skin (0.1&ndash;2 MPa).

---

## 6. Drug-Release Kinetics: the Korsmeyer-Peppas Model - The Drug-Eluting Implant (Sub-Calc E)
The fraction of a loaded drug released from a swelling matrix follows a power law in time:

<div align="center" style="font-size: 1.1em; font-weight: bold;">M<sub>t</sub> / M<sub>&infin;</sub> = k &middot; t<sup>n</sup></div>

where k is the release-rate constant and n is the **diffusion (release) exponent** that classifies the transport mechanism (for a thin slab):
* n = 0.5 &rArr; **Fickian diffusion** (concentration-gradient driven).
* 0.5 &lt; n &lt; 1 &rArr; **anomalous (non-Fickian)** transport: diffusion plus polymer relaxation.
* n = 1 &rArr; **Case-II / zero-order** release (relaxation/erosion controlled).

The **half-release time** is obtained by setting M<sub>t</sub>/M<sub>&infin;</sub> = 0.5:

<div align="center" style="font-size: 1.05em; font-weight: bold;">t<sub>50</sub> = (0.5 / k)<sup>1/n</sup></div>

<p align="center"><img src="images/subcalc_e.svg" alt="Korsmeyer-Peppas drug release" width="600"/></p>
<p align="center"><em>Figure 6: Cumulative drug release follows a power law in time; the diffusion exponent n classifies the transport mechanism, valid only below the 60% cutoff.</em></p>

A log-log plot of M<sub>t</sub>/M<sub>&infin;</sub> versus t is a straight line of slope n and intercept log(k). **The model is only valid for M<sub>t</sub>/M<sub>&infin;</sub> &lt; 0.6**; beyond that the "infinite reservoir" boundary condition fails, so the fit must be restricted to early-time data (see Section 7).

---

## 7. Contradictions and Limitations

<p align="center"><img src="images/theory_limits.svg" alt="Model validity windows and limitations" width="620"/></p>
<p align="center"><em>Figure 7: Validity windows for the three modelling limitations - ionic correction, Gaussian-chain limit, and the 60% release cutoff.</em></p>

**Contradiction 1 - Flory-Rehner ignores electrostatics.** The classical Flory-Rehner equation (Sub-Calc A) treats chains as ideal Gaussian coils and contains **no** electrostatic term. For ionic gels (PAA, PAAm) the Donnan osmotic pressure (Sub-Calc B) must be **added** to the Flory-Rehner balance; the simple version underestimates the swelling of polyelectrolyte gels by a factor of 2&ndash;5&times;. **Sub-Calc A is valid only for non-ionic gels**, and its result must not be applied directly to PAA. In this lab the student explicitly computes the Donnan correction and adds it to the Flory-Rehner result for an ionic gel.

**Contradiction 2 - Rubber elasticity fails at high swelling.** G = &nu;<sub>e</sub>k<sub>B</sub>T assumes **Gaussian** chain statistics. At very high swelling (Q &gt; 50) the strands approach full extension and enter the **non-Gaussian** regime, where the Arruda-Boyce (8-chain) model is required. For Q &lt; 30 rubber elasticity is accurate to about &plusmn;10%.

**Contradiction 3 - Korsmeyer-Peppas validity window.** The power law holds only for M<sub>t</sub>/M<sub>&infin;</sub> &lt; 0.6. Beyond 60% release the finite drug reservoir invalidates the assumption, so the simulation marks a **60% validity cutoff** and the log-log fit uses only points below it. Thick-panel and burst-release effects are outside this model's scope.

---

## 8. Relevance
Hydrogel science is the biological interface of 4D printing and underpins drug-delivery devices, soft robots, and tissue scaffolds. The Flory-Rehner and Korsmeyer-Peppas models are standard in Pharmaceutical Sciences and Biomedical Engineering curricula, and Sub-Calc E connects directly to India's large generic-pharmaceutical manufacturing sector, linking 4D printing to real industrial applications.
