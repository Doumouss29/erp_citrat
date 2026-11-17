import { Calendar, FileX } from "lucide-react";
import MergedTabsPage from "@/components/layout/MergedTabsPage";
import CongesPage from "./Conges";
import AbsencesPage from "./Absences";

// Menu unique « Absences & Congés » : onglets Congés / Absences.
export default function AbsencesCongesPage() {
  return (
    <MergedTabsPage
      tabs={[
        { key: "conges", label: "Congés", icon: Calendar, activeClass: "bg-gradient-to-r from-green-500 to-green-600", render: () => <CongesPage /> },
        { key: "absences", label: "Absences", icon: FileX, activeClass: "bg-gradient-to-r from-orange-500 to-orange-600", activeColor: "#c2410c", render: () => <AbsencesPage /> },
      ]}
    />
  );
}
