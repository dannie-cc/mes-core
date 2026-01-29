import { serverConfig } from '@/config';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

@Injectable()
export class AppService {
    private readonly packageInfo: { version: string; name: string };

    constructor(
        @Inject(serverConfig.KEY)
        private config: ConfigType<typeof serverConfig>,
    ) {
        const rootPkg = join(process.cwd(), 'package.json');
        const fallbackPkg = join(__dirname, '..', 'package.json');
        const pkgPath = existsSync(rootPkg) ? rootPkg : existsSync(fallbackPkg) ? fallbackPkg : null;

        if (pkgPath) {
            try {
                this.packageInfo = JSON.parse(readFileSync(pkgPath, 'utf-8'));
            } catch {
                this.packageInfo = { name: 'unknown', version: '0.0.0' };
            }
        } else {
            this.packageInfo = { name: 'unknown', version: '0.0.0' };
        }
    }

    getHello(): string {
        const environment = this.config.environment;
        return `Hello from ${environment}`;
    }

    getHealthInfo() {
        const environment = this.config.environment;
        return {
            message: `Hello from ${environment}`,
            version: this.packageInfo.version,
            name: this.packageInfo.name,
            environment,
            timestamp: new Date().toISOString(),
        };
    }
}
