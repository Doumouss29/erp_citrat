import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

const field = { border: "1px solid #CFD9E7", padding: "10px 12px", borderRadius: 10, width: "100%", boxSizing: "border-box" };
const button = { background: "#0C3D85", color: "#fff", border: 0, padding: "10px 16px", borderRadius: 10, fontWeight: 700, cursor: "pointer" };
const empty = { label: "", value: "", office_id: "" };

export default function DepartementsManager() {
  const [rows, setRows] = useState([]);
  const [offices, setOffices] = useState([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const reload = async () => {
    const [d,o] = await Promise.all([
      base44.entities.Department.list("label",500),
      base44.entities.OfficeTerminal.list("office_name",200)
    ]);
    setRows(d || []); setOffices(o || []);
  };
  useEffect(() => { reload().catch(e=>setError(e.message || "Chargement impossible")); },[]);
  const reset = () => { setForm(empty); setEditing(null); setError(""); };
  const save = async (e) => {
    e.preventDefault();
    const label = form.label.trim();
    const value = (editing ? form.value : label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"")).trim();
    if (!label || !value) return setError("Le libellé est obligatoire.");
    if (rows.some(x=>x.value===value && x.id!==editing)) return setError("Ce département existe déjà.");
    setBusy(true); setError(""); setNotice("");
    try {
      const payload={label,value,office_id:form.office_id};
      if(editing) await base44.entities.Department.update(editing,payload);
      else await base44.entities.Department.create(payload);
      await reload(); reset(); setNotice("Département enregistré.");
    } catch(e) { setError(e.message || "Enregistrement impossible"); }
    finally {setBusy(false);}
  };
  const remove = async (row) => {
    if(!window.confirm("Supprimer « "+row.label+" » ? Vérifiez les rattachements existants."))return;
    setBusy(true); setError("");
    try {await base44.entities.Department.delete(row.id); await reload(); setNotice("Département supprimé.");}
    catch(e) {setError(e.message || "Suppression impossible");}
    finally {setBusy(false);}
  };
  return (
    <div style={{background:"#fff",border:"1px solid #E0E5EF",borderRadius:16,padding:"clamp(18px,3vw,28px)"}}>
      <h2 style={{fontSize:16,fontWeight:800,color:"#081F69",marginBottom:6}}>Départements et services</h2>
      <p style={{fontSize:13,color:"#64748B",marginBottom:18}}>Aucun département n'est créé automatiquement. Définissez vos services et rattachez-les à un bureau si nécessaire.</p>
      <form onSubmit={save} style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:12,alignItems:"end",marginBottom:24}}>
        <label style={{fontSize:12,fontWeight:700}}>Libellé *
          <input style={{...field,marginTop:6}} required maxLength={100} placeholder="Ex. Topographie" value={form.label} onChange={e=>setForm(v=>({...v,label:e.target.value}))}/>
        </label>
        <label style={{fontSize:12,fontWeight:700}}>Bureau (optionnel)
          <select style={{...field,marginTop:6}} value={form.office_id} onChange={e=>setForm(v=>({...v,office_id:e.target.value}))}>
            <option value="">Aucun bureau</option>
            {offices.map(o=><option key={o.id} value={o.id}>{o.office_name}</option>)}
          </select>
        </label>
        <div style={{display:"flex",gap:8}}>
          <button type="submit" disabled={busy} style={{...button,opacity:busy?.6:1}}>{editing?"Enregistrer":"Créer"}</button>
          {editing && <button type="button" onClick={reset} style={{...button,background:"#E8EEF7",color:"#081F69"}}>Annuler</button>}
        </div>
      </form>
      {error && <p role="alert" style={{color:"#B91C1C",fontSize:13,marginBottom:12}}>{error}</p>}
      {notice && <p role="status" style={{color:"#116466",fontSize:13,marginBottom:12}}>{notice}</p>}
      {rows.length===0 ? <div style={{background:"#F3F8FC",padding:22,borderRadius:12,color:"#53647B",fontSize:13}}>Aucun département configuré.</div> :
        <div style={{display:"grid",gap:10}}>
          {rows.map(row=><div key={row.id} style={{display:"flex",alignItems:"center",gap:12,padding:12,border:"1px solid #E4EAF2",borderRadius:10,flexWrap:"wrap"}}>
            <div style={{flex:1,minWidth:150}}>
              <strong style={{color:"#081F69"}}>{row.label}</strong>
              <div style={{fontSize:12,color:"#64748B"}}>{offices.find(o=>o.id===row.office_id)?.office_name || "Sans bureau"}</div>
            </div>
            <button type="button" disabled={busy} onClick={()=>{setEditing(row.id);setForm({label:row.label,value:row.value,office_id:row.office_id||""});}} style={{...button,background:"#E9F2FB",color:"#0C3D85"}}>Modifier</button>
            <button type="button" disabled={busy} onClick={()=>remove(row)} style={{...button,background:"#FFF0F0",color:"#B91C1C"}}>Supprimer</button>
          </div>)}
        </div>}
    </div>
  );
}
