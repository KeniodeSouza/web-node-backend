import { createZodDto } from 'nestjs-zod';
import { 
  ParmIdSchema,
  ParmEmailSchema,
  CreateUsuarioSchema, 
  UpdateUsuarioSchema, 
} from '../schemas/usuario.schema';


// DTO para validação de Parâmetros (ID na URL)
export class ParmIdDto extends createZodDto(ParmIdSchema) {}

// DTO para validação de Parâmetros (Email na URL)
export class ParmEmailDto extends createZodDto(ParmEmailSchema) {}

// DTO para Criação (POST)
export class CreateUsuarioDto extends createZodDto(CreateUsuarioSchema) {}

// DTO para Atualização (PUT/PATCH)
export class UpdateUsuarioDto extends createZodDto(UpdateUsuarioSchema) {}

