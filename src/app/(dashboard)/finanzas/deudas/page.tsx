import type { Metadata } from "next";
import { getModuleDataAction } from "@/actions/modules";
import { getDashboardDataAction } from "@/actions/dashboard";
import { ModulePage } from "@/components/modules/module-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Deudas y créditos" };

export default async function Page() {
  const [moduleData, dashboardData] = await Promise.all([
    getModuleDataAction(),
    getDashboardDataAction(),
  ]);
  return (
    <ModulePage
      kind="debts"
      initialModuleData={moduleData}
      initialDashboardData={dashboardData}
    />
  );
}
