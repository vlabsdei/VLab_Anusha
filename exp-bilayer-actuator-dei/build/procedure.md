# Procedure: Bilayer Actuator Design

Welcome to the Bilayer Actuator Design Virtual Laboratory. This lab allows you to design and simulate thermo-mechanical bending and hygroscopic swelling of bilayer actuators across five distinct sub-calculators.

Follow the step-by-step guide below:

## Sub-Calc A: Timoshenko Bimetal Formula
**Objective:** Calculate curvature and bending angle based on temperature change.

1. **Select Materials:** Choose passive layer (e.g., PLA) and active layer (e.g., hydrogel).
2. **Set Parameters:** Adjust layer thicknesses and temperature change (&Delta;T).
3. **Run Simulation:** Compute curvature (&kappa;), radius (R), and bending angle (&theta;).
4. **Observe:** Record curvature for different thickness ratios (m = 0.5, 1.0, 2.0) and plot &kappa; vs &Delta;T and &kappa; vs m to identify the optimal thickness ratio.

## Sub-Calc B: Hygroscopic Swelling: Anisotropic Expansion
**Objective:** Calculate swelling strain and identify optimal fiber orientation.

1. **Select Material:** Choose a cellulose composite and set moisture uptake (&Delta;C).
2. **Run Simulation:** Compute parallel and transverse swelling strains, and swelling anisotropy ratio (A<sub>s</sub>).
3. **Observe:** Vary fiber orientation angle (&theta;<sub>f</sub>) and plot net bending angle vs &theta;<sub>f</sub>. Identify the orientation giving maximum out-of-plane bending.

## Sub-Calc C: Print Path as Shape Programme
**Objective:** Program transformation geometry using print direction.

1. **Set Angles:** Input top layer print angle (&theta;<sub>top</sub>) and bottom layer print angle (&theta;<sub>bottom</sub>).
2. **Run Simulation:** Compute effective CTE (&alpha;<sub>eff</sub>) for each layer and programmed curvature.
3. **Observe:** Test angle combinations (e.g., 0&deg;/90&deg;, 45&deg;/-45&deg;) to identify which produces max flat bending, twisting, or helical shape.

## Sub-Calc D: Moisture Diffusion Timescale
**Objective:** Use Fick's Second Law to predict actuation speed.

1. **Set Parameters:** Define layer thickness (L) and diffusion coefficient (D).
2. **Run Simulation:** Compute characteristic diffusion time (t<sub>diff</sub>) and time to 90% swelling equilibrium (t<sub>90</sub>).
3. **Observe:** Plot t<sub>90</sub> vs L<sup>2</sup>. Confirm the scaling law where thinner layers respond exponentially faster.

## Sub-Calc E: Blocking Force & Work Output
**Objective:** Compute blocking force and energy density of the actuator.

1. **Run Simulation:** Compute free deflection from Sub-Calc A and resulting blocking force (F<sub>block</sub>).
2. **Observe:** Record work output (W) and energy density (U<sub>act</sub>) for different humidity levels. Compare work output to other actuators.
