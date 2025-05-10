import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AwsService } from './aws.service';
import { SesModule } from './ses/ses.module';

@Module({
  imports: [ConfigModule, SesModule],
  providers: [AwsService],
  exports: [AwsService, SesModule],
})
export class AwsModule {}
