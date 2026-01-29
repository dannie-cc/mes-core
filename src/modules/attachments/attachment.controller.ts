import { Controller, Post, Get, Body, Param, Query, Delete, Header, StreamableFile } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

import { CustomLoggerService } from '@/app/services/logger/logger.service';
import { AttachmentService } from './attachment.service';

import { ok } from '@/utils';
import { type UploadAttachmentDto } from './attachment.dto';
import { MIME_TYPE } from '@/app/services/storage/storage.interface';
import { AttachmentsDecorators } from './attachments.decorators';
import { PaginatedFilterQueryDto } from '@/common/dto/filter.dto';
import { CurrentUser } from '@/common/decorators/user.decorator';
import { JwtUser } from '@/types/jwt.types';
import { FILE_TYPE } from '@/common/enums';

@ApiTags('Attachments')
@ApiBearerAuth()
@Controller('attachments')
export class AttachmentController {
    constructor(
        private readonly attachmentService: AttachmentService,
        private readonly logger: CustomLoggerService,
    ) {
        this.logger.setContext(AttachmentController.name);
    }

    @Post('upload')
    @AttachmentsDecorators('upload')
    async getUploadUrl(@Body() uploadDto: UploadAttachmentDto, @CurrentUser() user: JwtUser) {
        const { fileName, mimeType, type } = uploadDto;

        const result = await this.attachmentService.createAttachment(user, fileName, mimeType as MIME_TYPE, type as FILE_TYPE);
        return ok(result).message('Upload URL generated successfully');
    }

    @Post(':attachmentId/confirm')
    @AttachmentsDecorators('confirm')
    async confirmUpload(@Param('attachmentId') attachmentId: string) {
        const result = await this.attachmentService.confirmUpload(attachmentId);
        return ok(result).message('Upload confirmed successfully');
    }

    @Get('list')
    @AttachmentsDecorators('list')
    async listAttachments(@Query() filterQuery: PaginatedFilterQueryDto, @CurrentUser() user: JwtUser) {
        const result = await this.attachmentService.list(user, filterQuery);
        return ok(result.data).message('Attachments fetched successfully').paginate({
            total: result.total,
            page: result.page,
            limit: result.limit,
        });
    }

    @Get('my-files')
    @AttachmentsDecorators('my-files')
    async myFiles(@Query() filterQuery: PaginatedFilterQueryDto, @CurrentUser() user: JwtUser) {
        const result = await this.attachmentService.myFiles(user, filterQuery);
        return ok(result.data).message('My Orders fetched successfully').paginate({
            total: result.total,
            page: result.page,
            limit: result.limit,
        });
    }

    @Get(':attachmentId')
    @AttachmentsDecorators('get')
    async getFileUrl(@Param('attachmentId') attachmentId: string, @CurrentUser() user: JwtUser) {
        const result = await this.attachmentService.getDownloadUrl(attachmentId, user);
        return ok(result).message('Download URL generated successfully');
    }

    @Delete(':attachmentId')
    @AttachmentsDecorators('delete')
    async deleteAttachment(@Param('attachmentId') attachmentId: string, @CurrentUser() user: JwtUser) {
        const result = await this.attachmentService.delete(user, attachmentId);
        return ok(result).message('Attachment removed successfully');
    }


    @Get(':attachmentId/thumbnail')
    @AttachmentsDecorators('streamThumbnail')
    @Header('Cache-Control', 'public, max-age=3600')
    async streamThumbnail(@Param('attachmentId') id: string, @CurrentUser() user: JwtUser) {
        const { stream, attachment } = await this.attachmentService.getThumbnailStream(id, user);

        const result = new StreamableFile(stream, {
            type: attachment.mimeType,
            disposition: 'inline', // don't force "download"
        });

        return ok(result).message('Thumbnail fetched successfully');
    }
}
