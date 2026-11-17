import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";

const actions=[["view","Consulter"],["create","Créer"],["edit","Modifier"],["delete","Supprimer"],["export","Exporter"],["approve","Valider"]];

export default function IndividualRestrictionsEditor({account,profiles,onSaved}) {
  const [catalog,setCatalog]=useState(null);
  const [denials,setDenials]=useState(account.permission_denials||{});
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [success,setSuccess]=useState("");
  const profile=useMemo(()=>profiles.find(p=>p.profile_id===account.grade),[profiles,account.grade]);
  useEffect(()=>{let live=true;base44.permissions.catalog().then(v=>{if(live)setCatalog(v);}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[]);
  useEffect(()=>setDenials(account.permission_denials||{}),[account.id,account.permission_denials]);
  if(!profile)return <p style={{fontSize:12,color:"#64748B"}}>Attribuez d'abord un profil d'accès à cet utilisateur.</p>;
  const modules=Object.entries(profile.permissions||{}).flatMap(([app,mods])=>
    (profile.apps||[]).includes(app)
      ?Object.entries(mods||{}).map(([module,rule])=>({app,module,rule,label:catalog?.[app]?.[module]||module}))
      :[]
  );
  const toggle=(app,module,action,checked)=>{
    setDenials(prev=>{
      const copy=JSON.parse(JSON.stringify(prev));
      copy[app]=copy[app]||{};
      const current=new Set(copy[app][module]||[]);
      if(checked)current.add(action);else current.delete(action);
      copy[app][module]=[...current];
      return copy;
    });
  };
  const save=async()=>{
    setSaving(true);setError("");setSuccess("");
    try{
      await base44.entities.User.update(account.id,{permission_denials:denials});
      await onSaved();
      setSuccess("Restrictions individuelles enregistrées. Elles ne peuvent jamais ajouter de privilèges.");
    }catch(e){setError(e.message||"Enregistrement impossible");}
    finally{setSaving(false);}
  };
  return <div style={{padding:14,background:"#F3F8FC",border:"1px solid #DDE7F5",borderRadius:10,marginTop:10,width:"100%"}}>
    <strong style={{fontSize:12,color:"#081F69"}}>Restrictions individuelles — {account.email}</strong>
    <p style={{fontSize:11,color:"#64748B",margin:"5px 0 13px"}}>Cochez les actions à retirer pour ce compte. L'accès est d'abord défini dans le profil. Les exceptions ne donnent aucun droit supplémentaire.</p>
    {modules.length===0&&<p style={{fontSize:12}}>Ce profil ne contient pas encore de permissions détaillées.</p>}
    {modules.map(({app,module,rule,label})=><div key={app+module} style={{background:"#fff",border:"1px solid #E3EAF5",padding:10,borderRadius:8,marginBottom:8}}>
      <div style={{fontSize:12,fontWeight:700,marginBottom:7}}>{app.toUpperCase()} — {label}</div>
      <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
        {actions.filter(([k])=>rule[k]===true).map(([action,text])=><label key={action} style={{display:"inline-flex",gap:5,alignItems:"center",fontSize:11}}>
          <input type="checkbox" checked={((denials[app]||{})[module]||[]).includes(action)}
            onChange={e=>toggle(app,module,action,e.target.checked)}/>
          Interdire : {text}
        </label>)}
      </div>
    </div>)}
    {error&&<p role="alert" style={{fontSize:12,color:"#B91C1C"}}>{error}</p>}
    {success&&<p role="status" style={{fontSize:12,color:"#086E73"}}>{success}</p>}
    <button disabled={saving} onClick={save} style={{border:0,background:"#0C3D85",color:"#fff",padding:"9px 14px",borderRadius:8,marginTop:4,fontWeight:700,cursor:"pointer"}}>
      {saving?"Enregistrement…":"Enregistrer les restrictions"}
    </button>
  </div>;
}
