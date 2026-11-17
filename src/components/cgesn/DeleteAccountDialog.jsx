import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Confirmation de la suppression définitive du compte : l'utilisateur retape son e-mail,
// puis le serveur (fonction deleteMyAccount) vérifie la session et effectue la suppression.
export default function DeleteAccountDialog({ open, onOpenChange, user }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) { setEmail(""); setError(null); }
  }, [open]);

  const confirmed = email.trim().toLowerCase() === String(user?.email || "").trim().toLowerCase() && !!user?.email;

  const submit = async (event) => {
    event.preventDefault();
    if (!confirmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      await base44.functions.invoke("deleteMyAccount", { confirm_email: email.trim() });
      base44.auth.logout("/connexion");
    } catch (err) {
      setError(err?.response?.data?.error || err?.data?.error || "La suppression a échoué. Réessayez ou contactez la DSI du CITRAT.");
      setBusy(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!busy) onOpenChange(next); }}>
      <AlertDialogContent>
        <form onSubmit={submit} className="space-y-4">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer définitivement votre compte ?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-left text-sm text-muted-foreground">
                <p className="font-semibold text-destructive">Cette action est irréversible.</p>
                <p>Votre compte, vos accès, vos notifications et votre progression CSST seront supprimés. Votre nom sera retiré de vos tickets d'assistance.</p>
                <p>Votre dossier RH (fiche employé, congés, absences, pointages, rapports) et vos preuves de consentement sont conservés pour la durée d'archivage prévue par la loi.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="delete-account-email">Pour confirmer, saisissez votre adresse e-mail</Label>
            <Input
              id="delete-account-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={user?.email || ""}
              disabled={busy}
            />
          </div>
          {error && <p role="alert" className="text-sm font-medium text-destructive">{error}</p>}
          <AlertDialogFooter className="gap-2">
            <Button type="button" variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button type="submit" variant="destructive" disabled={!confirmed || busy}>
              {busy ? "Suppression…" : "Supprimer mon compte"}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
