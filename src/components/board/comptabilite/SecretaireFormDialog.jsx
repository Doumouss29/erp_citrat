import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const defaultValues = {
  nom_complet: '',
  telephone: '',
  email: '',
  bureau_ids: [],
  actif: true
};

export default function SecretaireFormDialog({ open, onOpenChange, secretaire, bureaux, isSubmitting, onSubmit }) {
  const [values, setValues] = useState(defaultValues);

  useEffect(() => {
    if (!open) return;
    setValues(secretaire ? {
      nom_complet: secretaire.nom_complet || '',
      telephone: secretaire.telephone || '',
      email: secretaire.email || '',
      bureau_ids: secretaire.bureau_ids || [],
      actif: secretaire.actif !== false
    } : defaultValues);
  }, [open, secretaire]);

  const toggleBureau = (bureauId) => {
    setValues((current) => ({
      ...current,
      bureau_ids: current.bureau_ids.includes(bureauId)
        ? current.bureau_ids.filter((id) => id !== bureauId)
        : [...current.bureau_ids, bureauId]
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-3xl border-slate-200 p-0 overflow-hidden">
        <form onSubmit={handleSubmit} className="space-y-6 p-6 sm:p-8">
          <DialogHeader>
            <DialogTitle className="text-2xl text-slate-900">
              {secretaire ? 'Modifier la secrétaire' : 'Nouvelle secrétaire'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-600">
              <span className="font-medium text-slate-700">Nom complet</span>
              <input
                required
                value={values.nom_complet}
                onChange={(event) => setValues((current) => ({ ...current, nom_complet: event.target.value }))}
                className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-slate-900 outline-none focus:border-slate-400"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-600">
              <span className="font-medium text-slate-700">Téléphone</span>
              <input
                required
                value={values.telephone}
                onChange={(event) => setValues((current) => ({ ...current, telephone: event.target.value }))}
                className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-slate-900 outline-none focus:border-slate-400"
              />
            </label>

            <label className="space-y-2 text-sm text-slate-600 md:col-span-2">
              <span className="font-medium text-slate-700">Email</span>
              <input
                type="email"
                required
                value={values.email}
                onChange={(event) => setValues((current) => ({ ...current, email: event.target.value }))}
                className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-slate-900 outline-none focus:border-slate-400"
              />
            </label>
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Bureaux rattachés</p>
              <p className="mt-1 text-sm text-slate-500">Les responsables liés seront renseignés automatiquement selon les bureaux sélectionnés.</p>
            </div>
            <div className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
              {bureaux.map((bureau) => (
                <label key={bureau.id} className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={values.bureau_ids.includes(bureau.id)}
                    onChange={() => toggleBureau(bureau.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />
                  <span>
                    <span className="block font-semibold text-slate-900">{bureau.nom}</span>
                    <span className="block text-xs text-slate-500">Responsable : {bureau.responsable_nom || '—'}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <label className="inline-flex items-center gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={values.actif}
              onChange={(event) => setValues((current) => ({ ...current, actif: event.target.checked }))}
              className="h-4 w-4 rounded border-slate-300"
            />
            Secrétaire active
          </label>

          <DialogFooter className="gap-3 sm:justify-end">
            <Button type="button" variant="outline" className="rounded-2xl" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting || values.bureau_ids.length === 0} className="rounded-2xl bg-slate-900 hover:bg-slate-800">
              {secretaire ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}