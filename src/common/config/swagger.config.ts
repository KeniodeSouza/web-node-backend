// src/common/config/swagger.config.ts

import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export function setupSwagger(app: INestApplication): void {
   // 1. Define a configuração dos documentos
  const config = new DocumentBuilder()
    .setTitle('Web Node Backend')
    .setDescription('Documentação da API de Gestão (Schema Auth)')
    .setVersion('1.0')
    // .addTag('usuario', 'Operações relacionadas com usuário')
    // .addTag('perfil', 'Operações relacionadas com Perfil')
    // .addTag('permissao', 'Operações relacionadas com Permissão')
    .addBearerAuth() // Caso decida adicionar JWT futuramente
    .build();

  // 2. Cria o documento
  const document = SwaggerModule.createDocument(app, config);

  // 3. Configura a rota de acesso
  SwaggerModule.setup('api/docs', app, document); 

}