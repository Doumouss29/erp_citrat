import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Droits sur les rapports trimestriels HSE (calculés côté serveur à partir du profil HSE).
// canPrepare : Référent HSE / admin — canValidate : Coordinateur HSE, Chef de projet HSE / admin.
export default function useHseRapportPerms() {
  return useQuery({
    queryKey: ["hse-rapport-perms"],
    queryFn: async () => (await base44.functions.invoke("hseRapport", { action: "me" })).data,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
