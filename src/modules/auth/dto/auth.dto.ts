import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const AuthSchema = z.object({
  email: z.string()
          .email('E-mail inválido')
          .describe("Email de Validação"),
  passwd: z.string()
          .min(8, 'Senha deve ter no mínimo 8 caracteres')
          .describe("Senha de Acesso"),
});

export class AuthDto extends createZodDto(AuthSchema) {}
