import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * e-Cadastre est une application interne au cabinet : il n'y a plus de notion d'organisation
 * pour les utilisateurs. Un seul enregistrement « Organisation » subsiste en coulisse : il porte
 * la configuration du projet (communes, objectifs, couches cadastrales) et sert de référence
 * aux collectes. Aucun écran ne demande plus de choisir ou d'appartenir à une organisation.
 */
export function useCabinetOrg() {
  return useQuery({
    queryKey: ['cabinet-org'],
    queryFn: async () => {
      const r = await base44.entities.Organisation.list('created_date', 10);
      const list = Array.isArray(r) ? r : r?.items || [];
      return list.find((o) => o.statut !== 'inactive') || list[0] || null;
    },
    staleTime: 30 * 60 * 1000,
  });
}

/** Identifiant à utiliser : celui de l'adresse (anciens liens), du compte, sinon celui du cabinet. */
export function resolveOrgId(fromUrl, user, cabinet) {
  return fromUrl || user?.organisation_id || cabinet?.id || '';
}
