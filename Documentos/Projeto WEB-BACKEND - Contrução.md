# Projeto WEB-BACKEND

## A) Definição das entidade do banco de dados:

### 1. Definição das base de dados
```ddl
-- Schema de Permissões (Tratamento de auth)
CREATE SCHEMA auth AUTHORIZATION user_admin;

-- Tabela de Permissão (Ex: 'CRIAR_USUARIO', 'EXCLUIR_USUARIO', etc.)
CREATE TABLE auth.tb_permissao (
    id           					SERIAL		 NOT NULL,	
    acao   							VARCHAR(255) NOT NULL UNIQUE,
    descricao  						VARCHAR(100) NOT NULL,
	CONSTRAINT pk_tb_permissao PRIMARY KEY (id)
);

-- Tabela de Perfil (Ex: 'Administrador', 'Gerencia', 'Funcionario', 'Visitante', etc.)
CREATE TABLE auth.tb_perfil (
    id           					SERIAL		 NOT NULL,	
    nome         					VARCHAR(100) NOT NULL UNIQUE,
    descricao    					VARCHAR(500) NOT NULL,
    data_criacao 					TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT pk_tb_perfil PRIMARY KEY (id)
);

-- Tabela de Usuário
CREATE TABLE auth.tb_usuario (Ex: 'admin@gestao.com.br, gerente@gestao.com,  etc.)
    id           					SERIAL		 NOT NULL,	
    nome         					VARCHAR(100) NOT NULL,
    email        					VARCHAR(100) NOT NULL UNIQUE,
    status_ativo					BOOLEAN NOT NULL DEFAULT true,
    data_criacao 					TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
	CONSTRAINT pk_tb_usuario PRIMARY KEY (id)
);

-- Tabela de Perfil com Permissoes (Ex: 'Administrador' -> 'CRIAR_USUARIO', 'EXCLUIR_USUARIO') 
CREATE TABLE auth.tb_perfis_permissoes (
    id_perfil    					INT NOT NULL,
    id_permissao 					INT NOT NULL,
    -- Chave Primária Composta
    CONSTRAINT pk_perfis_permissoes PRIMARY KEY (id_perfil, id_permissao),
    -- Chaves Estrangeiras com integridade referencial
    CONSTRAINT fk_perfil FOREIGN KEY (id_perfil) 
        REFERENCES auth.tb_perfil(id) ON DELETE CASCADE,
    CONSTRAINT fk_permissao FOREIGN KEY (id_permissao) 
        REFERENCES auth.tb_permissao(id) ON DELETE CASCADE
);

-- Tabela de Usuario com Perfis (Ex: 'gerente@gestao' -> 'Gerencia', 'Funcionario') 
CREATE TABLE auth.tb_usuarios_perfis (
    id_usuario 						INT NOT NULL,
    id_perfil  						INT NOT NULL,
    -- Chave Primária Composta
    CONSTRAINT pk_usuarios_perfis PRIMARY KEY (id_usuario, id_perfil),
    -- Chaves Estrangeiras com integridade referencial
    CONSTRAINT fk_usuario FOREIGN KEY (id_usuario) 
        REFERENCES auth.tb_usuario(id) ON DELETE CASCADE,
    CONSTRAINT fk_perfil_usuario FOREIGN KEY (id_perfil) 
        REFERENCES auth.tb_perfil(id) ON DELETE CASCADE
);
```
---

### 2. Dados iniciais das tabelas

- **Inserir Permissões Iniciais**
```sql
INSERT INTO auth.tb_permissao (acao, descricao) VALUES 
	('GERENCIAR_PERFIL', 'Permite editar permissões e perfis'),
	('CONSULTAR_USUARIO', 'Permite listar/consultar usuários'),
	('CRIAR_USUARIO', 'Permite cadastrar novos usuários'),
	('ATUALIZAR_USUARIO', 'Permite atualizar usuários')
	('CANCELAR_USUARIO', 'Permite inabilitar usuários')
ON CONFLICT DO NOTHING;
```
---

