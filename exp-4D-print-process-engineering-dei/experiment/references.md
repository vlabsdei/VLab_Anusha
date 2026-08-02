# References

1. **Tibbits, S. (2014).** *4D Printing: Multi-Material Shape Change*. Architectural Design, 84(1), 116-121. DOI: [10.1002/ad.1710](https://doi.org/10.1002/ad.1710)
2. **Sun, Q., Rizvi, G. M., Bellehumeur, C. T., & Gu, P. (2008).** *Effect of processing conditions on the bonding quality of FDM polymer filaments*. Rapid Prototyping Journal, 14(2), 72-80. DOI: [10.1108/13552540810862028](https://doi.org/10.1108/13552540810862028)
3. **Wool, R. P., & O'Connor, K. M. (1981).** *A theory of crack healing in polymers*. Journal of Applied Physics, 52(10), 5953-5963. DOI: [10.1063/1.328526](https://doi.org/10.1063/1.328526)
4. **Northcutt, L. A., Orski, S. V., Migler, K. B., & Kotula, A. P. (2018).** *Effect of processing conditions on crystallization kinetics during material extrusion additive manufacturing*. Polymer, 154, 182-187. DOI: [10.1016/j.polymer.2018.09.018](https://doi.org/10.1016/j.polymer.2018.09.018)
5. **Wang, T.-M., Xi, J.-T., & Jin, Y. (2007).** *A model research for prototype warp deformation in the FDM process*. International Journal of Advanced Manufacturing Technology, 33(11-12), 1087-1096. DOI: [10.1007/s00170-006-0556-9](https://doi.org/10.1007/s00170-006-0556-9)
6. **Ahn, S.-H., Montero, M., Odell, D., Roundy, S., & Wright, P. K. (2002).** *Anisotropic material properties of fused deposition modeling ABS*. Rapid Prototyping Journal, 8(4), 248-257. DOI: [10.1108/13552540210441166](https://doi.org/10.1108/13552540210441166)
7. **de Gennes, P. G. (1971).** *Reptation of a Polymer Chain in the Presence of Fixed Obstacles*. The Journal of Chemical Physics, 55(2), 572-579. DOI: [10.1063/1.1675789](https://doi.org/10.1063/1.1675789)

## Indian engineering lab manuals

8. **Aurora's Engineering College - Engineering Physics Lab Manual.** *5. Time Constant of an R-C Circuit*, PDF page 29 (printed page 28). Backs the exponential decay used for bead cooling. The manual integrates q/C + R*dq/dt = 0 to q = q0 * e^(-t/(R*C)) with time constant tau = R*C, which is the same first-order ODE as T(t) = T_amb + (T_print - T_amb) * e^(-t/tau_cool).
   [Open the manual (PDF)](https://www.aurora.ac.in/images/pdf/departments/humanities-and-sciences/engg-phy-lab-manual.pdf) - local copy: `screenshots_references/manuals/exp8_engphy_aurora.pdf`, screenshot: `screenshots_references/exp08_timeconstant__aurora-engphy_RC_p29.png`

   Partial fit: the apparatus is a discharging capacitor, not a cooling polymer bead. It proves the exponential time-constant maths, not the thermal set-up.

9. **Rohini College of Engineering and Technology (RCET), Kanyakumari - Statistical Process Control, Unit III (Process Capability).** *Cpk Process Capability Index*, PDF pages 3-4. Backs the process capability index Cpk = min(Cpu, Cpl) used to score print consistency. Page 3 defines Cpk and contrasts it with Cp; the algebraic form Cpu = (USL - X-bar)/(3*sigma) is on page 4.
   [Open the manual (PDF)](https://www.rcet.org.in/uploads/academics/regulation2024/rohini_66538379427.pdf) - local copy: `screenshots_references/manuals/exp8_spc_rcet.pdf`, screenshot: `screenshots_references/exp08_cpk__rcet_processcapability_p3.png`
