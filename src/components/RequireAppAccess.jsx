import React, { useEffect, useState } from 'react';
import { Navigate, Outlet, Link } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { APP_DEFS } from '@/lib/cgesnData';
import { useEffectiveAccess } from '@/lib/accessProfiles';
import { isOfficeAccount } from '@/components/utils/officeUtils';
import { base44 } from '@/api/base44Client';

/**
 * Bloque l'accès à une appli interne si l'utilisateur connecté ne l'a pas dans ses accès
 * (applis de son grade + accès supplémentaires). Il est alors renvoyé au portail avec un message.
 * Les applications internes privées exigent une session. Les routes publiques restent
 * déclarées séparément, en dehors de cette garde.
 */
export default function RequireAppAccess({ appId }) {
  const { user, isAuthenticated, isLoadingAuth } = useAuth();
  const { access, loading: accessLoading } = useEffectiveAccess(user);
  const [permissionState, setPermissionState] = useState({loading:true, matrix:null, error:null});
  useEffect(() => {
    if (!isAuthenticated || !user?.id || user.role === 'admin') {
      setPermissionState({loading:false,matrix:null,error:null});
      return;
    }
    let active=true;
    setPermissionState({loading:true,matrix:null,error:null});
    base44.permissions.mine().then(matrix => {
      if(active)setPermissionState({loading:false,matrix,error:null});
    }).catch(error => {
      if(active)setPermissionState({loading:false,matrix:null,error:error?.message||"Vérification impossible"});
    });
    return () => {active=false;};
  }, [isAuthenticated,user?.id,user?.grade,appId]);

  if (isLoadingAuth || (isAuthenticated && user && (accessLoading || (user.role !== "admin" && permissionState.loading)))) {
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

  if (user.role !== "admin" && !isOfficeAccount(user.email)) {
    const def = APP_DEFS.find(d => d.id === appId);
    const name = def?.name || "cette application";
    const modules = Object.values(permissionState.matrix?.[appId] || {});
    const hasFunctionalRights = modules.some(rule =>
      rule && ["view","create","edit","delete","export","approve"].some(action => rule[action] === true)
    );
    if (permissionState.error || !hasFunctionalRights) {
      return <main style={{minHeight:"100vh",background:"#F3F8FC",display:"grid",placeItems:"center",padding:20}}>
        <section style={{maxWidth:520,width:"100%",background:"#fff",padding:28,borderRadius:18,border:"1px solid #DCE5F2",fontFamily:"Poppins, sans-serif"}}>
          <h1 style={{fontSize:20,fontWeight:800,color:"#081F69",marginBottom:12}}>Accès à {name}</h1>
          <p style={{color:"#52647C",lineHeight:1.65}}>
            {permissionState.error
              ? "Impossible de vérifier vos autorisations. Réessayez ou contactez l'administrateur."
              : "Cette application figure dans votre profil, mais aucune permission fonctionnelle ne vous a encore été accordée. Demandez à l'administrateur de configurer les droits détaillés de votre profil."}
          </p>
          <Link to="/portail" style={{display:"inline-block",marginTop:14,background:"#0C3D85",color:"#fff",borderRadius:9,padding:"11px 18px",textDecoration:"none",fontWeight:700}}>Retour au portail</Link>
        </section>
      </main>;
    }
  }

  return <Outlet />;
}
