import React from 'react';
import { Button } from '@/components/ui/button';

export default function GuideTabs({ activeTab, onTabChange }) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      <Button
        variant={activeTab === 'guide' ? 'default' : 'outline'}
        onClick={() => onTabChange('guide')}
      >
        Guide
      </Button>
      <Button
        variant={activeTab === 'attestation' ? 'default' : 'outline'}
        onClick={() => onTabChange('attestation')}
      >
        Attestation
      </Button>
    </div>
  );
}