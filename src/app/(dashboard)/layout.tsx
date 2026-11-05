import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { pool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import { AppShell } from "@/components/app-shell";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  let groceryCount = 0;
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(si.id) as count 
       FROM shopping_items si
       JOIN shopping_lists sl ON si.list_id = sl.id
       WHERE sl.household_id = ? AND si.purchased = FALSE`,
      [session.householdId]
    );
    groceryCount = Number(rows[0]?.count || 0);
  } catch {
    groceryCount = 0;
  }

  return (
    <AppShell user={session} groceryCount={groceryCount}>
      {children}
    </AppShell>
  );
}
