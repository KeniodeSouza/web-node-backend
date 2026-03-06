// src/modules/usuario/schemas/usuario.schema.ts
import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const ParmIdSchema = z.object({
        id: z.coerce.number()
                .int()
                .positive()
                .describe('Identificador'),
});

export const ParmEmailSchema = z.object({
        email: z.string()
                .email({ message: 'E-mail inválido' })
                .describe('E-mail único institucional'),
});

export const CreateUsuarioSchema = z.object({
        nome: z.string()
                .min(3)
                .describe('Nome completo do usuário'), // .describe aparece no Swagger
        statusAtivo: z.boolean()
                .optional()
                .default(true)
                .describe('Status de Ativo'), 
        email: z.string()
                .email({ message: 'E-mail inválido' })
                .describe('E-mail único institucional'),
        passwd: z.string()
                .min(8)
                .describe('Password'),
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
