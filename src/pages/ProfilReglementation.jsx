import { Users, FileText } from "lucide-react";
import MergedTabsPage from "@/components/layout/MergedTabsPage";
import ProfilPage from "./Profil";
import ReglementationMenuPage from "./ReglementationMenu";

// Menu unique « Profil & Réglementation » : onglets Mon Profil / Réglementation.
export default function ProfilReglementationPage() {
  return (
    <MergedTabsPage
      tabs={[
        { key: "profil", label: "Mon Profil", icon: Users, activeClass: "bg-gradient-to-r from-teal-500 to-teal-600", render: () => <ProfilPage /> },
        { key: "reglementation", label: "Réglementation", icon: FileText, activeClass: "bg-gradient-to-r from-slate-500 to-slate-600", render: () => <ReglementationMenuPage /> },
      ]}
    />
  );
}
