# References

1. **Tibbits, S. (2014).** *4D Printing: Multi-Material Shape Change*. Architectural Design, 84(1), 116-121. DOI: [10.1002/ad.1710](https://doi.org/10.1002/ad.1710)
2. **Ashby, M. F. (2011).** *Materials Selection in Mechanical Design* (4th ed.). Butterworth-Heinemann, Oxford. ISBN: 978-1-85617-663-7
3. **Timoshenko, S. (1925).** *Analysis of Bi-Metal Thermostats*. Journal of the Optical Society of America, 11(3), 233-255. DOI: [10.1364/JOSA.11.000233](https://doi.org/10.1364/JOSA.11.000233)
4. **Ge, Q., Dunn, C. K., Qi, H. J., & Dunn, M. L. (2014).** *Active origami by 4D printing*. Smart Materials and Structures, 23(9), 094007. DOI: [10.1088/0964-1726/23/9/094007](https://doi.org/10.1088/0964-1726/23/9/094007)
5. **Momeni, F., Hassani.N, S. M. M., Liu, X., & Ni, J. (2017).** *A review of 4D printing*. Materials & Design, 122, 42-79. DOI: [10.1016/j.matdes.2017.02.068](https://doi.org/10.1016/j.matdes.2017.02.068)
6. **Mankins, J. C. (2009).** *Technology readiness assessments: A retrospective*. Acta Astronautica, 65(9-10), 1216-1223. DOI: [10.1016/j.actaastro.2009.03.058](https://doi.org/10.1016/j.actaastro.2009.03.058)
7. **Faludi, J., Bayley, C., Bhogal, S., & Iribarne, M. (2015).** *Comparing environmental impacts of additive manufacturing vs traditional machining via life-cycle assessment*. Rapid Prototyping Journal, 21(1), 14-33. DOI: [10.1108/RPJ-07-2013-0067](https://doi.org/10.1108/RPJ-07-2013-0067)

## Indian engineering lab manuals

8. **Institute of Aeronautical Engineering (IARE), Hyderabad - Strength of Materials Lab Manual.** *Experiment No. 03, Deflection Test on Simply Supported Beam*, PDF page 25 (the experiment opens on page 24). Backs the Young's modulus E that the material index in this experiment is built on. The manual loads a simply supported beam at midspan, measures the central deflection delta, and gets E from delta = W*L^3/(48*E*I), rearranged to E = W*L^3/(48*delta*I). That E is the input to the Ashby stiffness index M1 = sqrt(E)/rho.
   [Open the manual (PDF)](https://www.iare.ac.in/sites/default/files/lab1/IARE_Strength_of_Materials_Laboratory.pdf) - local copy: `screenshots_references/manuals/exp2_som_iare.pdf`, screenshot: `screenshots_references/exp10_youngsmodulus__iare-som_simplysupported_p25.png`

   Partial fit: the manual proves the measurement of E only. The index itself, the normalisation of each index to 0-1, and the weighted total M_total = sum(wi * M_hat_i) are selection theory from Ashby (reference 2), not lab-manual material.
