# Theory: 4D-Printed Soft Robots

## 1. Introduction to Soft Robotics and 4D Printing
Conventional robots are built from rigid links and joints; soft robots instead deform their entire body to move, grip, and adapt. When those bodies are 3D-printed from stimuli-responsive materials, the printed part is not the finished robot — heat, pressure, or a control signal reshapes it afterwards. That post-print, time-dependent transformation is the "fourth dimension." This experiment builds a soft finger up in five layers: make it bend, make it hold that bend for free, make a body crawl, make a hand grip, and finally close a control loop so the bend lands exactly where we want it.

---

## 2. Core Concept: Pressure, Modulus, and Friction as Design Knobs
Three physical levers recur throughout soft-robot design. **Pressure** inflates cavities and generates the moments that bend and grip. **Modulus** — how stiff the material is — decides whether a shape springs back or stays put, and in shape-memory polymers it can be switched by temperature. **Friction**, and specifically its directional asymmetry, is what converts symmetric body oscillation into net locomotion. Each sub-calculator isolates one of these levers, then Sub-Calc E ties the pneumatic actuator back into a feedback loop.

---

## 3. Pneumatic Bending Actuation (Sub-Calc A)
An eccentric air cavity offset from the finger's neutral axis converts gauge pressure into a bending moment. With cross-section A<sub>cross</sub> and eccentricity d<sub>ecc</sub>:

<div align="center" style="font-size: 1.1em; font-weight: bold;">M = P &middot; A<sub>cross</sub> &middot; d<sub>ecc</sub></div>

That moment bends a beam of effective flexural rigidity E&middot;I<sub>eff</sub> into a uniform curvature, and a uniformly curved finger of length L subtends a tip angle:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&kappa; = M / (E &middot; I<sub>eff</sub>) &nbsp;&nbsp;&rarr;&nbsp;&nbsp; &theta;<sub>lin</sub> = &kappa; &middot; L</div>

Here E = 1 MPa (soft silicone), I<sub>eff</sub> = 1.82&times;10<sup>&minus;10</sup> m<sup>4</sup>. The linear law only holds while the moment arm stays roughly constant, i.e. for &theta; &lesssim; 30&deg;. Beyond that the cavity geometry stiffens and the finger saturates, captured by an empirical rolloff:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&theta; = &theta;<sub>lin</sub> / (1 + &beta; &middot; &theta;<sub>lin</sub><sup>2</sup>) &nbsp;&nbsp; (&beta; = 0.0534 rad<sup>&minus;2</sup>)</div>

The coefficient &beta; is calibrated so that 20 kPa &rarr; 28&deg; and 80 kPa &rarr; 94&deg;: equal pressure steps buy ever less angle as the finger curls.

<p align="center"><img src="images/subcalc_a.svg" alt="Bending angle versus drive pressure, linear law versus geometric-stiffening rolloff" width="620"/></p>
<p align="center"><em>Figure 1: Pressure drives a moment and hence curvature; the linear angle &theta;<sub>lin</sub> = &kappa;L (dashed) runs away, but geometric stiffening rolls the real angle off into saturation past ~30&deg; (Sub-Calc A).</em></p>

---

## 4. Shape-Memory Stiffness Switching (Sub-Calc B)
A pneumatic finger must keep burning pressure to hold a pose. A shape-memory polymer skin removes that cost: bend it while warm and soft, then cool it below its glass transition T<sub>g</sub> = 40 &deg;C so it vitrifies and freezes the bend. The modulus follows an empirical sigmoid straddling T<sub>g</sub>, running between the warm E<sub>active</sub> and the cold E<sub>passive</sub> = 1.5 GPa:

<div align="center" style="font-size: 1.1em; font-weight: bold;">E(T) = E<sub>passive</sub> + (E<sub>active</sub> &minus; E<sub>passive</sub>) / (1 + exp(&minus;(T &minus; T<sub>g</sub>) / w))</div>

with width w = 3 &deg;C. The switch is quantified by the stiffness ratio, and the warm bend and locked hold by:

<div align="center" style="font-size: 1.1em; font-weight: bold;">SR = E<sub>passive</sub> / E<sub>active</sub> &nbsp;&nbsp;&middot;&nbsp;&nbsp; &theta;<sub>bent</sub> = min(90&deg;, k<sub>b</sub>&middot;P<sub>bend</sub>/E<sub>active</sub>) &nbsp;&nbsp;&middot;&nbsp;&nbsp; &theta;<sub>held</sub> = R<sub>f</sub> &middot; &theta;<sub>bent</sub></div>

The shape fixity R<sub>f</sub> is the fraction of the bend that survives unloading (as in the SMP programming cycle of Exp 1). The payoff is energetic: holding pneumatically leaks power continuously at P&middot;Q<sub>leak</sub>, whereas once T &lt; T<sub>g</sub> the SMP-locked hold costs **exactly 0 W**. If the finger never crosses T<sub>g</sub>, releasing pressure lets it spring straight back — no lock.

<p align="center"><img src="images/subcalc_b.svg" alt="Modulus versus temperature sigmoid switching across the glass transition" width="620"/></p>
<p align="center"><em>Figure 2: Cooling through T<sub>g</sub> = 40 &deg;C jumps the modulus from E<sub>active</sub> to a ~1.5 GPa glassy state; below T<sub>g</sub> the bend holds at zero power, above it the finger springs back (Sub-Calc B).</em></p>

---

