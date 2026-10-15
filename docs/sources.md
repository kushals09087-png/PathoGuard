# Genome Firewall — Scientific Sources & Evidence Provenance

## 1. Interpretive Standards & Breakpoint Guidelines

1. **Clinical and Laboratory Standards Institute (CLSI)**
   - **Guideline**: *Performance Standards for Antimicrobial Susceptibility Testing*, 34th Edition (M100-ED34, 2024).
   - **Tables Applied**:
     - Table 2A-1 & 2A-2: *Escherichia coli* and *Klebsiella pneumoniae* breakpoints (Ciprofloxacin, Ceftriaxone, Meropenem, Gentamicin, Tetracycline).
     - Table 2C: *Staphylococcus aureus* breakpoints and cefoxitin surrogate disc diffusion / MIC test for mecA-mediated methicillin resistance.
     - Section 3: Screening and confirmatory tests for ESBLs and carbapenemases.
   - **Reference Link**: [CLSI M100 Standards](https://clsi.org)

2. **European Committee on Antimicrobial Susceptibility Testing (EUCAST)**
   - **Guideline**: *Breakpoint tables for interpretation of MICs and zone diameters*, Version 14.0, 2024.
   - **Guideline**: *Guidelines for detection of resistance mechanisms and specific resistances of clinical and/or epidemiological importance*, 2023.
   - **Mechanisms Applied**:
     - Section 3.2: Class D OXA-48-like carbapenemases (weak carbapenem hydrolysis, MIC near breakpoint without porin loss).
     - Section 4.1: Fluoroquinolone QRDR mutations in Enterobacterales (single vs. dual gyrA/parC missense substitutions).
   - **Reference Link**: [EUCAST Guidelines](https://www.eucast.org)

---

## 2. Detection Engine & Reference Catalogs

1. **NCBI AMRFinderPlus**
   - **Software**: Version 3.12.8
   - **Citation**: Feldgarden M, et al. *AMRFinderPlus and the Reference Gene Catalog facilitate examination of the genomic AMR architecture of large pathogen collections.* Scientific Reports 2021;11:12728. doi: 10.1038/s41598-021-91456-0.
   - **Reference Database**: NCBI Bacterial Antimicrobial Resistance Reference Gene Catalog, release version `2024-05-02.1`.
   - **Organism Flags**:
     - `Escherichia` for *Escherichia coli*
     - `Klebsiella_pneumoniae` for *Klebsiella pneumoniae*
     - `Staphylococcus_aureus` for *Staphylococcus aureus*

2. **NCBI Pathogen Detection BioProject**
   - **Accession**: PRJNA292661
   - **Role**: Evaluation isolate assemblies with matched laboratory antimicrobial susceptibility test (AST) phenotypes for pair-level benchmark reliability calculation.

---

## 3. Mechanism-Specific Literature Citations

1. **Beta-Lactamases & Carbapenemases**:
   - Paterson DL, Bonomo RA. *Extended-spectrum beta-lactamases: a clinical update.* Clin Microbiol Rev 2005;18(4):657-686.
   - Nordmann P, Cuzon G, Naas T. *The real threat of Klebsiella pneumoniae carbapenemase-producing bacteria.* Lancet Infect Dis 2009;9(4):228-236.
   - Poirel L, Potron A, Nordmann P. *OXA-48-like carbapenemases: the 'phantom menace'.* J Antimicrob Chemother 2012;67(7):1597-1606.

2. **Fluoroquinolones & QRDR Substitutions**:
   - Ruiz J. *Mechanisms of resistance to quinolones: target alterations, permeability decrease and active efflux.* Int J Antimicrob Agents 2003;22(2):98-105.
   - Strahilevitz J, Jacoby GA, Hooper DC, Robicsek A. *Plasmid-mediated quinolone resistance: a multifaceted threat.* Clin Microbiol Rev 2009;22(4):664-688.

3. **Aminoglycosides & 16S rRNA Methyltransferases**:
   - Ramirez MS, Tolmasky ME. *Aminoglycoside modifying enzymes.* Drug Resist Updat 2010;13(6):151-171.
   - Doi Y, Arakawa Y. *16S ribosomal RNA methylation: emerging resistance mechanism against aminoglycosides.* Clin Infect Dis 2007;45(1):88-94.

4. **Staphylococcal Resistance (MRSA & Glycopeptides)**:
   - Chambers HF. *Methicillin resistance in staphylococci: molecular and biochemical basis and clinical implications.* Clin Microbiol Rev 1997;10(4):781-791.
   - Sievert DM, et al. *Vancomycin-resistant Staphylococcus aureus in the United States, 2002-2006.* Clin Infect Dis 2008;46(5):668-674.
   - Howden BP, Davies JK, Johnson PD, Stinear TP, Grayson ML. *Reduced vancomycin susceptibility in Staphylococcus aureus, including vancomycin-intermediate and heterogeneous vancomycin-intermediate strains: resistance mechanisms, laboratory detection, and clinical implications.* Clin Microbiol Rev 2010;23(1):99-139.

---

## 4. Benchmark Statistical Formulation

Per-pair reliability rates are reported with two-sided 95% confidence intervals calculated using the **Wilson score interval** without continuity correction:

$$\hat{p} \pm \frac{z \sqrt{\frac{\hat{p}(1-\hat{p})}{n} + \frac{z^2}{4n^2}}}{1 + \frac{z^2}{n}}$$

Where $\hat{p} = \frac{k}{n}$, $z = 1.96$, $k$ is the number of concordant isolate evaluations, and $n$ is the total evaluated sample count for that organism–antibiotic pair.
