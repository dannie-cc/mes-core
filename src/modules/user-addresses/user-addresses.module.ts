import { Module } from '@nestjs/common';
import { DrizzleModule } from '@/models/model.module';
import { UserAddressesService } from './user-addresses.service';
import { UserAddressesController } from './user-addresses.controller';
import { CustomLoggerService } from '@/app/services/logger/logger.service';

@Module({
    imports: [DrizzleModule],
    controllers: [UserAddressesController],
    providers: [UserAddressesService, CustomLoggerService],
    exports: [UserAddressesService],
})
export class UserAddressesModule {}
