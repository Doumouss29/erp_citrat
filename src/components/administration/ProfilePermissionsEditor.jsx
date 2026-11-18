import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";

const APP_NAMES = { rhcgesn:"RH-CITRAT", cgesnboard:"CITRAT-BOARD", ecadastre:"E-CADASTRE", lotissement:"E-GUIDE", assistancenum:"ASSISTANCE", csst:"CSST", hse:"HSE", coprociv:"COPROCIV" };
const ACTIONS = [
  ["view","Consulter"],["create","Créer"],["edit","Modifier"],
  ["delete","Supprimer"],["export","Exporter"],["approve","Valider"]
];
const SCOPES = [
  ["own","Mes données"],["office","Mes bureaux"],
  ["department","Mon département"],["all","Toutes les données"]
];
const emptyRule = () => ({ view:false, create:false, edit:false, delete:false, export:false, approve:false, scope:"own" });
const shell = {background:"#F5F9FE",border:"1px solid #DCE8F6",borderRadius:12,padding:"16px",marginTop:14};
const actionButton = {padding:"9px 14px",border:0,borderRadius:9,background:"#0C3D85",color:"#fff",fontSize:12,fontWeight:700,cursor:"pointer"};
const getError=e=>e?.message||"Enregistrement des droits impossible";

export default function ProfilePermissionsEditor({profile,onSaved}) {
  const [catalog,setCatalog]=useState(null);
  const [expanded,setExpanded]=useState(null);
  const [rules,setRules]=useState(profile.permissions||{});
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");
  const [notice,setNotice]=useState("");
  const apps=useMemo(()=>new Set(profile.apps||[]),[profile.apps]);
  useEffect(()=>{
    let active=true;
    base44.permissions.catalog().then(data=>{if(active)setCatalog(data);})
      .catch(e=>{if(active)setError("Catalogue indisponible : "+getError(e));});
    return ()=>{active=false;};
  },[]);
  useEffect(()=>{setRules(profile.permissions||{});},[profile.id,profile.permissions]);
  const enabled=Object.entries(catalog||{}).filter(([app])=>apps.has(app));
  const update=(app,module,key,value)=>{
    setError("");setNotice("");
    setRules(prev=>({...prev,[app]:{...(prev[app]||{}),
      [module]:{...emptyRule(),...((prev[app]||{})[module]||{}),[key]:value}}}));
  };
  const save=async()=>{
    setSaving(true);setError("");setNotice("");
    const payload=Object.fromEntries(Object.entries(rules).filter(([a])=>apps.has(a)));
    try{
      await base44.entities.AccessProfile.update(profile.id,{permissions:payload});
      await onSaved();
      setNotice("Droits enregistrés. Les changements prennent effet dès la prochaine requête API.");
    }catch(e){setError(getError(e));}
    finally{setSaving(false);}
  };
  return <div style={shell}>
    <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap",alignItems:"center"}}>
      <div>
        <strong style={{fontSize:13,color:"#081F69"}}>Permissions détaillées</strong>
        <p style={{fontSize:12,color:"#53647B",margin:"4px 0 0"}}>
          Chaque permission est refusée par défaut. Les contrôles sont appliqués sur le serveur.
        </p>
      </div>
      <button type="button" style={{...actionButton,opacity:saving ? 0.55 : 1}} disabled={saving||!catalog} onClick={save}>
        {saving?"Enregistrement…":"Enregistrer les droits"}
      </button>
    </div>
    {error&&<p role="alert" style={{color:"#B42323",fontSize:12,marginTop:10}}>{error}</p>}
    {notice&&<p role="status" style={{color:"#116466",fontSize:12,marginTop:10}}>{notice}</p>}
    {!catalog&&<p style={{fontSize:12}}>Chargement du catalogue de permissions…</p>}
    {catalog&&enabled.length===0&&<p style={{fontSize:12,marginTop:12}}>Cochez d'abord une application interne ci-dessus.</p>}
    {enabled.map(([app,modules])=><div key={app} style={{background:"#fff",border:"1px solid #E1E8F4",borderRadius:10,marginTop:12,overflow:"hidden"}}>
      <button type="button" onClick={()=>setExpanded(expanded===app?null:app)}
        style={{border:0,background:"transparent",width:"100%",textAlign:"left",padding:13,display:"flex",justifyContent:"space-between",cursor:"pointer",color:"#081F69",fontWeight:700}}>
        <span>{APP_NAMES[app] || app.toUpperCase()} · {Object.keys(modules).length} module(s)</span>
        <span>{expanded===app?"Masquer":"Configurer"}</span>
      </button>
      {expanded===app&&<div style={{padding:12,borderTop:"1px solid #E1E8F4",display:"grid",gap:12}}>
        {Object.entries(modules).map(([mod,label])=>{
          const rule={...emptyRule(),...((rules[app]||{})[mod]||{})};
          return <div key={mod} style={{padding:12,background:"#F7F9FD",borderRadius:10}}>
            <div style={{fontSize:13,fontWeight:700,marginBottom:10}}>{label}</div>
            <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
              {ACTIONS.map(([key,text])=><label key={key} style={{fontSize:12,display:"inline-flex",gap:5,alignItems:"center",cursor:"pointer"}}>
                <input type="checkbox" checked={rule[key]===true} onChange={e=>update(app,mod,key,e.target.checked)}/>
                {text}
              </label>)}
            </div>
            <label style={{display:"flex",flexWrap:"wrap",alignItems:"center",gap:10,marginTop:14,fontSize:12}}>
              Périmètre des données
              <select value={rule.scope} onChange={e=>update(app,mod,"scope",e.target.value)}
                style={{border:"1px solid #C9D7E9",padding:"8px",borderRadius:8,background:"#fff"}}>
                {SCOPES.map(([value,name])=><option value={value} key={value}>{name}</option>)}
              </select>
            </label>
            {rule.scope!=="all"&&<p style={{fontSize:11,color:"#637186",marginTop:8}}>
              Les enregistrements sans rattachement fiable au périmètre seront refusés.
            </p>}
          </div>;
        })}
      </div>}
    </div>)}
  </div>;
}
