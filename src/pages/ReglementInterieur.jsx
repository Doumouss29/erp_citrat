import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ReglementInterieurPage() {
  const navigate = useNavigate();
  const [expandedPages, setExpandedPages] = React.useState({});

  const togglePage = (index) => {
    setExpandedPages(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

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

        <Card className="shadow-2xl border-0 bg-white overflow-hidden">
          {/* Page de Couverture */}
          <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 text-white p-6 md:p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')]"></div>
            </div>
            <div className="relative z-10">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dea3af6d9b2b5362a21577/567047ce7_cgesn.jpg" 
                alt="Logo CITRAT" 
                className="w-16 h-16 md:w-24 md:h-24 mx-auto mb-4 md:mb-8 rounded-xl shadow-2xl bg-white p-2"
              />
              <h1 className="text-2xl md:text-5xl font-bold mb-2 md:mb-4">RÈGLEMENT INTÉRIEUR</h1>
              <h2 className="text-lg md:text-3xl font-semibold mb-4 md:mb-8">Cabinet de Géomètre Expert</h2>
              <h3 className="text-base md:text-2xl mb-6 md:mb-12">Soro Nanga</h3>
              <div className="inline-block bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 md:px-8 md:py-4 border border-white/20">
                <p className="text-xs md:text-sm text-slate-200">Société à Responsabilité limitée</p>
                <p className="text-xs text-slate-300 mt-1">BP 718 Abidjan 06, Adjamé Williamsville</p>
              </div>
              <div className="mt-6 md:mt-12 text-slate-300 text-xs md:text-sm">
                <p>Approuvé le 26 janvier 2023</p>
                <p>En vigueur depuis février 2023</p>
              </div>
            </div>
          </div>

          {/* Contenu du Règlement avec pages scannées */}
          <CardContent className="p-4 space-y-3 bg-white">
            {/* Pages scannées redimensionnées */}
            {[
              { url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dea3af6d9b2b5362a21577/69246f6d9_REGLEMENTINTERIEUR-2.pdf', title: 'Sommaire détaillé', page: 1 },
              { url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dea3af6d9b2b5362a21577/38627d620_REGLEMENTINTERIEUR-3.pdf', title: 'Suite du sommaire', page: 2 },
              { url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dea3af6d9b2b5362a21577/132f8fbb3_REGLEMENTINTERIEUR-4.pdf', title: 'Dispositions Générales', page: 3 },
              { url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dea3af6d9b2b5362a21577/89760480a_REGLEMENTINTERIEUR-5.pdf', title: 'Organisation Technique (1/2)', page: 4 },
              { url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dea3af6d9b2b5362a21577/ba68dc1d4_REGLEMENTINTERIEUR-6.pdf', title: 'Organisation Technique (2/2)', page: 5 },
              { url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dea3af6d9b2b5362a21577/925c125dd_REGLEMENTINTERIEUR-7.pdf', title: 'Permissions exceptionnelles', page: 6 },
              { url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dea3af6d9b2b5362a21577/b7ef25de2_REGLEMENTINTERIEUR-8.pdf', title: 'Congé annuel & Affectation de matériel', page: 7 },
              { url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dea3af6d9b2b5362a21577/22dfff62e_REGLEMENTINTERIEUR-9.pdf', title: 'Autorisation de conduire', page: 8 },
              { url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dea3af6d9b2b5362a21577/57bcf623b_REGLEMENTINTERIEUR-10.pdf', title: 'Délégués du personnel', page: 9 },
              { url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dea3af6d9b2b5362a21577/1b872bbf9_REGLEMENTINTERIEUR-11.pdf', title: 'Discipline - Interdictions', page: 10 },
              { url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dea3af6d9b2b5362a21577/b79c0d768_REGLEMENTINTERIEUR-12.pdf', title: 'Fautes et Sanctions disciplinaires', page: 11 },
              { url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dea3af6d9b2b5362a21577/76e97fa12_REGLEMENTINTERIEUR-13.pdf', title: 'Fautes et Sanctions disciplinaires (suite)', page: 12 },
              { url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dea3af6d9b2b5362a21577/43378c3d9_REGLEMENTINTERIEUR-14.pdf', title: 'Procédures disciplinaires', page: 13 },
              { url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dea3af6d9b2b5362a21577/bf0787712_REGLEMENTINTERIEUR-15.pdf', title: 'Hygiène, Sécurité, Dispositions finales', page: 14 },
              { url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dea3af6d9b2b5362a21577/b92c77312_REGLEMENTINTERIEUR-16.pdf', title: 'Publication et signatures', page: 15 },
              { url: 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68dea3af6d9b2b5362a21577/f8745a5dc_REGLEMENTINTERIEUR-17.pdf', title: 'Validation officielle', page: 16 }
            ].map((doc, index) => (
              <div key={index} className="border-b border-slate-200 pb-3 last:border-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
                      <span className="text-indigo-700 font-semibold text-sm">{doc.page}</span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-900">{doc.title}</h3>
                  </div>
                  <Button
                    onClick={() => togglePage(index)}
                    variant="outline"
                    size="sm"
                    className="rounded-lg text-xs px-2 py-1 h-7"
                  >
                    {expandedPages[index] ? 'Masquer' : 'Afficher'}
                  </Button>
                </div>
                {expandedPages[index] && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                    <iframe
                      src={`https://mozilla.github.io/pdf.js/web/viewer.html?file=${encodeURIComponent(doc.url)}`}
                      className="w-full"
                      style={{ height: '800px', border: 'none' }}
                      title={doc.title}
                    />
                  </div>
                )}
              </div>
            ))}
          </CardContent>

          {/* Footer */}
          <div className="bg-slate-100 p-4 md:p-6 text-center text-xs md:text-sm text-slate-600 border-t-2 border-slate-200">
            <p className="font-semibold">Cabinet de Géomètre Expert - Soro Nanga (CITRAT)</p>
            <p className="mt-1">BP 718 Abidjan 06, Adjamé Williamsville CR 51099</p>
            <p className="mt-1 text-xs md:text-sm">cgesn2007@yahoo.fr • Tél/Fax: 20-37-02-05 • 22-78-18-18 • 08-85-02-52</p>
            <p className="mt-2 md:mt-3 text-xs text-slate-500">Document officiel approuvé par l'Inspection du Travail et déposé au greffe du Tribunal du Travail d'Abidjan</p>
          </div>
        </Card>
      </div>
    </div>
  );
}