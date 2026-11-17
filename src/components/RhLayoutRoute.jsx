import PageSuspense from "@/components/PageSuspense";
import { useLocation, Outlet } from "react-router-dom";
import RhLayout from "@/RhLayout";

// Layout route wrapper: passes the current page name to RhLayout and renders
// the matched child route via <Outlet />.
export default function RhLayoutRoute() {
  const location = useLocation();
  // "/rh/Conges" → "Conges"
  const pageName = location.pathname.replace(/^\/rh\/?/, "").replace(/^\//, "");
  return (
    <RhLayout currentPageName={pageName}>
      <PageSuspense><Outlet /></PageSuspense>
    </RhLayout>
  );
}