import React from 'react';
import { FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AttestationGuide() {
  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <FileText className="w-8 h-8" />
            Attestation
          </h1>
          <p className="text-slate-500 mt-2">Page vierge pour l'instant</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Attestation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="min-h-[320px] rounded-lg border border-dashed border-slate-300 bg-white" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}