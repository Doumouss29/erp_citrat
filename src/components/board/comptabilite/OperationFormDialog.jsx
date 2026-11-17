import { FormSelect } from "@/components/ui/form-select";
import React, { useEffect, useMemo, useState } from 'react';
import { Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getMonthYearCode(dateValue) {
  const date = new Date(dateValue);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}-${year}`;
}

function buildNextBonNumber(dateValue, operations, currentId, typeOperation = 'entree') {
  const suffix = getMonthYearCode(dateValue);
  const usedNumbers = operations
    .filter((item) => item.id !== currentId && item.type_operation === typeOperation)
    .map((item) => item.numero_bon || '')
    .filter((value) => value.endsWith(`-${suffix}`))
    .map((value) => Number(value.split('-')[0]))
    .filter((value) => !Number.isNaN(value));

  const nextNumber = (usedNumbers.length ? Math.max(...usedNumbers) : 0) + 1;
  return `${String(nextNumber).padStart(3, '0')}-${suffix}`;
}

function getOperationBonNumero(operation, initialType, existingOperations) {
  if (operation?.numero_bon) return operation.numero_bon;
  const typeOperation = operation?.type_operation || initialType;
  return buildNextBonNumber(operation?.date_operation || getToday(), existingOperations, operation?.id, typeOperation);
}

function formatAmountWithDots(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function numberToFrenchWords(value) {
  const units = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
  const tens = ['', '', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante'];

  const belowHundred = (n) => {
    if (n < 17) return units[n];
    if (n < 20) return `dix-${units[n - 10]}`;
    if (n < 70) {
      const ten = Math.floor(n / 10);
      const unit = n % 10;
      if (unit === 0) return tens[ten];
      if (unit === 1) return `${tens[ten]} et un`;
      return `${tens[ten]}-${units[unit]}`;
    }
    if (n < 80) {
      if (n === 71) return 'soixante et onze';
      return `soixante-${belowHundred(n - 60)}`;
    }
    if (n === 80) return 'quatre-vingts';
    if (n < 100) return `quatre-vingt-${belowHundred(n - 80)}`;
    return '';
  };

  const belowThousand = (n) => {
    if (n < 100) return belowHundred(n);
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    const hundredWord = hundred === 1 ? 'cent' : `${units[hundred]} cent`;
    if (rest === 0) return hundred > 1 ? `${hundredWord}s` : hundredWord;
    return `${hundredWord} ${belowHundred(rest)}`;
  };

  const number = Number(value || 0);
  if (!number) return 'zéro franc CFA';
  if (number < 1000) return `${belowThousand(number)} francs CFA`;
  if (number < 1000000) {
    const thousands = Math.floor(number / 1000);
    const rest = number % 1000;
    const thousandsWord = thousands === 1 ? 'mille' : `${belowThousand(thousands)} mille`;
    return `${thousandsWord}${rest ? ` ${belowThousand(rest)}` : ''} francs CFA`;
  }
  const millions = Math.floor(number / 1000000);
  const rest = number % 1000000;
  const millionsWord = millions === 1 ? 'un million' : `${belowThousand(millions)} millions`;
  if (!rest) return `${millionsWord} de francs CFA`;
  if (rest < 1000) return `${millionsWord} ${belowThousand(rest)} francs CFA`;
  const thousands = Math.floor(rest / 1000);
  const remainder = rest % 1000;
  const thousandsWord = thousands === 1 ? 'mille' : `${belowThousand(thousands)} mille`;
  return `${millionsWord} ${thousandsWord}${remainder ? ` ${belowThousand(remainder)}` : ''} francs CFA`;
}

export default function OperationFormDialog({ open, onOpenChange, operation, initialType = 'entree', bureaux, secretaires = [], existingOperations = [], defaultBureau, isAdmin, isSubmitting, onValuesChange, onSubmit }) {
   const [values, setValues] = useState({
     type_operation: 'entree',
     montant: '',
     description: '',
     beneficiaire: '',
     observation: '',
     montant_lettres: '',
     mode_reglement: 'espece',
     numero_bon: '',
     bureau_id: '',
     date_operation: getToday()
   });
  const [justificatifFile, setJustificatifFile] = useState(null);

  const bureauSelection = useMemo(() => {
    return bureaux.find((bureau) => bureau.id === values.bureau_id) || defaultBureau || null;
  }, [bureaux, defaultBureau, values.bureau_id]);

  const secretaireSelection = useMemo(() => {
    if (!bureauSelection?.id) return null;
    return secretaires.find((item) => Array.isArray(item.bureau_ids) && item.bureau_ids.includes(bureauSelection.id)) || null;
  }, [secretaires, bureauSelection]);

  useEffect(() => {
    const bonNumber = getOperationBonNumero(operation, initialType, existingOperations);
    setValues({
      type_operation: operation?.type_operation || initialType,
      montant: operation?.montant || '',
      description: operation?.description || '',
      beneficiaire: operation?.beneficiaire || '',
      observation: operation?.observation || '',
      montant_lettres: operation?.montant_lettres || '',
      mode_reglement: operation?.mode_reglement || 'espece',
      numero_bon: bonNumber,
      bureau_id: operation?.bureau_id || defaultBureau?.id || '',
      date_operation: operation?.date_operation || getToday()
    });
    setJustificatifFile(null);
  }, [operation, defaultBureau, open, initialType, existingOperations]);

  useEffect(() => {
    if (!open || operation) return;
    const nextNumero = buildNextBonNumber(values.date_operation, existingOperations, null, values.type_operation);
    // Toujours mettre à jour le numéro pour assurer l'incrémentation
    setValues((current) => ({ ...current, numero_bon: nextNumero }));
  }, [values.date_operation, values.type_operation, open, operation, existingOperations]);

  useEffect(() => {
    setValues((current) => {
      const amountInWords = numberToFrenchWords(current.montant).toUpperCase();
      if (current.montant_lettres === amountInWords || !current.montant) {
        return current.montant ? current : { ...current, montant_lettres: '' };
      }
      return { ...current, montant_lettres: amountInWords };
    });
  }, [values.montant]);

  useEffect(() => {
    if (!open || !onValuesChange) return;
    onValuesChange({
      ...values,
      bureau_nom: bureauSelection?.nom || '',
      bureau_code: bureauSelection?.code || '',
      secretaire_nom: secretaireSelection?.nom_complet || ''
    });
  }, [open, values, bureauSelection, secretaireSelection, onValuesChange]);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({
      values: {
        ...values,
        numero_bon: values.numero_bon || buildNextBonNumber(values.date_operation, existingOperations, operation?.id, values.type_operation),
        montant: Number(String(values.montant || 0).replace(/\./g, '')),
        bureau_code: bureauSelection?.code || operation?.bureau_code || '',
        secretaire_nom: secretaireSelection?.nom_complet || operation?.secretaire_nom || ''
      },
      file: justificatifFile,
      currentOperation: operation || null
    });
  };

  const isEntree = values.type_operation === 'entree';
  const formTitle = isEntree ? 'BON D’ENTRÉE DE CAISSE' : 'BON DE SORTIE DE CAISSE';
  const personLabel = isEntree ? 'Nom et prénoms' : 'Récepteur (Nom et prénoms)';
  const reasonLabel = isEntree ? 'Objet' : 'Motif sortie de caisse';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-7xl rounded-3xl border-slate-200 p-0 overflow-hidden">
        <div className="bg-[#f8f6ee] p-4 sm:p-6">
          <DialogHeader className="px-2">
            <DialogTitle className="text-2xl text-slate-900">{operation ? 'Modifier un bon de caisse' : 'Nouveau bon de caisse'}</DialogTitle>
            <DialogDescription className="text-sm text-slate-600">
              Formulaire présenté selon vos modèles de bon d’entrée et de bon de sortie.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="mt-4 rounded-[28px] border-2 border-[#d6d3c6] bg-white p-5 shadow-sm sm:p-8">
            <div className="border-b border-slate-200 pb-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:justify-center">
                  <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/696fe5195586fd61f32bcb08/47c566a2e_images.png" alt="CITRAT" className="h-20 w-auto object-contain" />
                  <div className="text-center">
                    <p className="text-2xl font-bold text-[#1f3f95]">Cabinet de Géomètre Expert Soro Nanga Sarl</p>
                    <p className="mt-1 text-base text-slate-600">Foncier – SIG – VRD – Topographie – Géodésie – Formations</p>
                    <p className="text-base text-slate-600">cgesn2007@yahoo.fr · Tél : 27 20 37 02 05 / 05 05 42 52 69 / 01 01 40 00 06</p>
                  </div>
                </div>

                <div className="flex w-full flex-col items-center justify-center gap-4 pt-4 lg:flex-row lg:items-end lg:gap-8">
                  <h2 className="text-center text-4xl font-black uppercase tracking-wide text-[#2246a3] lg:flex-1">{formTitle}</h2>
                  <div className="grid w-full max-w-[360px] gap-3 sm:grid-cols-2">
                    <label className="space-y-2 text-sm text-slate-700 text-left">
                      <span className="font-semibold">N°</span>
                      <input type="text" value={values.numero_bon} readOnly className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-4 font-bold text-red-600 outline-none" />
                    </label>
                    <label className="space-y-2 text-sm text-slate-700 text-left">
                      <span className="font-semibold">Date</span>
                      <input type="date" value={values.date_operation} onChange={(event) => setValues((current) => ({ ...current, date_operation: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-300 px-4 text-slate-900 outline-none focus:border-[#1f3f95]" required />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr] xl:items-start">
              <div className="grid gap-5 lg:grid-cols-2">
                <label className="space-y-2 text-sm text-slate-700 lg:col-span-2">
                  <span className="font-semibold">{personLabel}</span>
                  <input type="text" value={values.beneficiaire} onChange={(event) => setValues((current) => ({ ...current, beneficiaire: event.target.value }))} className="h-12 w-full border-0 border-b-2 border-dotted border-slate-400 px-1 text-base text-slate-900 outline-none focus:border-[#1f3f95]" placeholder="Saisir le nom complet" />
                </label>

                <label className="space-y-2 text-sm text-slate-700 lg:col-span-2">
                  <span className="font-semibold">{reasonLabel}</span>
                  <textarea value={values.description} onChange={(event) => setValues((current) => ({ ...current, description: event.target.value }))} className="min-h-[84px] w-full resize-none border-0 border-b-2 border-dotted border-slate-400 px-1 py-2 text-base text-slate-900 outline-none focus:border-[#1f3f95]" placeholder="Décrire l’objet ou le motif" required />
                </label>

                {isEntree && (
                  <label className="space-y-2 text-sm text-slate-700">
                    <span className="font-semibold">Mode de règlement</span>
                    <FormSelect value={values.mode_reglement} onChange={(event) => setValues((current) => ({ ...current, mode_reglement: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-300 px-4 text-slate-900 outline-none focus:border-[#1f3f95]">
                      <option value="espece">Espèce</option>
                      <option value="cheque">Chèque</option>
                    </FormSelect>
                  </label>
                )}

                <label className="space-y-2 text-sm text-slate-700">
                  <span className="font-semibold">Montant en chiffres</span>
                  <input type="text" inputMode="numeric" value={formatAmountWithDots(values.montant)} onChange={(event) => setValues((current) => ({ ...current, montant: event.target.value.replace(/\D/g, '') }))} className="h-12 w-full border-0 border-b-2 border-dotted border-slate-400 px-1 text-base text-slate-900 outline-none focus:border-[#1f3f95]" required />
                </label>

                <label className="space-y-2 text-sm text-slate-700 lg:col-span-2">
                  <span className="font-semibold">Montant en lettres</span>
                  <input type="text" value={values.montant_lettres} readOnly className="h-12 w-full border-0 border-b-2 border-dotted border-slate-400 bg-transparent px-1 text-base text-slate-900 outline-none" placeholder="Écriture automatique du montant" />
                </label>

                <label className="space-y-2 text-sm text-slate-700">
                  <span className="font-semibold">Bureau</span>
                  {isAdmin ? (
                    <FormSelect value={values.bureau_id} onChange={(event) => setValues((current) => ({ ...current, bureau_id: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-300 px-4 text-slate-900 outline-none focus:border-[#1f3f95]" required>
                      <option value="">Choisir un bureau</option>
                      {bureaux.map((bureau) => (
                        <option key={bureau.id} value={bureau.id}>{bureau.nom}</option>
                      ))}
                    </FormSelect>
                  ) : (
                    <div className="flex h-11 items-center rounded-xl border border-slate-300 bg-slate-50 px-4 text-slate-900">
                      {bureauSelection?.nom || 'Aucun bureau assigné'}
                    </div>
                  )}
                </label>

                <label className="space-y-2 text-sm text-slate-700">
                  <span className="font-semibold">Observation / banque / contact</span>
                  <input type="text" value={values.observation} onChange={(event) => setValues((current) => ({ ...current, observation: event.target.value }))} className="h-11 w-full rounded-xl border border-slate-300 px-4 text-slate-900 outline-none focus:border-[#1f3f95]" placeholder="Information complémentaire" />
                </label>
              </div>

              <label className="block space-y-3 text-sm text-slate-700 xl:mt-1">
                <span className="font-semibold">Reçu ou facture justificatif(ve)</span>
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 xl:min-h-[260px]">
                  <div className="flex items-center gap-3 text-slate-700">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white shadow-sm">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">Ajouter un justificatif</p>
                      <p className="text-xs text-slate-500">PNG, JPG, PDF ou document bureautique.</p>
                    </div>
                  </div>
                  <input type="file" onChange={(event) => setJustificatifFile(event.target.files?.[0] || null)} className="mt-4 block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-white" />
                  {(justificatifFile || operation?.justificatif_nom) && (
                    <p className="mt-3 text-xs text-slate-500">Fichier sélectionné : {justificatifFile?.name || operation?.justificatif_nom}</p>
                  )}
                </div>
              </label>
            </div>

            <div className="mt-8 grid gap-6 border-t border-slate-200 pt-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-5 text-center">
                <p className="text-lg font-bold text-[#2246a3]">{isEntree ? 'VISA DU CLIENT' : 'Récepteur'}</p>
                <p className="mt-2 text-sm text-slate-500">Signature et contact</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-5 text-center">
                <p className="text-lg font-bold text-[#2246a3]">VISA DE LA TRÉSORIÈRE</p>
                <p className="mt-2 text-sm text-slate-500">{secretaireSelection?.nom_complet || 'Nom et signature'}</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" className="rounded-2xl" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" className="rounded-2xl bg-slate-900 hover:bg-slate-800" disabled={isSubmitting || !values.bureau_id}>
                {isSubmitting ? 'Enregistrement...' : operation ? 'Mettre à jour' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}