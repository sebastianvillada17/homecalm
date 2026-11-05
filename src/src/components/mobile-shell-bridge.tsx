"use client";

import { useEffect } from "react";

/**
 * MobileShellBridge
 * Puente nativo entre la aplicación web Next.js y el runtime de Capacitor en Android.
 * - Solo se ejecuta si Capacitor detecta una plataforma nativa (Android / iOS).
 * - Gestiona la barra de estado con los colores de marca (#104D43).
 * - Oculta suavemente el Splash Screen cuando la interfaz está lista.
 * - Captura el botón físico o gesto de "Atrás" de Android para navegar el historial
 *   o salir limpiamente de la app.
 */
export function MobileShellBridge() {
  useEffect(() => {
    let backHandleRemove: (() => void) | undefined;

    async function initNativeShell() {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (!Capacitor.isNativePlatform()) {
          return;
        }

        const { App } = await import("@capacitor/app");
        const { StatusBar, Style } = await import("@capacitor/status-bar");
        const { SplashScreen } = await import("@capacitor/splash-screen");

        // 1. Configurar barra de estado nativa
        try {
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: "#104D43" });
        } catch {
          // Ignorado en plataformas sin soporte
        }

        // 2. Ocultar Splash Screen una vez hidratada la aplicación
        try {
          await SplashScreen.hide({ fadeOutDuration: 300 });
        } catch {
          // Ignorado
        }

        // 3. Manejar botón nativo "Atrás" de Android
        const backListener = await App.addListener("backButton", ({ canGoBack }) => {
          if (window.history.length > 1 && canGoBack) {
            window.history.back();
          } else {
            // Si está en la raíz, confirma o minimiza la app
            App.exitApp();
          }
        });

        backHandleRemove = () => {
          backListener.remove();
        };
      } catch {
        // En entorno de navegador tradicional, no realiza ninguna acción
      }
    }

    initNativeShell();

    return () => {
      if (backHandleRemove) {
        backHandleRemove();
      }
    };
  }, []);

  return null;
}

