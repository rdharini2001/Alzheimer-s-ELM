# Obtain the study data

The project uses the OASIS-2 longitudinal demographic/MRI-derived measures spreadsheet. Request access through the [OASIS project](https://sites.wustl.edu/oasisbrains/request-access/); read and accept its [data-use terms](https://sites.wustl.edu/oasisbrains/). Download the demographic spreadsheet, and place it at:

`data/raw/oasis_longitudinal_demographics.xlsx`

Convert to the expected 15-column table:

```bash
python scripts/ingest_xlsx.py data/raw/oasis_longitudinal_demographics.xlsx
```

The pipeline reads `data/processed/oasis_longitudinal.csv`. Files containing individual participants are excluded from the public Git repository. The private research archive contains the user's supplied dataset for local reproduction. The workbook and CSV are not licensed under the project's MIT source-code license.

**OASIS-2 citation:** Marcus, D. S., Fotenos, A. F., Csernansky, J. G., Morris, J. C., & Buckner, R. L. (2010). Open Access Series of Imaging Studies: Longitudinal MRI Data in Nondemented and Demented Older Adults. *Journal of Cognitive Neuroscience*, 22, 2677–2684. DOI: 10.1162/jocn.2009.21407.
