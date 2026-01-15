# Guia de Deploy - Sistema Odonto Ramalho

Este guia descreve como fazer o deploy da aplicação em um servidor EC2 da AWS ou qualquer servidor Linux.

## 📋 Requisitos do Servidor

- **Sistema Operacional:** Ubuntu 20.04+ ou Debian 11+
- **Node.js:** versão 18.x ou superior
- **NPM:** versão 9.x ou superior
- **RAM:** Mínimo 1GB (recomendado 2GB+)
- **Disco:** Mínimo 20GB disponível
- **Porta:** 5000 (para a aplicação) + 80/443 (para Nginx, opcional)

## 🚀 Deploy Rápido (Recomendado)

### 1. Preparação Inicial

```bash
# Conectar à instância EC2
ssh -i sua-chave.pem ubuntu@seu-ip-ec2

# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar dependências do sistema
sudo apt install -y build-essential python3 git curl
```

### 2. Instalar Node.js

```bash
# Usando NodeSource repository (recomendado)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalação
node --version
npm --version
```

### 3. Instalar PM2 Globalmente

```bash
sudo npm install -g pm2
```

### 4. Deploy da Aplicação

```bash
# Clonar ou transferir o projeto
cd /var/www
sudo mkdir -p odonto-ramalho
sudo chown $USER:$USER odonto-ramalho
cd odonto-ramalho

# Opção A: Clonar do Git
git clone SEU_REPOSITORIO .

# Opção B: Transferir via SCP (do seu computador)
# scp -r -i chave.pem ./seu-projeto ubuntu@seu-ip:/var/www/odonto-ramalho/
```

### 5. Configurar Variáveis de Ambiente

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Gerar SESSION_SECRET segura
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Editar arquivo .env
nano .env

# Cole a chave gerada em SESSION_SECRET
```

### 6. Executar Script de Setup

```bash
chmod +x setup-deploy.sh
bash setup-deploy.sh
```

Este script irá:
- ✓ Criar diretórios necessários (`data`, `logs`, `backups`)
- ✓ Instalar dependências npm
- ✓ Fazer o build da aplicação
- ✓ Iniciar com PM2
- ✓ Configurar inicialização automática no boot
- ✓ Opcionalmente configurar Nginx

---

## 🔧 Configuração Manual (Se Preferir)

### 1. Instalar Dependências

```bash
cd /var/www/odonto-ramalho
npm install
```

### 2. Criar Diretórios

```bash
mkdir -p data logs backups
chmod 755 data
```

### 3. Build da Aplicação

```bash
npm run build
```

Você verá algo assim se tudo estiver correto:
```
building client...
✓ built in 18.14s
building server...
  dist/index.cjs  1000.2kb
⚡ Done
```

### 4. Exportar Variáveis de Ambiente

```bash
# Adicionar ao ~/.bashrc
echo 'export SESSION_SECRET="sua-chave-gerada-aqui"' >> ~/.bashrc
echo 'export NODE_ENV=production' >> ~/.bashrc
echo 'export PORT=5000' >> ~/.bashrc

# Recarregar
source ~/.bashrc

# Verificar
echo $SESSION_SECRET
```

### 5. Iniciar com PM2

```bash
# Verificar se SESSION_SECRET está configurado
echo $SESSION_SECRET

# Iniciar
pm2 start ecosystem.config.cjs --env production

# Verificar status
pm2 status

# Ver logs
pm2 logs odonto-ramalho --lines 20

# Salvar
pm2 save

# Configurar startup automático
pm2 startup
# Execute o comando que PM2 exibir
```

---

## 🌐 Configurar Nginx (Proxy Reverso)

### 1. Instalar Nginx

```bash
sudo apt install -y nginx
```

### 2. Configurar Site

```bash
# Copiar arquivo de configuração
sudo cp nginx.conf.example /etc/nginx/sites-available/odonto-ramalho

# Criar link simbólico
sudo ln -s /etc/nginx/sites-available/odonto-ramalho /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx

# Habilitar no boot
sudo systemctl enable nginx
```

### 3. Acessar a Aplicação

```bash
# Via IP direto (substitua pelo seu IP EC2)
http://SEU_IP_EC2

