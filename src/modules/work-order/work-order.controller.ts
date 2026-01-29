import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { WorkOrderService } from './work-order.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { JwtUser } from '@/types/jwt.types';

import { ok } from '@/utils';

@Controller('work-orders')
@UseGuards(JwtAuthGuard)
export class WorkOrderController {
    constructor(private readonly workOrderService: WorkOrderService) {}

    @Post()
    async createWorkOrder(
        @Request() req: { user: JwtUser },
        @Body() body: { bomRevisionId: string, targetQuantity: number }
    ) {
        return ok(await this.workOrderService.createWorkOrder(req.user.factoryId, body.bomRevisionId, body.targetQuantity));
    }

    @Post('release/:id')
    async releaseWorkOrder(@Request() req: { user: JwtUser }, @Param('id') id: string) {
        return ok(await this.workOrderService.releaseWorkOrder(id, req.user.factoryId));
    }

    @Get()
    async listWorkOrders(@Request() req: { user: JwtUser }) {
        return ok(await this.workOrderService.listWorkOrders(req.user.factoryId));
    }
}
