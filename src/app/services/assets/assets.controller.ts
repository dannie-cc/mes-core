import { Controller } from '@nestjs/common';

@Controller('public')
export class AssetsController {
    // The ServeStaticModule in AssetsModule handles serving all static assets.
    // This controller can be used for other public, non-static routes if needed.
}
