import type { Metadata } from "next";
import { getDashboardDataAction } from "@/actions/dashboard";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Resumen del hogar" };

export default async function DashboardPage() {
  const initialData = await getDashboardDataAction();
  return <DashboardView initialData={initialData} />;
}
