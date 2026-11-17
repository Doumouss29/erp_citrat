import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Building2, Users, ChevronRight, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createPageUrl } from "@/utils";
import { Link, useNavigate } from "react-router-dom";

export default function ReglementationMenuPage() {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const navigate = useNavigate();

  const categories = [
    {
      id: "reglement",
      title: "Règlement Intérieur",
      icon: FileText,
      color: "from-blue-500 to-blue-600",
      items: [],
      directLink: createPageUrl("ReglementInterieur")
    },
    {
      id: "organigramme",
      title: "Organigramme",
      icon: Building2,
      color: "from-purple-500 to-purple-600",
      items: []
    },
    {
      id: "politique",
      title: "Politique RH",
      icon: Users,
      color: "from-green-500 to-green-600",
      items: [
        { title: "Temps de Travail", link: createPageUrl("Reglementation") + "?tab=temps" },
        { title: "Congés", link: createPageUrl("Reglementation") + "?tab=conges" },
        { title: "Absences", link: createPageUrl("Reglementation") + "?tab=absences" }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">


        <AnimatePresence mode="wait">
          {!selectedCategory ? (
            <motion.div
              key="categories"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {categories.map((category) => (
                <motion.div
                  key={category.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card 
                    className="shadow-xl border-0 bg-white/95 backdrop-blur-sm hover:shadow-2xl transition-all cursor-pointer overflow-hidden h-full"
                    onClick={() => {
                      if (category.directLink) {
                        navigate(category.directLink);
                      } else if (category.id === "politique") {
                        navigate(createPageUrl("Reglementation"));
                      } else {
                        setSelectedCategory(category);
                      }
                    }}
                  >
                    <CardHeader className={`bg-gradient-to-r ${category.color} text-white p-6`}>
                      <div className="flex items-center justify-between">
                        <category.icon className="w-12 h-12" />
                        <ChevronRight className="w-6 h-6" />
                      </div>
                    </CardHeader>
                    <CardContent className="p-6">
                      <CardTitle className="text-xl font-bold text-slate-900 mb-2">
                        {category.title}
                      </CardTitle>
                      <p className="text-sm text-slate-600">
                        {category.directLink ? '1 section disponible' : category.items.length > 0 ? `${category.items.length} section${category.items.length > 1 ? 's' : ''} disponible${category.items.length > 1 ? 's' : ''}` : '0 section disponible'}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="subcategories"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Button
                onClick={() => setSelectedCategory(null)}
                variant="ghost"
                className="mb-6 rounded-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour
              </Button>

              <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
                <CardHeader className={`bg-gradient-to-r ${selectedCategory.color} text-white p-6`}>
                  <div className="flex items-center gap-4">
                    <selectedCategory.icon className="w-10 h-10" />
                    <CardTitle className="text-2xl font-bold">{selectedCategory.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-3">
                  {selectedCategory.items.map((item, index) => (
                    <Link key={index} to={item.link}>
                      <motion.div
                        whileHover={{ scale: 1.02, x: 5 }}
                        className="flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border-2 border-slate-200 transition-all cursor-pointer"
                      >
                        <span className="font-semibold text-slate-900">{item.title}</span>
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </motion.div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}