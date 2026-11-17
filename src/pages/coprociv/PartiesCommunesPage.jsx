import React from 'react';
import PartiesCommunes from '@/components/coprociv/PartiesCommunes';
import { useCopro } from '@/lib/coprocivStore';
import { fm, n0, natureOf } from '@/lib/engine';
import { Card, Pill } from '@/components/coprociv/ui';

export default function PartiesCommunesPage() {
  const { state } = useCopro();
  const communs = state.communs || [];
  const tot = k => fm(communs.filter(x => natureOf(x) === k).reduce((a, x) => a + n0(x.surface), 0));
  return (
    <Card title={`Parties communes (${communs.length})`} right={<div style={{ display: 'flex', gap: 8 }}><Pill tone="neutral">Générales · {tot('pcg')} m²</Pill><Pill tone="neutral">Spéciales · {tot('pcs')} m²</Pill></div>}>
      <PartiesCommunes />
    </Card>
  );
}
