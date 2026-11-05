import { NextResponse } from "next/server";
import { testConnection } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const result = await testConnection();

  if (!result.ok) {
    return NextResponse.json(
      {
        status: "error",
        message: "No se pudo conectar a la base de datos",
        error: result.error,
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    status: "ok",
    message: "Conexión a MySQL exitosa",
    database: result.database,
    version: result.version,
    host: process.env.DB_HOST || "mysql-a8ddfe7-sebastianvibr-27cd.f.aivencloud.com",
    ssl: true,
  });
}

