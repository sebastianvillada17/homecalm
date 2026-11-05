import type { Metadata } from "next";
import { getModuleDataAction } from "@/actions/modules";
import { getDashboardDataAction } from "@/actions/dashboard";
import { getWeeklyMealPlanAction } from "@/actions/meals";
import { ModulePage } from "@/components/modules/module-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Alimentación" };

export default async function Page() {
  const [moduleData, dashboardData, mealPlanRes] = await Promise.all([
    getModuleDataAction(),
    getDashboardDataAction(),
    getWeeklyMealPlanAction(),
  ]);
  return (
    <ModulePage
      kind="food"
      initialModuleData={moduleData}
      initialDashboardData={dashboardData}
      initialMealPlan={mealPlanRes.success ? mealPlanRes.plan : null}
    />
  );
}
