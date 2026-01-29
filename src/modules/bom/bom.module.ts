import { Module } from '@nestjs/common';
import { BomService } from './bom.service';
import { DrizzleModule } from '@/models/model.module';

import { BomController } from './bom.controller';

@Module({
    imports: [DrizzleModule],
    controllers: [BomController],
    providers: [BomService],
    exports: [BomService],
})
export class BomModule {}
