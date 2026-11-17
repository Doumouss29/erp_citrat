import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const normalizeTf = (value) => String(value || '').replace(/^TF\s*/i, '').trim();

export default function AttestationLotSelector({ lots = [], selectedLotIds = [], onToggleLot, onToggleAll, allSelected, attributairesByLot = {} }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <LabelSection count={lots.length} />
        <div className="flex items-center gap-2">
          <Checkbox id="select-all-filtered-lots" checked={allSelected} onCheckedChange={onToggleAll} />
          <label htmlFor="select-all-filtered-lots" className="text-sm cursor-pointer">Sélectionner tous</label>
        </div>
      </div>

      <ScrollArea className="h-56 border rounded-lg p-3">
        <div className="space-y-2">
          {lots.length > 0 ? lots.map((lot) => {
            const checked = selectedLotIds.includes(lot.id);
            const names = (attributairesByLot[lot.id] || []).map((attr) => attr.type_attributaire === 'physique'
              ? `${attr.nom || ''} ${attr.prenom || ''}`.trim()
              : (attr.raison_sociale || attr.nom || '').trim()).filter(Boolean);

            return (
              <button
                key={lot.id}
                type="button"
                onClick={() => onToggleLot(lot.id)}
                className={cn('w-full rounded-md border px-3 py-2 text-left hover:bg-slate-50', checked && 'border-primary bg-slate-50')}
              >
                <div className="flex items-start gap-3">
                  <span className={cn('mt-0.5 h-4 w-4 shrink-0 rounded-sm border border-primary', checked && 'bg-primary')} />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-sm text-slate-900">Lot {lot.numero_lot || '-'}{lot.ilot?.numero_ilot ? ` • Îlot ${lot.ilot.numero_ilot}` : ''}</div>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {lot.TF ? <Badge variant="outline">{normalizeTf(lot.TF)}</Badge> : null}
                      {names.length > 0 ? <Badge variant="outline">{names.join(', ')}</Badge> : null}
                    </div>
                  </div>
                </div>
              </button>
            );
          }) : <p className="text-sm text-slate-500">Aucun lot ne correspond au filtre choisi.</p>}
        </div>
      </ScrollArea>

      <p className="text-xs text-slate-500 mt-2">
        {selectedLotIds.length === 0
          ? "Tous les lots issus du filtre seront inclus si aucun lot n'est coché."
          : `${selectedLotIds.length} lot(s) sélectionné(s)`}
      </p>
    </div>
  );
}

function LabelSection({ count }) {
  return <div className="text-sm font-medium text-slate-900">5. Sélectionnez le ou les lots à inclure <span className="text-slate-500 font-normal">({count})</span></div>;
}