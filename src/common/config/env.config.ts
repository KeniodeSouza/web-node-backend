// src/common/config/env.config.ts
import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  // Adicione outras aqui conforme o projeto crescer (JWT_SECRET, etc)
});

export type Env = z.infer<typeof envSchema>;
