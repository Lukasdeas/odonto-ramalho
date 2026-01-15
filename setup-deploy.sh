#!/bin/bash

# Script de setup completo para deploy
# Execute: bash setup-deploy.sh

echo "======================================"
echo "  SETUP DEPLOY - Odonto Ramalho"
echo "======================================"

cd /var/www/odonto-ramalho 2>/dev/null || cd "$(dirname "$0")"

# Criar diretórios necessários
echo "[1/7] Criando diretórios..."
mkdir -p data logs backups
chmod 755 data logs backups

# Verificar dependências do sistema
echo "[2/7] Verificando dependências do sistema..."
if ! command -v gcc &> /dev/null; then
    echo "  -> Instalando build-essential..."
    sudo apt update
    sudo apt install -y build-essential python3
fi

# Limpar instalação anterior
echo "[3/7] Limpando instalação anterior..."
rm -rf node_modules package-lock.json dist/ 2>/dev/null

# Instalar dependências
echo "[4/7] Instalando dependências npm (incluindo devDependencies para build)..."
npm install --include=dev

# Rebuild módulos nativos
echo "[5/7] Reconstruindo módulos nativos..."
npm rebuild better-sqlite3

# Build da aplicação
echo "[6/7] Fazendo build da aplicação..."
npm run build

if [ $? -ne 0 ]; then
    echo ""
    echo "ERRO: Build falhou! Verifique os logs acima."
    exit 1
fi

# Parar aplicação anterior
echo "[7/7] Iniciando com PM2..."
pm2 delete odonto-ramalho 2>/dev/null || true
pm2 start ecosystem.config.cjs --env production

# Salvar configuração PM2
pm2 save

echo ""
echo "======================================"
echo "  SETUP CONCLUÍDO!"
echo "======================================"
echo ""
echo "Comandos úteis:"
echo "  pm2 status                    - Ver status"
echo "  pm2 logs odonto-ramalho       - Ver logs"
echo "  pm2 restart odonto-ramalho    - Reiniciar"
echo ""
echo "Acesse: http://$(curl -s ifconfig.me 2>/dev/null || echo 'SEU_IP'):5000"
echo ""

# Configurar startup automático
echo "Para iniciar automaticamente no boot, execute:"
echo "  pm2 startup"
echo "  (e execute o comando que PM2 exibir)"