- **Inserir Perfil Administrador**

```sql
INSERT INTO auth.tb_perfil (nome, descricao) VALUES 
	('ADMIN', 'Acesso total ao sistema'),
	('GERENTE', 'Acesso a manutenção de Funcionários e Visitantes'),
	('FUNCIONARIO', 'Acesso a manuntenção dos dados'),
	('VISITANTE', 'Acesso somente a consulta')
ON CONFLICT DO NOTHING;
```

- **Criar Usuário Admin (Senha: Use seu hash ou e-mail conforme sua lógica)**

```sql
INSERT INTO auth.tb_usuario (nome, email, status_ativo) VALUES 
	('Administrador Sistema', 'admin@gestao.com', true),
	('kenio de Souza', 'kenio.souza@gestao.com', true)
ON CONFLICT DO NOTHING;
```

- **Vincular Permissões ao Perfil ADMIN**

```sql
INSERT INTO auth.tb_perfis_permissoes (id_perfil, id_permissao)
	SELECT p.id, perm.id 
	FROM auth.tb_perfil p, auth.tb_permissao perm
	WHERE p.nome = 'ADMIN'
ON CONFLICT DO NOTHING;
```

- **Vincular Usuário ao Perfil ADMIN**

```sql
INSERT INTO auth.tb_usuarios_perfis (id_usuario, id_perfil)
	SELECT u.id, p.id 
	FROM auth.tb_usuario u, auth.tb_perfil p
	WHERE u.email = 'admin@gestao.com' 
	  AND p.nome = 'ADMIN'
ON CONFLICT DO NOTHING;
```

> Reinicie o TS Server (Dica de Ouro)
	Às vezes o terminal diz que deu certo, mas o VS Code continua mostrando a linha vermelha de erro.

- No VS Code, aperte **Ctrl + Shift + P**
- Digite: **TypeScript: Restart TS Server**
- Pressione **Enter**
---

## B) Configuração do PRISMA:

Configurar o Prisma com NestJS e Fastify em um banco de dados já existente requer atenção especial ao mapeamento das tabelas e do 
schema específico (`auth`).

Aqui está o passo a passo para deixar tudo rodando redondo:

### 1. Instalação e Inicialização

Primeiro, instale as dependências necessárias no seu projeto NestJS:

```bash
npm install @prisma/client @prisma/adapter-pg pg
npm install prisma @types/pg dotenv --save-dev

```

* Verificação via Endpoint (Health Check)
Se você quer um endpoint para monitorar (útil para Docker, Kubernetes ou UptimeRobot), use o @nestjs/terminus.

```bash
npm install @nestjs/terminus
```

Vamos precisar do Zod e da integração com o NestJS:

```bash
npm install zod nestjs-zod @nestjs/platform-fastify
```

Inicie o Prisma:

```bash
npx prisma init

```

Estrutura de Pastas
```Plaintext
src/
  prisma/
    schema.prisma    <-- O arquivo de configuração vai aqui
    prisma.service.ts
    prisma.module.ts
  app.module.ts
  main.ts
.env
prisma.config.ts

```
---

### 2. Configuração do variaveis de ambiente

No seu arquivo `.env`, ajuste a URL de conexão. Note que o nome do banco é `gestao` e precisamos informar o schema `auth`:

```env
DATABASE_URL="postgresql://usuario:senha@localhost:5432/gestao?schema=auth"

```
---

### 3. Configuração do prisma

O Arquivo de configuração do prisma deve apontar para datasource e schema

**./prisma.config.ts**

```typescript
// prisma.cconfig.ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "src/prisma/schema.prisma",
  migrations: {
    path: "src/prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});

```

Como você já tem as tabelas criadas, você pode usar o comando `npx prisma db pull`. No entanto, para que o Prisma entenda o 
schema `auth`, seu arquivo deve estar configurado assim:

