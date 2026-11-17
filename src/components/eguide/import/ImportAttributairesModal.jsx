import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  FileText,
  XCircle,
} from "lucide-react";

export default function ImportAttributairesModal({ isOpen, onClose, lotissement }) {
  const [csvFile, setCsvFile] = useState(null);
  const [selectedLotissementId, setSelectedLotissementId] = useState(lotissement?.id || "");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [progress, setProgress] = useState({ 
    step: 0, 
    message: "", 
    current: null 
  });

  const cancelRef = useRef({ cancelled: false });

  const { data: lotissements = [] } = useQuery({
    queryKey: ["lotissements-eguide"],
    queryFn: () => base44.entities.LotissementEguide.filter({ commune: { $exists: true, $ne: "" } }),
  });

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const handleCsvChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Le fichier doit être un CSV");
      setCsvFile(null);
      return;
    }

    setCsvFile(file);
    setError("");
    setSuccess("");
  };

  const niceError = (err) => {
    const msg =
      err?.response?.data?.error ||
      err?.response?.data?.message ||
      err?.message ||
      "Erreur lors de l'import";

    // Amélioration message rate-limit / gateway
    if (msg.toLowerCase().includes("rate limit") || err?.response?.status === 429) {
      return "Trop de requêtes (rate-limit). Réessaie dans 10 secondes, ou baisse la vitesse.";
    }
    if (err?.response?.status === 504) {
      return "Le serveur a mis trop de temps (504). L’import continue côté serveur: relance l’import, il reprendra.";
    }

    return msg;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedLotissementId) return setError("Veuillez sélectionner un lotissement");
    if (!csvFile) return setError("Veuillez sélectionner un fichier CSV");

    setIsUploading(true);
    cancelRef.current.cancelled = false;

    try {
      // Récupérer le lotissement pour obtenir la date d'attestation
      const selectedLotissement = lotissements.find(l => l.id === selectedLotissementId);
      
      // Chercher une attestation existante pour obtenir la date
      let dateAttribution = null;
      try {
        const attestations = await base44.entities.Attestation.filter({ id_lotissement: selectedLotissementId }, '-created_date', 1);
        if (attestations.length > 0 && attestations[0].date_attestation) {
          dateAttribution = attestations[0].date_attestation;
        }
      } catch (err) {
        console.warn('Impossible de récupérer la date d\'attestation:', err);
      }

      // 1) upload fichier
      const { file_url: csvUrl } = await base44.integrations.Core.UploadFile({ file: csvFile });

      // 2) boucle stepper
      let cursor = null;
      let totalOk = 0;
      let totalFail = 0;
      let totalLines = 0;

      const FUNCTION_NAME = "importAttributaires";

      while (true) {
        if (cancelRef.current.cancelled) throw new Error("Import annulé");

        setProgress({
          step: totalLines,
          message: `Traitement en cours (${totalLines} lignes traitées)...`,
          current: null,
        });

        const payload = cursor
          ? { csv_url: csvUrl, id_lotissement: selectedLotissementId, date_attribution: dateAttribution, cursor }
          : { csv_url: csvUrl, id_lotissement: selectedLotissementId, date_attribution: dateAttribution };

        const res = await base44.functions.invoke(FUNCTION_NAME, payload);
        const data = res?.data;

        if (!data?.success) throw new Error(data?.error || "Erreur import");

        const s = data.step || {};
        const stepOk = (s.attributaires_ok || 0) + (s.lots_updated_ok || 0) + (s.historiques_ok || 0);
        const stepFail = (s.attributaires_fail || 0) + (s.lots_updated_fail || 0) + (s.historiques_fail || 0);
        totalOk += stepOk;
        totalFail += stepFail;
        totalLines += s.lines_processed || 0;

        setProgress({
          step: totalLines,
          message: data.done ? "✅ Terminé !" : `${totalLines} lignes traitées (${totalOk} OK, ${totalFail} échecs)`,
          current: {
            lines_processed: s.lines_processed || 0,
            lots_touched: s.lots_touched || 0,
            attributaires_ok: s.attributaires_ok || 0,
            lots_updated_ok: s.lots_updated_ok || 0,
            historiques_ok: s.historiques_ok || 0,
          },
        });

        if (data.done) {
          setSuccess(
            `Import terminé ✓ — ${totalOk} créations réussies, ${totalFail} échecs`
          );
          window.dispatchEvent(new Event("attributaires-imported"));
          break;
        }

        cursor = data.nextCursor;
        await sleep(100);
      }
    } catch (err) {
      setError(niceError(err));
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    cancelRef.current.cancelled = true;
    setCsvFile(null);
    setSelectedLotissementId(lotissement?.id || "");
    setError("");
    setSuccess("");
    setProgress({ step: 0, message: "", current: null });
    onClose();
  };

  useEffect(() => {
    if (lotissement?.id) setSelectedLotissementId(lotissement.id);
  }, [lotissement]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Importer les attributaires
          </DialogTitle>
          <DialogDescription>
            Attribuez les lots à des propriétaires via un fichier CSV
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {isUploading && progress.message && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                  <p className="text-sm font-medium text-blue-700">{progress.message}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => (cancelRef.current.cancelled = true)}
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Annuler
                </Button>
              </div>

              {progress.current && (
                <div className="bg-white rounded p-3 text-xs text-slate-700 space-y-1 border border-blue-100">
                  {progress.current.lines_processed > 0 && (
                    <div>📋 Ligne: <b>{progress.current.lines_processed}</b></div>
                  )}
                  {progress.current.attributaires_ok > 0 && (
                    <div>✓ Attributaire créé</div>
                  )}
                  {progress.current.lots_updated_ok > 0 && (
                    <div>✓ Lot mis à jour (statut: <b>{progress.current.lots_updated_ok}</b>)</div>
                  )}
                  {progress.current.historiques_ok > 0 && (
                    <div>✓ Historique enregistré</div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="bg-slate-50 p-4 rounded-lg space-y-3">
            <div>
              <Label htmlFor="lotissement">Lotissement *</Label>
              <Select
                value={selectedLotissementId}
                onValueChange={setSelectedLotissementId}
                disabled={isUploading}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Sélectionner un lotissement..." />
                </SelectTrigger>
                <SelectContent>
                  {lotissements.map((lot) => (
                    <SelectItem key={lot.id} value={lot.id}>
                      {lot.nom} - {lot.region}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="csv_file" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Fichier CSV des attributaires
              </Label>
              <Input
                id="csv_file"
                type="file"
                accept=".csv"
                onChange={handleCsvChange}
                className="mt-2"
                disabled={isUploading}
              />
              <p className="text-xs text-slate-500 mt-2">
                Format: NOM; PRENOM; CNI; ILOT; LOT (ALL ou numéros séparés par virgule); AFFECTATION; STATUT
              </p>
              {csvFile && (
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {csvFile.name} ({(csvFile.size / 1024).toFixed(0)} Ko)
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t pt-4">
            <Button type="button" variant="outline" onClick={handleClose} disabled={isUploading}>
              Annuler
            </Button>
            <Button type="submit" disabled={isUploading || !csvFile || !selectedLotissementId}>
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Import en cours...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Importer
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}