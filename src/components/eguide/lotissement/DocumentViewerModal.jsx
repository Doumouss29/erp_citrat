import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from "@/components/ui/button";
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { safeUrl } from "@/lib/safeUrl";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;

export default function DocumentViewerModal({ document, open, onOpenChange }) {
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);

  if (!document) return null;

  const isPDF = document.type_mime?.includes('pdf') || document.nom_fichier?.toLowerCase().endsWith('.pdf');
  const isImage = document.type_mime?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp)$/i.test(document.nom_fichier);

  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl h-[90vh] p-0 gap-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-lg">{document.nom_fichier}</div>
              {document.description && (
                <div className="text-sm text-slate-500 font-normal mt-1">{document.description}</div>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto px-6 pb-6">
          {isPDF ? (
            <div className="flex flex-col items-center gap-4">
              <Document
                file={document.url_fichier}
                onLoadSuccess={onDocumentLoadSuccess}
                className="border border-slate-200 rounded-lg"
              >
                <Page 
                  pageNumber={pageNumber}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="max-w-full"
                />
              </Document>
              
              {numPages && numPages > 1 && (
                <div className="flex items-center gap-4 bg-slate-100 px-4 py-2 rounded-lg">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                    disabled={pageNumber <= 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  
                  <span className="text-sm font-medium">
                    Page {pageNumber} / {numPages}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                    disabled={pageNumber >= numPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          ) : isImage ? (
            <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200">
              <img
                src={document.url_fichier}
                alt={document.nom_fichier}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-center text-slate-500">
                <p className="mb-4">Aperçu non disponible pour ce type de fichier</p>
                <a
                  href={safeUrl(document.url_fichier)}
                  download
                  className="text-orange-600 hover:text-orange-700 underline"
                >
                  Télécharger le fichier
                </a>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}