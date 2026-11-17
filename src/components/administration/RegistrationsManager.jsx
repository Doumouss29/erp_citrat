import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

const input = {padding:"9px 12px",border:"1px solid #CDD9E9",borderRadius:9,minWidth:0,background:"#fff"};
const btn = {background:"#0C3D85",color:"#fff",border:0,borderRadius:9,padding:"10px 16px",fontWeight:700,cursor:"pointer"};
const panel = {background:"#fff",border:"1px solid #DFE6F0",borderRadius:16,padding:"clamp(18px,3vw,26px)"};
const statuses = {unverified:"E-mail non vérifié",pending:"En attente",approved:"Approuvé",rejected:"Refusé"};
const empty = {grade:"",office:"",department:"",note:""};

export default function RegistrationsManager() {
  const [requests,setRequests]=useState([]);
  const [users,setUsers]=useState([]);
  const [profiles,setProfiles]=useState([]);
  const [offices,setOffices]=useState([]);
  const [departments,setDepartments]=useState([]);
  const [forms,setForms]=useState({});
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(null);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const reload=useCallback(async()=>{
    const [r,u,p,o,d]=await Promise.all([
      base44.onboarding.registrations(),
      base44.entities.User.list(),
      base44.entities.AccessProfile.list("name",200),
      base44.entities.OfficeTerminal.list("office_name",200),
      base44.entities.Department.list("label",200)
    ]);
    setRequests(r||[]);setUsers(u||[]);setProfiles(p||[]);setOffices(o||[]);setDepartments(d||[]);
  },[]);
  useEffect(()=>{reload().catch(e=>setError(e.message||"Chargement impossible")).finally(()=>setLoading(false));},[reload]);
  const change=(id,key,value)=>setForms(f=>({...f,[id]:{...(f[id]||empty),[key]:value}}));
  const act=async(request,action)=>{
    const f=forms[request.id]||empty;
    if(action==="approve"&&(!f.grade||!f.office)){setError("Choisissez un profil et un bureau existants.");return;}
    if(!window.confirm(action==="approve"?"Approuver ce compte et activer sa connexion ?":"Refuser définitivement cette demande ?"))return;
    setBusy(request.id);setError("");setNotice("");
    try {
      const res=await base44.onboarding.decide(request.id,{action,...f});
      await reload();
      setNotice(action==="approve"?"Compte approuvé et activé.":"Demande refusée.");
      if(res.mail_delivered===false)setNotice("Décision enregistrée, mais le courrier électronique de notification n'a pas pu être envoyé.");
    }catch(e){setError(e.message||"Erreur de traitement");}
    finally{setBusy(null);}
  };
  const setStatus=async(u)=>{
    const next=u.account_status==="suspended"?"active":"suspended";
    if(!window.confirm(next==="suspended"?"Suspendre ce compte et fermer ses sessions ?":"Réactiver ce compte ?"))return;
    setBusy(u.id);setError("");setNotice("");
    try {await base44.onboarding.accountStatus(u.id,next);await reload();setNotice(next==="active"?"Compte réactivé.":"Compte suspendu.");}
    catch(e){setError(e.message||"Action impossible");}
    finally{setBusy(null);}
  };
  const pending=requests.filter(r=>r.status==="pending");
  return <div style={{display:"grid",gap:18}}>
    <section style={panel}>
      <h2 style={{fontSize:17,fontWeight:800,color:"#081F69"}}>Demandes d'inscription <span style={{color:"#0A95C7"}}>({pending.length} en attente)</span></h2>
      <p style={{fontSize:12,color:"#64748B",margin:"6px 0 18px"}}>Seules les adresses e-mail vérifiées peuvent être approuvées. Le compte ne reçoit aucun privilège d'administration.</p>
      {error && <p role="alert" style={{color:"#B91C1C",background:"#FFF0F0",padding:12,borderRadius:9}}>{error}</p>}
      {notice && <p role="status" style={{color:"#0D6E70",background:"#EDF8F8",padding:12,borderRadius:9}}>{notice}</p>}
      {loading ? <p>Chargement…</p> : !pending.length ? <p style={{padding:16,background:"#F3F8FC",borderRadius:10,color:"#53647B"}}>Aucune demande en attente de validation.</p> :
        <div style={{display:"grid",gap:12}}>
        {pending.map(r=><article key={r.id} style={{border:"1px solid #E0E7F1",borderRadius:12,padding:16}}>
          <div style={{fontWeight:800,color:"#081F69"}}>{r.last_name} {r.first_name}</div>
          <div style={{fontSize:12,color:"#64748B",margin:"4px 0 14px"}}>{r.email} · {r.telephone} · Vérifié le {new Date(r.verified_at).toLocaleString("fr-FR")}</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10}}>
            <label style={{display:"grid",fontSize:12,gap:4,fontWeight:700}}>Profil d'accès *
              <select style={input} value={(forms[r.id]||empty).grade} onChange={e=>change(r.id,"grade",e.target.value)}>
                <option value="">Choisir un profil</option>{profiles.map(p=><option key={p.id} value={p.profile_id}>{p.name}</option>)}
              </select>
            </label>
            <label style={{display:"grid",fontSize:12,gap:4,fontWeight:700}}>Bureau *
              <select style={input} value={(forms[r.id]||empty).office} onChange={e=>change(r.id,"office",e.target.value)}>
                <option value="">Choisir un bureau</option>{offices.map(o=><option key={o.id} value={o.office_name}>{o.office_name}</option>)}
              </select>
            </label>
            <label style={{display:"grid",fontSize:12,gap:4,fontWeight:700}}>Département
              <select style={input} value={(forms[r.id]||empty).department} onChange={e=>change(r.id,"department",e.target.value)}>
                <option value="">Aucun département</option>{departments.map(d=><option key={d.id} value={d.value}>{d.label}</option>)}
              </select>
            </label>
          </div>
          <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:14}}>
            <button style={btn} disabled={busy===r.id} onClick={()=>act(r,"approve")}>Approuver et activer</button>
            <button style={{...btn,background:"#FFF0F0",color:"#A32129"}} disabled={busy===r.id} onClick={()=>act(r,"reject")}>Refuser</button>
          </div>
        </article>)}
        </div>}
    </section>
    <section style={panel}>
      <h2 style={{fontSize:16,fontWeight:800,color:"#081F69"}}>Comptes existants</h2>
      <p style={{fontSize:12,color:"#64748B",marginBottom:16}}>Suspension et réactivation, sans suppression du compte ni de ses données.</p>
      {users.map(u=><div key={u.id} style={{display:"flex",gap:12,justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",borderTop:"1px solid #E4EAF2",padding:"12px 0"}}>
        <div style={{minWidth:160}}><strong>{[u.last_name,u.first_name].filter(Boolean).join(" ")||u.name||u.email}</strong>
          <div style={{fontSize:12,color:"#64748B"}}>{u.email} · {u.role==="admin"?"Administrateur":"Utilisateur"} · {u.account_status==="suspended"?"Suspendu":"Actif"}</div>
        </div>
        {u.role!=="admin"&&<button style={{...btn,background:u.account_status==="suspended"?"#0C3D85":"#EFF3F9",color:u.account_status==="suspended"?"#fff":"#7A2D37"}} disabled={busy===u.id} onClick={()=>setStatus(u)}>{u.account_status==="suspended"?"Réactiver":"Suspendre"}</button>}
      </div>)}
    </section>
    <section style={panel}>
      <h2 style={{fontSize:15,fontWeight:800,color:"#081F69"}}>Historique des demandes</h2>
      <div style={{display:"grid",gap:7,marginTop:12}}>
        {requests.filter(r=>r.status!=="pending").map(r=><div key={r.id} style={{display:"flex",justifyContent:"space-between",gap:12,fontSize:12,padding:10,background:"#F5F8FC",borderRadius:8}}>
          <span>{r.last_name} {r.first_name} · {r.email}</span><strong>{statuses[r.status]||r.status}</strong>
        </div>)}
        {!requests.length&&<p style={{color:"#64748B"}}>Aucune demande.</p>}
      </div>
    </section>
  </div>;
}
