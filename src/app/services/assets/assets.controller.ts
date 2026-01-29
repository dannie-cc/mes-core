import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { join } from 'path';

@Controller('public')
export class AssetsController {
    @Get('logo.svg')
    getLogo(@Res() res: Response) {
        // Serve from compiled assets location in production (dist/assets)
        const logoPath = join(process.cwd(), 'dist', 'assets', 'images', 'logo.svg');
        return res.sendFile(logoPath);
    }
}
