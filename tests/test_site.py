"""Tests for the published interactive results page and its data contract."""
import csv
import json
import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class WebsiteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        page=(ROOT/'docs/index.html').read_text(encoding='utf-8')
        match=re.search(r'<script type="application/json" id="project-data">(.*?)</script>',page,re.S)
        if not match:
            raise AssertionError('Project data must be available inside docs/index.html')
        cls.page=page
        cls.content=json.loads(match.group(1))

    def test_cohort_and_age_chart_agree(self):
        cohort=self.content['cohort']
        self.assertEqual((cohort['subjects'],cohort['sessions']),(150,373))
        self.assertEqual(cohort['groups'],{'Converted':14,'Demented':64,'Nondemented':72})
        self.assertEqual(sum(row['count'] for row in cohort['ages']),150)

    def test_holdout_metrics_derived_from_saved_counts(self):
        record=self.content['experiments']['session_holdout'][0]
        self.assertEqual((record['tn'],record['fp'],record['fn'],record['tp']),(34,0,1,25))
        self.assertAlmostEqual(record['accuracy'],59/60,places=12)
        self.assertAlmostEqual(record['sensitivity'],25/26,places=12)
        self.assertAlmostEqual(record['specificity'],1.0,places=12)
        self.assertAlmostEqual(record['f1'],50/51,places=12)

    def test_aggregate_model_tables_match_site(self):
        with (ROOT/'results/tables/model_comparison.csv').open(newline='',encoding='utf8') as fd:
            source={(r['experiment'],r['model']):r for r in csv.DictReader(fd)}
        total=0
        for exp,records in self.content['experiments'].items():
            if exp=='session_holdout': continue
            for record in records:
                previous=source[(exp,record['model'])]
                for key in ('accuracy','sensitivity','specificity','f1','auc'):
                    self.assertAlmostEqual(float(previous[key]),record[key],places=12)
                total+=1
        self.assertEqual(total,27)

    def test_atlas_controls_and_data_scoping(self):
        import re
        self.assertIn('id="brain-canvas"', self.page)
        self.assertIn('assets/brain-lateral.webp', self.page)
        self.assertIn('data-outcome="tp"', self.page)
        self.assertIn('data-outcome="fn"', self.page)
        for region in ('frontal','parietal','temporal','occipital','cerebellum','hippocampus','amygdala','ventricles'):
            self.assertIn(f'data-region="{region}"', self.page)
        for view in ('cortex', 'memory', 'outputs'):
            self.assertIn(f'data-view="{view}"', self.page)
        for layer in ('structure', 'features', 'network'):
            self.assertIn(f'data-layer="{layer}"', self.page)
        for feature in ('CDR', 'eTIV', 'EDUC', 'MMSE', 'nWBV'):
            self.assertIn(f'data-feature="{feature}"', self.page)
        self.assertIn('not a patient MRI', self.page)
        self.assertIn('assets/site.css', self.page)
        self.assertNotIn('__PROJECT_DATA__', self.page)
        self.assertNotRegex(self.page, r'OAS2_\d{4}')

    def test_brain_image_available_and_outcome_counts_in_source(self):
        image=ROOT/'docs/assets/brain-lateral.webp'
        self.assertTrue(image.is_file() and image.stat().st_size>100_000)
        hold=self.content['experiments']['session_holdout'][0]
        self.assertEqual(hold['tp']+hold['tn']+hold['fp']+hold['fn'],60)
        script=(ROOT/'docs/assets/site.js').read_text()
        self.assertIn('hold[key]',script)
        self.assertIn('REGIONS',script)

    def test_page_contains_published_article_link_and_no_personal_records(self):
        self.assertIn('https://doi.org/10.1615/JMachLearnModelComput.2023048413',self.page)
        self.assertNotIn('OAS2_0001',self.page)
        self.assertNotIn('MRI ID',self.page)
        self.assertIn('assets/site.js',self.page)


if __name__ == '__main__':
    unittest.main()