## 5. Earthworm Crawling Locomotion (Sub-Calc C)
A peristaltic body that only extends and contracts goes nowhere if its two ends slip equally — it just breathes in place. Net travel needs directional (anisotropic) friction. Each cycle extends a segment of rest length L<sub>seg</sub> = 40 mm by its active strain, and only the fraction set by the friction asymmetry is kept:

<div align="center" style="font-size: 1.1em; font-weight: bold;">&delta;<sub>ext</sub> = L<sub>seg</sub> &middot; &epsilon;<sub>active</sub> &nbsp;&nbsp;&middot;&nbsp;&nbsp; &mu;<sub>asym</sub> = &mu;<sub>back</sub> / &mu;<sub>fwd</sub></div>

<div align="center" style="font-size: 1.1em; font-weight: bold;">&delta;<sub>net</sub> = &delta;<sub>ext</sub> &middot; (1 &minus; 1/&mu;<sub>asym</sub>) &nbsp;&nbsp;&middot;&nbsp;&nbsp; v = &delta;<sub>net</sub> &middot; f</div>

When &mu;<sub>asym</sub> = 1 the net displacement is exactly zero; when &mu;<sub>asym</sub> &lt; 1 (more slip while anchoring than advancing) &delta;<sub>net</sub> goes negative and the robot crawls backward. A smooth 4D-printed surface gives &mu;<sub>fwd</sub> &asymp; &mu;<sub>back</sub>, so directional travel demands printed scales or angled legs to break the symmetry.

<p align="center"><img src="images/subcalc_c.svg" alt="Net displacement per cycle as a function of friction asymmetry" width="620"/></p>
<p align="center"><em>Figure 3: Net displacement per cycle crosses zero exactly at &mu;<sub>asym</sub> = 1 — symmetric friction gives no travel, and &mu;<sub>asym</sub> &lt; 1 reverses the crawl direction (Sub-Calc C).</em></p>

---

## 6. Three-Finger Grasping & Force Closure (Sub-Calc D)
Three fingers close on an object; each presses with a normal force that depends on how square its contact is. With tip area A<sub>tip</sub> = 100 mm<sup>2</sup> and finger angle &theta;:

<div align="center" style="font-size: 1.1em; font-weight: bold;">F<sub>grasp</sub> = P &middot; A<sub>tip</sub> &middot; cos&theta;</div>

The reachable workspace runs from the palm radius out to R<sub>max</sub> = r<sub>palm</sub> + L&middot;sin&theta; (r<sub>palm</sub> = 20 mm). A quasi-static grip holds only if friction at each of the three contacts can carry its share of the weight:

<div align="center" style="font-size: 1.1em; font-weight: bold;">F<sub>grasp</sub> &middot; &mu;<sub>contact</sub> &gt; m&middot;g / 3</div>

The cos&theta; term is the whole story: as &theta; &rarr; 90&deg; the normal force vanishes and no amount of pressure can save the grip, so the object drops. Inverting the closure condition gives the heaviest object three fingers can hold, m<sub>max</sub> = 3&middot;F<sub>grasp</sub>&middot;&mu;/g.

<p align="center"><img src="images/subcalc_d.svg" alt="Grasp force per finger versus finger angle with the hold threshold" width="620"/></p>
<p align="center"><em>Figure 4: Per-finger grasp force falls as cos&theta; and hits zero at 90&deg;; once it drops below the mg/(3&mu;) threshold the three-finger closure fails and the object is released (Sub-Calc D).</em></p>

---

## 7. Closed-Loop Bending Control (Sub-Calc E)
The bending finger of Sub-Calc A, seen from a controller, is a first-order pressure-to-angle plant with a fill lag &tau;<sub>p</sub> and DC gain K<sub>plant</sub> = 1.4 &deg;/kPa:

<div align="center" style="font-size: 1.1em; font-weight: bold;">G(s) = K<sub>plant</sub> / (&tau;<sub>p</sub>&middot;s + 1) &nbsp;&nbsp;&hArr;&nbsp;&nbsp; &tau;<sub>p</sub> &middot; dy/dt = K<sub>plant</sub>&middot;u &minus; y</div>

A PID controller drives the valve command u from the tracking error e = &theta;<sub>set</sub> &minus; y, with the command clamped to the 0&ndash;150 kPa valve range (and integral anti-windup at the rails):

<div align="center" style="font-size: 1.1em; font-weight: bold;">u = K<sub>p</sub> &middot; (e + (1/T<sub>i</sub>)&int;e&middot;dt + T<sub>d</sub>&middot;de/dt)</div>

The step response is scored for percent overshoot and 2 % settling time, with a second-order estimate of damping &zeta; (from the overshoot) and closed-loop bandwidth &omega;<sub>cl</sub> &asymp; 4/(&zeta;&middot;t<sub>s</sub>). A well-tuned loop meets overshoot &lt; 15 % and t<sub>s</sub> &lt; 2 s; too much K<sub>p</sub> rings, too little never catches the setpoint. Because the plant model is linear, it over-predicts on large steps where the real finger saturates — these gains are a starting point, not the last word on hardware.

<p align="center"><img src="images/subcalc_e.svg" alt="Closed-loop PID step response showing overshoot and settling band" width="620"/></p>
<p align="center"><em>Figure 5: The PID loop chases &theta;<sub>set</sub>; overshoot and the 2 % settling band decide whether the tuning passes, while bad gains ring or saturate the valve limit (Sub-Calc E).</em></p>
