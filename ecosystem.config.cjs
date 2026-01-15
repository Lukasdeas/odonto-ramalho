module.exports = {
  apps: [
    {
      name: "odonto-ramalho",
      script: "dist/index.cjs",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      max_memory_restart: "500M",
      
      // Carregar variáveis do arquivo .env
      node_args: "-r dotenv/config",
      
      // Variáveis de ambiente padrão
      env: {
        NODE_ENV: "development",
        PORT: 5000
      },
      
      // Variáveis de ambiente de produção
      env_production: {
        NODE_ENV: "production",
        PORT: 5000
      },
      
      // Configuração de logs
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      log_file: "./logs/combined.log",
      time: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      
      // Tratamento de sinais e crashes
      listen_timeout: 10000,
      kill_timeout: 5000,
      shutdown_with_message: true,
      
      // Reinicialização automática com delay
      max_restarts: 10,
      min_uptime: "10s"
    }
  ],
  
  // Configurações globais
  monitor_interval: 100,
  
  // Deploy configuration
  deploy: {
    production: {
      user: "ubuntu",
      host: "your-ec2-ip",
      ref: "origin/main",
      repo: "git@github.com:seu-usuario/seu-repo.git",
      path: "/var/www/odonto-ramalho",
      "post-deploy": "npm install && npm run build && pm2 reload ecosystem.config.cjs --env production"
    }
  }
};
