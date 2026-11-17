import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export default function GuideTfSubFilter({ tfs, selectedTFs, onToggleTF, tfStats = {} }) {
  const [search, setSearch] = useState('');

  const filteredTfs = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tfs;
    return tfs.filter((tf) => String(tf).toLowerCase().includes(term));
  }, [tfs, search]);

  if (!tfs?.length) return null;

  return (
    <div>
      <div className="mb-3">
        <p className="font-medium text-sm text-slate-900">4. Sous-sélection par TF (optionnel)</p>
        <p className="text-xs text-slate-500 mt-1">Si vous choisissez un ou plusieurs TF, seuls ces lots seront gardés dans le guide.</p>
      </div>

      <div className="space-y-3">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un TF..."
        />

        <ScrollArea className="h-40 border rounded-lg p-3">
          <div className="space-y-2">
            {filteredTfs.length > 0 ? filteredTfs.map((tf) => {
              const checked = selectedTFs.includes(tf);
              const stats = tfStats[tf] || { ilots: 0, lots: 0 };
              return (
                <button
                  key={tf}
                  type="button"
                  onClick={() => onToggleTF(tf)}
                  className={cn(
                    'w-full flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-left hover:bg-slate-50',
                    checked && 'bg-slate-100'
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={cn('h-4 w-4 shrink-0 rounded-sm border border-primary', checked && 'bg-primary')} />
                    <span>{tf}</span>
                  </div>
                  <span className="text-xs text-slate-500 shrink-0">{stats.ilots} îlot(s) • {stats.lots} lot(s)</span>
                </button>
              );
            }) : (
              <p className="text-sm text-slate-500 px-2 py-3">Aucun TF trouvé</p>
            )}
          </div>
        </ScrollArea>
      </div>

      <p className="text-xs text-slate-500 mt-2">
        {selectedTFs.length === 0 ? 'Aucun TF choisi : tous les TF de la sélection principale seront inclus.' : `${selectedTFs.length} TF sélectionné(s)`}
      </p>
    </div>
  );
}