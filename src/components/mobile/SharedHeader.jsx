import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

const ROOT_PAGES = ['DashboardAgent', 'Conges', 'Absences', 'Profil'];

export default function SharedHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const pathName = location.pathname.split('/').filter(Boolean)[0];
  const isRootPage = ROOT_PAGES.some(page => location.pathname.includes(page));

  return (
    <header className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-200 z-30" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center justify-between h-14 px-4">
        {!isRootPage && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-slate-700 hover:bg-slate-100 rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        )}
        
        {isRootPage && (
          <div className="flex items-center gap-2">
            <img 
              src="/logo-citrat.svg" 
              alt="CITRAT Logo" 
              className="w-8 h-8 object-contain rounded-lg"
            />
            <span className="text-sm font-bold text-slate-900">RH CITRAT</span>
          </div>
        )}
        
        <div className="flex-1" />
      </div>
    </header>
  );
}