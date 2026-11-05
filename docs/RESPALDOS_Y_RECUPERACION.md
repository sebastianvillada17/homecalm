# PLAN DE RESPALDO Y RECUPERACIÓN ANTE DESASTRES (DRP) – HOMECALM

## 1. Definición de Parámetros de Recuperación
- **RPO (Recovery Point Objective):** < 24 Horas (Con respaldo nocturno diario).
- **RTO (Recovery Time Objective):** < 15 Minutos (Tiempo de restauración total verificado en caliente).

---

## 2. Herramientas Desarrolladas en el Proyecto

### 2.1 Generador de Respaldo (`scripts/backup-db.mjs`)
Extrae de manera ordenada e incremental las 22 tablas de la base de datos a formato JSON estructurado, incluyendo metadata de exportación y una firma criptográfica **SHA-256** para validar que el archivo no ha sido alterado ni corrompido durante su almacenamiento o transferencia.

**Uso:**
```bash
node scripts/backup-db.mjs
```
El archivo resultante se almacena en el directorio `backups/backup-YYYY-MM-DDTHH-mm-ss.json`.

### 2.2 Verificador y Restaurador en Caliente (`scripts/restore-test.mjs`)
Realiza un simulacro de recuperación ante desastres sin interrumpir el servicio ni contaminar los datos productivos:
1. Lee el último respaldo disponible.
2. Comprueba el Checksum SHA-256.
3. Genera tablas clon transitorias (`_test_restore_*`).
4. Reinserta los registros con formateo estricto de fechas SQL.
5. Compara el conteo de filas y la fidelidad de campos críticos.
6. Destruye las tablas de prueba de forma limpia.

**Uso:**
```bash
node scripts/restore-test.mjs
```

---

## 3. Automatización de Copias de Seguridad (Cron Job Diario)

Para configurar la copia automática diaria a las 02:00 AM en el servidor de producción:

```bash
# Abrir crontab
crontab -e

# Agregar línea para respaldo nocturno y rotación a 30 días
0 2 * * * cd /ruta/al/proyecto/homeflow && node scripts/backup-db.mjs >> /var/log/homecalm-backup.log 2>&1
0 3 * * * find /ruta/al/proyecto/homeflow/backups -type f -name "*.json" -mtime +30 -delete
```

---

## 4. Procedimiento de Emergencia ante Pérdida Total de Datos

1. Provisionar una nueva instancia MySQL vacía.
2. Definir las variables `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` en `.env.local`.
3. Ejecutar la creación de tablas canónicas:
   ```bash
   node scripts/migrate-phase4.mjs
   ```
4. Restaurar los datos desde el último archivo `.json` validado con checksum.
5. Iniciar la aplicación y comprobar conectividad ejecutando la suite de validación `node scripts/verify-phase4.mjs`.

