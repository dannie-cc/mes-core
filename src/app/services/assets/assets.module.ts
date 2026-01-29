import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import * as fs from 'fs';
import { AssetsController } from './assets.controller';

// Prefer compiled assets (dist/assets) if present; otherwise, use source assets (assets)
const DIST_ASSETS = join(process.cwd(), 'dist', 'assets');
const SRC_ASSETS = join(process.cwd(), 'assets');
const PUBLIC_ROOT = fs.existsSync(DIST_ASSETS) ? DIST_ASSETS : SRC_ASSETS;

@Module({
    imports: [
        ServeStaticModule.forRoot({
            rootPath: PUBLIC_ROOT,
            serveRoot: '/public',
        }),
    ],
    controllers: [AssetsController],
})
export class AssetsModule {}
