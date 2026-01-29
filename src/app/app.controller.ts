import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from '@/modules/auth/decorators/public.decorators';
import { ok } from '@/utils';


@ApiTags('Welcome')
@Controller('health')
export class AppController {
    constructor(private readonly appService: AppService) {}

    @ApiOperation({
        summary: 'Health check with version info',
        operationId: 'getHealth',
        description: 'This API will return health status and version information.',
    })
    @ApiResponse({
        status: 200,
        description: 'API health status and version info.',
    })
    @Public()
    @Get()
    getHello(): ReturnType<typeof ok> {
        const healthInfo = this.appService.getHealthInfo();
        return ok(healthInfo).message('API is healthy');
    }
}