# Se configurou com domínio
http://seu-dominio.com.br
```

### 4. Configurar SSL (Let's Encrypt) - Opcional

```bash
# Instalar Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obter certificado (remova default_server do nginx.conf antes)
sudo certbot --nginx -d seu-dominio.com.br

# Renovação automática
sudo certbot renew --dry-run
```

---

## 🔒 Configurar Firewall (UFW)

```bash
# Ativar firewall
sudo ufw enable

# Permitir SSH
sudo ufw allow ssh

# Permitir Nginx
sudo ufw allow 'Nginx Full'

# Permitir porta da aplicação (se acessada diretamente)
sudo ufw allow 5000

# Ver regras
sudo ufw status
```

---

## 📊 Monitoramento e Logs

### Gerenciar Aplicação

```bash
# Ver status
pm2 status

# Monitorar em tempo real
pm2 monit

# Ver logs completos
pm2 logs odonto-ramalho

# Ver apenas erros
pm2 logs odonto-ramalho --err

# Número específico de linhas
pm2 logs odonto-ramalho --lines 100

# Reiniciar aplicação
pm2 restart odonto-ramalho

# Parar aplicação
pm2 stop odonto-ramalho

# Deletar do PM2
pm2 delete odonto-ramalho
```

### Logs do Nginx

```bash
# Erros
sudo tail -f /var/log/nginx/odonto-ramalho-error.log

# Acessos
sudo tail -f /var/log/nginx/odonto-ramalho-access.log

# Ambos com filtro
sudo tail -f /var/log/nginx/odonto-ramalho-*.log | grep ERROR
```

### Recursos do Sistema

```bash
# Ver CPU e memória
htop

# Espaço em disco
df -h

# Verificar porta em uso
sudo lsof -i :5000
sudo lsof -i :80
```

---

## 🆘 Troubleshooting

### ❌ Erro: "SESSION_SECRET is not defined"

**Causa:** Variável de ambiente não configurada

**Solução:**
```bash
# Gerar nova chave
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Adicionar ao .env ou ~/.bashrc
export SESSION_SECRET="sua-chave-aqui"

# Recarregar
source ~/.bashrc

# Reiniciar aplicação
pm2 restart odonto-ramalho
```

### ❌ Erro: "ENOENT: no such file or directory, open 'data/odonto.db'"

**Causa:** Diretório `data` não existe ou não tem permissões

**Solução:**
```bash
# Criar diretório
mkdir -p data

# Definir permissões
chmod 755 data

# Se arquivo existe, corrigir permissões
chmod 644 data/odonto.db

# Reiniciar
pm2 restart odonto-ramalho
```

### ❌ Erro: "SQLITE_CANTOPEN: unable to open database file"

**Causa:** Banco de dados travado ou arquivo corrompido

**Solução:**
```bash
# Fazer backup do arquivo anterior
cp data/odonto.db data/odonto.db.backup.$(date +%s)

# Deletar arquivo (será recriado automaticamente)
rm data/odonto.db

# Reiniciar aplicação
pm2 restart odonto-ramalho

# Verificar logs
pm2 logs odonto-ramalho
```

### ❌ Erro: "Port 5000 already in use"

**Causa:** Outra aplicação usando a porta

**Solução:**
```bash
# Encontrar processo na porta
sudo lsof -i :5000

# Matar processo (se for aplicação anterior)
kill -9 PID

# Ou mudar PORT no .env ou ecosystem.config.cjs
export PORT=5001
pm2 restart ecosystem.config.cjs
```

### ❌ Erro: "Cannot find module 'better-sqlite3'"

**Causa:** Módulo nativo não compilado durante npm install

**Solução:**
```bash
# Reinstalar dependências
rm -rf node_modules package-lock.json
npm install

# Ou compilar manualmente
npm rebuild better-sqlite3

# Rebuild da aplicação
npm run build

# Reiniciar
pm2 restart odonto-ramalho
```

### ❌ Erro: "Application crashed on startup"

**Causa:** Diversos, verifique logs

**Solução:**
```bash
# Ver logs detalhados
pm2 logs odonto-ramalho --err --lines 50

