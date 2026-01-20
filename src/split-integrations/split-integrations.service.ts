import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SplitIntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  async handleMPCode(code: string) {
    console.log(code);
    return { received: true, code };
  }
}
