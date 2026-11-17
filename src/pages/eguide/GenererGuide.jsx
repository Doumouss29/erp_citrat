import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';

function useAuthRedirect() {
  useEffect(() => {
    base44.auth.isAuthenticated().then(isAuth => {
      if (!isAuth) {
        base44.auth.redirectToLogin();
      }
    });
  }, []);
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import DocumentViewerModal from '@/components/eguide/lotissement/DocumentViewerModal';
import CoverPreview from '@/components/eguide/guide/CoverPreview';
import GuideProgressModal from '@/components/eguide/guide/GuideProgressModal';
import { Loader2, FileText, Download, CheckCircle2, Eye, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import GuideTabs from '@/components/eguide/guide/GuideTabs';
import AttestationLotSelector from '@/components/eguide/guide/AttestationLotSelector';
import GuideTfSubFilter from '@/components/eguide/guide/GuideTfSubFilter';
import SearchableSelectionList from '@/components/eguide/guide/SearchableSelectionList';

const normalizeTf = (value) => String(value || '').replace(/^TF\s*/i, '').replace(/\s*[AB]\s*$/i, '').trim();

export default function GenererGuide() {
  useAuthRedirect();
  const [activeTab, setActiveTab] = useState('guide');
  const [attestationType, setAttestationType] = useState('affectation');
  const [selectedLotissement, setSelectedLotissement] = useState('');
  const [selectionMode, setSelectionMode] = useState('ilot');
  const [selectedIlots, setSelectedIlots] = useState([]);
  const [selectedAttributaires, setSelectedAttributaires] = useState([]);
  const [selectedTFs, setSelectedTFs] = useState([]);
  const [selectedLotIds, setSelectedLotIds] = useState([]);
  const [selectedDocumentIds, setSelectedDocumentIds] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [volume, setVolume] = useState('');
  const [generating, setGenerating] = useState(false);
  const [downloadingBundle, setDownloadingBundle] = useState(false);
  const [viewDocument, setViewDocument] = useState(null);
  const [documentsExpanded, setDocumentsExpanded] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressConfig, setProgressConfig] = useState({
    title: 'Génération du guide',
    description: '',
    steps: []
  });
  const [stepStatus, setStepStatus] = useState({ step1: 'idle', step2: 'idle', step3: 'idle', error: null });
  const [finalBlob, setFinalBlob] = useState(null);
  const queryClient = useQueryClient();

  const { data: lotissements = [] } = useQuery({
    queryKey: ['lotissements-eguide'],
    queryFn: () => base44.entities.LotissementEguide.filter({ commune: { $exists: true, $ne: "" } })
  });

  const { data: ilots = [] } = useQuery({
    queryKey: ['ilots', selectedLotissement],
    queryFn: () => selectedLotissement
      ? base44.entities.Ilot.filter({ id_lotissement: selectedLotissement })
      : Promise.resolve([]),
    enabled: !!selectedLotissement
  });

  const { data: documents = [], isLoading: docsLoading } = useQuery({
    queryKey: ['documents', selectedLotissement],
    queryFn: () => selectedLotissement
      ? base44.entities.Document.filter({ id_lotissement: selectedLotissement }, '-created_date', 1000)
      : Promise.resolve([]),
    enabled: !!selectedLotissement
  });

  const { data: lots = [] } = useQuery({
    queryKey: ['lots-guide', selectedLotissement],
    queryFn: () => selectedLotissement
      ? base44.entities.Lot.filter({ id_lotissement: selectedLotissement }, '', 10000)
      : Promise.resolve([]),
    enabled: !!selectedLotissement
  });

  const { data: attributaires = [] } = useQuery({
    queryKey: ['attributaires-guide', selectedLotissement, lots.length],
    queryFn: async () => {
      if (!selectedLotissement || lots.length === 0) return [];
      const allAttributaires = await base44.entities.Attributaire.list();
      const lotIds = new Set(lots.map(l => l.id));
      return allAttributaires.filter(a => lotIds.has(a.id_lot));
    },
    enabled: !!selectedLotissement
  });

  const { data: themeConfigs = [] } = useQuery({
    queryKey: ['config-theme'],
    queryFn: () => base44.entities.ConfigurationApp.filter({ cle: 'theme' })
  });

  const titleColor = (themeConfigs[0]?.valeur?.primaryTextColor) || '#a3009d';

  const eligibleDocuments = useMemo(() => documents.filter((doc) => {
    const type = String(doc?.type_document || '').toLowerCase();
    const desc = String(doc?.description || '').toLowerCase();
    const name = String(doc?.nom_fichier || '').toLowerCase();
    const mime = String(doc?.type_mime || '').toLowerCase();
    const isPdf = mime.includes('pdf') || name.endsWith('.pdf');
    const isAttestation = type === 'attestation';
    const isGuide = desc === '__guide_global__';
    const isCover = desc === '__cover__' || name.includes('couverture') || name.includes('cover') || name.includes('page_de_garde') || name.includes('page de garde');
    return isPdf && !isAttestation && !isGuide && !isCover;
  }), [documents]);

  const uniqueAttributaires = useMemo(() => [...new Map(
    attributaires.map(a => {
      const label = a.type_attributaire === 'physique'
        ? `${a.nom || ''} ${a.prenom || ''}`.trim()
        : (a.raison_sociale || a.nom || '').trim();
      const key = `${a.type_attributaire || ''}::${label.toLowerCase()}`;
      return [key, { key, label, type_attributaire: a.type_attributaire }];
    })
  ).values()].filter(a => a.label).sort((a, b) => a.label.localeCompare(b.label, 'fr', { sensitivity: 'base' })), [attributaires]);

  const uniqueTFs = useMemo(() => [...new Set(
    lots
      .map(lot => normalizeTf(lot.TF))
      .filter(Boolean)
  )].sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' })), [lots]);

  const tfStats = useMemo(() => lots.reduce((acc, lot) => {
    const tf = normalizeTf(lot.TF);
    if (!tf) return acc;
    if (!acc[tf]) acc[tf] = { ilotIds: new Set(), lots: 0 };
    acc[tf].ilotIds.add(lot.id_ilot);
    acc[tf].lots += 1;
    return acc;
  }, {}), [lots]);

  const tfStatsDisplay = useMemo(() => Object.fromEntries(
    Object.entries(tfStats).map(([tf, stats]) => [tf, { ilots: stats.ilotIds.size, lots: stats.lots }])
  ), [tfStats]);

  function getAttributaireSelectionKey(a) {
    const label = a.type_attributaire === 'physique'
      ? `${a.nom || ''} ${a.prenom || ''}`.trim()
      : (a.raison_sociale || a.nom || '').trim();
    return `${a.type_attributaire || ''}::${label.toLowerCase()}`;
  }

  const guideSubFilterData = useMemo(() => {
    let scopedLots = lots;

    if (selectionMode === 'ilot' && selectedIlots.length > 0) {
      scopedLots = lots.filter((lot) => selectedIlots.includes(lot.id_ilot));
    } else if (selectionMode === 'attributaire' && selectedAttributaires.length > 0) {
      const allowedLotIds = new Set(
        attributaires
          .filter((a) => selectedAttributaires.includes(getAttributaireSelectionKey(a)))
          .map((a) => a.id_lot)
          .filter(Boolean)
      );
      scopedLots = lots.filter((lot) => allowedLotIds.has(lot.id));
    }

    const stats = scopedLots.reduce((acc, lot) => {
      const tf = normalizeTf(lot.TF);
      if (!tf) return acc;
      if (!acc[tf]) acc[tf] = { ilotIds: new Set(), lots: 0 };
      acc[tf].ilotIds.add(lot.id_ilot);
      acc[tf].lots += 1;
      return acc;
    }, {});

    return {
      tfs: Object.keys(stats).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' })),
      stats: Object.fromEntries(
        Object.entries(stats).map(([tf, data]) => [tf, { ilots: data.ilotIds.size, lots: data.lots }])
      )
    };
  }, [lots, selectionMode, selectedIlots, selectedAttributaires, attributaires]);

  const attributairesByLot = useMemo(() => attributaires.reduce((acc, attr) => {
    if (!attr?.id_lot) return acc;
    if (!acc[attr.id_lot]) acc[attr.id_lot] = [];
    acc[attr.id_lot].push(attr);
    return acc;
  }, {}), [attributaires]);

  const attributaireStats = useMemo(() => {
    const lotById = Object.fromEntries(lots.map((lot) => [lot.id, lot]));
    return attributaires.reduce((acc, attr) => {
      const key = getAttributaireSelectionKey(attr);
      const lot = lotById[attr.id_lot];
      if (!key || !lot) return acc;
      if (!acc[key]) acc[key] = { ilotIds: new Set(), lotIds: new Set() };
      acc[key].ilotIds.add(lot.id_ilot);
      acc[key].lotIds.add(lot.id);
      return acc;
    }, {});
  }, [attributaires, lots]);

  const attributaireStatsDisplay = useMemo(() => Object.fromEntries(
    Object.entries(attributaireStats).map(([key, stats]) => [key, { ilots: stats.ilotIds.size, lots: stats.lotIds.size }])
  ), [attributaireStats]);

  const ilotById = useMemo(() => Object.fromEntries(ilots.map((ilot) => [ilot.id, ilot])), [ilots]);

  const filteredAttestationLots = useMemo(() => {
    const baseLots = lots.map((lot) => ({ ...lot, ilot: ilotById[lot.id_ilot] })).sort((a, b) => {
      const ilotCompare = String(a?.ilot?.numero_ilot || '').localeCompare(String(b?.ilot?.numero_ilot || ''), 'fr', { numeric: true, sensitivity: 'base' });
      if (ilotCompare !== 0) return ilotCompare;
      return String(a?.numero_lot || '').localeCompare(String(b?.numero_lot || ''), 'fr', { numeric: true, sensitivity: 'base' });
    });

    if (selectionMode === 'ilot') {
      return selectedIlots.length > 0 ? baseLots.filter((lot) => selectedIlots.includes(lot.id_ilot)) : baseLots;
    }

    if (selectionMode === 'attributaire') {
      if (selectedAttributaires.length === 0) return baseLots;
      const allowedLotIds = new Set(attributaires.filter((a) => selectedAttributaires.includes(getAttributaireSelectionKey(a))).map((a) => a.id_lot).filter(Boolean));
      return baseLots.filter((lot) => allowedLotIds.has(lot.id));
    }

    if (selectedTFs.length === 0) return baseLots;
    const tfSet = new Set(selectedTFs.map((tf) => normalizeTf(tf)));
    return baseLots.filter((lot) => tfSet.has(normalizeTf(lot.TF)));
  }, [lots, ilotById, selectionMode, selectedIlots, selectedAttributaires, selectedTFs, attributaires]);

  const filteredGuideLots = useMemo(() => {
    let scopedLots = lots;

    if (selectionMode === 'ilot' && selectedIlots.length > 0) {
      scopedLots = lots.filter((lot) => selectedIlots.includes(lot.id_ilot));
    } else if (selectionMode === 'attributaire' && selectedAttributaires.length > 0) {
      const allowedLotIds = new Set(
        attributaires
          .filter((a) => selectedAttributaires.includes(getAttributaireSelectionKey(a)))
          .map((a) => a.id_lot)
          .filter(Boolean)
      );
      scopedLots = lots.filter((lot) => allowedLotIds.has(lot.id));
    }

    if (selectedTFs.length > 0) {
      const tfSet = new Set(selectedTFs.map((tf) => normalizeTf(tf)));
      scopedLots = scopedLots.filter((lot) => tfSet.has(normalizeTf(lot.TF)));
    }

    return scopedLots;
  }, [lots, selectionMode, selectedIlots, selectedAttributaires, selectedTFs, attributaires]);

  const allFilteredLotsSelected = filteredAttestationLots.length > 0 && filteredAttestationLots.every((lot) => selectedLotIds.includes(lot.id));

  const lotCountByIlot = useMemo(() => lots.reduce((acc, lot) => {
    if (!lot?.id_ilot) return acc;
    acc[lot.id_ilot] = (acc[lot.id_ilot] || 0) + 1;
    return acc;
  }, {}), [lots]);

  const sortedIlots = useMemo(() => [...ilots].sort((a, b) => {
    const numA = parseInt(a.numero_ilot) || 0;
    const numB = parseInt(b.numero_ilot) || 0;
    return numA - numB;
  }), [ilots]);

  const selectionItems = useMemo(() => {
    if (selectionMode === 'ilot') {
      return sortedIlots.map((ilot) => ({
        value: ilot.id,
        label: `Îlot ${ilot.numero_ilot}`,
        meta: `1 îlot • ${lotCountByIlot[ilot.id] ?? ilot.nombre_lots ?? 0} lot(s)`
      }));
    }

    if (selectionMode === 'attributaire') {
      return uniqueAttributaires.map((attributaire) => ({
        value: attributaire.key,
        label: attributaire.label,
        meta: `${attributaireStatsDisplay[attributaire.key]?.ilots || 0} îlot(s) • ${attributaireStatsDisplay[attributaire.key]?.lots || 0} lot(s)`
      }));
    }

    return uniqueTFs.map((tf) => ({
      value: tf,
      label: tf,
      meta: `${tfStatsDisplay[tf]?.ilots || 0} îlot(s) • ${tfStatsDisplay[tf]?.lots || 0} lot(s)`
    }));
  }, [selectionMode, sortedIlots, lotCountByIlot, uniqueAttributaires, attributaireStatsDisplay, uniqueTFs, tfStatsDisplay]);

  useEffect(() => {
    setDocumentsExpanded(false);
  }, [selectedLotissement]);

  useEffect(() => {
    setSelectedDocumentIds(eligibleDocuments.map((doc) => doc.id));
  }, [selectedLotissement, eligibleDocuments.length]);

  useEffect(() => {
    if (selectAll) {
      if (selectionMode === 'ilot') {
        setSelectedIlots(ilots.map(i => i.id));
      } else if (selectionMode === 'attributaire') {
        setSelectedAttributaires(uniqueAttributaires.map(a => a.key));
      } else {
        setSelectedTFs(uniqueTFs);
      }
    } else {
      if (selectionMode === 'ilot') {
        setSelectedIlots([]);
      } else if (selectionMode === 'attributaire') {
        setSelectedAttributaires([]);
      } else {
        setSelectedTFs([]);
      }
    }
  }, [selectAll, ilots, selectionMode, uniqueAttributaires, uniqueTFs]);

  useEffect(() => {
    setSelectedLotIds((prev) => prev.filter((id) => filteredAttestationLots.some((lot) => lot.id === id)));
  }, [filteredAttestationLots]);

  useEffect(() => {
    if (selectionMode === 'ilot' || selectionMode === 'attributaire') {
      setSelectedTFs((prev) => prev.filter((tf) => guideSubFilterData.tfs.includes(tf)));
    }
  }, [selectionMode, guideSubFilterData]);

  const handleToggleIlot = (ilotId) => {
    setSelectAll(false);
    setSelectedIlots(prev =>
      prev.includes(ilotId)
        ? prev.filter(id => id !== ilotId)
        : [...prev, ilotId]
    );
  };

  const handleToggleAttributaire = (attributaireKey) => {
    setSelectAll(false);
    setSelectedAttributaires(prev =>
      prev.includes(attributaireKey)
        ? prev.filter(id => id !== attributaireKey)
        : [...prev, attributaireKey]
    );
  };

  const handleToggleTF = (tf) => {
    setSelectAll(false);
    setSelectedTFs(prev =>
      prev.includes(tf)
        ? prev.filter(id => id !== tf)
        : [...prev, tf]
    );
  };

  const handleToggleLot = (lotId) => {
    setSelectedLotIds((prev) =>
      prev.includes(lotId)
        ? prev.filter((id) => id !== lotId)
        : [...prev, lotId]
    );
  };

  const handleToggleAllFilteredLots = (checked) => {
    setSelectedLotIds(checked ? filteredAttestationLots.map((lot) => lot.id) : []);
  };

  const handleToggleDocument = (documentId) => {
    setSelectedDocumentIds(prev =>
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const handleGenerate = async () => {
    if (!selectedLotissement) {
      toast.error('Veuillez sélectionner un lotissement');
      return;
    }

    setGenerating(true);
    setFinalBlob(null);
    setProgressConfig({
      title: 'Génération du guide',
      description: 'Le guide a été enregistré dans les documents du lotissement. Vous pouvez aussi le télécharger ici.',
      steps: [
        { key: 'step1', label: 'Fusion de la couverture et des documents' },
        { key: 'step2', label: 'Génération des pages du guide' },
        { key: 'step3', label: 'Fusion finale' },
      ]
    });
    setStepStatus({ step1: 'running', step2: 'idle', step3: 'idle', error: null });
    setProgressOpen(true);

    try {
      const resp1 = await base44.functions.invoke('downloadCoverAndDocs', {
        id_lotissement: selectedLotissement,
        family_name: familyName,
        volume,
        selected_document_ids: selectedDocumentIds,
      });
      const coverDocsBlob = new Blob([resp1.data], { type: 'application/pdf' });
      setStepStatus((s) => ({ ...s, step1: 'done' }));

      const resp2 = await base44.functions.invoke('genererGuide', {
        id_lotissement: selectedLotissement,
        ilots_ids: selectionMode === 'ilot' ? (selectedIlots.length > 0 ? selectedIlots : ilots.map(i => i.id)) : [],
        attributaires_ids: selectionMode === 'attributaire' ? selectedAttributaires : [],
        tf_values: selectedTFs,
        family_name: familyName,
        volume,
        selected_document_ids: selectedDocumentIds,
        custom_filename: buildGuideFilename(),
        only_guide: true,
      });
      const guideBlob = new Blob([resp2.data], { type: 'application/pdf' });
      setStepStatus((s) => ({ ...s, step2: 'done' }));

      setStepStatus((s) => ({ ...s, step3: 'running' }));
      const guideArrayBuf = await guideBlob.arrayBuffer();
      const u8 = new Uint8Array(guideArrayBuf);
      let binary = '';
      const chunk = 0x8000;
      for (let i = 0; i < u8.length; i += chunk) {
        binary += String.fromCharCode(...u8.subarray(i, i + chunk));
      }
      const guideB64 = btoa(binary);
      const resp3 = await base44.functions.invoke('genererGuide', {
        id_lotissement: selectedLotissement,
        ilots_ids: selectionMode === 'ilot' ? (selectedIlots.length > 0 ? selectedIlots : ilots.map(i => i.id)) : [],
        attributaires_ids: selectionMode === 'attributaire' ? selectedAttributaires : [],
        tf_values: selectedTFs,
        family_name: familyName,
        volume,
        selected_document_ids: selectedDocumentIds,
        custom_filename: buildGuideFilename(),
        merge_with_cover_docs: true,
        save_document: true,
        guide_pdf_base64: guideB64,
      });

      const headers3 = resp3?.headers || {};
      const ct3 = String(headers3['content-type'] || headers3['Content-Type'] || '');
      const isPdf3 = ct3.includes('application/pdf');
      if (isPdf3) {
        const final = new Blob([resp3.data], { type: 'application/pdf' });
        setFinalBlob(final);
        setStepStatus((s) => ({ ...s, step3: 'done' }));
      } else if (resp3?.data?.saved) {
        try {
          const fileUrl = resp3?.data?.url;
          if (fileUrl) {
            const freshUrl = new URL(fileUrl, window.location.origin);
            freshUrl.searchParams.set('_ts', String(Date.now()));
            const res = await fetch(freshUrl.toString(), { cache: 'no-store' });
            if (res.ok) {
              const blob = await res.blob();
              setFinalBlob(blob);
            }
          }
        } catch {}
        setStepStatus((s) => ({ ...s, step3: 'done' }));
        toast.success('Guide enregistré dans les documents du lotissement');
        queryClient.invalidateQueries({ queryKey: ['documents', selectedLotissement] });
      } else if (isPdf3 === false && (headers3['X-Guide-Saved'] === 'false' || headers3['x-guide-saved'] === 'false')) {
        const final = new Blob([resp3.data], { type: 'application/pdf' });
        setFinalBlob(final);
        setStepStatus((s) => ({ ...s, step3: 'done' }));
        toast.message('Guide trop volumineux pour l\'enregistrement, téléchargement direct prêt');
      } else {
        const msg = (resp3?.data && typeof resp3.data === 'object' && resp3.data.error)
          ? resp3.data.error
          : 'La génération a échoué.';
        throw new Error(msg);
      }
      toast.success('Guide global prêt au téléchargement');
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors de la génération du guide');
      setStepStatus((s) => ({ ...s, error: error?.message || 'Erreur', step1: s.step1 === 'idle' ? 'error' : s.step1, step2: s.step2 === 'idle' ? 'error' : s.step2, step3: 'error' }));
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadBundle = async () => {
    if (!selectedLotissement) {
      toast.error('Veuillez sélectionner un lotissement');
      return;
    }
    setDownloadingBundle(true);
    try {
      const response = await base44.functions.invoke('downloadCoverAndDocs', {
        id_lotissement: selectedLotissement,
        family_name: familyName,
        volume,
        selected_document_ids: selectedDocumentIds,
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `couverture_et_documents_${selectedLotissement}_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      toast.success('Téléchargement prêt');
    } catch (e) {
      console.error(e);
      toast.error('Erreur lors du téléchargement groupé');
    } finally {
      setDownloadingBundle(false);
    }
  };

  const handleDownloadFinal = () => {
    if (!finalBlob) return;
    const url = window.URL.createObjectURL(finalBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeTab === 'attestation' ? 'Attestations.pdf' : buildGuideFilename();
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
  };

  const handleGenerateAttestations = async () => {
    if (!selectedLotissement) {
      toast.error('Veuillez sélectionner un lotissement');
      return;
    }

    setGenerating(true);
    setFinalBlob(null);
    setProgressConfig({
      title: 'Génération des attestations',
      description: 'Les attestations sont enregistrées dans les documents des lots. Vous pouvez aussi télécharger le PDF global ici.',
      steps: [
        { key: 'step1', label: 'Préparation des lots sélectionnés' },
        { key: 'step2', label: 'Génération du PDF global' },
        { key: 'step3', label: 'Enregistrement des attestations par lot' },
      ]
    });
    setStepStatus({ step1: 'running', step2: 'idle', step3: 'idle', error: null });
    setProgressOpen(true);

    try {
      setStepStatus((s) => ({ ...s, step1: 'done', step2: 'running' }));
      const pdfResponse = await base44.functions.invoke('genererAttestations', {
        id_lotissement: selectedLotissement,
        ilots_ids: selectionMode === 'ilot' ? (selectedIlots.length > 0 ? selectedIlots : ilots.map(i => i.id)) : [],
        attributaires_ids: selectionMode === 'attributaire' ? selectedAttributaires : [],
        tf_values: selectionMode === 'tf' ? selectedTFs : [],
        lot_ids: selectedLotIds,
        attestation_type: attestationType,
        save_document: false,
      });

      const pdfHeaders = pdfResponse?.headers || {};
      const pdfContentType = String(pdfHeaders['content-type'] || pdfHeaders['Content-Type'] || '');
      const isPdfResponse = pdfContentType.includes('application/pdf');
      if (!isPdfResponse) {
        const message = (pdfResponse?.data && typeof pdfResponse.data === 'object' && pdfResponse.data.error)
          ? pdfResponse.data.error
          : "Aucune attestation de cession n'existe pour les lots concernés.";
        throw new Error(message);
      }

      const blob = new Blob([pdfResponse.data], { type: 'application/pdf' });
      setFinalBlob(blob);
      setStepStatus((s) => ({ ...s, step2: 'done', step3: 'running' }));

      const saveResponse = await base44.functions.invoke('genererAttestations', {
        id_lotissement: selectedLotissement,
        ilots_ids: selectionMode === 'ilot' ? (selectedIlots.length > 0 ? selectedIlots : ilots.map(i => i.id)) : [],
        attributaires_ids: selectionMode === 'attributaire' ? selectedAttributaires : [],
        tf_values: selectionMode === 'tf' ? selectedTFs : [],
        lot_ids: selectedLotIds,
        attestation_type: attestationType,
        save_document: true,
      });

      if (saveResponse?.data?.error) {
        throw new Error(saveResponse.data.error);
      }

      queryClient.invalidateQueries({ queryKey: ['documents', selectedLotissement] });
      setStepStatus((s) => ({ ...s, step3: 'done' }));
      toast.success(`${saveResponse.data?.count || 0} attestation(s) générée(s)`);
    } catch (error) {
      console.error(error);
      const message = error?.response?.data?.error || error?.message || 'Erreur lors de la génération des attestations';
      toast.error(message);
      setStepStatus((s) => ({
        ...s,
        error: message,
        step1: s.step1 === 'done' ? 'done' : 'error',
        step2: s.step2 === 'done' ? 'done' : 'error',
        step3: s.step3 === 'done' ? 'done' : 'error'
      }));
    } finally {
      setGenerating(false);
    }
  };

  const lotissement = lotissements.find(l => l.id === selectedLotissement);

  const selectedAttributaireLabel = selectionMode === 'attributaire' && selectedAttributaires.length === 1
    ? uniqueAttributaires.find((item) => item.key === selectedAttributaires[0])?.label || ''
    : '';

  const buildGuideFilename = () => {
    const sanitize = (value) => String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    const parts = [
      'Guide',
      lotissement?.nom,
      familyName,
      selectionMode === 'attributaire' ? selectedAttributaireLabel : '',
      selectionMode === 'tf' ? 'TF' : '',
      filteredGuideLots.length > 0 ? `${filteredGuideLots.length}lots` : ''
    ].map(sanitize).filter(Boolean);

    return `${parts.join('_') || 'Guide'}.pdf`;
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <FileText className="w-8 h-8" />
            <span className="sm:hidden">GUIDE</span>
            <span className="hidden sm:inline">GUIDE</span>
          </h1>
          <p className="text-slate-500 mt-2 hidden sm:block">
            Gestion du guide et de l'attestation
          </p>
        </div>

        <GuideTabs activeTab={activeTab} onTabChange={setActiveTab} />

        {activeTab === 'attestation' ? (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle style={{ color: titleColor }}>Configuration des attestations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>1. Choisissez le type d'attestation</Label>
                <Select value={attestationType} onValueChange={setAttestationType}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choisir un type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="affectation">Attestation d'affectation</SelectItem>
                    <SelectItem value="cession">Attestation de cession</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-2">
                  Le type “Affectation” utilise le modèle actuel. Le type “Cession” génère un calque PDF à imprimer sur le papier pré-imprimé.
                </p>
              </div>

              <div>
                <Label>2. Sélectionnez un lotissement</Label>
                <Select value={selectedLotissement} onValueChange={(value) => { setSelectedLotissement(value); setSelectAll(false); setSelectedIlots([]); setSelectedAttributaires([]); setSelectedTFs([]); setSelectedLotIds([]); }}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Choisir un lotissement..." />
                  </SelectTrigger>
                  <SelectContent>
                    {lotissements.map(lot => (
                      <SelectItem key={lot.id} value={lot.id}>
                        {lot.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedLotissement && (
                <div className="space-y-4">
                  <div>
                    <Label>3. Choisissez le mode de sélection</Label>
                    <Select value={selectionMode} onValueChange={(value) => { setSelectionMode(value); setSelectAll(false); setSelectedIlots([]); setSelectedAttributaires([]); setSelectedTFs([]); setSelectedLotIds([]); }}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choisir un mode..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ilot">Par îlots</SelectItem>
                        <SelectItem value="attributaire">Par attributaire</SelectItem>
                        <SelectItem value="tf">Par TF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <Label>{selectionMode === 'ilot' ? '4. Sélectionnez les îlots à inclure' : selectionMode === 'attributaire' ? '4. Sélectionnez les attributaires à inclure' : '4. Sélectionnez les TF à inclure'}</Label>
                      <div className="flex items-center gap-2">
                        <Checkbox id="select-all-attestation" checked={selectAll} onCheckedChange={setSelectAll} />
                        <Label htmlFor="select-all-attestation" className="cursor-pointer">Sélectionner tous</Label>
                      </div>
                    </div>

                    <SearchableSelectionList
                      items={selectionItems}
                      selectedValues={selectionMode === 'ilot' ? selectedIlots : selectionMode === 'attributaire' ? selectedAttributaires : selectedTFs}
                      onToggle={selectionMode === 'ilot' ? handleToggleIlot : selectionMode === 'attributaire' ? handleToggleAttributaire : handleToggleTF}
                      searchPlaceholder={selectionMode === 'ilot' ? 'Rechercher un îlot...' : selectionMode === 'attributaire' ? 'Rechercher un attributaire...' : 'Rechercher un TF...'}
                      emptyMessage={selectionMode === 'ilot' ? 'Aucun îlot trouvé' : selectionMode === 'attributaire' ? 'Aucun attributaire trouvé' : 'Aucun TF trouvé'}
                    />
                  </div>

                  <AttestationLotSelector
                    lots={filteredAttestationLots}
                    selectedLotIds={selectedLotIds}
                    onToggleLot={handleToggleLot}
                    onToggleAll={handleToggleAllFilteredLots}
                    allSelected={allFilteredLotsSelected}
                    attributairesByLot={attributairesByLot}
                  />
                </div>
              )}

              <Button onClick={handleGenerateAttestations} disabled={!selectedLotissement || generating} className="w-full" size="lg">
                {generating ? (
                  <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Génération en cours...</>
                ) : (
                  <><Download className="w-5 h-5 mr-2" /> {attestationType === 'cession' ? "Générer les attestations de cession PDF" : "Générer les attestations d'affectation PDF"}</>
                )}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {selectedLotissement && (
              <>
                <CoverPreview lotissement={lotissement} volume={volume} familyName={familyName} />
              </>
            )}

            {selectedLotissement ? (
              <Card className="mb-6">
                <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CardTitle style={{ color: titleColor }}>Documents officiels du lotissement</CardTitle>
                    {!docsLoading && eligibleDocuments.length > 0 && (
                      <Badge variant="outline">{eligibleDocuments.length} document(s) éligible(s)</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {eligibleDocuments.length > 0 && !docsLoading && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDocumentsExpanded(prev => !prev)}
                      >
                        {documentsExpanded ? (
                          <><ChevronDown className="w-4 h-4 mr-2" /> Replier</>
                        ) : (
                          <><ChevronRight className="w-4 h-4 mr-2" /> Déplier</>
                        )}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadBundle}
                      disabled={!selectedLotissement || docsLoading || downloadingBundle}
                      className="whitespace-nowrap"
                    >
                      {downloadingBundle ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Préparation...</>
                      ) : (
                        <><Download className="w-4 h-4 mr-2" /> Télécharger (couverture + docs)</>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {docsLoading ? (
                    <div className="flex items-center text-sm text-slate-600"><Loader2 className="w-4 h-4 mr-2 animate-spin"/>Chargement des documents...</div>
                  ) : eligibleDocuments.length > 0 ? (
                    documentsExpanded ? (
                      <div className="space-y-3">
                        <div className="rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          Seuls les documents éligibles au guide sont affichés ici. Les attestations sont exclues automatiquement.
                        </div>
                        {[...eligibleDocuments]
                          .sort((a, b) => {
                            const pa = a.type_document === 'decret' ? 1 : 0;
                            const pb = b.type_document === 'decret' ? 1 : 0;
                            if (pa !== pb) return pb - pa;
                            const da = new Date(a.created_date || 0).getTime();
                            const db = new Date(b.created_date || 0).getTime();
                            return db - da;
                          })
                          .map(doc => {
                            const checked = selectedDocumentIds.includes(doc.id);
                            return (
                              <div key={doc.id} className="flex items-center justify-between gap-3 p-3 border rounded-lg bg-white">
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                  <Checkbox checked={checked} onCheckedChange={() => handleToggleDocument(doc.id)} />
                                  <div className="min-w-0">
                                    <div className="font-medium text-slate-900 text-sm truncate max-w-[44vw] sm:max-w-[36rem]">{doc.nom_fichier}</div>
                                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                                      <Badge variant="outline">
                                        {doc.type_document === 'decret' ? 'Décret' :
                                         doc.type_document === 'plan' ? 'Plan' :
                                         doc.type_document === 'contrat' ? 'Contrat' :
                                         doc.type_document === 'piece_identite' ? "Pièce d'identité" : 'Autre'}
                                      </Badge>
                                      {doc.taille ? <span>{(doc.taille/1024).toFixed(0)} Ko</span> : null}
                                      {doc.created_date ? <span>{format(new Date(doc.created_date), 'dd/MM/yyyy', { locale: fr })}</span> : null}
                                    </div>
                                    {doc.description && (
                                      <p className="text-xs text-slate-500 mt-1">{doc.description}</p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <Button size="sm" variant="outline" onClick={() => setViewDocument(doc)}>
                                    <Eye className="w-4 h-4 mr-2"/> Voir
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <div className="rounded-lg border bg-slate-50 px-4 py-3 text-sm text-slate-600">
                        La liste est repliée. Cliquez sur « Déplier » pour choisir les documents à inclure dans le guide.
                      </div>
                    )
                  ) : (
                    <p className="text-sm text-slate-500">Aucun document éligible pour le guide.</p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle style={{ color: titleColor }}>Documents officiels</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-500">Sélectionnez un lotissement pour voir ses documents officiels.</p>
                </CardContent>
              </Card>
            )}

            <Card className="mb-6">
              <CardHeader>
                <CardTitle style={{ color: titleColor }}>Configuration du Guide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label>1. Sélectionnez un lotissement</Label>
                  <Select value={selectedLotissement} onValueChange={(value) => { setSelectedLotissement(value); setSelectAll(false); setSelectedIlots([]); setSelectedAttributaires([]); setSelectedTFs([]); }}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Choisir un lotissement..." />
                    </SelectTrigger>
                    <SelectContent>
                      {lotissements.map(lot => (
                        <SelectItem key={lot.id} value={lot.id}>
                          {lot.nom}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedLotissement && (
                  <div className="space-y-4">
                    <div>
                      <Label>2. Choisissez le mode de sélection</Label>
                      <Select value={selectionMode} onValueChange={(value) => { setSelectionMode(value); setSelectAll(false); setSelectedIlots([]); setSelectedAttributaires([]); setSelectedTFs([]); }}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Choisir un mode..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ilot">Par îlots</SelectItem>
                          <SelectItem value="attributaire">Par attributaire</SelectItem>
                          <SelectItem value="tf">Par TF</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <Label>{selectionMode === 'ilot' ? '3. Sélectionnez les îlots à inclure' : selectionMode === 'attributaire' ? '3. Sélectionnez les attributaires à inclure' : '3. Sélectionnez les TF à inclure'}</Label>
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="select-all"
                            checked={selectAll}
                            onCheckedChange={setSelectAll}
                          />
                          <Label htmlFor="select-all" className="cursor-pointer">
                            Sélectionner tous
                          </Label>
                        </div>
                      </div>

                      <SearchableSelectionList
                        items={selectionItems}
                        selectedValues={selectionMode === 'ilot' ? selectedIlots : selectionMode === 'attributaire' ? selectedAttributaires : selectedTFs}
                        onToggle={selectionMode === 'ilot' ? handleToggleIlot : selectionMode === 'attributaire' ? handleToggleAttributaire : handleToggleTF}
                        searchPlaceholder={selectionMode === 'ilot' ? 'Rechercher un îlot...' : selectionMode === 'attributaire' ? 'Rechercher un attributaire...' : 'Rechercher un TF...'}
                        emptyMessage={selectionMode === 'ilot' ? 'Aucun îlot trouvé' : selectionMode === 'attributaire' ? 'Aucun attributaire trouvé' : 'Aucun TF trouvé'}
                      />

                      <p className="text-xs text-slate-500 mt-2">
                        {selectionMode === 'ilot'
                          ? (selectedIlots.length === 0 ? "Tous les îlots seront inclus si aucun n'est sélectionné" : `${selectedIlots.length} îlot(s) sélectionné(s)`)
                          : selectionMode === 'attributaire'
                            ? (selectedAttributaires.length === 0 ? "Tous les attributaires seront inclus si aucun n'est sélectionné" : `${selectedAttributaires.length} attributaire(s) sélectionné(s)`)
                            : (selectedTFs.length === 0 ? "Tous les TF seront inclus si aucun n'est sélectionné" : `${selectedTFs.length} TF sélectionné(s)`)
                        }
                      </p>
                    </div>

                    {selectionMode !== 'tf' && (
                      <GuideTfSubFilter
                        tfs={guideSubFilterData.tfs}
                        tfStats={guideSubFilterData.stats}
                        selectedTFs={selectedTFs}
                        onToggleTF={handleToggleTF}
                      />
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="family-name" className="whitespace-nowrap">Nom famille (optionnel)</Label>
                    <Input
                      id="family-name"
                      value={familyName}
                      onChange={(e) => setFamilyName(e.target.value)}
                      placeholder="Ex: FAMILLE KOUADIO"
                      className="mt-1"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="volume" className="whitespace-nowrap">Volume (optionnel)</Label>
                    <Input
                      id="volume"
                      value={volume}
                      onChange={(e) => setVolume(e.target.value)}
                      placeholder="Ex: 1, 2, A, B..."
                      className="mt-1"
                    />
                  </div>

                </div>

                {lotissement && (
                  <div className="bg-slate-50 rounded-lg p-4 space-y-1 text-sm">
                    <p><span className="font-medium">Région:</span> {lotissement.region || 'Non renseignée'}</p>
                    <p><span className="font-medium">Commune:</span> {lotissement.commune || 'Non renseignée'}</p>
                    <p><span className="font-medium">Décret:</span> {lotissement.decret || 'Non renseigné'}</p>
                  </div>
                )}

                <Button
                  onClick={handleGenerate}
                  disabled={!selectedLotissement || generating}
                  className="w-full"
                  size="lg"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Génération en cours...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5 mr-2" />
                      Générer le guide PDF
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base" style={{ color: titleColor }}>Contenu du guide généré</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                    <span>Page de garde avec armoirie, région, commune et décret</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                    <span>Récapitulatif des îlots et lots</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                    <span>Fiches détaillées pour chaque lot avec informations des attributaires</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </>
        )}

        <DocumentViewerModal
          document={viewDocument}
          open={!!viewDocument}
          onOpenChange={(open) => !open && setViewDocument(null)}
        />
        <GuideProgressModal
          open={progressOpen}
          onOpenChange={setProgressOpen}
          stepStatus={stepStatus}
          onDownload={handleDownloadFinal}
          canDownload={!!finalBlob}
          title={progressConfig.title}
          description={progressConfig.description}
          steps={progressConfig.steps}
        />
      </div>
    </div>
  );
}