import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';

export default function DeleteAttributairesModal({ 
  isOpen, 
  onClose, 
  personsToDelete,
  onDeleteComplete 
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    currentPerson: '',
    deleted: 0,
    failed: 0
  });
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef(null);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError('');
    setSuccess('');
    setElapsedTime(0);
    
    // Démarrer le timer
    timerRef.current = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    const totalAttributions = personsToDelete.reduce((sum, p) => sum + p.attributions.length, 0);
    let deletedCount = 0;
    let failedCount = 0;

    try {
      setProgress({
        current: 0,
        total: personsToDelete.length,
        currentPerson: '',
        deleted: 0,
        failed: 0
      });

      for (let i = 0; i < personsToDelete.length; i++) {
        const person = personsToDelete[i];
        const personName = person.type_attributaire === 'physique' 
          ? `${person.prenom} ${person.nom}`
          : person.raison_sociale || person.nom;

        setProgress(prev => ({
          ...prev,
          current: i + 1,
          currentPerson: personName
        }));

        try {
          // Supprimer toutes les attributions de cette personne en parallèle
          await onDeleteComplete(person);
          deletedCount++;
          
          setProgress(prev => ({
            ...prev,
            deleted: deletedCount,
            failed: failedCount
          }));

          // Petit délai entre les personnes
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
          failedCount++;
          setProgress(prev => ({
            ...prev,
            failed: failedCount
          }));
        }
      }

      if (failedCount === 0) {
        setSuccess(`${deletedCount} personne(s) supprimée(s) avec succès`);
      } else {
        setSuccess(`${deletedCount} personne(s) supprimée(s), ${failedCount} échec(s)`);
      }

      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      setError(err.message || 'Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  useEffect(() => {
    if (isOpen && !isDeleting && !success && !error) {
      // Auto-démarrer la suppression à l'ouverture
      handleDelete();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const totalAttributions = personsToDelete.reduce((sum, p) => sum + p.attributions.length, 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-red-600" />
            Suppression en cours
          </DialogTitle>
          <DialogDescription>
            Suppression de {personsToDelete.length} personne(s) et {totalAttributions} attribution(s)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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

          {isDeleting && (
            <div className="bg-gradient-to-br from-red-50 to-red-100 border border-red-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-red-600 animate-spin" />
                  <div>
                    <p className="text-sm font-semibold text-red-900">
                      Suppression en cours...
                    </p>
                    <p className="text-xs text-red-700 mt-0.5">
                      ⏱️ Temps écoulé: {formatTime(elapsedTime)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-white/80 rounded-lg p-3">
                  <p className="text-xs text-slate-600 mb-1">Progression</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-slate-900">
                      {progress.current}
                    </span>
                    <span className="text-xs text-slate-500">/ {progress.total}</span>
                  </div>
                </div>
                <div className="bg-white/80 rounded-lg p-3">
                  <p className="text-xs text-slate-600 mb-1">Suppressions</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-red-600">
                      {progress.deleted}
                    </span>
                    <span className="text-xs text-slate-500">personnes</span>
                  </div>
                </div>
              </div>

              {progress.currentPerson && (
                <div className="bg-white/90 rounded-lg p-3">
                  <p className="text-xs font-semibold text-slate-700 mb-1">
                    🗑️ En cours:
                  </p>
                  <p className="text-sm text-slate-900">{progress.currentPerson}</p>
                </div>
              )}

              {progress.failed > 0 && (
                <div className="mt-3 bg-red-100 rounded-lg p-3">
                  <p className="text-xs text-red-800">
                    ⚠️ Échecs: {progress.failed}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t pt-4">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isDeleting}
          >
            {isDeleting ? 'Fermer après' : 'Fermer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}