**./src/prisma/schema.prisma**

```prisma
// src/prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql" // ou seu banco (mysql, sqlite...)
  // lista de todos os schemas que sua aplicação usa
  schemas  = ["public", "auth"]  
}

model Permissao {
  id            Int       @id @default(autoincrement())
  acao          String    @unique @db.VarChar(255)
  descricao     String    @db.VarChar(100)
  perfis        PerfisPermissoes[]

  @@map("tb_permissao")
  @@schema("auth")
}

model Perfil {
  id            Int       @id @default(autoincrement())
  nome          String    @unique @db.VarChar(100)
  descricao     String    @db.VarChar(500)
  data_criacao  DateTime  @default(now()) @db.Timestamp
  permissoes    PerfisPermissoes[]
  usuarios      UsuariosPerfis[]

  @@map("tb_perfil")
  @@schema("auth")
}

model Usuario {
  id            Int       @id @default(autoincrement())
  nome          String    @db.VarChar(100)
  email         String    @unique @db.VarChar(100)
  status_ativo  Boolean   @default(true)
  data_criacao  DateTime  @default(now()) @db.Timestamp
  perfis        UsuariosPerfis[]

  @@map("tb_usuario")
  @@schema("auth")
}

model PerfisPermissoes {
  id_perfil    Int
  id_permissao Int
  perfil       Perfil     @relation(fields: [id_perfil], references: [id], onDelete: Cascade)
  permissao    Permissao  @relation(fields: [id_permissao], references: [id], onDelete: Cascade)

  @@id([id_perfil, id_permissao])
  @@map("tb_perfis_permissoes")
  @@schema("auth")
}

model UsuariosPerfis {
  id_usuario Int
  id_perfil  Int
  usuario    Usuario      @relation(fields: [id_usuario], references: [id], onDelete: Cascade)
  perfil     Perfil       @relation(fields: [id_perfil], references: [id], onDelete: Cascade)

  @@id([id_usuario, id_perfil])
  @@map("tb_usuarios_perfis")
  @@schema("auth")
}

```
---

### 4. Integração com NestJS

Crie um serviço para gerenciar a conexão. 
No NestJS com Fastify, é importante garantir o fechamento da conexão no shutdown da aplicação.

```typescript
// src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // 1. Criamos um pool de conexão nativo do Driver 'pg'
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // 2. Criamos o adaptador do Prisma
    const adapter = new PrismaPg(pool);

    // 3. Passamos o adaptador para o construtor do Prisma 7
    super({ adapter });
  }

  async onModuleInit() {
    // Forçamos a conexão manual na inicialização do módulo
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

```

O modulo de tratamento dos componentes

**src/prisma/prisma.module.ts**

```typescript
// src/prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Torna o PrismaService disponível em todo o projeto sem precisar importar o PrismaModule toda hora
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

```

Para completar o configuração do Prisma configuramos a app.module:

**src/APP.module.ts**

```typescript
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { envSchema } from './common/config/env.config'; 
import { PrismaModule } from './prisma/prisma.module';
import { UsuarioModule } from './modules/usuario/usuario.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (config) => {
        return envSchema.parse(config);
      },
    }),
    PrismaModule,
    UsuarioModule,
  ],
  providers: [
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
  ],
})
export class AppModule {}

```


Após ajustar o arquivo, gere o Client:

```bash
npx prisma generate

```
---

- Resumo da Estrutura de Dados

  O mapeamento que criamos acima reflete exatamente o seu SQL. Aqui está uma visualização de como as entidades se relacionam:


