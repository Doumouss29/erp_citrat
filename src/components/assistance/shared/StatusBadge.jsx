import React from 'react';
import { Badge } from '@/components/ui/badge';
import { getStatusInfo, getPriorityInfo, getRequestTypeInfo } from '@/lib/assistanceConstants';

export function StatusBadge({ status }) {
  const info = getStatusInfo(status);
  return (
    <Badge variant="outline" className={`${info.color} border text-[11px] font-medium`}>
      {info.label}
    </Badge>
  );
}

export function PriorityBadge({ priority }) {
  const info = getPriorityInfo(priority);
  return (
    <Badge variant="outline" className={`${info.color} border text-[11px] font-medium`}>
      {info.label}
    </Badge>
  );
}

export function RequestTypeBadge({ type }) {
  const info = getRequestTypeInfo(type);
  return (
    <Badge variant="outline" className={`${info.color} border text-[11px] font-medium`}>
      {info.label}
    </Badge>
  );
}