import React, { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

export default function SearchableSelectionList({
  items = [],
  selectedValues = [],
  onToggle,
  searchPlaceholder,
  emptyMessage = 'Aucun résultat'
}) {
  const [search, setSearch] = useState('');

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => {
      const haystack = `${item.label || ''} ${item.meta || ''}`.toLowerCase();
      return haystack.includes(term);
    });
  }, [items, search]);

  return (
    <div className="space-y-3">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={searchPlaceholder}
      />

      <ScrollArea className="h-48 border rounded-lg p-3">
        <div className="space-y-2">
          {filteredItems.length > 0 ? filteredItems.map((item) => {
            const checked = selectedValues.includes(item.value);
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => onToggle(item.value)}
                className={cn(
                  'w-full flex items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-slate-50',
                  checked && 'bg-slate-100'
                )}
              >
                <span className={cn('h-4 w-4 shrink-0 rounded-sm border border-primary', checked && 'bg-primary')} />
                <span>{item.label}</span>
                {item.meta ? <span className="text-xs text-slate-500 shrink-0">{item.meta}</span> : null}
              </button>
            );
          }) : (
            <p className="text-sm text-slate-500 px-2 py-3">{emptyMessage}</p>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}