### **Dica de Ouro**

  Como você está usando um schema chamado `auth` que não é o `public`, certifique-se de que o usuário do banco de dados definido 
  no seu `.env` tem permissões de **USAGE** e **SELECT/INSERT/UPDATE** especificamente no schema `auth`.

  Aqui alguns métodos para validar a integridade da geração do schema

	1. Verifique a pasta física (Onde o Código Vive)

		O Prisma, por padrão, gera o cliente dentro da sua pasta `node_modules`. Vá até o seu terminal e verifique se estes arquivos existem:
	* **Caminho:** `node_modules/.prisma/client/index.d.ts`
	* **O que procurar:** Este arquivo deve conter as definições de tipo das suas tabelas (Models). Se a pasta `.prisma` não existir, o 
	  `generate` falhou ou não foi executado.

	2. Use o comando `prisma validate

	   Antes de gerar, o Prisma precisa garantir que o seu arquivo de esquema não tem erros de sintaxe ou relações quebradas. Execute:
	   
	```bash
	npx prisma validate --schema=src/prisma/schema.prisma

	```

	O comando `**npx prisma validate**` retornou algum erro de sintaxe no seu schema

	Se este comando retornar um erro, o `generate` nunca funcionará corretamente.
---

	3. Teste de "Intellisense" (O Teste Definitivo)
	   Abra qualquer arquivo `.ts` no seu VS Code (ex: `main.ts` ou um service) e tente digitar o seguinte:
	```typescript
	import { PrismaClient } from '@prisma/client';
	const prisma = new PrismaClient();
	```
> Ao digitar "prisma." abaixo, o VS Code deve sugerir o nome das suas tabelas
  Exemplo: prisma.user.findMany()
  Se o VS Code sublinhar `PrismaClient` de vermelho ou não sugerir suas tabelas, a geração falhou.

	4. Verifique a saída do comando Generate
	   Ao rodar `npm run prisma:generate`, a última linha da saída no terminal **deve** ser algo como:

> Generated Prisma Client (v7.4.2) to ./node_modules/@prisma/client in XXXms

	Se aparecer uma mensagem dizendo que ele foi gerado em um **caminho customizado**, isso pode estar causando o erro no NestJS, 
	pois o framework não saberá onde buscar os arquivos.


	5. Sincronização com o Banco (Prisma Studio)
	   Uma forma visual de saber se tudo está "conversando" bem (Schema + Banco + Gerador) é abrir o **Prisma Studio**:

	```bash
	npx prisma studio 

	```
	
> Isso abrirá uma interface no seu navegador (geralmente em `localhost:5555`). Se ele abrir e mostrar suas tabelas, a conexão e o 
schema estão 100% operacionais.

--------------------------------------------------------------------------
## C) Estrutura de diretorios e arquivos

Para manter um projeto organizado, escalável e seguindo os padrões do NestJS com a arquitetura que definimos 
(BaseRepository + Zod + Prisma), a estrutura de diretórios deve ser modular.

Aqui está o mapeamento completo de onde cada arquivo deve residir:

### 1. Estrutura de Diretórios (Tree View)

```text
gestao-auth-api/
├── src/
│   ├── common/                      # Código compartilhado entre módulos
│   │   ├── repositories/
│   │   │   └── base.repository.ts   # Classe abstrata BaseRepository
│   │   └── pipes/
│   │       └── zod-validation.pipe.ts
│   │
│   ├── prisma/                      # Configuração central do Banco de Dados
│   │   ├── schema.prisma            # Definição das tabelas (Schema Auth)
│   │   ├── prisma.service.ts        # Service de conexão
│   │   └── prisma.module.ts         # Módulo Global do Prisma
│   │
│   ├── modules/                     # Módulos de domínio da aplicação
│   │   ├── usuario/
│   │   │   ├── dto/
│   │   │   │   └── usuario.dto.ts   # DTOs gerados pelo Zod
│   │   │   ├── schemas/
│   │   │   │   └── usuario.schema.ts # Definições Zod puras
│   │   │   ├── usuario.controller.ts
│   │   │   ├── usuario.service.ts
│   │   │   ├── usuario.repository.ts
│   │   │   └── usuario.module.ts
│   │   │
│   │   └── perfil/                  # Exemplo de outro módulo seguindo o padrão
│   │       ├── dto/
│   │       ├── schemas/
│   │       ├── perfil.controller.ts
│   │       └── ...
│   │
│   ├── app.module.ts                # Módulo raiz que importa os outros
│   └── main.ts                      # Entry point (Bootstrap Fastify + Zod)
│
├── prisma.config.ts                 # Configuração de conexão do Prisma 7 (Raiz)
├── .env                             # Variáveis de ambiente
├── package.json
└── tsconfig.json

