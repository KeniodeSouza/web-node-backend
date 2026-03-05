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

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  
  console.log(`🚀 API: http://localhost:${port}/api`);
  console.log(`📄 Docs: http://localhost:${port}/api/docs`);
}

bootstrap();