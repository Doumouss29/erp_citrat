import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { APP_DEFS } from '@/lib/cgesnData';
import { useEffectiveAccess } from '@/lib/accessProfiles';
import { isOfficeAccount } from '@/components/utils/officeUtils';

/**
 * Bloque l'accès à une appli interne si l'utilisateur connecté ne l'a pas dans ses accès
 * (applis de son grade + accès supplémentaires). Il est alors renvoyé au portail avec un message.
 * Les applications internes privées exigent une session. Les routes publiques restent
 * déclarées séparément, en dehors de cette garde.
 */
export default function RequireAppAccess({ appId }) {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const { access, loading: accessLoading } = useEffectiveAccess(user);

  if (isLoadingAuth || (isAuthenticated && user && accessLoading)) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated || !user) return <Navigate to="/connexion" replace />;

  if (isAuthenticated && user) {
    // Comptes bureaux : accès au terminal de pointage RH-CITRAT, sans profil d'accès à configurer
    if (appId === 'rhcgesn' && isOfficeAccount(user.email)) return <Outlet />;
    if (!access.includes(appId)) {
      const def = APP_DEFS.find((d) => d.id === appId);
      const name = def ? def.name : 'cette application';
      return <Navigate to="/portail" replace state={{ accessDenied: `Vous n'avez pas accès à ${name}.` }} />;
    }
  }

  return <Outlet />;
}
