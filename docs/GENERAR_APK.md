# GUÍA DE GENERACIÓN Y COMPILACIÓN DEL APK / AAB DE HOMECALM

Esta guía detalla el procedimiento paso a paso para compilar la aplicación HOMECALM en formato Android nativo (**APK Debug**, **APK Release firmado** y **Android App Bundle .aab** para Google Play Store).

---

## 1. Requisitos Previos del Sistema

Para compilar la aplicación localmente o en un agente CI/CD, se requiere:

1. **Java Development Kit (JDK)**: OpenJDK 17 LTS (versión 17.0.20 o superior).
2. **Android SDK Command-Line Tools**:
   - `platforms;android-35` (Android 15 / API 35).
   - `build-tools;35.0.0`.
   - `platform-tools`.
3. **Gradle**: Versión 8.14 o superior (gestionada automáticamente mediante el script `gradlew.bat` del proyecto).
4. **Node.js**: Versión 20 LTS o 22 LTS, junto con `pnpm` o `npm`.

---

## 2. Variables de Entorno del Sistema

Antes de invocar el compilador de Gradle, asegúrate de configurar las variables de entorno en la terminal (PowerShell o Bash):

### En Windows PowerShell:
```powershell
# Rutas hacia el JDK 17 y Android SDK
$env:JAVA_HOME = "C:\Users\<tu-usuario>\homeflow-source\.tools\jdk17\jdk-17.0.20.1+1"
$env:ANDROID_HOME = "C:\Users\<tu-usuario>\homeflow-source\.tools\android-sdk"
$env:GRADLE_USER_HOME = "C:\Users\<tu-usuario>\homeflow-source\.tools\.gradle"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\cmdline-tools\latest\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"
```

---

## 3. Sincronización de Assets con Capacitor

Antes de compilar la versión nativa, sincroniza los cambios de la configuración y assets web:

```powershell
cd c:\Users\<tu-usuario>\homeflow-source\homeflow
npx cap sync android
```

Este comando:
- Lee [`capacitor.config.ts`](file:///c:/Users/svillada/homeflow-source/homeflow/capacitor.config.ts).
- Actualiza `android/app/src/main/assets/capacitor.config.json`.
- Enlaza las dependencias nativas de `@capacitor/app`, `@capacitor/status-bar`, `@capacitor/splash-screen` y `@capacitor/network`.

---

## 4. Compilación del APK de Desarrollo (Debug)

El APK de desarrollo permite instalar y probar la aplicación directamente en cualquier dispositivo Android o emulador físico activando la opción *Depuración USB*.

### Comando de compilación:
```powershell
cd c:\Users\<tu-usuario>\homeflow-source\homeflow\android
.\gradlew.bat assembleDebug
```

### Ubicación del artefacto generado:
- **Ruta de origen**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **Ruta de artefactos**: `artifacts/android/homecalm-debug.apk`

---

## 5. Compilación del APK Firmado de Producción (Release)

Para generar el APK final optimizado y firmado con la clave criptográfica oficial de HOMECALM:

### Comando de compilación:
```powershell
cd c:\Users\<tu-usuario>\homeflow-source\homeflow\android
.\gradlew.bat assembleRelease
```

### Ubicación del artefacto generado:
- **Ruta de origen**: `android/app/build/outputs/apk/release/app-release.apk`
- **Ruta de artefactos**: `artifacts/android/homecalm-release.apk`

---

## 6. Compilación del Android App Bundle (AAB para Google Play)

El formato `.aab` es el formato oficial exigido por Google Play Console para publicar o actualizar aplicaciones en la tienda.

### Comando de compilación:
```powershell
cd c:\Users\<tu-usuario>\homeflow-source\homeflow\android
.\gradlew.bat bundleRelease
```

### Ubicación del artefacto generado:
- **Ruta de origen**: `android/app/build/outputs/bundle/release/app-release.aab`
- **Ruta de artefactos**: `artifacts/android/homecalm-release.aab`

---

## 7. Instalación en Dispositivos de Prueba vía ADB

Si tienes un dispositivo Android conectado por cable USB con depuración activada:

```powershell
# Listar dispositivos conectados
adb devices

# Instalar el APK en el dispositivo
adb install -r artifacts/android/homecalm-debug.apk

# Ejecutar la aplicacion inmediatamente
adb shell am start -n com.homecalm.app/.MainActivity
```

