# Anatomy and prediction viewer

The project page provides an educational lateral-view brain illustration with interactive labels for the frontal, parietal, temporal and occipital lobes, cerebellum, hippocampus, amygdala and lateral ventricles. Callout positions are approximate. The hippocampus, amygdala and ventricles are deep structures and are **not visible on the illustrated outer surface**; their annotations indicate general context rather than boundaries.

The anatomical image is a newly created digital medical illustration, not an OASIS-2 participant MRI, an MRI segmentation, or an atlas registered to the study cohort. The website does not claim voxel-level localization or regional measurements.

## Model prediction display

The ELM produces a global class prediction for each evaluated MRI session. The outcome panel is computed from the saved 60-session holdout confusion matrix:

| Observed / predicted | Demented | Nondemented |
|---|---:|---:|
| Demented | 25 | 1 |
| Nondemented | 0 | 34 |

The four selectable cells correspond to true positives (25), false negatives (1), false positives (0), and true negatives (34). The colored whole-brain outline is a **class-level presentation cue**, not a localization of disease or an individualized prediction probability. Session-level evaluation contains repeated participants across training and testing partitions; it is not participant-disjoint clinical validation.

Selecting a study variable highlights it as a **global or clinical predictor**. eTIV and nWBV are global structural volumes; CDR and MMSE are clinical/cognitive measures, and education is demographic. None supplies a regional attribution map for the ELM in the present dataset.

## Maintaining the site

The website is a static GitHub Pages project. Its figures and outcome counts are generated from aggregate result artifacts using:

```bash
python scripts/build_site.py
```

The anatomy image is distributed in `docs/assets/brain-lateral.webp`, while `docs/assets/site.js` contains region descriptions, callout coordinates, and interactions. All research tables remain available separately. For a subject-specific regional MRI map, the model would need to be retrained with appropriately processed, consented regional MRI features and evaluated separately.
