import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const AuthSchema = z.object({
  nome: z.string().min(3).optional(),
  email: z.string().email('E-mail inválido'),
  passwd: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  perfilId: z.number().int().optional(),
});

export class AuthDto extends createZodDto(AuthSchema) {}