# Testar build localmente
npm run build
node dist/index.cjs

# Verificar variáveis de ambiente
echo $SESSION_SECRET
echo $NODE_ENV
echo $PORT

# Se tudo normal, tentar com verbose
NODE_DEBUG=* pm2 start ecosystem.config.cjs
```

### ❌ Nginx retorna erro 502 Bad Gateway

**Causa:** Aplicação não está rodando

**Solução:**
```bash
# Verificar se aplicação está rodando
pm2 status

# Ver logs
pm2 logs odonto-ramalho

# Iniciar novamente
pm2 start ecosystem.config.cjs

# Verificar se porta 5000 está aberta
curl http://127.0.0.1:5000

# Recarregar Nginx
sudo nginx -t
sudo systemctl reload nginx
```

---

## 💾 Backup do Banco de Dados

### Backup Manual

```bash
# Fazer backup
cp data/odonto.db backups/odonto-$(date +%Y%m%d-%H%M%S).db

# Listar backups
ls -lh backups/

# Restaurar de um backup (parar app primeiro!)
pm2 stop odonto-ramalho
cp backups/odonto-20241209-143022.db data/odonto.db
pm2 start ecosystem.config.cjs
```

### Backup Automático com Cron

```bash
# Editar crontab
crontab -e

# Adicionar linha para backup diário às 3h da manhã
0 3 * * * cp /var/www/odonto-ramalho/data/odonto.db /var/www/odonto-ramalho/backups/odonto-$(date +\%Y\%m\%d).db

# Limpar backups antigos (mais de 30 dias)
0 4 * * * find /var/www/odonto-ramalho/backups -type f -mtime +30 -delete
```

---

## 🔄 Atualizar Aplicação

```bash
# Ir para diretório
cd /var/www/odonto-ramalho

# Parar aplicação
pm2 stop odonto-ramalho

# Atualizar código
git pull origin main

# Reinstalar dependências (se necessário)
npm install

# Rebuild
npm run build

# Iniciar novamente
pm2 start ecosystem.config.cjs

# Ver logs para confirmar
pm2 logs odonto-ramalho --lines 20
```

---

## 📁 Estrutura de Arquivos em Produção

```
/var/www/odonto-ramalho/
├── data/
│   └── odonto.db                    # Banco de dados SQLite
├── dist/
│   ├── index.cjs                    # Backend compilado
│   └── public/
│       ├── index.html               # Frontend compilado
│       └── assets/                  # CSS, JS, imagens
├── logs/
│   ├── error.log                    # Erros da aplicação
│   ├── out.log                      # Saídas
│   └── combined.log                 # Combinado
├── backups/                         # Backups do banco de dados
├── node_modules/                    # Dependências
├── .env                             # Variáveis de ambiente (PROTEGIDO!)
├── ecosystem.config.cjs             # Configuração PM2
├── package.json                     # Dependências
└── nginx.conf.example               # Configuração Nginx
```

---

## 🔐 Segurança em Produção

### Medidas de Segurança Implementadas

A aplicação já inclui as seguintes proteções:

1. **Rate Limiting**
   - 100 requisições por 15 minutos para APIs gerais
   - 10 tentativas de login por 15 minutos (proteção contra brute force)

2. **Security Headers (Helmet)**
   - Content Security Policy
   - X-Frame-Options (proteção contra clickjacking)
   - X-Content-Type-Options (previne MIME sniffing)
   - X-XSS-Protection

3. **Autenticação JWT**
   - Tokens expiram em 8 horas
   - Senhas hasheadas com bcrypt (salt rounds: 10)
   - Proteção contra vazamento de dados entre sessões

4. **Autorização Baseada em Roles**
   - Separação admin/dentista
   - Cada dentista só acessa seus próprios pacientes
   - Admin pode acessar e transferir pacientes

5. **Sanitização de Dados**
   - Limpeza de inputs para prevenir XSS
   - Validação com Zod em todas as rotas

### Checklist de Segurança Pós-Deploy

```bash
# 1. Verificar se SESSION_SECRET está configurado corretamente
echo $SESSION_SECRET  # Deve mostrar uma string longa

