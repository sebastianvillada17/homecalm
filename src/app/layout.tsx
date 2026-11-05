import type { Metadata, Viewport } from "next";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/fraunces/500.css";
import "@fontsource/fraunces/600.css";
import "@/app/globals.css";
import { DemoProvider } from "@/lib/demo-store";
import { MobileShellBridge } from "@/components/mobile-shell-bridge";

export const metadata: Metadata = {
  applicationName: "HOMECALM",
  title: { default: "HOMECALM — Organización del hogar", template: "%s · HOMECALM" },
  description: "Finanzas, compras y organización de la vida en casa.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/homeflow-icon-192.png",
    apple: "/homeflow-icon-192.png",
  },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "HOMECALM" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#176B5B",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        <DemoProvider>
          <MobileShellBridge />
          {children}
        </DemoProvider>
      </body>
    </html>
  );
}
