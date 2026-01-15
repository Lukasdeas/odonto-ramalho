# Odonto Ramalho - Sistema de Gestão Odontológica

## Overview
Sistema completo de gestão para clínica odontológica com autenticação JWT, agendamento interativo em tabela, cadastro de pacientes, prontuários clínicos, anamnese digital e odontograma interativo com 32 dentes.

## Tech Stack
- **Frontend**: React + TypeScript + Vite
- **Backend**: Express.js + TypeScript
- **Database**: SQLite (better-sqlite3) - para deploy fora do Replit
- **Auth**: JWT com bcryptjs
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: TanStack Query (React Query)
- **Routing**: wouter

## Project Structure
```
├── client/src/
│   ├── components/
│   │   ├── app-sidebar.tsx      # Sidebar de navegação
│   │   ├── theme-toggle.tsx     # Toggle dark/light mode
│   │   └── ui/                  # shadcn/ui components
│   ├── lib/
│   │   ├── auth.tsx             # AuthContext e hooks
│   │   ├── theme.tsx            # ThemeProvider
│   │   └── queryClient.ts       # React Query config
│   ├── pages/
│   │   ├── login.tsx            # Tela de login/registro
│   │   ├── dashboard.tsx        # Dashboard com estatísticas
│   │   ├── agenda.tsx           # Agenda semanal interativa
│   │   ├── pacientes.tsx        # Lista de pacientes
│   │   ├── paciente-detalhe.tsx # Detalhe com anamnese
│   │   ├── odontograma.tsx      # Odontograma digital
│   │   ├── prontuarios.tsx      # Registros clínicos
│   │   └── configuracoes.tsx    # Configurações da clínica
│   └── App.tsx
├── server/
│   ├── db.ts                    # SQLite setup
│   ├── storage.ts               # Storage interface
│   └── routes.ts                # API routes
├── shared/
│   └── schema.ts                # Tipos e validação Zod
└── data/
    └── odonto.db                # SQLite database file
```

## Key Features
1. **Autenticação JWT**: Login/registro com hash de senha bcrypt
2. **Agenda Interativa**: Tabela semanal com dias nas colunas e horários nas linhas
   - Bloqueio de dias não trabalhados (sábado/domingo configuráveis)
   - Bloqueio multi-slot para tratamentos de longa duração
   - Detecção de conflitos para evitar agendamentos sobrepostos
3. **Cadastro de Pacientes**: CRUD completo com dados pessoais
4. **Anamnese Digital**: Histórico médico completo (alergias, medicamentos, doenças)
5. **Odontograma**: Grid 2D com 32 dentes, condições coloridas (cárie, restauração, etc)
6. **Prontuário Eletrônico (Evolução Clínica)**:
   - Interface moderna estilo timeline médica
   - Anexo de imagens/exames (radiografias, fotos clínicas)
   - Suporte a múltiplos tipos de arquivo (JPEG, PNG, GIF, WebP, BMP, PDF)
   - Galeria com visualização ampliada e navegação
   - Armazenamento local em data/uploads (preparado para EC2)
7. **Configurações**: Horários, dias de trabalho, dados da clínica
8. **Controle Financeiro de Tratamentos**:
   - Preços personalizados por dentista/tratamento
   - Duração customizada por tratamento (sobrescreve duração padrão)
   - Toggle para ativar/desativar tratamentos oferecidos
   - Integração com landing page pública mostrando preços

## Color Palette
- **Primary Blue**: #2E86AB (hsl 199 58% 42%)
- **Purple Accent**: #A23B72 (hsl 328 47% 43%)
- **Success Green**: #28A745 (hsl 134 61% 41%)

## Typography
- **Sans**: Inter
- **Headings**: Poppins
- **Mono**: Roboto Mono

## API Endpoints
- `POST /api/auth/register` - Registro
- `POST /api/auth/login` - Login
- `GET /api/dashboard/stats` - Estatísticas
- `GET/POST/PATCH/DELETE /api/patients` - Pacientes
- `GET/POST/PATCH /api/anamnesis` - Anamnese
- `GET/POST/PATCH/DELETE /api/appointments` - Agendamentos (inclui duration)
- `GET/POST/PATCH /api/records` - Prontuários
- `GET /api/records-with-images` - Prontuários com imagens anexas
- `POST /api/records/:recordId/images` - Upload de imagens para registro
- `GET /api/records/:recordId/images` - Listar imagens de um registro
- `DELETE /api/record-images/:id` - Deletar imagem
- `GET /api/uploads/:filename` - Download seguro de arquivos (autenticado)
- `GET/POST/PATCH /api/odontogram` - Odontograma
- `GET/POST/PATCH /api/settings` - Configurações
- `GET/POST/DELETE /api/dentist-treatments/:dentistId` - Tratamentos do dentista
- `GET /api/dentist-treatments/:dentistId/details` - Tratamentos com preços e duração
- `GET /api/public/dentists` - Lista pública de dentistas com tratamentos

## Running the Project
```bash
npm run dev
```
Server runs on port 5000.

## Database
SQLite database stored in `data/odonto.db`. Tables:
- users, patients, anamnesis, appointments (com duration), dental_records, tooth_conditions, dentist_settings, treatments, dentist_treatments (com price e customDuration), record_images

## File Storage
Uploaded images are stored in `data/uploads/` directory with secure authenticated access.

## Deployment
Para deploy em servidor Linux, consulte o arquivo `DEPLOY.md`.

### Build para Producao
```bash
npm run build     # Compila frontend e backend
npm run start     # Inicia em modo producao
```

### Arquivos de Producao
- `dist/index.cjs` - Backend compilado
- `dist/public/` - Frontend estatico
- `ecosystem.config.cjs` - Configuracao PM2

### Variaveis de Ambiente
- `PORT` - Porta do servidor (padrao: 5000)
- `SESSION_SECRET` - Chave secreta para JWT
- `NODE_ENV` - Ambiente (development/production)

#### Configurações de Email (Notificações)
- `SMTP_HOST` - Servidor SMTP (ex: smtp.gmail.com)
- `SMTP_PORT` - Porta SMTP (587 para TLS, 465 para SSL)
- `SMTP_USER` - Usuário SMTP
- `SMTP_PASS` - Senha/App Password SMTP
- `EMAIL_FROM` - Email remetente (fallback: SMTP_FROM, SMTP_USER)
- `SMTP_SECURE` - Define conexão segura (true/false, auto-detecta pela porta)
- `NOTIFICATION_EMAIL` - Email para receber notificações (fallback: EMAIL_FROM)
- `CLINIC_NAME` - Nome da clínica (usado nos emails)

**Fluxo de Email:**
1. Cliente envia mensagem/agendamento via landing page
2. Email enviado para a clínica com dados completos do contato
3. Email de confirmação enviado para o cliente (se informou email)

#### Links Sociais (Landing Page)
- `VITE_WHATSAPP_LINK` - Link direto do WhatsApp (wa.me/...)
- `VITE_INSTAGRAM_LINK` - Link do perfil Instagram
- `VITE_INSTAGRAM_USER` - Nome de usuário do Instagram (default: odonto.ramalho)
- `VITE_WHATSAPP_QRCODE` - URL da imagem do QR Code do WhatsApp (opcional)