# 2. Verificar permissões do arquivo .env
ls -la .env  # Deve ser -rw------- (600)

# 3. Verificar se apenas portas necessárias estão abertas
sudo ufw status

# 4. Testar rate limiting
for i in {1..15}; do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5000/api/auth/login -d '{}'; done
# Após 10 requisições, deve retornar 429

# 5. Verificar headers de segurança
curl -I http://localhost:5000 | grep -E "(X-Frame|X-Content-Type|X-XSS)"
```

### Configurações Adicionais Recomendadas

#### Fail2ban (Proteção contra Brute Force)

```bash
# Instalar
sudo apt install -y fail2ban

# Criar configuração
sudo nano /etc/fail2ban/jail.local
```

Conteúdo para `jail.local`:
```ini
[odonto-ramalho]
enabled = true
port = http,https
filter = odonto-ramalho
logpath = /var/www/odonto-ramalho/logs/*.log
maxretry = 5
bantime = 3600
findtime = 600
```

#### Atualizações de Segurança Automáticas

```bash
# Instalar unattended-upgrades
sudo apt install -y unattended-upgrades

# Habilitar
sudo dpkg-reconfigure -plow unattended-upgrades
```

#### Monitoramento de Logs

```bash
# Verificar logs de erro
pm2 logs odonto-ramalho --err --lines 50

# Monitorar tentativas de login
grep -i "login\|auth" /var/www/odonto-ramalho/logs/combined.log

# Verificar logs do Nginx
sudo tail -f /var/log/nginx/odonto-ramalho-error.log
```

---

## ✅ Checklist de Deploy

### Básico
- [ ] Servidor atualizado (apt update && upgrade)
- [ ] Node.js 20+ instalado
- [ ] PM2 instalado globalmente
- [ ] Projeto clonado/transferido
- [ ] npm install executado
- [ ] npm run build sem erros

### Segurança (OBRIGATÓRIO)
- [ ] SESSION_SECRET configurado com chave única de 64+ caracteres
- [ ] Arquivo .env com permissão 600 (chmod 600 .env)
- [ ] NODE_ENV=production no .env
- [ ] Firewall (UFW) ativado e configurado
- [ ] Porta 5000 NÃO exposta publicamente (use Nginx)
- [ ] Nginx configurado como proxy reverso
- [ ] SSL/HTTPS configurado (Let's Encrypt)

### Operacional
- [ ] pm2 start executado com sucesso
- [ ] Aplicação acessível via Nginx
- [ ] PM2 configurado para iniciar no boot (pm2 startup)
- [ ] Diretório data/ com permissões corretas
- [ ] Diretório logs/ criado
- [ ] Backups automáticos configurados (cron)
- [ ] Logs sendo monitorados

### Verificação Final
- [ ] Login funcionando corretamente
- [ ] Pacientes salvos no banco de dados
- [ ] Agendamentos funcionando
- [ ] Documentos sendo gerados

---

## 📞 Suporte

Em caso de problemas:

1. **Verifique logs da aplicação:**
   ```bash
   pm2 logs odonto-ramalho --lines 50
   ```

2. **Verifique logs do Nginx:**
   ```bash
   sudo tail -f /var/log/nginx/odonto-ramalho-error.log
   ```

3. **Teste build localmente:**
   ```bash
   npm run build
   node dist/index.cjs
   ```

4. **Verifique se a porta está em uso:**
   ```bash
   sudo lsof -i :5000
   ```

5. **Reinicie tudo:**
   ```bash
   pm2 delete odonto-ramalho
   npm run build
   pm2 start ecosystem.config.cjs
   ```

---

## 🎉 Conclusão

Sua aplicação está pronta para produção! Acesse em:
- **Pela porta direta:** `http://seu-ip-ec2:5000`
- **Via Nginx:** `http://seu-ip-ec2`
- **Com domínio:** `http://seu-dominio.com.br`

Monitorar regularmente com `pm2 monit` e revisar logs com `pm2 logs`.
