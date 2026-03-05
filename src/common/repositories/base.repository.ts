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
