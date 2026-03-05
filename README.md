<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

---

# 🔐 Web Node for Backend

API robusta desenvolvida com **NestJS** e **Fastify**, focada em alta performance e segurança de tipos, utilizando **Prisma 7** 
para persistência no banco `gestao` (schema `auth`) e **Zod** para validações.

## 🛠️ Tecnologias e Arquitetura

O projeto segue uma estrutura modular e limpa:

* **Fastify Adapter:** Engine de requisições de alta performance.
* **Prisma 7:** ORM configurado com `multiSchema` e conexão via `prisma.config.ts`.
* **Zod & nestjs-zod:** Validação de schemas e geração automática de DTOs.
* **Base Repository:** Camada de abstração genérica para operações CRUD.
* **Swagger UI:** Documentação automática disponível em `/api/docs`.

## 📁 Estrutura de Pastas

```text
gestao-auth-api/
├── src/
│   ├── config/                      # Configurações de terceiros (Swagger, etc)
│   ├── common/                      # Código compartilhado entre módulos
│   │   ├── repositories/
│   │   │   └── base.repository.ts   # Classe abstrata BaseRepository
│   │   └── pipes/
│   │       └── zod-validation.pipe.ts
│   ├── prisma/                      # Configuração central do Banco de Dados
│   │   ├── schema.prisma            # Definição das tabelas (Schema Auth)
│   │   ├── prisma.service.ts        # Service de conexão
│   │   └── prisma.module.ts         # Módulo Global do Prisma
│   ├── modules/                     # Módulos de domínio da aplicação
│   │   ├── usuarios/
│   │   │   ├── dto/                 # Classes de transporte validadas
│   │   │   │   └── usuario.dto.ts   # DTOs gerados pelo Zod
│   │   │   ├── schemas/             # Definições Zod  
│   │   │   │   └── usuario.schema.ts # Definições Zod puras
│   │   │   ├── usuarios.controller.ts
│   │   │   ├── usuarios.service.ts
│   │   │   ├── usuarios.repository.ts
│   │   │   └── usuarios.module.ts
│   │   ├── perfil/                  # Exemplo de outro módulo seguindo o padrão
│   │   │    ├── dto/
│   │   │    ├── schemas/
│   │   │    ├── perfil.controller.ts
│   │   │    └── ...
│   │   └── ...
│   │       ├── dto/
│   │       ├── schemas/
│   │       └── ...
│   ├── app.module.ts                # Módulo raiz que importa os outros
│   └── main.ts                      # Entry point (Bootstrap Fastify + Zod)
├── prisma.config.ts                 # Configuração de conexão do Prisma 7 (Raiz)
├── .env                             # Variáveis de ambiente
├── package.json
└── tsconfig.json
```
---

## 🚀 Como Executar

### 1. Requisitos

* Node.js 20+
* PostgreSQL (Banco `gestao` com schema `auth`)

### 2. Configuração do Ambiente

Crie um arquivo `.env` na raiz:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/gestao?schema=auth"

```

### 3. Instalação e Banco

```bash
# Instalar dependências
npm install

# Gerar o Prisma Client
npx prisma generate

```

### 4. Rodar a aplicação

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests
```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```
---

## 🔗 Endpoints Principais (Módulo Usuários)

----------------------------------------------------------------------------
| Método | Rota                | Descrição                                 |
|--------+---------------------+-------------------------------------------|
| `GET`  | `/api/usuario`      | Lista todos os usuários do schema `auth`. |
| `POST` | `/api/usuario`      | Cria um novo usuário (Validação via Zod). |
| `GET`  | `/api/usuario/:id`  | Busca detalhes de usuário por ID.         |
----------------------------------------------------------------------------

Acesse a documentação completa em: `http://localhost:3000/api/docs`

---

## 📝 Notas de Versão (Prisma 7)

> Esta implementação resolve o erro **P1012** ao mover a URL de conexão para o arquivo `prisma.config.ts`, conforme as novas diretrizes 
  do Prisma 7, e remove o warning de `multiSchema` por ser agora uma feature estável.

---



