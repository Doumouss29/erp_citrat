import React from 'react';
import { useCopro } from '@/lib/coprocivStore';

export default function Toast() {
  const { toast } = useCopro();
  if (!toast) return null;
  return (
    <div style={{
      position: 'fixed', left: '50%', bottom: 28, transform: 'translateX(-50%)', zIndex: 50,
      background: 'var(--b0)', color: '#F6F3EC', padding: '10px 18px', borderRadius: 10, fontSize: 14, fontWeight: 600,
      boxShadow: '0 8px 24px rgba(0,0,0,.22)', maxWidth: '90vw', textAlign: 'center'
    }}>
      {toast}
    </div>
  );
}