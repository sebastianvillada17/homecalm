# PLAN Y PROTOCOLO DE PRUEBAS MÓVILES PARA HOMECALM ANDROID

## 1. Alcance de las Pruebas

El presente protocolo define la metodología y casos de prueba requeridos para validar la calidad, usabilidad, rendimiento y seguridad de **HOMECALM en Android (APK / AAB)**, garantizando paridad funcional completa con la versión web y una experiencia nativa pulida.

---

## 2. Matriz de Compatibilidad de Dispositivos y Sistemas Operativos

| Versión de Android | Nivel de API | Estado de Soporte | Entorno de Prueba Recomendado |
| :--- | :--- | :--- | :--- |
| **Android 15** | API 35 | Target Principal (Producción) | Pixel 8 / Pixel 9 / Emulador API 35 |
| **Android 14** | API 34 | Soportado | Samsung Galaxy S23/S24 |
| **Android 13** | API 33 | Soportado | Xiaomi Redmi Note 12 |
| **Android 12** | API 31/32 | Soportado | Motorola Moto G |
| **Android 10 / 11** | API 29/30 | Soportado | Dispositivos de gama media/baja |
| **Android 7.0 a 9.0** | API 24 - 28 | minSdkVersion (24) | Emulador Android 7.0 |

---

## 3. Casos de Prueba: Integración Nativa (Capacitor)

### CP-NAT-01: Splash Screen e Inicio en Frío
- **Objetivo**: Verificar que la aplicación arranca sin pantallas en blanco (*white flash*).
- **Procedimiento**: Forzar detención de la app y abrirla desde el launcher.
- **Resultado Esperado**: Se visualiza inmediatamente la pantalla de bienvenida con fondo `#176B5B` y logotipo centrado. Una vez hidratada la UI, se desvanece suavemente en 300 ms.

### CP-NAT-02: Barra de Estado y Safe Areas (Notch / Punch Hole)
- **Objetivo**: Verificar que el contenido no quede oculto bajo la cámara frontal o la barra de gestos.
- **Procedimiento**: Navegar por el Dashboard y formularios en un teléfono con notch o punch hole.
- **Resultado Esperado**: La barra de estado mantiene color `#104D43` y estilo oscuro (iconos blancos). El padding superior e inferior respeta los safe-area insets.

### CP-NAT-03: Botón Físico / Gesto "Atrás" de Android
- **Objetivo**: Probar la navegación contextual de retroceso.
- **Procedimiento**:
  1. Desde el Dashboard, ingresar a *Finanzas*, luego abrir el detalle de una *Cuenta*.
  2. Presionar el botón o realizar el gesto de retroceso de Android.
  3. Comprobar que regresa a *Finanzas*, y con otro retroceso a *Dashboard*.
  4. Al pulsar retroceso en el *Dashboard*, la app debe minimizarse ordenadamente.
- **Resultado Esperado**: Historial de navegación fluido sin cierres inesperados.

### CP-NAT-04: Pérdida y Recuperación de Red (Modo Offline)
- **Objetivo**: Evaluar la resiliencia ante cortes de conectividad.
- **Procedimiento**:
  1. Activar *Modo Avión* en el dispositivo.
  2. Abrir la app o intentar recargarla.
  3. Desactivar *Modo Avión* y pulsar el botón **"Reintentar conexión"**.
- **Resultado Esperado**: La aplicación muestra `offline.html` con diseño de marca corporativo y restablece la sesión automáticamente al pulsar reintentar.

---

## 4. Casos de Prueba: Módulos de Negocio en Pantalla Táctil

| Módulo | Escenario de Prueba | Criterio de Éxito |
| :--- | :--- | :--- |
| **Dashboard** | Scroll vertical y visualización de tarjetas resumen | Sin desbordamiento horizontal (*horizontal overflow*). Elementos táctiles de mínimo 44x44 px. |
| **Finanzas / Transacciones** | Crear gasto o ingreso desde el móvil | Teclado numérico nativo al ingresar montos. Feedback táctil inmediato. |
| **Presupuestos** | Visualización de barras de progreso | Barras legibles sin cortes de texto en resoluciones de 360px a 480px de ancho. |
| **Deudas y Metas** | Registro de abonos y aportes | Recálculo instantáneo de saldos restantes y barras de avance. |
| **Tareas del Hogar** | Marcar tarea como completada vía tap | Transición visual inmediata del checkbox táctil. |
| **Lista de Compras** | Toggle de compras en el supermercado | Manejo ágil con una sola mano. Botón flotante accesible. |
| **Inventario** | Edición y ajuste rápido de stock | Modales responsivos adaptados al ancho de pantalla. |
| **Menú Semanal** | Navegación horizontal por días de la semana | Desplazamiento táctil fluido (*touch-drag*) en carrusel de días. |
| **Miembros del Hogar** | Añadir nuevo integrante desde Configuración | Formulario modal centrado, botones de Guardar y Cancelar siempre visibles. |
| **Asistente IA** | Envío de mensaje en chat móvil | El teclado en pantalla no bloquea el input de texto; auto-scroll hacia el mensaje más reciente. |
| **Autenticación** | Login y persistencia de sesión | Las cookies HMAC se mantienen activas tras cerrar y reabrir la app. |

---

## 5. Pruebas de Rendimiento Móvil

1. **Tiempo de Arranque (Cold Start)**: Inferior a 2.5 segundos en dispositivos modernos (Pixel / Galaxy).
2. **Consumo de Memoria RAM**: Promedio estable entre 90 MB y 160 MB en el proceso de WebView.
3. **Fluidez de Animaciones**: 60 cuadros por segundo (FPS) en transiciones de navegación y modales.

