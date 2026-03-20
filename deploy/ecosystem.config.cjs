/**
 * PM2 process for the form-builder SPA (Vite preview serving `frontend/dist`).
 *
 * On the VPS (from repo root):
 *   cd frontend && npm ci && npm run build
 *   pm2 start deploy/ecosystem.config.cjs
 *   pm2 save
 *
 * Pair with Nginx (see nginx-forms.yallaprojects.com.conf) proxying to 127.0.0.1:4173.
 * Cloudflare DNS: A record `forms` → VPS IP (proxied).
 */
const path = require('path')

const frontendDir = path.join(__dirname, '..', 'frontend')

module.exports = {
  apps: [
    {
      name: 'form-builder',
      cwd: frontendDir,
      script: path.join(frontendDir, 'node_modules', 'vite', 'bin', 'vite.js'),
      args: 'preview --host 127.0.0.1 --port 4173',
      interpreter: 'node',
      instances: 1,
      autorestart: true,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
}
