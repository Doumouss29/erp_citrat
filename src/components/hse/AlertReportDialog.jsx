import React from "react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const STATUS = {
  sent: { label: "Notification créée, courriel accepté", Icon: CheckCircle2, color: "text-emerald-700" },
  notified_only: { label: "Notification créée, courriel non confirmé", Icon: AlertTriangle, color: "text-amber-700" },
  no_account: { label: "Aucun compte à cette adresse", Icon: XCircle, color: "text-red-700" },
  ineligible: { label: "Compte non habilité", Icon: XCircle, color: "text-red-700" },
  suspended: { label: "Compte suspendu", Icon: XCircle, color: "text-red-700" },
  failed: { label: "Envoi en échec", Icon: XCircle, color: "text-red-700" },
};

// Compte rendu d'envoi d'une alerte HSE, affiché dans le portail.
export default function AlertReportDialog({ report, onClose }) {
  if (!report) return null;
  const rows = report.rows || [];
  const reached = rows.filter((r) => r.status === "sent" || r.status === "notified_only").length;

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{report.error ? "Alerte non envoyée" : "Compte rendu de l'alerte"}</DialogTitle>
          <DialogDescription>
            {report.reference ? `Fiche ${report.reference}` : "Fiche HSE"}
            {!report.error && ` · ${reached} prévenu(s) sur ${rows.length}`}
          </DialogDescription>
        </DialogHeader>

        {report.error ? (
          <p className="text-sm text-red-700">{report.error}</p>
        ) : (
          <ul className="divide-y divide-slate-100 border-y border-slate-100">
            {rows.map((row) => {
              const { label, Icon, color } = STATUS[row.status] || STATUS.failed;
              return (
                <li key={row.email} className="flex items-start gap-3 py-3">
                  <Icon className={`w-5 h-5 flex-none mt-0.5 ${color}`} aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{row.nom || row.email}</p>
                    <p className="text-xs text-slate-500 break-all">{row.email}</p>
                    <p className={`text-xs mt-0.5 ${color}`}>{label}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <DialogFooter className="gap-2">
          <Button onClick={onClose}>Fermer</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
