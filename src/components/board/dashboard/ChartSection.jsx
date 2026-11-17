import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
import StatutDonut from './StatutDonut';

const COLORS = ['#3B82F6', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316'];

export default function ChartSection({ dossiers, activites, statuts, bureaux, showBureaux = false, isAdmin = false }) {
  // Dossiers par activité
  const dossiersParActivite = activites?.filter(a => a.actif).map(activite => ({
    name: activite.code,
    value: dossiers?.filter(d => d.activite_id === activite.id).length || 0
  })).filter(item => item.value > 0) || [];

  // Dossiers par statut
  const dossiersParStatut = statuts?.filter(s => s.actif).map(statut => ({
    name: statut.libelle,
    value: dossiers?.filter(d => d.statut_id === statut.id).length || 0,
    color: statut.couleur
  })).filter(item => item.value > 0) || [];

  // Dossiers par bureau (pour DG)
  const dossiersParBureau = bureaux?.map(bureau => ({
    name: bureau.code,
    fullName: bureau.nom,
    value: dossiers?.filter(d => d.bureau_id === bureau.id).length || 0,
    portefeuille: dossiers?.filter(d => d.bureau_id === bureau.id && !statuts?.find(s => s.id === d.statut_id)?.est_final)
      .reduce((sum, d) => sum + (d.cout_estime || 0), 0) || 0
  })) || [];

  // Évolution mensuelle (6 derniers mois)
  const now = new Date();
  const evolutionMensuelle = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const mois = date.getMonth() + 1;
    const annee = date.getFullYear();
    const dossiersMois = dossiers?.filter(d => d.annee === annee && d.mois === mois) || [];
    return {
      name: date.toLocaleDateString('fr-FR', { month: 'short' }).toUpperCase(),
      dossiers: dossiersMois.length,
      valeur: dossiersMois.reduce((sum, d) => sum + (d.cout_estime || 0), 0) / 1000000,
      livres: dossiersMois.filter(d => statuts?.find(s => s.id === d.statut_id)?.est_final).length,
      enCours: dossiersMois.filter(d => !statuts?.find(s => s.id === d.statut_id)?.est_final).length
    };
  });

  const maxActivite = Math.max(...dossiersParActivite.map(d => d.value), 0);
  const maxBureau = Math.max(...dossiersParBureau.map(d => d.value), 0);
  const dynamicMax = (max) => Math.ceil((max * 1.3) / 5) * 5 || 10;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Dossiers par activité */}
      <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-2xl p-6 shadow-sm border border-blue-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Répartition par activité</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dossiersParActivite} margin={{ top: 20, right: 5, left: -10, bottom: 5 }} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 10 }} interval={0} angle={-35} textAnchor="end" height={45} />
              <YAxis tick={{ fill: '#64748B', fontSize: 12 }} domain={[0, dynamicMax(maxActivite)]} width={30} />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                formatter={(value) => [value + ' dossiers']}
                labelFormatter={(label) => ''}
              />
              <Bar dataKey="value" name="Activités" fill="#3B82F6" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: '#1E293B', fontSize: 12, fontWeight: 600 }} />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Dossiers par statut */}
      <div className="bg-gradient-to-br from-white to-purple-50/30 rounded-2xl p-6 shadow-sm border border-purple-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Répartition par statut</h3>
        <StatutDonut data={dossiersParStatut} />
      </div>

      {/* Évolution mensuelle */}
      {isAdmin ? (
        <div className="bg-gradient-to-br from-white to-emerald-50/30 rounded-2xl p-6 shadow-sm border border-emerald-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Évolution mensuelle</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolutionMensuelle} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 11 }} />
                <YAxis tick={{ fill: '#64748B', fontSize: 11 }} width={35} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Legend />
                <Line type="monotone" dataKey="livres" name="Réalisés" stroke="#F97316" strokeWidth={2} dot={{ fill: '#F97316' }} />
                <Line type="monotone" dataKey="enCours" name="En cours" stroke="#22C55E" strokeWidth={2} dot={{ fill: '#22C55E' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <>
          {/* Évolution mensuelle - Nombre de dossiers */}
          <div className="bg-gradient-to-br from-white to-blue-50/30 rounded-2xl p-6 shadow-sm border border-blue-100">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Évolution dossiers</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolutionMensuelle} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 11 }} width={30} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  <Legend />
                  <Line type="monotone" dataKey="dossiers" name="Dossiers" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6', r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Évolution mensuelle - Dossiers livrés vs en cours */}
          <div className="bg-gradient-to-br from-white to-emerald-50/30 rounded-2xl p-6 shadow-sm border border-emerald-100">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Dossiers livrés vs en cours</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolutionMensuelle} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748B', fontSize: 11 }} width={30} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                  <Legend />
                  <Line type="monotone" dataKey="livres" name="Livrés" stroke="#F97316" strokeWidth={3} dot={{ fill: '#F97316', r: 5 }} />
                  <Line type="monotone" dataKey="enCours" name="En cours" stroke="#22C55E" strokeWidth={3} dot={{ fill: '#22C55E', r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {/* Comparatif bureaux (DG uniquement) */}
      {showBureaux && (
        <div className="bg-gradient-to-br from-white to-teal-50/30 rounded-2xl p-6 shadow-sm border border-teal-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Comparatif des bureaux</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dossiersParBureau} margin={{ top: 20, right: 5, left: -10, bottom: 0 }} barCategoryGap="20%">
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 11 }} interval={0} />
                <YAxis tick={{ fill: '#64748B', fontSize: 12 }} width={30} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                  formatter={(value, name, props) => {
                    if (name === 'portefeuille') return [new Intl.NumberFormat('fr-FR').format(value) + ' XOF', 'Portefeuille'];
                    return [value, 'Dossiers'];
                  }}
                />
                <Legend />
                <Bar dataKey="value" name="Dossiers" fill="#3B82F6" radius={[4, 4, 0, 0]} label={{ position: 'top', fill: '#1E293B', fontSize: 12, fontWeight: 600 }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}