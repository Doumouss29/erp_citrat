import React from "react";
import Connexion from "@/pages/Connexion";

// La page de connexion officielle de l'application est l'écran brandé CGESN.
// Ce composant est conservé comme point d'entrée "Login" attendu par la plateforme
// et se contente d'afficher la page de connexion brandée.
export default function Login() {
  return <Connexion />;
}