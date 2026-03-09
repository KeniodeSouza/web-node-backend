import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import { FastifyReply } from 'fastify';

@Catch(ZodError, Prisma.PrismaClientKnownRequestError)
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    return response.code(HttpStatus.BAD_REQUEST).send({
      statusCode: HttpStatus.BAD_REQUEST,
      type: 'VALIDATION_ERROR',
      // No Zod 4, usamos .issues em vez de .errors
      errors: exception.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
  }
}
