# Procedure: Hydrogel Mechanics & Soft Actuator Sizing

Welcome to the Hydrogel Mechanics Virtual Laboratory. Each sub-calculator is a recognizable 4D-printed medical device you build, trigger, and size: a self-folding gripper, a pH-triggered drug capsule, a body-temperature valve, a cartilage scaffold, and a drug-eluting implant. You pick the print recipe with the controls on the left, set the device running, watch it transform in 3D, and read off a real design number. The rigorous swelling, ionisation, thermal, elasticity, and release physics runs underneath every animation.

---

## Sub-Calc A: The Self-Folding Gripper (Flory-Rehner Swelling)
**The device:** a flat-printed hydrogel gripper that soaks up water, swells, and curls its four fingers shut around an object - a soft gripper with no motor.

1. **Pick the gel:** choose a material - **Alginate** (&chi; = 0.40), **PEG-DA** (0.45), **PNIPAM** (0.48), or **pHEMA** (0.55). A lower &chi; loves water more and swells harder.
2. **Set the print:** move the **UV-cure crosslinking** slider from loose to tight (tighter networks swell less).
3. **Trigger it:** click **Submerge in Water**. Watch the fingers fatten, turn blue, and curl up over the ball; the object brightens once the gripper closes on it.
4. **Read the plots:** the swelling curve (Q vs &chi;) and the fold curve (fold angle vs Q). Past about 160&deg; the gripper is "fully closed".
5. **Record:** the swelling ratio Q, the % water content, the fold angle, and whether it grips. The comparison table shows **which material closes it**.
6. **Design takeaway:** more swelling (lower &chi;, looser print) gives a tighter fold. Click **Next Experiment ->**.

---

## Sub-Calc B: The pH-Triggered Drug Capsule (Donnan Equilibrium)
**The device:** a two-piece printed capsule that stays sealed in stomach acid and springs open in the intestine, spilling its drug beads exactly where they are needed.

1. **Pick the shell polymer:** choose a polyacid by its **pK<sub>a</sub>** - **PMAA** (4.3), **PAA** (4.8), or a **Custom** (6.0). The pK<sub>a</sub> sets which organ it opens in.
2. **Set the charge groups:** move the **ionisable fraction f<sub>ion</sub>** slider (more acid groups = stronger swelling).
3. **Set or sweep pH:** drag the **pH** slider (stomach acid ~1.5 to intestine ~7.4), or click **Swallow the Capsule** to play the full stomach -> intestine journey.
4. **Watch it:** the shell turns from grey to green and the two halves separate as it swells open, releasing the red drug beads.
5. **Read & record:** the shell charge &alpha;, the swelling Q, the **opening pH**, the target organ, and the **pH 10% -> 90% opening window**. The table shows where each polymer opens.
6. **Design takeaway:** the capsule opens once pH climbs past its pK<sub>a</sub>, so choose the pK<sub>a</sub> to match the target organ. Click **Next Experiment ->**.

---

## Sub-Calc C: The Body-Temperature Valve (PNIPAM LCST Collapse)
**The device:** a soft-muscle valve printed from PNIPAM. The gel posts swell when cool and prop a lid open so fluid flows; warmed past 32&deg;C they collapse and the lid drops, shutting the flow - a self-regulating valve.

1. **Set the swollen size:** move the **Q<sub>swollen</sub>** slider (sets how much the gel grows when cool).
2. **Set the switch sharpness:** move the **transition width w** slider (smaller = snappier switch).
3. **Set or sweep temperature:** drag the **temperature** slider, or click **Warm to Body Temp** to heat from 10&deg;C through the 32&deg;C switch.
4. **Watch it:** below 32&deg;C the blue posts hold the lid up and fluid streams through; above 32&deg;C they collapse to amber, the lid drops, and the flow stalls.
5. **Read & record:** Q at temperature, the **Volume Change Ratio (VCR)**, the **switch window** (FWHM of dQ/dT), and the **actuation stroke &epsilon;**. The table shows OPEN/SHUT at 20/30/34/37&deg;C.
6. **Design takeaway:** it snaps shut right at body temperature - a self-regulating valve or drug switch. Click **Next Experiment ->**.

---

## Sub-Calc D: The Cartilage Scaffold (Rubber Elasticity & Indentation)
**The device:** a printed tissue scaffold being pressed by an indentation probe. Its stiffness must match real cartilage so cells feel the right mechanics.

1. **Set the crosslinking:** move the **crosslink density &nu;<sub>e</sub>** slider (10<sup>23</sup>-10<sup>26</sup> chains/m&sup3;).
2. **Set the swelling:** move the **Q** slider (the scaffold softens as it swells), and the **temperature T** slider.
3. **Trigger it:** click **Press the Scaffold**. The probe dents the surface - deeper for a softer gel - and the swelling sweeps up so you can watch the scaffold soften.
4. **Read the plots:** the stiffness curve (E vs Q, falling as Q<sup>-1/3</sup>) and the **tissue-match bands** (brain, muscle, cartilage, skin) on a log scale.
5. **Record:** G<sub>dry</sub>, the swollen Young's modulus E, the closest tissue, and whether E lands in the **cartilage window (0.1-1 MPa)**.
6. **Design takeaway:** tighten the crosslinking until E lands between 0.1 and 1 MPa to match cartilage. Click **Next Experiment ->**.

---

## Sub-Calc E: The Drug-Eluting Implant (Korsmeyer-Peppas Release)
**The device:** a printed drug-loaded implant that releases its dose over hours to days. The release exponent n tells you whether diffusion or polymer swelling controls the dose.

1. **Set the release rate:** move the **rate constant k** slider.
2. **Set the mechanism:** move the **diffusion exponent n** slider (n = 0.5 Fickian diffusion, n = 1.0 zero-order/Case II).
3. **Trigger it:** click **Run the Release**. The implant releases coloured drug particles over time as the cumulative-release curve fills in.
4. **Read the plots:** the release profile M<sub>t</sub>/M<sub>&infin;</sub> vs t and the log-log fit (slope = n). A dashed **60% cutoff line** marks where the model stops being valid.
5. **Record:** the transport mechanism, the **half-release time t<sub>50</sub>**, and confirm your reading uses only data below 60% release.
6. **Finish:** you have built and sized all five hydrogel devices. Use **Restart** to explore other recipes.
