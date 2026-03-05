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
    super({ adapter,
            log: ['query', 'info', 'warn', 'error'],
            errorFormat: 'minimal',
     });

  }

  async onModuleInit() {
    try {
        // Forçamos a conexão manual na inicialização do módulo
        await this.$connect();
        await this.$queryRaw`SELECT 1`.catch(() => {
            throw new Error('Database connection test failed');
        });

        console.log('✅ Conexão com o banco de dados estabelecida com sucesso.');
    } catch (error) {
        console.error('❌ Banco de dados: Offline ou Inacessível');
        console.error(error.message);
        process.exit(1);
    }    
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}

