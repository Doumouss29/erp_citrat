import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2 } from 'lucide-react';
import { useMediaQuery } from '@/components/hooks/useMediaQuery';

export default function MobileSelect({ value, onValueChange, placeholder, children, label, triggerClassName }) {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = !useMediaQuery('(min-width: 768px)');

  if (!isMobile) {
    return (
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={triggerClassName}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    );
  }

  const selectedItem = React.Children.toArray(children).find(
    child => child.props.value === value
  );
  const selectedLabel = selectedItem?.props.children || placeholder;

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        variant="outline"
        className={`w-full justify-between ${triggerClassName}`}
      >
        <span className="text-slate-700">{selectedLabel}</span>
      </Button>

      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerContent className="h-[70vh]">
          <DrawerHeader className="border-b border-slate-200">
            <DrawerTitle className="text-lg font-semibold">{label || 'Sélectionner une option'}</DrawerTitle>
          </DrawerHeader>
          <div className="overflow-y-auto p-4 space-y-2">
            {React.Children.map(children, (child) => (
              <button
                key={child.props.value}
                onClick={() => {
                  onValueChange(child.props.value);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
                  child.props.value === value
                    ? 'bg-blue-50 border-blue-500 text-blue-700 font-semibold'
                    : 'border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <span>{child.props.children}</span>
                {child.props.value === value && (
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                )}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}