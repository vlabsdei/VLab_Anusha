# Theory: Bilayer Actuator Design

## 1. Introduction to Bilayer Actuators
The bilayer actuator is the simplest and most widely used mechanism in 4D printing. It consists of two layers with different expansion responses to a stimulus. When subjected to the stimulus (like heat or moisture), one layer expands more than the other, causing the entire structure to bend.

## 2. Timoshenko Bimetal Formula
The foundational equation for bilayer 4D printed structures is the Timoshenko bimetal formula, originally derived in 1925 for bimetallic thermostats. It relates the curvature of the bending beam to the thermal expansion coefficients, thickness ratio, modulus ratio, and temperature change.

## 3. Hygroscopic Swelling Anisotropy
In addition to thermal expansion, materials like wood or cellulose-based composites undergo hygroscopic swelling when absorbing moisture. Swelling is highly anisotropic, meaning it depends heavily on the fibre orientation. For instance, transverse swelling can be 4-10 times greater than parallel swelling.

## 4. Print Path as Shape Programme
In Fused Deposition Modeling (FDM), the print direction (deposition path angle) acts to program the transformation geometry. The slicer settings are not merely for manufacturing but encode the motion of the part. By altering print angles, the resulting bending can be tuned to produce flat bending, twisting, or helical shapes.

## 5. Moisture Diffusion Timescale (Fick's Second Law)
The actuation speed of a moisture-driven bilayer actuator depends on the diffusion timescale. Fick's Second Law governs this moisture diffusion. The characteristic diffusion time scales with the square of the layer thickness (L<sup>2</sup>), meaning thinner active layers actuate significantly faster.

## 6. Blocking Force & Work Output
The mechanical capability of an actuator is quantified by its blocking force (the force required to prevent bending) and its work output. This connects the mechanics of bending to the thermodynamics of the system, indicating how much energy density the actuator can deliver.