```
---

### 2. Localização e Conteúdo Chave

#### Camada de Dados (Prisma)

A localização em `src/prisma/` isola o acesso ao banco. 
O arquivo `prisma.config.ts` na raiz é o que resolve o erro **P1012**. 

#### Camada de Domínio (Ex: Usuário)

Dentro de `src/modules/usuario/`, separamos o **Schema** (validação) do **DTO** (objeto de transferência).

* **`usuario.schema.ts`**: Contém a lógica de validação do Zod que o Fastify usará para validar a requisição antes do Controller.
* **`usuario.dto.ts`**: Contém 
* **`usuario.controller.ts`**: 
* **`usuario.service.ts`**: 
* **`usuario.repository.ts`**: Fica em modules porque, embora herde da base, ele conhece a tipagem específica da tabela `tb_usuario`.
* **`usuario.module.ts`**: 

Essa estrutura permite que, para criar um novo módulo (como `Permissao`), você apenas copie a pasta `usuario`, altere os nomes 
e o `modelName` no repository, economizando cerca de 70% do tempo de desenvolvimento.

--------------------------------------------------------------------------
## D) Criação dos modulos do projeto

Para criar essa estrutura robusta com **NestJS, Fastify, Prisma 7 e Zod**, vamos organizar o código seguindo os princípios de SOLID 
e separação de responsabilidades.

### 1. Instalação das Dependências

#### 📦 Descrição dos Pacotes

- Core do Framework (NestJS & Fastify)

* **@nestjs/common, core, platform-fastify**: O coração do framework. O uso do Fastify garante uma latência muito menor em comparação ao Express.
* **@fastify (helmet, compress, cookie, etc.)**: Plugins para segurança (Helmet), compressão de dados, manipulação de cookies e sessões.
* **reflect-metadata & rxjs**: Dependências fundamentais para os decoradores do Nest e programação reativa.

- Banco de Dados e Validação

* **@prisma/client & prisma**: ORM de última geração. O Prisma 7 traz melhorias significativas de performance e tipagem.
* **zod & nestjs-zod**: Biblioteca de validação de esquemas. Garante que os dados que entram na API estejam corretos tanto em runtime 
                        quanto no TypeScript.
* **argon2**: Algoritmo moderno e ultra-seguro para hashing de senhas (superior ao bcrypt).

- Documentação e Utilitários

* **@nestjs/swagger & @scalar/nestjs-api-reference**: Geram a documentação automática da API. O Scalar é uma alternativa visualmente mais moderna ao Swagger UI.
* **axios & @nestjs/axios**: Para realizar requisições HTTP externas.
* **date-fns**: Manipulação de datas de forma leve e imutável.
* **handlebars & @fastify/view**: Motor de templates para renderizar HTML (útil para e-mails).

- Observabilidade e Performance

* **pino & nestjs-pino**: Logger extremamente rápido (baixo overhead).
* **@nestjs/cache-manager & ioredis**: Gerenciamento de cache em memória ou via Redis para escalar a aplicação.
* **node-os-utils**: Monitoramento de recursos do sistema (CPU, Memória).

---

#### 🚀 Comandos de Instalação (Por Fase)

Comandos divididos por categoria:

- Dependências de Produção (Runtime)

Estes pacotes são essenciais para o funcionamento do app no servidor.

```bash
npm install @nestjs/common @nestjs/core @nestjs/platform-fastify @nestjs/config @nestjs/swagger @nestjs/axios @nestjs/cache-manager @nestjs/platform-socket.io @nestjs/websockets @fastify/compress @fastify/cookie @fastify/helmet @fastify/multipart @fastify/redis @fastify/secure-session @fastify/static @fastify/view @prisma/client @scalar/nestjs-api-reference argon2 axios cache-manager date-fns handlebars ioredis nestjs-pino nestjs-zod node-os-utils pino pino-pretty reflect-metadata rxjs socket.io zod

