# OASIS-2 input schema and unit of analysis

The source spreadsheet contains **373 rows (= MRI sessions) and 150 unique Subject IDs**. Each subject contributes between 2 and 5 sessions. The file is an OASIS-2 *clinical/derived measures table*, not a folder of T1-weighted MRI image volumes.

| Column | Meaning | Type / handling |
|---|---|---|
| `Subject ID` | Repeated-visit participant identifier | Join/group key. **Never** a predictor. |
| `MRI ID` | Unique visit/image session identifier | Audit ID only. **Never** a predictor. |
| `Group` | Longitudinal participant classification: `Nondemented`, `Demented`, `Converted` | Target/grouping metadata. **Never** a predictor. |
| `Visit` | Sequence number for a session | Numeric; visit-level analyses only. |
| `MR Delay` | Time since initial visit, in days | Numeric; visit-level analyses only. |
| `M/F` | Recorded female/male sex | Static numeric F=0, M=1; interpret subgroup results descriptively. |
| `Hand` | Handedness | All supplied records right-handed; excluded as constant. |
| `Age` | Age at visit, years | Numeric |
| `EDUC` | Education, recorded years | Numeric |
| `SES` | Socioeconomic-status ordinal score | Numeric; 19 absent records, fold-only median imputation. |
| `MMSE` | Mini-Mental State Examination score | Numeric; 2 absent records, fold-only median imputation. |
| `CDR` | Clinical Dementia Rating score | Clinical feature in CDR-inclusive model protocols and the session-level holdout; omitted from CDR-proxy and CDR-excluded experiments. |
| `eTIV` | Estimated total intracranial volume | Numeric, derived imaging measurement. |
| `nWBV` | Normalized whole-brain volume | Numeric, derived imaging measurement. |
| `ASF` | Atlas scaling factor | Numeric, derived imaging measurement. |

## Definitions with consequential differences

- `Group == Converted` is assigned to all follow-up sessions of the 14 converters even though earlier scans may have CDR 0. **It does not mean all their visits show dementia.**
- Demented/non-demented group is a participant-level classification, while CDR is visit-specific clinical rating. They are closely related but not interchangeable. Two `Nondemented` visits have CDR 0.5.
- A future-ever-positive label at a baseline visit is not necessarily a contemporaneous disease diagnosis, and duration of follow-up is variable.
- Features already extracted from MRI (eTIV/nWBV/ASF) do not allow you to reconstruct voxel-based tissue segmentation or learn from raw MRI images.

## Access and citation

The official OASIS-2 page is https://sites.wustl.edu/oasisbrains/home/oasis-2/ and the current OASIS access information is https://sites.wustl.edu/oasisbrains/request-access/ . Read the data-use conditions before public redistribution. Acknowledge OASIS-2 and cite Marcus et al., *Journal of Cognitive Neuroscience* 22:2677-2684, doi:10.1162/jocn.2009.21407. Participant re-identification is prohibited.
