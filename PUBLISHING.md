# Publishing the project

GitHub Pages serves `docs/index.html` directly. Open **Settings → Pages**, select **Deploy from a branch**, then choose `main` and `/docs`. The resulting page is available at `https://<account>.github.io/<repository>/`.

Source data are not included in the public GitHub archive. Researchers can obtain the spreadsheet from the OASIS project and run `python scripts/ingest_xlsx.py data/raw/oasis_longitudinal_demographics.xlsx` before `bash scripts/run_all.sh`.

After updating results, run `python scripts/build_site.py` to refresh the website. Do not commit the original data, session-level predictions, train/test manifests, or publisher PDF to a public repository unless the respective terms explicitly permit redistribution.