```

- Dependências de Desenvolvimento (Build e Tipagem)

Estes pacotes são usados apenas localmente para compilar, testar e formatar o código.

```bash
npm install -D @nestjs/cli @nestjs/schematics @nestjs/testing @swc/core @swc/jest @types/node @types/jest @types/express @types/supertest @typescript-eslint/eslint-plugin @typescript-eslint/parser dotenv eslint eslint-config-prettier eslint-plugin-prettier globals jest prettier prisma source-map-support supertest ts-jest ts-loader ts-node tsconfig-paths typescript

```
---

### 2. Base Repository (Genérico)

Este repositório servirá de base para todas as outras entidades, centralizando as operações de CRUD.

> Implementação completa focada na entidade `Usuario`:

```typescript
// src/common/repositories/base.repository.ts
import { PrismaService } from '../../prisma/prisma.service';

export abstract class BaseRepository<T> {
  constructor(
    protected readonly prisma: PrismaService,
    protected readonly model: string,
  ) {}

  async getAll(): Promise<T[]> {
    return (this.prisma[this.model] as any).findMany();
  }

  async getForId(id: number): Promise<T | null> {
    return (this.prisma[this.model] as any).findUnique({ 
                                              where: { id: Number(id) } 
                                            });
  }

  async create(data: any): Promise<T> {
    return (this.prisma[this.model] as any).create({ 
                                              data 
                                            });
  }

  async update(id: number, data: any): Promise<T> {
    return (this.prisma[this.model] as any).update({ 
                                              where: { id: Number(id) }, 
                                              data 
                                            });
  }

  async delete(id: number): Promise<T> {
    return (this.prisma[this.model] as any).delete({ 
                                              where: { id } 
                                            });
  }
}

```
---

### 3. Mapeamento com Zod (Schemas e DTOs)

Utilizaremos `nestjs-zod` para validar a entrada de dados.

```typescript
// src/modules/usuario/schemas/usuario.schema.ts
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Schemas

export const ParmIdSchema = z.object({
	id: z.coerce.number()
			.int()
			.positive(),
			.describe('Identificador'), // .describe aparece no Swagger
});

export const ParmEmailSchema = z.object({
	email: z.string()
			.email({ message: 'E-mail inválido' })
			.describe('E-mail único institucional'),
});

export const CreateUsuarioSchema = z.object({
	nome: z.string()
			.min(3)
			.describe('Nome completo do usuário'), 
	statusAtivo: z.boolean()
			.optional()
			.default(true)
			.describe('Status de Ativo'), 
	email: z.string()
			.email({ message: 'E-mail inválido' })
			.describe('E-mail único institucional'),
});

export const UpdateUsuarioSchema = z.object({
	nome: z.string()
			.min(3)
			.optional()
			.describe('Nome completo do usuário'), 
	statusAtivo: z.boolean()
			.optional()
			.describe('Status de Ativo'), 
	email: z.string()
			.email({ message: 'E-mail inválido' })
			.optional()
			.describe('E-mail único institucional'),
})

// DTOs para uso no Controller
export class ParmIdDto extends createZodDto(ParmIdSchema) {}
export class ParmEmailDto extends createZodDto(ParmEmailSchema) {}
export class CreateUsuarioDto extends createZodDto(CreateUsuarioSchema) {}
export class UpdateUsuarioDto extends createZodDto(UpdateUsuarioSchema) {}


