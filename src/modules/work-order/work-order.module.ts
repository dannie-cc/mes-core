import { Module } from '@nestjs/common';
import { WorkOrderService } from './work-order.service';
import { DrizzleModule } from '@/models/model.module';

import { WorkOrderController } from './work-order.controller';

@Module({
    imports: [DrizzleModule],
    controllers: [WorkOrderController],
    providers: [WorkOrderService],
    exports: [WorkOrderService],
})
export class WorkOrderModule {}
