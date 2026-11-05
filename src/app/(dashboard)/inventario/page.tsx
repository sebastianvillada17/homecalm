import type { Metadata } from "next";
import { getModuleDataAction } from "@/actions/modules";
import { getDashboardDataAction } from "@/actions/dashboard";
import { ModulePage } from "@/components/modules/module-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Inventario del hogar" };

export default async function Page() {
  const [moduleData, dashboardData] = await Promise.all([
    getModuleDataAction(),
    getDashboardDataAction(),
  ]);
  return (
    <ModulePage
      kind="inventory"
      initialModuleData={moduleData}
      initialDashboardData={dashboardData}
    />
  );
}
