"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[HOMECALM GLOBAL CRITICAL ERROR]", error);
  }, [error]);

  return (
    <html lang="es">
      <body style={{ fontFamily: "sans-serif", backgroundColor: "#f6f8f6", margin: 0, padding: 0 }}>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: "20px" }}>
          <div style={{ maxWidth: "440px", backgroundColor: "#ffffff", padding: "32px", borderRadius: "20px", border: "1px solid #e2ece5", textAlign: "center", boxShadow: "0 8px 24px rgba(0,0,0,0.04)" }}>
            <h1 style={{ color: "#174a3f", fontSize: "22px", margin: "0 0 12px" }}>HOMECALM</h1>
            <h2 style={{ color: "#1b2721", fontSize: "18px", margin: "0 0 12px" }}>Ocurrió un error en la aplicación</h2>
            <p style={{ color: "#617168", fontSize: "13px", lineHeight: "1.5", margin: "0 0 24px" }}>
              No te preocupes, tus datos no han sido afectados. Puedes recargar la aplicación para continuar.
            </p>
            <button
              onClick={() => reset()}
              style={{ backgroundColor: "#174a3f", color: "#ffffff", border: "none", padding: "12px 24px", borderRadius: "12px", fontSize: "13px", fontWeight: "600", cursor: "pointer" }}
            >
              Recargar aplicación
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}

