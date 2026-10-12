"""Recreate EDA themes and objectively summarize out-of-fold performance."""
import argparse,csv
from pathlib import Path
from collections import Counter
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from sklearn.metrics import roc_curve
from .data import read_records,select_experiment,COMMON_FEATURES,get_numeric

plt.rcParams.update({'figure.dpi':130,'savefig.dpi':190,'font.size':10,'axes.spines.top':False,
                     'axes.spines.right':False,'axes.titleweight':'semibold'})

def store(fig, folder,name):
    fig.tight_layout(pad=2)
    fig.savefig(folder/(name+'.png'),bbox_inches='tight',facecolor='white')
    fig.savefig(folder/(name+'.svg'),bbox_inches='tight',facecolor='white')
    plt.close(fig)

def main(root='.', data='data/processed/oasis_longitudinal.csv'):
    root=Path(root);dest=root/'results/figures';dest.mkdir(parents=True,exist_ok=True)
    records=read_records(root/data if not Path(data).is_absolute() else data)
    base=select_experiment(records,'baseline_ever')
    counts=Counter(r['Group'] for r in records if int(r['Visit'])==1)
    fig,ax=plt.subplots(figsize=(7.4,4.2))
    names=['Nondemented','Demented','Converted'];vals=[counts[x] for x in names]
    ax.bar(names,vals,color=['#4b79a1','#dd8353','#a575a5'],width=.65)
    for i,v in enumerate(vals):ax.text(i,v+1,str(v),ha='center',size=10)
    ax.set_ylim(0,85);ax.set_ylabel('Unique participants');ax.set_title('OASIS-2 baseline diagnostic-group counts')
    store(fig,dest,'figure_02_group_distribution')

    fig,ax=plt.subplots(figsize=(7.4,4.2))
    ct=Counter((r['Group'],r['M/F']) for r in records if int(r['Visit'])==1)
    for j,s in enumerate(['F','M']):
        bottom=[ct[(n,'F')] if s=='M' else 0 for n in names]
        ax.bar(names,[ct[(n,s)] for n in names],bottom=bottom,label=('Female' if s=='F' else 'Male'),
               color=('#a486bd' if s=='F' else '#7bb8bb'))
    ax.set_ylabel('Unique participants');ax.set_title('Group by recorded sex — baseline visit');ax.legend(frameon=False)
    store(fig,dest,'figure_03_sex_group')

    fig,ax=plt.subplots(figsize=(8.2,4))
    age=[int(r['Age']) for r in records if int(r['Visit'])==1 and r['Group']!='Nondemented']
    ax.hist(age,bins=range(59,99,3),color='#4b79a1',edgecolor='white')
    ax.set_xlabel('Age at first visit (years)');ax.set_ylabel('Participants')
    ax.set_title('Baseline ages: ever demented or converted (follow-up label)')
    store(fig,dest,'figure_04_baseline_age')

    ff=['Age','EDUC','SES','MMSE','CDR','eTIV','nWBV','ASF']
    rows=[]
    for r in records:
        rows.append([get_numeric(r,f) for f in ff])
    a=np.array(rows,dtype=float)
    cm=np.empty((len(ff),len(ff)))
    for i in range(len(ff)):
        for j in range(len(ff)):
            ok=np.isfinite(a[:,i])&np.isfinite(a[:,j]); cm[i,j]=np.corrcoef(a[ok,i],a[ok,j])[0,1]
    fig,ax=plt.subplots(figsize=(8,6.7))
    img=ax.imshow(cm,cmap='RdBu_r',vmin=-1,vmax=1)
    ax.set_xticks(range(len(ff)),ff,rotation=45,ha='right');ax.set_yticks(range(len(ff)),ff)
    for (i,j),x in np.ndenumerate(cm):
        ax.text(j,i,f'{x:.2f}',ha='center',va='center',fontsize=8,color='white' if abs(x)>.65 else '#1d2733')
    fig.colorbar(img,ax=ax,shrink=.82,label='Pearson r');ax.set_title('Clinical-feature correlation (all sessions)')
    store(fig,dest,'figure_05_correlations')

    table=root/'results/tables/model_comparison.csv'
    pred=root/'results/predictions/oof_predictions.csv'
    if table.exists():
        metrics=list(csv.DictReader(table.open()))
        for experiment in sorted(set(x['experiment'] for x in metrics)):
            f=[m for m in metrics if m['experiment']==experiment]
            f.sort(key=lambda d:float(d['balanced_accuracy']) if 'balanced_accuracy' in d else float(d['accuracy']),reverse=True)
            fig,ax=plt.subplots(figsize=(9.2,4.6))
            ax.bar([x['model'] for x in f],[float(x['accuracy']) for x in f],color='#4479a5')
            ax.set_ylim(0,1);ax.set_ylabel('OOF accuracy');ax.set_title(f'Model comparison — {experiment}')
            for i,x in enumerate(f):ax.text(i,float(x['accuracy'])+.015,f"{float(x['accuracy']):.2f}",ha='center',fontsize=8)
            store(fig,dest,'model_accuracy_'+experiment)
    if pred.exists():
        rows=list(csv.DictReader(pred.open()))
        for experiment in sorted(set(x['experiment'] for x in rows)):
            sample=[r for r in rows if r['experiment']==experiment and r['model']=='ELM']
            y=np.array([int(r['actual']) for r in sample]);p=np.array([float(r['prob_positive']) for r in sample])
            fpr,tpr,_=roc_curve(y,p)
            fig,ax=plt.subplots(figsize=(5.7,5.2));ax.plot(fpr,tpr,label='ELM (out-of-fold)',color='#4479a5',lw=2)
            ax.plot([0,1],[0,1],'--',color='#999999',label='Chance');ax.set(xlim=(0,1),ylim=(0,1),xlabel='False positive rate',ylabel='True positive rate',title='ROC — '+experiment)
            ax.legend(loc='lower right',frameon=False)
            store(fig,dest,'elm_roc_'+experiment)
    holdout_file=root/'results/predictions/elm_session_predictions.csv'
    if holdout_file.exists():
        from sklearn.metrics import confusion_matrix
        subset=list(csv.DictReader(holdout_file.open()))
        y=np.array([int(r['actual']) for r in subset]); p=np.array([int(r['predicted']) for r in subset]); q=np.array([float(r['prob_positive']) for r in subset])
        mat=confusion_matrix(y,p,labels=[0,1])
        fig,ax=plt.subplots(figsize=(5.4,4.4))
        ax.imshow(mat,cmap='Blues',vmin=0,vmax=max(mat.flat)*1.16)
        ax.set(xticks=[0,1],yticks=[0,1],xticklabels=['Nondemented','Demented'],yticklabels=['Nondemented','Demented'],
               xlabel='Predicted diagnostic group',ylabel='Recorded diagnostic group',
               title='ELM session-level test set')
        for (i,j),n in np.ndenumerate(mat):
            ax.text(j,i,str(n),ha='center',va='center',fontsize=22,color='white' if n>=max(mat.flat)*.6 else '#16304d')
        store(fig,dest,'elm_session_holdout_confusion')
        fpr,tpr,_=roc_curve(y,q)
        fig,ax=plt.subplots(figsize=(5.6,4.8))
        ax.plot(fpr,tpr,color='#2474a8',linewidth=2,label='Session-level ELM')
        ax.plot([0,1],[0,1],'--',color='#888',label='Chance')
        ax.set(xlim=(0,1),ylim=(0,1),xlabel='False positive rate',ylabel='True positive rate',
               title='ELM session holdout ROC')
        ax.legend(loc='lower right',frameon=False)
        store(fig,dest,'elm_session_holdout_roc')
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--root',default='.');p.add_argument('--data',default='data/processed/oasis_longitudinal.csv');a=p.parse_args();main(a.root,a.data)
