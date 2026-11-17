import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Clock, Calendar, CheckCircle2, AlertCircle, TrendingUp, FileText, Shield, ShieldAlert, Lock, Settings, Save, ArrowLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { getMe } from "@/lib/rhSession";

export default function ReglementationPage() {
  const [currentUser, setCurrentUser] = useState(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [activeTab, setActiveTab] = useState("temps");
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (tab) setActiveTab(tab);
  }, [location]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    setCheckingAuth(true);
    try {
      const user = await getMe();
      setCurrentUser(user);
      loadPolicy();
    } catch (error) {
      console.error("Error checking auth:", error);
    }
    setCheckingAuth(false);
  };

  const loadPolicy = async () => {
    setLoading(true);
    const policies = await base44.entities.LeavePolicy.list();
    
    if (policies.length > 0) {
      setPolicy(policies[0]);
    } else {
      setPolicy({
        annual_leave_days: 25,
        accrual_rate: 2.08,
        sick_leave_requires_justification: true,
        max_consecutive_days: 30,
        min_notice_days: 7,
        carry_forward_enabled: true,
        max_carry_forward_days: 5
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const policies = await base44.entities.LeavePolicy.list();
      
      if (policies.length > 0) {
        await base44.entities.LeavePolicy.update(policies[0].id, policy);
      } else {
        await base44.entities.LeavePolicy.create(policy);
      }
      
      setMessage({ type: "success", text: "Politique de congés enregistrée avec succès" });
    } catch (error) {
      setMessage({ type: "error", text: "Erreur lors de l'enregistrement" });
    }
    setSaving(false);
    setTimeout(() => setMessage(null), 3000);
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-4 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Vérification des accès...</p>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <Button
          onClick={() => navigate(-1)}
          variant="ghost"
          className="mb-6 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>



        {message && (
          <Alert className={`mb-6 ${message.type === "success" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
            <AlertCircle className={`h-5 w-5 ${message.type === "success" ? "text-green-600" : "text-red-600"}`} />
            <AlertDescription className="text-slate-700 font-medium">
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-100 p-0 rounded-xl w-full grid grid-cols-3 gap-0 h-auto">
            <TabsTrigger value="temps" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-500 data-[state=active]:to-slate-600 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-slate-600 rounded-lg m-1 px-4 md:px-6 py-3 text-sm font-semibold transition-all">
              Temps de Travail
            </TabsTrigger>
            <TabsTrigger value="conges" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-500 data-[state=active]:to-slate-600 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-slate-600 rounded-lg m-1 px-4 md:px-6 py-3 text-sm font-semibold transition-all">
              Congés
            </TabsTrigger>
            <TabsTrigger value="absences" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-slate-500 data-[state=active]:to-slate-600 data-[state=active]:text-white data-[state=inactive]:bg-transparent data-[state=inactive]:text-slate-600 rounded-lg m-1 px-4 md:px-6 py-3 text-sm font-semibold transition-all">
              Absences
            </TabsTrigger>
          </TabsList>

          <TabsContent value="temps">
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <Card className="shadow-xl border-0 bg-gradient-to-br from-blue-50 to-blue-100">
                  <CardContent className="p-6 text-center">
                    <Clock className="w-10 h-10 text-blue-600 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-600">Plage Horaire</p>
                    <p className="text-3xl font-bold text-blue-600">06h - 22h</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card className="shadow-xl border-0 bg-gradient-to-br from-green-50 to-green-100">
                  <CardContent className="p-6 text-center">
                    <TrendingUp className="w-10 h-10 text-green-600 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-600">Durée Journalière</p>
                    <p className="text-3xl font-bold text-green-600">8 heures</p>
                  </CardContent>
                </Card>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <Card className="shadow-xl border-0 bg-gradient-to-br from-purple-50 to-purple-100">
                  <CardContent className="p-6 text-center">
                    <CheckCircle2 className="w-10 h-10 text-purple-600 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-slate-600">Statut</p>
                    <p className="text-3xl font-bold text-purple-600">Actif</p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>

            <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm mb-8">
              <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white p-6">
                <CardTitle className="text-2xl font-bold">Règles Générales</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <Alert className="bg-blue-50 border-blue-200">
                  <Clock className="h-5 w-5 text-blue-600" />
                  <AlertDescription className="text-slate-700">
                    <span className="font-bold text-blue-900">Plage Horaire Autorisée pour Pointage:</span> De 06h00 à 22h00
                    <br />
                    <span className="text-sm text-slate-600">Les pointages en dehors de cette plage seront automatiquement refusés par le système</span>
                  </AlertDescription>
                </Alert>

                <Alert className="bg-green-50 border-green-200">
                  <Calendar className="h-5 w-5 text-green-600" />
                  <AlertDescription className="text-slate-700">
                    <span className="font-bold text-green-900">Horaires de Travail Réglementaires:</span>
                    <div className="mt-2 space-y-1 text-sm">
                      <div>• <strong>Matin:</strong> 08h00 - 12h30 (4 heures 30 minutes)</div>
                      <div>• <strong>Pause déjeuner:</strong> 12h30 - 13h30 (1 heure)</div>
                      <div>• <strong>Après-midi:</strong> 13h30 - 17h00 (3 heures 30 minutes)</div>
                      <div>• <strong>Total journalier:</strong> 8 heures de travail effectif</div>
                      <div>• <strong>Total hebdomadaire:</strong> 40 heures (5 jours)</div>
                    </div>
                    <br />
                    <span className="text-sm text-slate-600">Le système calcule automatiquement la balance quotidienne de chaque employé par rapport à ces 8 heures réglementaires</span>
                  </AlertDescription>
                </Alert>

                <Alert className="bg-purple-50 border-purple-200">
                  <CheckCircle2 className="h-5 w-5 text-purple-600" />
                  <AlertDescription className="text-slate-700">
                    <span className="font-bold text-purple-900">Calcul Automatique:</span> Balance et cumul
                    <br />
                    <span className="text-sm text-slate-600">Le système met à jour automatiquement les heures après chaque pointage de sortie</span>
                  </AlertDescription>
                </Alert>

                <Alert className="bg-orange-50 border-orange-200">
                  <AlertCircle className="h-5 w-5 text-orange-600" />
                  <AlertDescription className="text-slate-700">
                    <span className="font-bold text-orange-900">⚠️ Motif OBLIGATOIRE pour Heures Supplémentaires ≥ 2h</span>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="bg-white rounded-lg p-3 border border-orange-200">
                        <strong>Règle :</strong> Si vous effectuez 2 heures supplémentaires ou plus dans une journée, vous devez obligatoirement indiquer le motif.
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-slate-200">
                        <strong>Motifs disponibles :</strong>
                        <ul className="ml-4 mt-2 space-y-1">
                          <li>• <strong>Réunion prolongée</strong> - Réunion ayant duré plus longtemps que prévu</li>
                          <li>• <strong>Formation</strong> - Session de formation interne ou externe</li>
                          <li>• <strong>Production urgente</strong> - Travail urgent à finaliser</li>
                          <li>• <strong>Appel d'offres urgent</strong> - Dossier d'appel d'offres urgent à terminer</li>
                          <li>• <strong>Autre</strong> - Précisez obligatoirement le motif exact</li>
                        </ul>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-slate-200">
                        <strong>Important :</strong>
                        <ul className="ml-4 mt-1 space-y-1">
                          <li>• Le motif est <strong className="text-orange-700">OBLIGATOIRE</strong> pour valider le pointage si vous avez ≥ 2h supplémentaires</li>
                          <li>• Si vous choisissez "Autre", vous devez obligatoirement écrire la raison exacte</li>
                          <li>• Permet un meilleur suivi RH de vos heures supplémentaires</li>
                        </ul>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm mb-8">
              <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-600 text-white p-6">
                <CardTitle className="text-2xl font-bold">Fonctionnement du Système</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-6">
                <div className="bg-slate-50 rounded-2xl p-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-900 text-lg">Horaires de Travail Officiels</p>
                      <p className="text-sm text-slate-600 mt-1">
                        Les horaires de travail sont fixés comme suit:
                      </p>
                      <ul className="text-sm text-slate-600 mt-2 ml-4 space-y-1">
                        <li>• <strong>Matin:</strong> 08h00 à 12h30 (4h30)</li>
                        <li>• <strong>Après-midi:</strong> 13h30 à 17h00 (3h30)</li>
                        <li>• <strong>Total journalier:</strong> 8 heures</li>
                        <li>• <strong>Total hebdomadaire:</strong> 40 heures (5 jours)</li>
                      </ul>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-900 text-lg">Calcul Automatique des Heures</p>
                      <p className="text-sm text-slate-600 mt-1">
                        Après chaque pointage de sortie, le système calcule automatiquement les heures travaillées entre l'entrée et la sortie du jour même.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-900 text-lg">Balance Journalière</p>
                      <p className="text-sm text-slate-600 mt-1">
                        Différence entre les heures travaillées et les 8 heures réglementaires. Peut être positive (+) pour les heures supplémentaires ou négative (-) pour les heures manquantes.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-900 text-lg">Cumul des Heures</p>
                      <p className="text-sm text-slate-600 mt-1">
                        Le système cumule jour après jour les balances (positives et négatives) pour un suivi précis du temps de travail de chaque employé.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-semibold text-slate-900 text-lg">Validation en Temps Réel</p>
                      <p className="text-sm text-slate-600 mt-1">
                        Le système vérifie que le pointage est effectué dans la plage horaire autorisée (06h-22h) avant de l'enregistrer.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm mb-8">
              <CardHeader className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-6">
                <CardTitle className="text-2xl font-bold">Exemples de Calcul</CardTitle>
              </CardHeader>
              <CardContent className="p-8">
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <AlertDescription className="text-slate-700">
                    <span className="font-bold text-amber-900">Exemples concrets de calcul de balance:</span>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="bg-white rounded-lg p-3 border border-slate-200">
                        <strong>Exemple 1 - Horaire standard:</strong> Entrée à 08h00 - Sortie à 17h00 (avec 1h de pause)
                        <br />
                        <span className="text-slate-600">→ 8 heures travaillées (08h00-12h30 + 13h30-17h00)</span>
                        <br />
                        <span className="text-slate-600 font-semibold">→ Balance: 0h (temps réglementaire respecté)</span>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-slate-200">
                        <strong>Exemple 2 - Heure supplémentaire:</strong> Entrée à 08h00 - Sortie à 18h00 (avec 1h de pause)
                        <br />
                        <span className="text-slate-600">→ 9 heures travaillées</span>
                        <br />
                        <span className="text-green-600 font-semibold">→ Balance: +1h (heure supplémentaire)</span>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-slate-200">
                        <strong>Exemple 3 - Départ anticipé:</strong> Entrée à 08h00 - Sortie à 16h00 (avec 1h de pause)
                        <br />
                        <span className="text-slate-600">→ 7 heures travaillées</span>
                        <br />
                        <span className="text-red-600 font-semibold">→ Balance: -1h (heure manquante)</span>
                      </div>
                      <div className="bg-white rounded-lg p-3 border border-slate-200">
                        <strong>Note importante:</strong> Le système calcule la durée totale entre l'heure d'arrivée et de départ. 
                        Il appartient à l'employé de respecter la pause déjeuner d'1 heure (12h30-13h30) dans son emploi du temps.
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conges">
            {loading ? (
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-slate-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-slate-600">Chargement...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Définition et Types de Congés */}
                <Card className="shadow-2xl border-0 bg-white">
                  <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
                    <CardTitle className="text-2xl font-bold">Définition et Types de Congés</CardTitle>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                    <Alert className="bg-blue-50 border-blue-200">
                      <Calendar className="h-5 w-5 text-blue-600" />
                      <AlertDescription className="text-slate-700">
                        <span className="font-bold text-blue-900">Règles Générales des Congés Payés</span>
                        <div className="mt-3 space-y-2 text-sm">
                          <div className="bg-white rounded-lg p-3 border border-blue-200">
                            <strong>Droit annuel:</strong> 30 jours calendaires (JC) après 12 mois de travail complet
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-blue-200">
                            <strong>Acquisition mensuelle:</strong> 2,5 jours calendaires (JC) par mois travaillé
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-blue-200">
                            <strong>Jours ouvrables:</strong> Du lundi au samedi (6 jours par semaine)
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-blue-200">
                            <strong>Comptabilisation:</strong> En jours calendaires (JC), incluant tous les jours entre le début et la fin
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="shadow-lg border-blue-200 hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                              <Calendar className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="font-bold text-lg text-slate-900">Congés Annuels</h3>
                          </div>
                          <p className="text-sm text-slate-700 mb-3">
                            <strong>15 jours calendaires (JC)</strong> à prendre entre <strong>janvier et novembre</strong> de l'année en cours.
                          </p>
                          <div className="space-y-2">
                            <div className="bg-orange-50 rounded-xl p-3 border border-orange-200">
                              <p className="text-xs font-semibold text-orange-900">⚠️ Non reportables sur l'année suivante</p>
                            </div>
                            <div className="bg-blue-50 rounded-xl p-3 border border-blue-200">
                              <p className="text-xs font-semibold text-blue-900">📅 Période : Janvier à Novembre • Max 15 JC (fractionnable)</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="shadow-lg border-purple-200 hover:shadow-xl transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                              <Calendar className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="font-bold text-lg text-slate-900">Congés Collectifs Décembre</h3>
                          </div>
                          <p className="text-sm text-slate-700 mb-3">
                            <strong>15 jours calendaires (JC)</strong> de congé collectif imposé en <strong>décembre</strong>.
                          </p>
                          <div className="space-y-2">
                            <div className="bg-purple-50 rounded-xl p-3 border border-purple-200">
                              <p className="text-xs font-semibold text-purple-900">📅 Période : Décembre uniquement • Congé collectif imposé</p>
                            </div>
                            <div className="bg-green-50 rounded-xl p-3 border border-green-200">
                              <p className="text-xs font-semibold text-green-900">✅ Reportables sur janvier pour agents en astreinte</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="shadow-lg border-green-200 hover:shadow-xl transition-shadow md:col-span-2">
                        <CardContent className="p-6">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                              <CheckCircle2 className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="font-bold text-lg text-slate-900">Règles de Calcul</h3>
                          </div>
                          <div className="grid md:grid-cols-2 gap-4">
                            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                              <p className="text-sm font-semibold text-green-900 mb-2">Jours Calendaires (JC)</p>
                              <p className="text-xs text-slate-700">Les congés sont comptabilisés en jours calendaires, incluant tous les jours entre la date de début et de fin (weekends et jours fériés inclus).</p>
                            </div>
                            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                              <p className="text-sm font-semibold text-blue-900 mb-2">Total Annuel : 30 JC</p>
                              <p className="text-xs text-slate-700">15 JC individuels (Jan-Nov) + 15 JC collectifs (Déc) = 30 JC après 12 mois de travail</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <Alert className="bg-red-50 border-red-300 mt-6">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <AlertDescription className="text-slate-700">
                        <span className="font-bold text-red-900">Exception - Agents en Astreinte :</span>
                        <div className="mt-3 space-y-2 text-sm">
                          <div>
                            Les employés désignés <strong>agents en astreinte</strong> bénéficient d'une souplesse particulière pour leurs congés collectifs de décembre. Ils peuvent les reporter sur <strong>janvier de l'année suivante</strong>.
                          </div>
                          <div className="bg-white rounded-lg p-3 border border-red-200 mt-2">
                            <div className="font-semibold text-red-900 mb-2">Règles de report pour agents en astreinte :</div>
                            <div className="space-y-1 ml-2 text-xs">
                              <div>• L'employé doit être officiellement désigné comme "Agent en Astreinte" par le service RH</div>
                              <div>• Les jours d'astreinte effectués en décembre ouvrent droit au report</div>
                              <div>• Les 15 JC de congés collectifs peuvent être pris en décembre OU reportés sur janvier N+1</div>
                              <div>• Le système vérifie automatiquement le statut d'astreinte lors de la demande</div>
                              <div>• Les congés reportés doivent être pris avant la fin janvier de l'année suivante</div>
                            </div>
                          </div>
                          <div className="text-xs text-red-700 mt-2">
                            ⭐ Cette exception permet d'assurer la continuité de service en décembre tout en garantissant le droit aux congés.
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                </Card>

{isAdmin && (
                  <>
                    <Card className="shadow-2xl border-0 bg-white">
                      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-purple-50 to-blue-50 p-6">
                        <CardTitle className="text-xl font-bold text-slate-900">Allocation des Congés Annuels</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <Label className="text-sm font-semibold text-slate-700 mb-2 block">
                              Jours de congés annuels
                            </Label>
                            <Input
                              type="number"
                              value={policy?.annual_leave_days || 25}
                              onChange={(e) => setPolicy({...policy, annual_leave_days: parseInt(e.target.value)})}
                              className="rounded-xl"
                            />
                            <p className="text-xs text-slate-500 mt-1">Nombre total de jours par an</p>
                          </div>

                          <div>
                            <Label className="text-sm font-semibold text-slate-700 mb-2 block">
                              Taux d'accumulation mensuel
                            </Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={policy?.accrual_rate || 2.08}
                              onChange={(e) => setPolicy({...policy, accrual_rate: parseFloat(e.target.value)})}
                              className="rounded-xl"
                            />
                            <p className="text-xs text-slate-500 mt-1">Jours accumulés par mois</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-2xl border-0 bg-white">
                      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-orange-50 to-yellow-50 p-6">
                        <CardTitle className="text-xl font-bold text-slate-900">Règles de Demande</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div>
                            <Label className="text-sm font-semibold text-slate-700 mb-2 block">
                              Jours consécutifs maximum
                            </Label>
                            <Input
                              type="number"
                              value={policy?.max_consecutive_days || 30}
                              onChange={(e) => setPolicy({...policy, max_consecutive_days: parseInt(e.target.value)})}
                              className="rounded-xl"
                            />
                            <p className="text-xs text-slate-500 mt-1">Maximum de jours en une seule fois</p>
                          </div>

                          <div>
                            <Label className="text-sm font-semibold text-slate-700 mb-2 block">
                              Préavis minimum (jours)
                            </Label>
                            <Input
                              type="number"
                              value={policy?.min_notice_days || 7}
                              onChange={(e) => setPolicy({...policy, min_notice_days: parseInt(e.target.value)})}
                              className="rounded-xl"
                            />
                            <p className="text-xs text-slate-500 mt-1">Délai avant la date de début</p>
                          </div>
                        </div>

                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-slate-900">Justificatif obligatoire pour congé maladie</p>
                              <p className="text-sm text-slate-600">Les congés maladie nécessiteront un document médical</p>
                            </div>
                            <Switch
                              checked={policy?.sick_leave_requires_justification || false}
                              onCheckedChange={(checked) => setPolicy({...policy, sick_leave_requires_justification: checked})}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-2xl border-0 bg-white">
                      <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-green-50 to-emerald-50 p-6">
                        <CardTitle className="text-xl font-bold text-slate-900">Report de Congés</CardTitle>
                      </CardHeader>
                      <CardContent className="p-6 space-y-6">
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 mb-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-semibold text-slate-900">Autoriser le report des congés</p>
                              <p className="text-sm text-slate-600">Les congés non pris peuvent être reportés sur l'année suivante</p>
                            </div>
                            <Switch
                              checked={policy?.carry_forward_enabled || false}
                              onCheckedChange={(checked) => setPolicy({...policy, carry_forward_enabled: checked})}
                            />
                          </div>
                        </div>

                        {policy?.carry_forward_enabled && (
                          <div>
                            <Label className="text-sm font-semibold text-slate-700 mb-2 block">
                              Jours reportables maximum
                            </Label>
                            <Input
                              type="number"
                              value={policy?.max_carry_forward_days || 5}
                              onChange={(e) => setPolicy({...policy, max_carry_forward_days: parseInt(e.target.value)})}
                              className="rounded-xl"
                            />
                            <p className="text-xs text-slate-500 mt-1">Nombre maximum de jours pouvant être reportés</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </>
                )}

                {isAdmin && (
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-xl rounded-xl px-8 h-12 text-base font-semibold"
                    >
                      <Save className="w-5 h-5 mr-2" />
                      {saving ? "Enregistrement..." : "Enregistrer les Politiques"}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="absences">
            <div className="space-y-6">
              <Card className="shadow-2xl border-0 bg-white">
                <CardHeader className="bg-gradient-to-r from-orange-600 to-orange-700 text-white p-6">
                  <CardTitle className="text-2xl font-bold">Politique des Absences</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  <Alert className="bg-orange-50 border-orange-200">
                    <FileText className="h-5 w-5 text-orange-600" />
                    <AlertDescription className="text-slate-700">
                      <span className="font-bold text-orange-900">Plafond Annuel :</span>
                      <p className="mt-2 text-sm">
                        Chaque employé bénéficie d'un plafond de <strong>10 jours d'absence par an</strong>. 
                        Les absences dépassant ce plafond nécessitent une autorisation spéciale de la direction.
                      </p>
                    </AlertDescription>
                  </Alert>

                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl p-6 border border-orange-200">
                    <h3 className="font-bold text-orange-900 text-lg mb-4">Types d'Absences Autorisées</h3>
                    
                    <div className="space-y-4">
                      <div className="bg-white rounded-lg p-4 border border-slate-200">
                        <h4 className="font-semibold text-slate-900 mb-2">🏥 Santé</h4>
                        <ul className="space-y-1 text-sm text-slate-700 ml-4">
                          <li>• <strong>Maladie</strong> - Justificatif médical obligatoire</li>
                          <li>• <strong>Accident du travail</strong> - Justificatif médical obligatoire</li>
                        </ul>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-slate-200">
                        <h4 className="font-semibold text-slate-900 mb-2">👨‍👩‍👧‍👦 Événements Familiaux</h4>
                        <ul className="space-y-1 text-sm text-slate-700 ml-4">
                          <li>• <strong>Mariage du travailleur</strong> - 4 jours</li>
                          <li>• <strong>Mariage enfant/frère/sœur</strong> - 2 jours</li>
                          <li>• <strong>Naissance d'un enfant</strong> - 2 jours</li>
                          <li>• <strong>Baptême d'un enfant</strong> - 1 jour</li>
                          <li>• <strong>Première communion</strong> - 1 jour</li>
                        </ul>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-slate-200">
                        <h4 className="font-semibold text-slate-900 mb-2">🕊️ Décès</h4>
                        <ul className="space-y-1 text-sm text-slate-700 ml-4">
                          <li>• <strong>Décès du conjoint</strong> - 5 jours</li>
                          <li>• <strong>Décès enfant/père/mère</strong> - 5 jours</li>
                          <li>• <strong>Décès frère/sœur</strong> - 3 jours</li>
                          <li>• <strong>Décès beau-parent</strong> - 2 jours</li>
                        </ul>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-slate-200">
                        <h4 className="font-semibold text-slate-900 mb-2">🏠 Autres</h4>
                        <ul className="space-y-1 text-sm text-slate-700 ml-4">
                          <li>• <strong>Déménagement</strong> - 1 jour</li>
                          <li>• <strong>Formation</strong> - Justificatif obligatoire</li>
                          <li>• <strong>Autre</strong> - Justificatif obligatoire</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <Alert className="bg-red-50 border-red-200">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                    <AlertDescription className="text-slate-700">
                      <span className="font-bold text-red-900">Important :</span>
                      <div className="mt-2 space-y-1 text-sm">
                        <div>• Le compteur d'absences s'incrémente uniquement après approbation RH</div>
                        <div>• Les jours fériés et weekends ne sont pas comptabilisés dans le calcul</div>
                        <div>• Un justificatif est systématiquement requis pour maladie, accident, formation et "autre"</div>
                        <div>• Les absences avec durée réglementaire fixe doivent respecter exactement cette durée</div>
                      </div>
                    </AlertDescription>
                  </Alert>

                  <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                    <h4 className="font-bold text-slate-900 mb-3">Procédure de Déclaration</h4>
                    <div className="space-y-2 text-sm text-slate-700">
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                        <span><strong>1.</strong> L'employé déclare son absence via l'application avec les dates et le motif</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                        <span><strong>2.</strong> Le système calcule automatiquement les jours ouvrés (hors weekends et jours fériés)</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                        <span><strong>3.</strong> Un justificatif doit être joint pour certains types d'absence (maladie, formation, etc.)</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                        <span><strong>4.</strong> Le service RH examine la demande et vérifie le solde disponible (10j max/an)</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                        <span><strong>5.</strong> L'employé reçoit une notification de validation ou de refus par email et in-app</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <CheckCircle2 className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                        <span><strong>6.</strong> Le compteur d'absences est mis à jour automatiquement après approbation</span>
                      </div>
                    </div>
                  </div>

                  <Alert className="bg-amber-50 border-amber-200">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                    <AlertDescription className="text-slate-700">
                      <span className="font-bold text-amber-900">Exemple de Calcul :</span>
                      <div className="mt-3 space-y-2 text-sm">
                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                          Un employé déclare une maladie du lundi 15/01 au vendredi 19/01 (5 jours calendaires)
                          <br />
                          <span className="text-slate-600">→ 5 jours ouvrés comptabilisés (lundi au vendredi)</span>
                          <br />
                          <span className="text-orange-600 font-semibold">→ Solde restant: 5 jours sur 10 autorisés</span>
                        </div>
                        <div className="bg-white rounded-lg p-3 border border-slate-200">
                          Un employé déclare un décès du mercredi 20/01 au dimanche 24/01 (5 jours calendaires)
                          <br />
                          <span className="text-slate-600">→ 3 jours ouvrés comptabilisés (mercredi, jeudi, vendredi)</span>
                          <br />
                          <span className="text-slate-500 text-xs">→ Samedi et dimanche exclus du calcul</span>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}