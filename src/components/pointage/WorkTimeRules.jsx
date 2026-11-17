import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Clock, Calendar, CheckCircle2, AlertCircle } from "lucide-react";

export default function WorkTimeRules() {
  return (
    <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm mb-8">
      <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6">
        <CardTitle className="text-2xl font-bold">Réglementation du Temps de Travail</CardTitle>
        <p className="text-indigo-100 text-sm mt-2">Règles applicables à tous les employés</p>
      </CardHeader>
      <CardContent className="p-8 space-y-6">
        <Alert className="bg-blue-50 border-blue-200">
          <Clock className="h-5 w-5 text-blue-600" />
          <AlertDescription className="text-slate-700">
            <span className="font-bold text-blue-900">Plage Horaire Autorisée:</span> De 06h00 à 22h00
            <br />
            <span className="text-sm text-slate-600">Les pointages en dehors de cette plage seront refusés</span>
          </AlertDescription>
        </Alert>

        <Alert className="bg-green-50 border-green-200">
          <Calendar className="h-5 w-5 text-green-600" />
          <AlertDescription className="text-slate-700">
            <span className="font-bold text-green-900">Durée Journalière Réglementaire:</span> 8 heures par jour
            <br />
            <span className="text-sm text-slate-600">Le système calcule automatiquement votre balance quotidienne</span>
          </AlertDescription>
        </Alert>

        <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
          <h3 className="font-bold text-slate-900 text-lg mb-4">Fonctionnement du Système</h3>
          
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-slate-900">Calcul Automatique</p>
              <p className="text-sm text-slate-600">
                Après votre pointage de sortie, le système calcule vos heures travaillées
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-slate-900">Balance Journalière</p>
              <p className="text-sm text-slate-600">
                Différence entre vos heures travaillées et les 8h réglementaires (+ ou -)
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-slate-900">Cumul des Heures</p>
              <p className="text-sm text-slate-600">
                Le système cumule jour après jour votre balance pour un suivi précis
              </p>
            </div>
          </div>
        </div>

        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-5 w-5 text-amber-600" />
          <AlertDescription className="text-slate-700">
            <span className="font-bold text-amber-900">Exemples de calcul:</span>
            <div className="mt-2 space-y-1 text-sm">
              <div>• Entrée: 08h00 - Sortie: 17h00 = 9h travaillées → <span className="text-green-600 font-semibold">+1h</span></div>
              <div>• Entrée: 09h00 - Sortie: 16h00 = 7h travaillées → <span className="text-red-600 font-semibold">-1h</span></div>
              <div>• Entrée: 07h30 - Sortie: 15h30 = 8h travaillées → <span className="text-slate-600 font-semibold">0h</span></div>
            </div>
          </AlertDescription>
        </Alert>

        <div className="bg-indigo-50 rounded-2xl p-6 border-2 border-indigo-200">
          <h3 className="font-bold text-indigo-900 text-lg mb-3">📋 Résumé</h3>
          <div className="grid md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-slate-600">Plage horaire:</p>
              <p className="font-bold text-indigo-900">06h00 - 22h00</p>
            </div>
            <div>
              <p className="text-slate-600">Durée journalière:</p>
              <p className="font-bold text-indigo-900">8 heures</p>
            </div>
            <div>
              <p className="text-slate-600">Balance affichée:</p>
              <p className="font-bold text-indigo-900">Quotidienne + Cumulée</p>
            </div>
            <div>
              <p className="text-slate-600">Mise à jour:</p>
              <p className="font-bold text-indigo-900">Automatique</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}