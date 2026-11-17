import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Calendar, FileX, User } from 'lucide-react';

export default function MobileNavBar() {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { title: 'Tableau de bord', url: createPageUrl('DashboardAgent'), icon: Home, page: 'DashboardAgent' },
    { title: 'Absences & Congés', url: createPageUrl('AbsencesConges'), icon: FileX, page: 'AbsencesConges' },
    { title: 'Calendrier', url: createPageUrl('Calendrier'), icon: Calendar, page: 'Calendrier' },
    { title: 'Profil', url: createPageUrl('ProfilReglementation'), icon: User, page: 'ProfilReglementation' }
  ];

  const handleNavClick = (item) => {
    const isActive = location.pathname === item.url;
    if (isActive) {
      // Reset to root page by reloading the component
      navigate(item.url, { replace: true });
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-2xl z-40 select-none" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex justify-around">
        {navItems.map(item => {
          const isActive = location.pathname === item.url;
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              onClick={() => {
                navigate(item.url);
                handleNavClick(item);
              }}
              className={`flex-1 flex flex-col items-center justify-center py-3 transition-colors select-none cursor-pointer ${
                isActive 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title={item.title}
            >
              <Icon className="w-6 h-6 mb-1 select-none" />
              <span className="text-xs font-medium text-center select-none">{item.title}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}