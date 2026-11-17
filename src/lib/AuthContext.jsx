import React, { createContext, useState, useContext, useEffect } from 'react';
import { base44, clearMeCache } from '@/api/base44Client';
import { appParams } from '@/lib/app-params';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null); // Contains only { id, public_settings }

  useEffect(() => {
    checkAppState();
  }, []);

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);
      
      try {
        const publicSettings = await base44.app.getPublicSettings();
        setAppPublicSettings(publicSettings);
        
        // If we got the app public settings successfully, check if user is authenticated
        if (appParams.token) {
          await checkUserAuth();
        } else {
          setIsLoadingAuth(false);
          setIsAuthenticated(false);
          setAuthChecked(true);
        }
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error('App state check failed:', appError);
        
        // Handle app-level errors
        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === 'auth_required') {
            setAuthError({
              type: 'auth_required',
              message: 'Authentication required'
            });
          } else if (reason === 'user_not_registered') {
            setAuthError({
              type: 'user_not_registered',
              message: 'User not registered for this app'
            });
          } else {
            setAuthError({
              type: reason,
              message: appError.message
            });
          }
        } else {
          setAuthError({
            type: 'unknown',
            message: appError.message || 'Failed to load app'
          });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
      setAuthError({
        type: 'unknown',
        message: error.message || 'An unexpected error occurred'
      });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    try {
      // Now check if the user is authenticated
      setIsLoadingAuth(true);
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);
      linkEmployeeOnce(currentUser);
    } catch (error) {
      console.error('User auth check failed:', error);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);
      
      // If user auth fails, it might be an expired token
      if (error.status === 401 || error.status === 403) {
        setAuthError({
          type: 'auth_required',
          message: 'Authentication required'
        });
      }
    }
  };

  // Première connexion : relie le compte à sa fiche employé (adresse prenom.nom), une fois par session.
  const linkEmployeeOnce = async (currentUser) => {
    if (!currentUser || !currentUser.id || currentUser.super_admin) return;
    const key = `cgesn_emp_link_${currentUser.id}`;
    try { if (sessionStorage.getItem(key)) return; } catch (e) { /* stockage indisponible */ }
    try {
      const res = await base44.functions.invoke('linkEmployeeOnLogin', {});
      const data = (res && res.data) || res || {};
      try { sessionStorage.setItem(key, data.status || 'done'); } catch (e) { /* ignore */ }
      if (data.status === 'linked' && Array.isArray(data.user_updated) && data.user_updated.length) {
        clearMeCache();
        const refreshed = await base44.auth.me();
        setUser(refreshed);
      }
    } catch (e) {
      console.warn('Rattachement fiche employé impossible :', e);
    }
    // Responsables de bureau et secrétaires : affectation automatique à leur bureau dès la connexion.
    try {
      const res = await base44.functions.invoke('syncUserBureau', {});
      const data = (res && res.data) || res || {};
      if (data.updated) {
        clearMeCache();
        const refreshed = await base44.auth.me();
        setUser(refreshed);
      }
    } catch (e) {
      console.warn('Affectation au bureau impossible :', e);
    }
  };

  // Recharge le profil (rôle, accès aux applis…) sans afficher d'écran de chargement
  const refreshUser = async () => {
    try {
      clearMeCache();
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      return currentUser;
    } catch (error) {
      return null;
    }
  };

  const logout = (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    
    if (shouldRedirect) {
      // Use the SDK's logout method which handles token cleanup and redirect
      // Toute déconnexion renvoie vers la page de connexion du portail
      base44.auth.logout("/connexion");
    } else {
      // Just remove the token without redirect
      base44.auth.logout();
    }
  };

  const navigateToLogin = () => {
    // Use the SDK's redirectToLogin method
    base44.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      appPublicSettings,
      authChecked,
      logout,
      navigateToLogin,
      checkUserAuth,
      refreshUser,
      checkAppState
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
