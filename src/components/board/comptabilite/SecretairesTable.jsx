import React from 'react';
import { Building2, Mail, Pencil, Phone, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function SecretairesTable({ secretaires, onEdit, onDelete }) {
  if (secretaires.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 shadow-sm">
        Aucune secrétaire enregistrée pour le moment.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.06)]">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50/90 text-slate-700">
            <tr>
              <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide">Secrétaire</th>
              <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide">Contact</th>
              <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide">Bureaux</th>
              <th className="px-5 py-4 text-left text-xs font-bold uppercase tracking-wide">Responsables liés</th>
              <th className="px-5 py-4 text-center text-xs font-bold uppercase tracking-wide">Statut</th>
              <th className="px-5 py-4 text-right text-xs font-bold uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {secretaires.map((secretaire) => (
              <tr key={secretaire.id} className="border-t border-slate-100 align-top transition-colors hover:bg-slate-50/70">
                <td className="px-5 py-5">
                  <div className="space-y-1">
                    <p className="text-sm font-bold uppercase tracking-wide text-slate-900">{secretaire.nom_complet}</p>
                    <p className="text-xs text-slate-500">{(secretaire.bureau_noms || []).length} bureau(x) rattaché(s)</p>
                  </div>
                </td>
                <td className="px-5 py-5 text-slate-600">
                  <div className="space-y-3">
                    <p className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-sm"><Phone className="h-4 w-4 text-slate-400" /> {secretaire.telephone}</p>
                    <p className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1.5 text-sm break-all"><Mail className="h-4 w-4 text-slate-400" /> {secretaire.email}</p>
                  </div>
                </td>
                <td className="px-5 py-5 text-slate-600">
                  <div className="flex flex-wrap gap-2">
                    {(secretaire.bureau_noms || []).map((bureau, index) => (
                      <span key={`${secretaire.id}-bureau-${index}`} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
                        <Building2 className="h-4 w-4 text-slate-400" />
                        {bureau}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-5 text-slate-600">
                  <div className="flex flex-wrap gap-2">
                    {(secretaire.responsable_noms || []).map((responsable, index) => (
                      <span key={`${secretaire.id}-resp-${index}`} className="inline-flex rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">
                        {responsable}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-5 text-center">
                  <span className={secretaire.actif === false ? 'inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-slate-600' : 'inline-flex rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-emerald-700'}>
                    {secretaire.actif === false ? 'Inactive' : 'Active'}
                  </span>
                </td>
                <td className="px-5 py-5">
                  <div className="flex justify-end gap-2 whitespace-nowrap">
                    <Button type="button" variant="outline" size="sm" className="rounded-xl border-slate-200 bg-white hover:bg-slate-50" onClick={() => onEdit(secretaire)}>
                      <Pencil className="h-4 w-4" />
                      Modifier
                    </Button>
                    <Button type="button" variant="destructive" size="sm" className="rounded-xl" onClick={() => onDelete(secretaire)}>
                      <Trash2 className="h-4 w-4" />
                      Supprimer
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}