```
---

### 4. Camada de Acesso a Dados e Negócio

#### Repository

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BaseRepository } from '../../common/repositories/base.repository';
import { Usuario } from '@prisma/client';

@Injectable()
export class UsuarioRepository extends BaseRepository<Usuario> {
	constructor(prisma: PrismaService) {
		super(prisma, 'usuario'); // 'usuarios' deve bater com o nome no schema.prisma
	}

 	// Adicição de um novo metodo ao repositorio:
	async getForEmail(email: string): Promise<Usuario> {
		return (this.prisma[this.model] as any).findUnique({ 
												where: { email: email } 
												});	
  }

}

```
---

#### Service

```typescript
// src/modules/usuarios/usuarios.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { UsuarioRepository } from './usuario.repository';
import { CreateUsuarioDto, UpdateUsuarioDto } from './schemas/usuario.schema';

@Injectable()
export class UsuarioService {
  constructor(private readonly repository: UsuarioRepository) {}

  async listarTodos() {
    return this.repository.getAll();
  }

  async buscarPorId(id: number) {
    const usuario = await this.repository.getForId(id);
    if (!usuario) throw new NotFoundException('Usuário não encontrado');
    return usuario;
  }

  async buscarPorEmail(email: string) {
    const usuario = await this.repository.getForEmail(email);
    if (!usuario) throw new NotFoundException('Usuário não encontrado');
    return usuario;
  }

  async criar(dados: CreateUsuarioDto) {
    return this.repository.create(dados);
  }

  async atualizar(id: number, dados: UpdateUsuarioDto) {
    await this.buscarPorId(id); // Valida existência
    return this.repository.update(id, dados);
  }

  async excluir(id: number) {
    await this.buscarPorId(id);
    return this.repository.delete(id);
  }
}

```
---

### 5. Controller (Router)

No NestJS, o Controller atua como a classe de Router, definindo os endpoints e validações.

```typescript
// src/modules/usuarios/usuario.controller.ts
import { Body, Controller, Delete, Get, Param, Post, Put } from '@nestjs/common';
import { CreateUsuarioDto, ParmEmailSchema, ParmIdSchema, UpdateUsuarioDto } from './schemas/usuario.schema';
import { UsuarioService } from './usuario.service';
import { ZodValidationPipe } from 'nestjs-zod';

@Controller('usuario')
export class UsuarioController {
  constructor(private readonly service: UsuarioService) {}

  @Get()
  async getAll() {
    return this.service.listarTodos();
  }

  @Get(':id')
  async getOne(@Param('id', new ZodValidationPipe(ParmIdSchema.shape.id)) id: number) {
    return this.service.buscarPorId(id);
  }

  @Get('email/:email')
  async getForEmail(@Param('email', new ZodValidationPipe(ParmEmailSchema.shape.email)) email: string) {
    return this.service.buscarPorEmail(email);
  }

  @Post()
  async create(@Body() data: CreateUsuarioDto) {
    return this.service.criar(data);
  }

  @Put(':id')
  async update(@Param('id', new ZodValidationPipe(ParmIdSchema.shape.id)) id: number, 
               @Body() data: UpdateUsuarioDto) {
    return this.service.atualizar(id, data);
  }

  @Delete(':id')
  async remove(@Param('id', new ZodValidationPipe(ParmIdSchema.shape.id)) id: number) {
    return this.service.excluir(id);
  }
}

```
---

### 6. Módulo e Configuração Final

Não esqueça de registrar tudo no módulo da entidade:

```typescript
// src/modules/usuarios/usuario.module.ts
import { Module } from '@nestjs/common';
import { UsuarioRepository } from './usuario.repository';
import { UsuarioController } from './usuario.controller';
import { UsuarioService } from './usuario.service';

@Module({
  controllers: [UsuarioController],
  providers: [UsuarioService, UsuarioRepository],
})
export class UsuarioModule {}

```

### Como rodar

Para que o Zod valide automaticamente os DTOs no `Body`, adicione o Pipe global no seu `main.ts`:

