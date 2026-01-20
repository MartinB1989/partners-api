import { Module } from '@nestjs/common';
import { SplitIntegrationsController } from './split-integrations.controller';
import { SplitIntegrationsService } from './split-integrations.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [SplitIntegrationsController],
  providers: [SplitIntegrationsService],
  exports: [SplitIntegrationsService],
})
export class SplitIntegrationsModule {}
