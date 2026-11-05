# MANUAL DE DESPLIEGUE EN PRODUCCIÓN – HOMECALM

## 1. Opciones Recomendadas de Hospedaje

### Opción A: Vercel (Recomendada para Next.js App Router)
1. Conectar el repositorio de GitHub a la plataforma Vercel.
2. Seleccionar el framework preestablecido: **Next.js**.
3. Directorio raíz del proyecto: `homeflow`.
4. Configurar las variables de entorno en **Project Settings -> Environment Variables**:
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
   - `SESSION_SECRET`
   - `GEMINI_API_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`
   - `NEXT_PUBLIC_APP_URL` (ej. `https://homecalm.app`)
5. Desplegar. Vercel compila automáticamente las 20 rutas con Edge y Serverless Functions.

### Opción B: Servidor Node.js Tradicional / Docker (VPS en DigitalOcean, AWS EC2, Railway)
1. Instalar Node.js 20+ y `pnpm`.
2. Clonar el repositorio y crear `.env.local` con las variables de producción.
3. Ejecutar compilación de producción:
   ```bash
   pnpm install --frozen-lockfile
   pnpm build
   ```
4. Gestionar el proceso con PM2:
   ```bash
   npm install -g pm2
   pm2 start npm --name "homecalm" -- start -- -p 3000
   pm2 save
   pm2 startup
   ```
5. Configurar un proxy inverso Nginx con certificado SSL gratuito Let's Encrypt (Certbot).

---

## 2. Configuración de Proxy Inverso Nginx (Plantilla)

```nginx
server {
    server_name homecalm.app www.homecalm.app;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/homecalm.app/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/homecalm.app/privkey.pem;
}
```

---

## 3. Checklist Pre-Lanzamiento (Go-Live Checklist)

- [x] Base de datos MySQL con réplicas y SSL habilitado.
- [x] Ejecución de `scripts/migrate-phase4.mjs` para validar índices compuestos.
- [x] Generación de `SESSION_SECRET` aleatorio de 64 caracteres hex.
- [x] `NEXT_PUBLIC_APP_URL` apuntando al dominio de producción con HTTPS.
- [x] Cabeceras de seguridad activadas (HSTS, CSP/Permissions-Policy, Clickjacking protection).
- [x] Comprobación de que la suite de pruebas automatizadas pasa al 100% (104/104 pruebas).
- [x] Verificación de la tarea de respaldo automatizado diario programada en cron.

