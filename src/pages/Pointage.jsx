import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { LogIn, LogOut as LogOutIcon, Clock, User as UserIcon, LogOut, CheckCircle, AlertCircle, Coffee, PlayCircle } from "lucide-react";
import { resolveOffice } from "../components/utils/officeUtils";

const LOGO = "/logo-citrat.svg";

const pad2 = (n) => n.toString().padStart(2, '0');
const formatClock = (date) => `${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
const LOCAL_DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const LOCAL_MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const formatDateFr = (date) => `${LOCAL_DAYS[date.getDay()]} ${date.getDate()} ${LOCAL_MONTHS[date.getMonth()]} ${date.getFullYear()}`;

export default function PointagePage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [employee, setEmployee] = useState(null);
  const [overtimeDialog, setOvertimeDialog] = useState(null);
  const [overtimeReason, setOvertimeReason] = useState("");
  const [currentOffice, setCurrentOffice] = useState(null);
  const [officeInfo, setOfficeInfo] = useState(null);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    loadCurrentOffice();
    return () => clearInterval(timer);
  }, []);

  const loadCurrentOffice = async () => {
    try {
      const user = await base44.auth.me();
      const office = await resolveOffice(user.email);
      if (office) {
        setOfficeInfo({ ...office, email: office.email || user.email });
        setCurrentOffice(office.office_name);
      }
    } catch (error) {
      console.error("Error loading office:", error);
    }
  };

  // Terminal désactivé dans Administration → Bureaux : affiché mais pointage bloqué
  const terminalInactive = officeInfo?.is_active === false;

  // Les règles et l'enregistrement sont côté serveur (fonction pointage) :
  // un compte bureau n'a pas accès aux fiches employés ni à l'historique.
  const callPointage = async (payload) => {
    try {
      const res = await base44.functions.invoke("pointage", payload);
      return res?.data ?? res;
    } catch (error) {
      const serverError = error?.response?.data?.error || error?.data?.error;
      if (serverError) return { success: false, error: serverError };
      throw error;
    }
  };

  const handleSubmit = async (type) => {
    if (terminalInactive) {
      setMessage({ type: "error", text: "Ce terminal de pointage est désactivé. Contactez le service RH." });
      return;
    }
    if (!code.trim()) {
      setMessage({ type: "error", text: "Veuillez saisir votre code salarié" });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const submittedCode = code.trim();
      const result = await callPointage({ action: "punch", code: submittedCode, type });

      if (result?.success) {
        setEmployee(result.employee);
        setMessage({ type: "success", text: result.message });
        if (result.overtime) {
          setOvertimeDialog({ code: submittedCode, ...result.overtime });
        }
      } else {
        setMessage({ type: "error", text: result?.error || "Erreur lors du pointage. Veuillez réessayer." });
      }
    } catch (error) {
      console.error("Error during time entry:", error);
      const errorMsg = error?.message?.includes("Network")
        ? "Erreur de connexion. Vérifiez votre réseau et réessayez."
        : "Erreur lors du pointage. Veuillez réessayer.";
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setLoading(false);
      setTimeout(() => {
        setCode("");
        setEmployee(null);
        setMessage(null);
      }, 3000);
    }
  };

  const handleOvertimeSubmit = async () => {
    if (!overtimeDialog) return;

    try {
      await callPointage({ action: "overtime", code: overtimeDialog.code, reason: overtimeReason });
    } catch (error) {
      console.error("Error saving overtime reason:", error);
    }

    setOvertimeDialog(null);
    setOvertimeReason("");
  };

  const handleOvertimeSkip = () => {
    setOvertimeDialog(null);
    setOvertimeReason("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src={LOGO} alt="RH-CITRAT" className="w-9 h-9 sm:w-10 sm:h-10 object-contain rounded-lg flex-shrink-0" />
            <span className="font-bold text-slate-900 text-base sm:text-lg">RH-CITRAT</span>
          </div>
          <Button
            variant="outline"
            onClick={() => base44.auth.logout("/connexion")}
            className="border-[#0d5c66] text-[#0d5c66] hover:bg-[#e6f4f5]"
          >
            <LogOut className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Déconnexion</span>
          </Button>
        </div>
      </header>

      {/* Terminal */}
      <section className="relative flex-1 flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#0d5c66] to-[#0e4b53] p-4 sm:p-8">
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[#ff9d7b]/15 blur-3xl" />
        <div className="absolute -bottom-24 -left-16 w-72 h-72 rounded-full bg-[#0d5c66]/40 blur-3xl" />

        <Card className="relative w-full max-w-3xl shadow-2xl border-0 bg-white rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-[#0d5c66] to-[#0e4b53] p-6 sm:p-8">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6"
            >
              <div className="flex items-center gap-4">
                <Clock className="w-11 h-11 flex-shrink-0 text-[#d4af6a]" />
                <div>
                  <p className="text-4xl font-bold tabular-nums tracking-tight leading-none text-[#d4af6a]">
                    {formatClock(currentTime)}
                  </p>
                  <p className="text-sm text-[#d4af6a]/85 capitalize font-semibold mt-2">
                    {formatDateFr(currentTime)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[#d4af6a]/80 text-xs sm:text-sm font-semibold uppercase tracking-wider">Terminal de Pointage</p>
                {currentOffice && (
                  <p className="text-white text-xl sm:text-2xl font-bold mt-1">
                    Bureau {currentOffice}
                  </p>
                )}
              </div>
            </motion.div>
          </CardHeader>

          <CardContent className="p-6 sm:p-8 bg-white">
            <div className="flex flex-col gap-6">
              {terminalInactive && (
                <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-800">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="text-sm font-semibold">
                    Terminal désactivé : le pointage n'est pas possible depuis ce bureau pour le moment. Contactez le service RH.
                  </p>
                </div>
              )}
                            {/* Zone dynamique : saisie / employé / message */}
              <div className="relative bg-slate-50 border-2 border-slate-200 rounded-xl overflow-hidden" style={{ height: '200px' }}>
                {employee ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-[#e6f4f5] p-6"
                  >
                    <UserIcon className="w-12 h-12 mb-3 text-[#0d5c66]" />
                    <p className="text-2xl font-bold text-slate-900 mb-1">
                      {employee.first_name} {employee.last_name}
                    </p>
                    <p className="text-base text-slate-600">{employee.position}</p>
                    <p className="text-sm text-slate-500 mt-2">{employee.department}</p>
                  </motion.div>
                ) : message ? (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`absolute inset-0 flex flex-col items-center justify-center p-6 ${
                      message.type === 'success'
                        ? 'bg-[#e6f4f5]'
                        : message.type === 'warning'
                        ? 'bg-gradient-to-br from-orange-50 to-yellow-50'
                        : 'bg-gradient-to-br from-red-50 to-orange-50'
                    }`}
                  >
                    {message.type === 'success' ? (
                      <CheckCircle className="w-14 h-14 mb-3 text-[#0d5c66]" />
                    ) : message.type === 'warning' ? (
                      <AlertCircle className="w-14 h-14 mb-3 text-orange-600" />
                    ) : (
                      <AlertCircle className="w-14 h-14 mb-3 text-red-600" />
                    )}
                    <p className={`text-xl font-semibold text-center ${
                      message.type === 'success' ? 'text-[#0d5c66]' : message.type === 'warning' ? 'text-orange-800' : 'text-red-800'
                    }`}>
                      {message.text}
                    </p>
                  </motion.div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-5">
                    <label className="text-sm font-semibold text-slate-700 mb-3">
                      Saisissez votre code salarié
                    </label>
                    <Input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !loading) {
                          handleSubmit("entry");
                        }
                      }}
                      placeholder="CODE SALARIÉ"
                      className="text-center text-xl font-bold h-16 rounded-xl border-2 border-slate-300 focus:border-[#0d5c66] uppercase tracking-wider bg-white"
                      disabled={loading || terminalInactive}
                    />
                  </div>
                )}
              </div>

              {/* Boutons de pointage : Arrivée, Pause, Reprise, Départ */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <Button
                  onClick={() => handleSubmit("entry")}
                  disabled={loading || terminalInactive || !code.trim()}
                  className="h-16 sm:h-18 text-base sm:text-lg font-bold bg-[#0d5c66] hover:bg-[#053e3e] shadow-xl rounded-xl flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                >
                  <LogIn className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span>Arrivée</span>
                </Button>
                <Button
                  onClick={() => handleSubmit("break_start")}
                  disabled={loading || terminalInactive || !code.trim()}
                  className="h-16 sm:h-18 text-base sm:text-lg font-bold bg-orange-500 hover:bg-orange-600 shadow-xl rounded-xl flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                >
                  <Coffee className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span>Pause</span>
                </Button>
                <Button
                  onClick={() => handleSubmit("break_end")}
                  disabled={loading || terminalInactive || !code.trim()}
                  className="h-16 sm:h-18 text-base sm:text-lg font-bold bg-green-600 hover:bg-green-700 shadow-xl rounded-xl flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                >
                  <PlayCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span>Reprise</span>
                </Button>
                <Button
                  onClick={() => handleSubmit("exit")}
                  disabled={loading || terminalInactive || !code.trim()}
                  className="h-16 sm:h-18 text-base sm:text-lg font-bold bg-black hover:bg-gray-900 text-white shadow-xl rounded-xl flex flex-col items-center justify-center gap-1 disabled:opacity-50"
                >
                  <LogOutIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span>Départ</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dialog pour justification des heures supplémentaires */}
        <Dialog open={!!overtimeDialog} onOpenChange={() => handleOvertimeSkip()}>
          <DialogContent className="sm:max-w-md md:max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl md:text-2xl font-bold text-slate-900">
                Heures Supplémentaires Détectées
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="bg-[#e6f4f5] rounded-xl p-4 md:p-5 border border-[#0d5c66]/20">
                <p className="text-sm md:text-base text-slate-700 mb-2">
                  Vous avez travaillé <span className="font-bold text-[#0d5c66]">{overtimeDialog?.hoursWorked.toFixed(2)}h</span> aujourd'hui.
                </p>
                <p className="text-sm md:text-base text-slate-700">
                  Heures supplémentaires : <span className="font-bold text-[#0d5c66]">+{overtimeDialog?.overtime.toFixed(2)}h</span>
                </p>
              </div>

              <div>
                <label className="text-sm md:text-base font-semibold text-slate-700 mb-2 block">
                  Motif des heures supplémentaires (optionnel)
                </label>
                <Textarea
                  value={overtimeReason}
                  onChange={(e) => setOvertimeReason(e.target.value)}
                  placeholder="Ex: Réunion urgente, dossier à finaliser, mission importante..."
                  className="min-h-24 md:min-h-28 rounded-xl border-2 text-sm md:text-base"
                />
                <p className="text-xs md:text-sm text-slate-500 mt-2">
                  Cette justification aidera le service RH à comprendre les raisons de vos heures supplémentaires.
                </p>
              </div>
            </div>
            <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                onClick={handleOvertimeSkip}
                variant="outline"
                className="w-full sm:w-auto rounded-xl h-10 md:h-11 text-sm md:text-base border-[#0d5c66] text-[#0d5c66] hover:bg-[#e6f4f5]"
              >
                Passer
              </Button>
              <Button
                onClick={handleOvertimeSubmit}
                className="w-full sm:w-auto bg-[#0d5c66] hover:bg-[#053e3e] rounded-xl h-10 md:h-11 text-sm md:text-base"
              >
                Enregistrer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}
