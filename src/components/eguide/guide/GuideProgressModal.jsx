import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

function Step({ label, status }) {
  const isRunning = status === 'running';
  const isDone = status === 'done';
  const isError = status === 'error';
  return (
    <div className="flex items-center gap-3 py-2">
      {isRunning ? (
        <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
      ) : isDone ? (
        <CheckCircle2 className="w-4 h-4 text-green-600" />
      ) : isError ? (
        <AlertCircle className="w-4 h-4 text-red-600" />
      ) : (
        <div className="w-4 h-4 rounded-full bg-slate-200" />
      )}
      <span className="text-sm text-slate-700">{label}</span>
    </div>
  );
}

export default function GuideProgressModal({ open, onOpenChange, stepStatus, onDownload, canDownload, title = 'Génération du guide', description, steps = [] }) {
  const resolvedSteps = steps.length > 0 ? steps : [
    { key: 'step1', label: 'Fusion de la couverture et des documents' },
    { key: 'step2', label: 'Génération des pages du guide' },
    { key: 'step3', label: 'Fusion finale' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" aria-describedby="guide-generation-description">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="mt-2 space-y-2">
          {resolvedSteps.map((step) => (
            <Step key={step.key} label={step.label} status={stepStatus?.[step.key]} />
          ))}
        </div>
        {stepStatus?.error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {stepStatus.error}
          </div>
        )}
        {description && (
          <p id="guide-generation-description" className="mt-3 text-xs text-slate-500">
            {description}
          </p>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fermer</Button>
          <Button onClick={onDownload} disabled={!canDownload}>Télécharger le PDF</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}