import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: false,
  skipWaiting: true,
  disable: true,
});

const isProd = process.env.NODE_ENV === "production";

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    const headers = [
      {
        key: "X-DNS-Prefetch-Control",
        value: "on",
      },
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
      },
      {
        key: "X-XSS-Protection",
        value: "1; mode=block",
      },
    ];

    // Solo habilitar HSTS en producción para prevenir que localhost bloquee estilos o redirija a https
    if (isProd) {
      headers.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    return [
      {
        // Aplicar cabeceras de seguridad a páginas y rutas, excluyendo assets estáticos de Next.js
        source: "/((?!_next/static|_next/image|favicon.ico).*)",
        headers,
      },
    ];
  },
};

export default withPWA(nextConfig);
