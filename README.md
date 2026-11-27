<p align="center">
  <img src="apps/mobile/assets/logo.png" alt="Logo do Miaucha" width="260">
</p>

# Miaucha

App mobile para reencontrar pets perdidos. Quem perdeu, viu ou encontrou um animal registra uma ocorrência; a vizinhança vê no mapa, recebe um alerta quando o caso é perto e conversa pelo chat do app, sem expor e-mail, telefone ou endereço.

Projeto de TCC (5º período). Plano, especificações e matriz de testes em [Miaucha — Plano de Execução.md](Miaucha%20—%20Plano%20de%20Execução.md).

## O que o app faz

| Área | Funcionalidades |
| --- | --- |
| **Conta** | Cadastro com código por e-mail, login com e-mail e senha ou Google, recuperação de senha, consentimento (LGPD) e tutorial de boas-vindas |
| **Meus pets** | Cadastro com fotos; "registrar como perdido" a partir do pet já preenche a ocorrência |
| **Ocorrências** | Perdido, avistado ou encontrado, com fotos, espécie, dados do pet e local (localização atual, endereço ou toque no mapa); "Vi este pet" avisa o tutor na hora; "Como chegar" abre o Google Maps ou o Waze |
| **Mapa** | Ocorrências da área visível, com cor pelo tipo e ícone pela espécie, agrupamento por proximidade, filtros (tipo, espécie, período) e o último mapa salvo para ver sem internet |
| **Alertas** | Push quando surge um caso dentro do raio escolhido (1, 3 ou 5 km), com horário de silêncio; lista de alertas por distância |
| **Chat** | Conversa a partir de uma ocorrência, por pseudônimo, em tempo real, com fotos e "encontrei aqui"; telefone, e-mail e links digitados são mascarados; bloquear e denunciar; contato direto só se os dois aceitarem |

### Privacidade por padrão

- A API nunca devolve e-mail, telefone ou a coordenada exata. Cada ocorrência mostra um ponto deslocado ~150 m e o pseudônimo de quem registrou.
- A localização do usuário só chega ao servidor como uma célula de ~1 km (geohash), nunca o trajeto.
- Fotos ficam num bucket privado; o app recebe só links assinados que expiram.
- Todas as tabelas têm Row Level Security no Supabase.

## Tecnologias

| Camada | Tecnologia |
| --- | --- |
| App | Expo SDK 58 (React Native), Expo Router, TypeScript, NativeWind 4, fonte Plus Jakarta Sans, ícones Lucide; roda também no navegador (react-native-web), só em desenvolvimento |
| Mapa | MapLibre com mapas gratuitos do OpenFreeMap (OpenStreetMap) + supercluster |
| API | NestJS 12 (Node 24), Socket.IO para o chat |
| Banco | PostgreSQL + PostGIS no Supabase |
| Fotos | Supabase Storage pelo protocolo S3, com URLs assinadas |
| Notificações | Expo Push (Firebase Cloud Messaging no Android) |
| E-mail | API do Gmail (ou Resend) para os códigos |
| Hospedagem | API no Render; app pelo EAS Build e EAS Update |
| Testes | Jest 30, React Native Testing Library, Supertest e Testcontainers |

## Estrutura

```
apps/
  mobile/     App Expo. Rotas em src/app; cada área em src/features (auth, pets, occurrences, map, alerts, chat, profile...)
  api/        API NestJS. Módulos em src/; migrações SQL em migrations/; testes de integração em test/
packages/
  shared/     Regras e tipos usados pelo app e pela API (validações, cores, geohash, formatos)
docs/         Próximos passos, guias de deploy e o protótipo visual (design/design.tsx)
```

## Como rodar

### Pré-requisitos

- Node 24 e pnpm 12 (`corepack enable`)
- Docker, para os testes de integração da API
- Uma conta no [Expo](https://expo.dev) e um celular Android com o development build instalado (o mapa não roda no Expo Go)

### 1. Instalar

```bash
pnpm install          # na raiz do repositório
```

### 2. API

```bash
cd apps/api
cp .env.example .env  # preencha DATABASE_URL, JWT_SECRET, CODE_SECRET e as variáveis STORAGE_*
pnpm dev              # http://localhost:3000; as migrações rodam sozinhas ao iniciar
```

Sem configuração de e-mail, os códigos de verificação aparecem no log da API.

### 3. App

```bash
cd apps/mobile
cp .env.example .env.local   # EXPO_PUBLIC_API_URL = endereço da API (local ou https://miaucha-api.onrender.com)
npx expo start --tunnel ngrok
```

Abra o app **Miaucha** (development build) no celular e escaneie o QR code. Sem `EXPO_PUBLIC_API_URL`, o app usa um login falso em memória: qualquer código de 6 dígitos funciona.

Outros jeitos de abrir o app:

- **No navegador:** `npx expo start --web`. Só para desenvolvimento; a API precisa liberar a origem em `CORS_ORIGINS` (ou use `EXPO_PUBLIC_WEB_API_URL` com uma API local).
- **Modo demonstração:** `EXPO_PUBLIC_DEMO=1` usa dados e fotos de exemplo, sem chamar a API (bom para apresentar).

Para gerar o development build (uma vez, ou quando mudar algo nativo):

```bash
cd apps/mobile
npx eas-cli build -p android --profile development
```

## Testes

O projeto é feito em TDD: o teste vem primeiro, falha pelo motivo certo e só então vem o código.

```bash
pnpm test                          # tudo (shared, app e API; a API precisa do Docker)
pnpm typecheck
cd apps/mobile && npx jest src/features/map   # uma pasta do app
cd apps/api && pnpm test:unit                 # API sem Docker
```

Os testes de integração da API sobem PostGIS, Redis e um storage S3 em containers (Testcontainers) e nunca chamam serviços externos: e-mail e push são trocados por versões falsas.

## Deploy

| O quê | Como | Guia |
| --- | --- | --- |
| API | Render, pelo `render.yaml` | [docs/DEPLOY-RENDER.md](docs/DEPLOY-RENDER.md) |
| App e CI/CD | GitHub Actions + EAS: push na `s1/fundacao` publica em **dev**; tag `v*` publica em **prod** | [docs/DEPLOY-APP.md](docs/DEPLOY-APP.md) |

| Perfil do EAS | Gera | Uso |
| --- | --- | --- |
| `development` | APK com dev client | Desenvolvimento, carregando o JS do Metro |
| `preview` | APK | Testes e apresentação; recebe as atualizações do canal `preview` |
| `production` | AAB | Play Store; recebe as atualizações do canal `production` |

## Como contribuir

- Uma branch por tarefa e PR revisado por outra pessoa antes do merge. Mensagens de commit em português.
- Regras puras vão para `packages/shared` ou arquivos `.ts` testáveis; arquivos em `src/app` só ligam peças já testadas.
- Cores sempre pelos tokens (`colors` do shared ou classes como `bg-brand`), e a marca sempre pelo componente `AppLogo`.
- Toda migração que cria tabela precisa de `alter table <t> enable row level security;`.
- Antes de começar, leia o [CLAUDE.md](CLAUDE.md) (regras e armadilhas já resolvidas) e o [docs/PROXIMOS-PASSOS.md](docs/PROXIMOS-PASSOS.md) (estado atual e próximas tarefas).
