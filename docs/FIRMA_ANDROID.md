# GUÍA DE FIRMADO DIGITAL Y GESTIÓN DE CLAVES EN ANDROID

## 1. Fundamentos del Firmado Criptográfico en Android

Todo paquete de aplicación Android (`.apk` o `.aab`) debe estar firmado digitalmente por su desarrollador antes de poder instalarse en un dispositivo o publicarse en tiendas como Google Play Store.

Android utiliza un esquema de firma multinivel:
- **v1 (JAR Signature)**: Compatibilidad histórica.
- **v2 (APK Signature Scheme v2)**: Firma criptográfica sobre el binario completo del APK introducida en Android 7.0.
- **v3 (APK Signature Scheme v3)**: Añade soporte para rotación de claves criptográficas.
- **v4 (Streaming Signature)**: Permite instalación acelerada vía ADB en Android 11+.

---

## 2. Generación del Almacén de Claves (Keystore)

El almacén de claves (*keystore*) contiene el par de llaves asimétricas (pública y privada) utilizado para firmar HOMECALM.

### Comando estándar con `keytool` (incluido en JDK 17):
```powershell
keytool -genkeypair -v `
  -keystore homecalm-release.keystore `
  -alias homecalm `
  -keyalg RSA `
  -keysize 2048 `
  -validity 10000 `
  -storepass homecalm2026 `
  -keypass homecalm2026 `
  -dname "CN=HOMECALM, OU=Mobile Engineering, O=HOMECALM, L=Bogota, ST=Bogota, C=CO"
```

### Parámetros Explicados:
- `-keystore`: Nombre del archivo contenedor protegido (`homecalm-release.keystore`).
- `-alias`: Nombre identificador de la llave privada dentro del almacén (`homecalm`).
- `-keyalg RSA`: Algoritmo de cifrado asimétrico estándar de la industria.
- `-keysize 2048`: Tamaño de la llave en bits (requerimiento mínimo de seguridad de Google).
- `-validity 10000`: Periodo de vigencia de la llave en días (~27 años, asegurando actualizaciones continuas sin expiración prematura).
- `-dname`: Nombre distinguido (Distinguished Name) que acredita la titularidad de HOMECALM.

---

## 3. Configuración en Gradle (`android/app/build.gradle`)

Para firmar de manera reproducible tanto en entornos de desarrollo local como en tuberías de CI/CD, se configura el bloque `signingConfigs` en `android/app/build.gradle`:

```groovy
android {
    ...
    signingConfigs {
        release {
            storeFile file(System.getenv("HOMECALM_KEYSTORE_PATH") ?: "../homecalm-release.keystore")
            storePassword System.getenv("HOMECALM_KEYSTORE_PASSWORD") ?: "homecalm2026"
            keyAlias System.getenv("HOMECALM_KEY_ALIAS") ?: "homecalm"
            keyPassword System.getenv("HOMECALM_KEY_PASSWORD") ?: "homecalm2026"
        }
    }

    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

---

## 4. Extracción de Huellas Digitales (SHA-256 y SHA-1)

Las huellas digitales del certificado son requeridas para registrar la app en Google Play Console, Google Cloud Console (APIs de Google) y Firebase:

```powershell
keytool -list -v -keystore homecalm-release.keystore -alias homecalm -storepass homecalm2026
```

### Formato de salida:
- **Huella digital SHA-1**: `XX:XX:XX:...`
- **Huella digital SHA-256**: `YY:YY:YY:...`

---

## 5. Reglas Críticas de Ciberseguridad

> [!CAUTION]
> **Pérdida o filtración del Keystore**:
> 1. Si pierdes el archivo `.keystore` de producción antes de habilitar *Google Play App Signing*, **nunca más podrás actualizar la aplicación en la tienda**. Los usuarios se verán forzados a desinstalar la app e instalar un nuevo paquete con otro `applicationId`.
> 2. Si el archivo `.keystore` y sus contraseñas son filtrados en repositorios públicos, atacantes podrían firmar APKs maliciosos suplantando la identidad de HOMECALM.

### Políticas de Protección:
1. **Regla Gitignore**: El archivo `.gitignore` del proyecto excluye explícitamente cualquier patrón `*.keystore` y `*.jks`.
2. **Almacenamiento Seguro**: El keystore original debe resguardarse en un gestor corporativo cifrado (e.g. 1Password, Bitwarden, AWS Secrets Manager o Azure Key Vault).
3. **CI/CD Secrets**: En pipelines automáticos (GitHub Actions, GitLab CI), el keystore debe codificarse en Base64 e inyectarse en tiempo de compilación a través de variables de entorno protegidas.

