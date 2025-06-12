module.exports = {
  apps: [{
    name: 'pwa-note',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/pwa-note',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/pwa-note-error.log',
    out_file: '/var/log/pm2/pwa-note-out.log',
    log_file: '/var/log/pm2/pwa-note.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
}
