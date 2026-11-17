import React from 'react';
import { Building2, Edit, UserPlus, KeyRound, User as UserIcon, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fonctionLabel, fonctionBadge, userDisplayName } from '@/lib/userFonctions';

export default function BureauCapsule({ bureau, users, onEditBureau, onEditUser, onAddUser, onResetPassword, onDeleteUser }) {
  const attached = users.filter((u) => {
    const ids = u.bureau_ids || (u.bureau_id ? [u.bureau_id] : []);
    return ids.includes(bureau.id);
  });

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
      <div className="flex items-center justify-between bg-slate-900 px-3 sm:px-4 py-2.5 sm:py-3">
        <div className="flex items-center gap-1.5 sm:gap-2 text-white min-w-0">
          <Building2 className="w-4 h-4 shrink-0" />
          <span className="text-sm sm:text-base font-semibold truncate">{bureau.nom}</span>
          <Badge variant="outline" className="bg-white/10 text-white border-white/20 text-[10px] sm:text-xs px-1.5 py-0 shrink-0">{bureau.code}</Badge>
          {bureau.actif === false && <Badge className="bg-slate-200 text-slate-600 text-[10px] px-1.5 py-0">Inactif</Badge>}
        </div>
        <Button size="icon" variant="ghost" className="text-white hover:bg-white/20 h-8 w-8 shrink-0" onClick={() => onEditBureau(bureau)}>
          <Edit className="w-4 h-4" />
        </Button>
      </div>

      <div className="p-3 space-y-2 flex-1">
        {attached.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Aucun utilisateur rattaché</p>
        ) : (
          attached.map((u) => (
            <div key={u.id} className={`flex items-start justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-2.5 sm:px-3 py-2 ${u.statut === 'inactif' ? 'opacity-50' : ''}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <UserIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-xs sm:text-sm font-medium text-slate-800 truncate">{userDisplayName(u)}</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap">
                  <Badge className={fonctionBadge(u.fonction) + ' text-[10px] sm:text-xs px-1.5 sm:px-2 py-0 sm:py-0.5'}>{fonctionLabel(u.fonction)}</Badge>
                  {u.statut === 'inactif' && <Badge variant="outline" className="text-slate-500 text-[10px] sm:text-xs px-1.5 py-0">Inactif</Badge>}
                </div>
              </div>
              <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
                <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => onEditUser(u)} title="Modifier">
                  <Pencil className="w-3 sm:w-3.5 sm:h-3.5 h-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 text-amber-600 hover:bg-amber-50" onClick={() => onResetPassword(u)} title="Réinitialiser le mot de passe">
                  <KeyRound className="w-3 sm:w-3.5 sm:h-3.5 h-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 text-red-600 hover:bg-red-50" onClick={() => onDeleteUser?.(u)} title="Supprimer">
                  <Trash2 className="w-3 sm:w-3.5 sm:h-3.5 h-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-3 pt-0">
        <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => onAddUser(bureau)}>
          <UserPlus className="w-4 h-4" /> Ajouter un utilisateur
        </Button>
      </div>
    </div>
  );
}