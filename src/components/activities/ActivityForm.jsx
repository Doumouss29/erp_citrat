import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, MapPin, Briefcase, X } from "lucide-react";
import { motion } from "framer-motion";

export default function ActivityForm({ onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    project_name: "",
    location: "",
    start_date: new Date().toISOString().split("T")[0],
    description: ""
  });
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    if (!formData.project_name || !formData.location || !formData.start_date) {
      setError("Veuillez remplir tous les champs obligatoires");
      return;
    }
    onSubmit(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mb-6"
    >
      <Card className="shadow-2xl border-0 bg-white">
        <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-4 sm:p-6 relative">
          <CardTitle className="text-lg sm:text-2xl font-bold flex items-center gap-2 pr-10">
            <Briefcase className="w-6 h-6" />
            Déclarer une Mission
          </CardTitle>
          <button
            type="button"
            onClick={onCancel}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="p-4 sm:p-6 space-y-5">
            {error && (
              <Alert className="bg-red-50 border-red-200">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-900 font-semibold">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="project_name" className="text-sm font-semibold">
                Titre de la Mission / Projet *
              </Label>
              <Input
                id="project_name"
                value={formData.project_name}
                onChange={(e) => setFormData({ ...formData, project_name: e.target.value })}
                placeholder="Ex: Construction Route K5, Audit financier..."
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm font-semibold flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-500" />
                Localité / Ville *
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Ex: Daloa, Yamoussoukro, Abidjan..."
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date" className="text-sm font-semibold">Date de départ *</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
                className="h-12"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-semibold">Notes (optionnel)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Informations complémentaires..."
                rows={3}
                className="resize-none"
              />
            </div>
          </CardContent>
          <div className="p-4 sm:p-6 bg-slate-50 flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 border-t">
            <Button type="button" variant="outline" onClick={onCancel} className="rounded-xl">
              Annuler
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl"
            >
              Partir en Mission
            </Button>
          </div>
        </form>
      </Card>
    </motion.div>
  );
}