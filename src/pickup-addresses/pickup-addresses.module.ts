import { Module } from '@nestjs/common';
import { PickupAddressesService } from './pickup-addresses.service';
import { PickupAddressesController } from './pickup-addresses.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PickupAddressesController],
  providers: [PickupAddressesService],
  exports: [PickupAddressesService],
})
export class PickupAddressesModule {}
