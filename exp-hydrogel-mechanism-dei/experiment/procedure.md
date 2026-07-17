# Procedure: Hydrogel Mechanics and Stimuli-Responsive Actuation

Welcome to the Hydrogel Mechanics lab. Across five sub-calculators you will drive a printed gel through the physics that turns swelling into motion - from a gripper that folds itself shut in water to an implant metering out its dose over days. Each page gates behind a **Start Experiment** button; set your parameters, start the run, then work through the steps below.

---

## Sub-Calc A: The Self-Folding Gripper (Flory-Rehner Swelling)
**Objective:** Solve the Flory&ndash;Rehner equilibrium for the swelling ratio Q, then watch that swelling curl a flat-printed gripper's fingers shut.

1. **Choose the print material:** Pick one of the four radio presets - **Alginate (&chi;=0.40)**, **PEG-DA (&chi;=0.45)**, **PNIPAM @25&deg;C (&chi;=0.48)**, or **pHEMA (&chi;=0.55)**. Lower &chi; means the gel loves water more.
2. **Set the crosslink density:** Drag the **UV-cure crosslinking (loose &rarr; tight)** slider (range 0.0003&ndash;0.06). Looser printing swells more; the readout labels it loose / medium / tight / overtight.
3. **Submerge:** Click **Submerge in Water**. The gripper soaks up water over roughly three seconds, fattening and folding.
4. **Watch the fold:** In the viewport the four fingers change colour from pale-dry to swollen blue and wrap over the amber ball. The top plot tracks Q vs &chi;; the lower plot maps fold angle vs Q.
5. **Read the result:** Note the **Swelling ratio Q**, **Water content when swollen**, and **Finger fold angle**. Below &sim;30&deg; the gripper fails to close; past &sim;160&deg; it fully grips.
6. **Compare materials:** The table lists all four presets at your crosslink setting - see which recipe actually closes.
7. **Advance:** Click **Next &rsaquo;** in the rail to move to Sub-Calc B.

---

## Sub-Calc B: The pH-Triggered Drug Capsule (Donnan Equilibrium)
**Objective:** Ionise the weak-acid shell with Henderson&ndash;Hasselbalch and let Donnan osmotic pressure swell the capsule open at the right point in the gut.

1. **Choose the capsule polymer:** Select **PAA (pKa 4.8)**, **PMAA (pKa 4.3)**, or **Custom (pKa 6.0)**. The pKa sets the pH at which the shell charges up.
2. **Set the acid-group count:** Use the **Ionisable fraction (few &rarr; many)** slider (0.1&ndash;1.6). More groups means stronger Donnan swelling - but too many will over-swell and rupture the shell.
3. **Set the starting pH:** The **pH (stomach acid &rarr; intestine)** slider spans 1&ndash;8; it starts at 1.8 (stomach).
4. **Swallow:** Click **Swallow the Capsule**. The pH ramps from 1 upward, carrying the capsule from stomach to intestine.
5. **Watch it open:** The two shell halves separate and shift grey&rarr;green as the opening fraction climbs; a ruptured shell turns red and dumps all its beads at once.
6. **Read the result:** Check **Shell charge now (ionisation)**, **Shell swelling Q**, **Springs open at pH ~** (the p50), **Releases drug in**, and the **Opening window (10-90%)**.
7. **Advance:** Click **Next &rsaquo;** for Sub-Calc C.

---

## Sub-Calc C: The Body-Temperature Valve (LCST Thermoresponse)
**Objective:** Collapse a PNIPAM-type gel through its LCST (32&deg;C) and measure the actuation stroke and switch sharpness of a valve that snaps shut at body temperature.

1. **Set the swollen size:** Drag **Swollen swelling Q (small &rarr; big)** (1.5&ndash;50 g/g). This is how swollen the gel is when cool - it sets the available stroke.
2. **Set the switch sharpness:** The **Switch sharpness (sharp &rarr; gradual)** slider (0.6&ndash;4.0 &deg;C) is the transition-width parameter w in the sigmoid.
3. **Set the temperature:** The **Temperature (cool &rarr; body heat)** slider spans 10&ndash;50&deg;C.
4. **Warm it up:** Click **Warm to Body Temp**. The temperature sweeps upward; the gel posts collapse and let the lid drop onto its seat, stopping the flow.
5. **Watch the switch:** The upper plot shows Q vs T with the 32&deg;C switch line and 37&deg;C body line; the lower plot is |dQ/dT|, whose shaded FWHM is the switch window.
6. **Read the result:** Note the **Swelling Q at this temperature**, **Valve stroke** &epsilon;, **Size change (open vs shut)** Q<sub>sw</sub>/Q<sub>col</sub>, and **Switch window (sharpness)**. A gel that swells too little never lifts the lid - the readout flags it as failing.
7. **Advance:** Click **Next &rsaquo;** for Sub-Calc D.

---

## Sub-Calc D: The Cartilage Scaffold (Rubber Elasticity)
**Objective:** Compute a hydrogel's dry and swollen shear modulus from crosslink density, and tune both to match cartilage's 0.1&ndash;1 MPa stiffness.

1. **Set the crosslinking:** The **Crosslink tightness (loose &rarr; tight)** slider runs from 10<sup>22</sup> to 10<sup>27</sup> chains/m<sup>3</sup> (log scale, default 10<sup>24.5</sup>). Tighter crosslinking stiffens the network.
2. **Set the swelling:** Use **Swelling ratio Q (dense &rarr; watery)** (1&ndash;60). Swelling dilutes the chains and softens the gel as Q<sup>-1/3</sup>.
3. **Set the body temperature:** The **Temperature** slider (10&ndash;60&deg;C) feeds the k<sub>B</sub>T term; default 37&deg;C.
4. **Press it:** Click **Press the Scaffold**. A rigid spherical probe indents the deforming surface - a soft gel dents deep, a stiff one barely.
5. **Watch the match:** The upper plot shows E vs Q with the shaded cartilage window; the lower strip is a log-scale tissue map (brain, muscle, cartilage, skin) with your scaffold marked.
6. **Read the result:** Note **Stiffness when dry**, **Stiffness in the body (swollen)**, **Feels most like**, and whether it lands **in the cartilage window (0.1-1 MPa)**.
7. **Advance:** Click **Next &rsaquo;** for Sub-Calc E.

---

## Sub-Calc E: The Drug-Eluting Implant (Korsmeyer-Peppas)
**Objective:** Fit early-time release to the Korsmeyer&ndash;Peppas power law, read the exponent n to identify the transport mechanism, and estimate the dosing timescale.

1. **Set the release speed:** The **Release speed k (slow &rarr; fast)** slider spans 0.05&ndash;0.40. Larger k empties the implant sooner.
2. **Set the release shape:** The **Release exponent n (diffusion &rarr; steady)** slider runs 0.40&ndash;1.20. Near 0.5 is Fickian diffusion; 1.0 is steady zero-order; above 1 is a burst.
3. **Run it:** Click **Run the Release**. The implant slab empties its red drug beads over time as the fraction climbs.
4. **Mind the 60% line:** Watch the red cutoff band - the power law is only trustworthy below &sim;60% released, so the curve is drawn solid up to there and dashed beyond.
5. **Read the shape:** The lower log-log plot shows the release as a straight line whose **slope equals n**.
6. **Read the result:** Note **How it releases** (the mechanism), **Half the dose by** t<sub>50</sub>, and **Dose lasts about** t<sub>90</sub>. The table maps n to its mechanism.
7. **Finish:** This is the last sub-calc; use **Reset Implant** to run another recipe.
