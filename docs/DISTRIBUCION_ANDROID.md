# GUÍA DE DISTRIBUCIÓN Y PUBLICACIÓN DE HOMECALM EN ANDROID

## 1. Opciones de Distribución

HOMECALM para Android puede distribuirse mediante dos canales principales:
1. **Tienda Oficial (Google Play Store)**: Mediante el paquete optimizado **Android App Bundle (`.aab`)**, con firmas administradas por *Google Play App Signing*.
2. **Distribución Directa (Sideloading / APK Corporativo)**: Mediante el archivo autónomo firmado **`homecalm-release.apk`**, ideal para pruebas internas, betas privadas o despliegue independiente.

---

## 2. Publicación en Google Play Store

### 2.1 Requisitos Previos en Google Play Console
- Cuenta de Desarrollador de Google Play activa ($25 USD pago único).
- Nombre de la aplicación: **HOMECALM**.
- Idioma principal: Español (Latinoamérica / España).
- Clasificación de contenido: Para todas las edades (PEGI 3 / ESRB Everyone).
- Categoría: **Productividad / Estilo de vida**.

### 2.2 Política de Seguridad de los Datos (Data Safety Form)
En la sección *Seguridad de los datos* de Google Play Console, debes declarar:
- **Datos recopilados**:
  - Información personal básica (Nombre, Correo electrónico) para gestión de cuentas.
  - Información financiera (Gastos, presupuestos, saldos de cuentas) almacenada privadamente para la funcionalidad del hogar.
  - Datos de uso y diagnóstico (errores de aplicación).
- **Tratamiento**:
  - Todos los datos se transfieren mediante conexiones cifradas seguras (**HTTPS / TLS 1.3**).
  - Los datos **no se comparten ni venden a terceros**.
  - Los usuarios pueden solicitar la eliminación completa de su cuenta y datos desde la configuración del hogar.

### 2.3 Generación del Paquete AAB
```powershell
cd homeflow/android
.\gradlew.bat bundleRelease
```
El archivo resultante se encuentra en:
`artifacts/android/homecalm-release.aab`

### 2.4 Fases de Lanzamiento en Google Play Console
1. **Pruebas Internas (Internal Testing)**: Permite subir el paquete `.aab` y distribuirlo a un equipo de hasta 100 probadores en cuestión de minutos sin revisión de Google.
2. **Pruebas Cerradas (Closed Testing)**: Para cuentas personales nuevas creadas después de noviembre de 2023, Google exige realizar pruebas cerradas con al menos 20 evaluadores durante 14 días continuos antes de solicitar acceso a producción.
3. **Lanzamiento a Producción Escalado**: Se recomienda un despliegue progresivo (10% → 25% → 50% → 100%) monitoreando la tasa de fallos (*crash rate*) en Android Vitals.

---

## 3. Distribución Directa (Descarga de APK)

Para distribuir la aplicación a usuarios finales sin pasar por Google Play Store:

### 3.1 Entrega del APK
Compartir el archivo firmado:
`artifacts/android/homecalm-release.apk`

### 3.2 Instrucciones para el Usuario Final
1. Descargar el archivo `homecalm-release.apk` en el dispositivo Android.
2. Al pulsar el archivo descargado, Android solicitará autorización para instalar apps desde esa fuente (Chrome, Drive o Gestor de Archivos). Activar **"Permitir desde esta fuente"**.
3. Presionar **Instalar**.
4. Abrir **HOMECALM** e iniciar sesión con las credenciales del hogar.

### 3.3 Verificación de Integridad Criptográfica
Para asegurar que el APK no ha sido alterado por intermediarios, los usuarios o administradores pueden verificar su suma de comprobación SHA-256:

```powershell
Get-FileHash -Algorithm SHA256 artifacts/android/homecalm-release.apk
```
Comparar el hash obtenido con el valor oficial publicado en las notas de la versión.