```typescript
// src/main.ts
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { ZodValidationPipe } from 'nestjs-zod';
import { setupSwagger } from './common/config/swagger.config'; // Importe sua nova função

async function bootstrap() {
  // Inicializa o NestJS com o adaptador do Fastify
  const app = await NestFactory.create<NestFastifyApplication>(
		AppModule,
		new FastifyAdapter() 
  );

  // Configuração de Prefixo Global (Opcional, mas recomendado: ex: /api/v1/usuarios)
  app.setGlobalPrefix('api');

  // Ativa o ZodValidationPipe globalmente.
  // Isso faz com que os DTOs baseados em Zod funcionem automaticamente.
  app.useGlobalPipes(new ZodValidationPipe());

  // Configuração de CORS (importante para o frontend acessar a API)
  app.enableCors();

  // Chamada do Swagger
  setupSwagger(app);

  // Configura a porta para receber chamado, Executa o server de Fastify
  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 API: http://localhost:${port}/api`);
  console.log(`📄 Docs: http://localhost:${port}/api/docs`);
}

bootstrap();

```
---

### **Dica de Ouro**

No NestJS, o arquivo que chamamos de `???.module.ts` (como `app.module.ts`) é o **cérebro organizacional** da sua aplicação. 
Sem ele, o NestJS não sabe como as peças (Controllers, Services, Prisma) se conectam.
---

### 1. Encapsulamento e Isolamento (A "Caixa Preta")

O módulo funciona como uma fronteira. Tudo o que você cria dentro de um módulo (como o `UsuarioService`) fica invisível para o 
resto do sistema, a menos que você decida explicitamente "exportá-lo".

* **Vantagem:** Evita que o sistema se torne uma "maçaroca" de arquivos onde tudo depende de tudo. Se você precisar mudar o banco 
de dados do usuário, só mexe no `UsuarioModule`.
---

### 2. Gestão de Dependências (O Injetor)

O NestJS usa um sistema chamado **Injeção de Dependência**.

```typescript
@Module({
  imports: [PrismaModule], // "Eu preciso do banco de dados"
  controllers: [UsuarioController], // "Eu respondo às rotas de usuário"
  providers: [UsuarioService], // "Eu tenho a lógica de negócio"
  exports: [UsuarioService], // "Outros módulos podem usar minha lógica"
})
export class UsuarioModule {}

```
---

### 3. Singleton (Instância Única)

Por padrão, o NestJS garante que o `UsuarioService` seja criado apenas **uma vez** na memória. O módulo gerencia esse ciclo de vida. 
Isso economiza memória e evita comportamentos estranhos (como ter duas conexões diferentes com o banco para a mesma tarefa).
---

### 4. Organização por Domínio (Arquitetura Limpa)

Imagine um projeto grande. Se tudo estivesse em um único arquivo, seria impossível manter. Usando módulos, você divide o sistema 
por responsabilidades:

* `AuthModule` (Segurança)
* `UsuarioModule` (Cadastro)
* `PrismaModule` (Infraestrutura)

---

### 📦 Analogia: A Caixa de Ferramentas

Imagine seu projeto:

* O **Controller** é o mestre de obras que recebe os pedidos.
* O **Service** é o pedreiro que executa o trabalho.
* O **Módulo** é a caixa de ferramentas**.

Se o pedreiro precisar de uma furadeira (Prisma), ele não sai procurando pelo canteiro todo; ele olha dentro da caixa (Módulo). 
Se a ferramenta não estiver na caixa, ele não consegue trabalhar.

---

### O que acontece se você NÃO usar?

1. **Erro de Injeção:** Você tentará usar o `PrismaService` no `UsuarioController` e o NestJS dirá: *"Nest can't resolve dependencies of UsuarioController"*.
2. **Código Acoplado:** Você terá que instanciar classes manualmente (`const srv = new Service()`), perdendo todos os benefícios de testes automatizados e performance do framework.

---
