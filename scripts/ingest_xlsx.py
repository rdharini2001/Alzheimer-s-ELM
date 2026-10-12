#!/usr/bin/env python3
"""Convert the provided OASIS Excel worksheet to CSV using only Python stdlib.

Supports ordinary XLSX first-sheet data with shared/inline strings. This is
not a universal XLSX implementation. Tested against the supplied OASIS-2 file.
No calculation, scaling or imputation occurs at ingestion.
"""
import argparse,csv,re,sys,zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

NS={'x':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}

def column_index(address):
    label=re.match(r'[A-Z]+',address).group()
    i=0
    for char in label:i=i*26+ord(char)-64
    return i-1

def convert(src,dst):
    with zipfile.ZipFile(src) as archive:
        shared=[]
        if 'xl/sharedStrings.xml' in archive.namelist():
            x=ET.fromstring(archive.read('xl/sharedStrings.xml'))
            shared=[''.join(n.text or '' for n in el.findall('.//x:t',NS)) for el in x.findall('x:si',NS)]
        xml=ET.fromstring(archive.read('xl/worksheets/sheet1.xml'))
        rows=[]
        for row in xml.findall('.//x:sheetData/x:row',NS):
            out=['']*15
            for cell in row.findall('x:c',NS):
                i=column_index(cell.attrib['r'])
                if i>=15:continue
                value=cell.find('x:v',NS)
                if cell.attrib.get('t')=='inlineStr':
                    out[i]=''.join(n.text or '' for n in cell.findall('.//x:t',NS))
                elif value is not None and value.text is not None:
                    out[i]=shared[int(value.text)] if cell.attrib.get('t')=='s' else value.text
            rows.append(out)
    expected=['Subject ID','MRI ID','Group','Visit','MR Delay','M/F','Hand','Age','EDUC','SES','MMSE','CDR','eTIV','nWBV','ASF']
    if rows[0]!=expected:raise ValueError('Unexpected first-sheet headers')
    if len(rows)!=374:raise ValueError(f'Expected 374 worksheet lines, got {len(rows)}')
    Path(dst).parent.mkdir(parents=True,exist_ok=True)
    with open(dst,'w',newline='',encoding='utf-8') as f:csv.writer(f).writerows(rows)
    print(f'Wrote {dst}: {len(rows)-1} records')

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('xlsx');parser.add_argument('--output',default='data/processed/oasis_longitudinal.csv')
    args=parser.parse_args();convert(args.xlsx,args.output)
