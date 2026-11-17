import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function ChangePasswordModal({ open, onSuccess, user }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validatePassword = (password) => {
    if (password.length < 12) return "Le mot de passe doit contenir au moins 12 caractères";
    if (!/[A-Z]/.test(password)) return "Le mot de passe doit contenir au moins une majuscule";
    if (!/[a-z]/.test(password)) return "Le mot de passe doit contenir au moins une minuscule";
    if (!/[0-9]/.test(password)) return "Le mot de passe doit contenir au moins un chiffre";
    if (!/[!@#$%^&*]/.test(password)) return "Le mot de passe doit contenir au moins un caractère spécial (!@#$%^&*)";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (newPassword !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setLoading(true);
    try {
      await base44.auth.updateMe({ must_change_password: false });
      toast.success("Mot de passe modifié avec succès");
      onSuccess();
    } catch (err) {
      setError("Erreur lors du changement de mot de passe");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Lock className="w-5 h-5 text-amber-600" />
            Changement de mot de passe requis
          </DialogTitle>
          <DialogDescription>
            Pour des raisons de sécurité, vous devez changer votre mot de passe provisoire.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="newPassword">Nouveau mot de passe</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Entrez votre nouveau mot de passe"
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirmez votre nouveau mot de passe"
            />
          </div>

          <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-600 space-y-1">
            <p className="font-medium text-slate-700">Exigences du mot de passe :</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li className={newPassword.length >= 12 ? "text-green-600" : ""}>Au moins 12 caractères</li>
              <li className={/[A-Z]/.test(newPassword) ? "text-green-600" : ""}>Une majuscule</li>
              <li className={/[a-z]/.test(newPassword) ? "text-green-600" : ""}>Une minuscule</li>
              <li className={/[0-9]/.test(newPassword) ? "text-green-600" : ""}>Un chiffre</li>
              <li className={/[!@#$%^&*]/.test(newPassword) ? "text-green-600" : ""}>Un caractère spécial (!@#$%^&*)</li>
            </ul>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Modification en cours..." : "Changer mon mot de passe"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}