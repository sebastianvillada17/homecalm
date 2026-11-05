# INTEGRACIÓN Y CONFIGURACIÓN DE CAPACITOR 8 EN HOMECALM

## 1. Resumen de la Integración

Capacitor 8 es la capa de abstracción multiplataforma moderna que conecta el frontend web de HOMECALM con el sistema operativo Android. A diferencia de soluciones heredadas como Cordova, Capacitor mantiene el proyecto nativo (`android/`) como un artefacto de código fuente abierto, legible y estándar gestionado por Gradle.

---

## 2. Dependencias y Plugins Instalados

El proyecto incorpora los paquetes oficiales de Capacitor en sus versiones más recientes y estables:

| Paquete | Versión | Rol Funcional en HOMECALM |
| :--- | :--- | :--- |
| `@capacitor/core` | `^8.6.0` | Núcleo del runtime y puente de comunicación JavaScript ↔ Java. |
| `@capacitor/android` | `^8.6.0` | Proyecto base nativo para Android (librerías y runtime de Android WebView). |
| `@capacitor/cli` | `^8.6.0` | Herramienta de línea de comandos para sincronización de assets y configuración. |
| `@capacitor/app` | `^8.1.2` | Ciclo de vida de la aplicación, captura del botón de retroceso (*hardware back*) y salida limpia. |
| `@capacitor/status-bar` | `^8.0.4` | Control cromático de la barra de estado del sistema (`#104D43`, estilo `DARK`). |
| `@capacitor/splash-screen` | `^8.0.2` | Control de la pantalla de bienvenida nativa durante el inicio en frío. |
| `@capacitor/network` | `^8.0.1` | Detección en tiempo real de cambios en la conectividad a Internet. |

---

## 3. Desglose del Archivo de Configuración (`capacitor.config.ts`)

El archivo [`capacitor.config.ts`](file:///c:/Users/svillada/homeflow-source/homeflow/capacitor.config.ts) define el comportamiento del contenedor nativo:

```typescript
import type { CapacitorConfig } from "@capacitor/cli";

const isDev = process.env.NODE_ENV === "development";
const serverUrl = process.env.CAPACITOR_SERVER_URL || "https://homecalm.app";

const config: CapacitorConfig = {
  appId: "com.homecalm.app",
  appName: "HOMECALM",
  webDir: "public",
  bundledWebRuntime: false,
  server: {
    // Apunta al servidor de produccion o a la variable de entorno CAPACITOR_SERVER_URL
    url: serverUrl,
    cleartext: isDev,
    allowNavigation: [
      "homecalm.app",
      "*.homecalm.app",
      "localhost",
      "10.0.2.2", // Acceso en emulador Android
    ],
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: isDev,
    backgroundColor: "#176B5B",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#176B5B",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#104D43",
      overlaysWebView: false,
    },
    Network: {},
    App: {},
  },
};

export default config;
```

---

## 4. Ciclo de Sincronización y Comandos de Mantenimiento

Para mantener sincronizado el proyecto nativo con los cambios del frontend o de los plugins de Capacitor, se utilizan los siguientes comandos:

### 4.1 Sincronización de configuración y plugins
```bash
# Copia la configuracion (capacitor.config.ts) y enlaza las dependencias nativas en android/
npx cap sync android
```

### 4.2 Copia rápida de assets web
```bash
# Copia unicamente el contenido de public/ al directorio de assets de Android
npx cap copy android
```

### 4.3 Actualización de plugins nativos
```bash
# Actualiza los enlaces de plugins nativos en Gradle
npx cap update android
```

---

## 5. Manejo del Ciclo de Vida Móvil

Gracias a la integración con `@capacitor/app` y `@capacitor/splash-screen`, la experiencia en el dispositivo móvil se comporta como una aplicación 100% nativa:
1. Al iniciar, el sistema operativo muestra de inmediato el *Splash Screen* con el fondo corporativo verde esmeralda (`#176B5B`).
2. La barra de estado se colorea en `#104D43` con iconos blancos de alto contraste.
3. Una vez cargado el árbol de componentes de Next.js, `MobileShellBridge` ordena el desvanecimiento (*fade-out*) suave del Splash Screen.
4. El botón físico de retroceso navega en la pila de historial del navegador interno sin cerrar intempestivamente la aplicación. Si el usuario pulsa retroceso en la pantalla de inicio, la aplicación se minimiza de manera estándar.

