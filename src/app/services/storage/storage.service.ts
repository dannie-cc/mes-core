import { Client } from 'minio';
import { v4 as uuid } from 'uuid';
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';

import { MIME_TYPE, MinioClient, MinioOptions, MimeToExtension } from './storage.interface';
import { CustomLoggerService } from '@/app/services/logger/logger.service';

const DEFAULT_EXPIRY = 1800; // 30 minutes

@Injectable()
export class StorageService {
    private client: Client;
    private readonly minioClient: MinioClient;
    private readonly additionalParams: Omit<MinioOptions, keyof MinioClient>;
    private isInitialized = false;

    constructor(
        private readonly logger: CustomLoggerService,
        private readonly options: MinioOptions,
    ) {
        this.logger.setContext(StorageService.name);
        this.validateOptions(options);
        this.minioClient = { ...options };
        this.additionalParams = {
            bucketName: options.bucketName,
            expiry: options.expiry,
        };
        void this.init();
    }

    /**
     * Validates MinIO configuration options
     * @param options - MinIO configuration options
     * @throws {BadRequestException} If required configuration options are missing
     */
    private validateOptions(options: MinioOptions): void {
        if (!options.endPoint || !options.accessKey || !options.secretKey || !options.bucketName) {
            throw new BadRequestException('Invalid MinIO configuration');
        }
    }

    /**
     * Initializes the MinIO client and verifies bucket existence
     * @throws {InternalServerErrorException} If initialization fails or bucket doesn't exist
     */
    private async init() {
        if (this.isInitialized) return;

        try {
            this.client = new Client(this.minioClient);
            const bucketName = this.additionalParams.bucketName;
            const checkBucket = await this.client.bucketExists(bucketName);
            if (!checkBucket) {
                const error = `Bucket ${bucketName} does not exist in MinIO Server`;
                this.logger.error(error);
                throw new InternalServerErrorException(error);
            }

            this.isInitialized = true;
            this.logger.log(`MinIO Server Connected - Bucket: ${bucketName}`);
        } catch (error) {
            this.logger.error('MinIO initialization failed:', {
                error: error.message,
                stack: error.stack,
                config: { ...this.minioClient, secretKey: '***' },
            });
            throw new InternalServerErrorException('Storage service initialization failed');
        }
    }

    /**
     * Ensures the MinIO client is initialized before operations
     * @throws {InternalServerErrorException} If initialization fails
     */
    private async ensureInitialized(): Promise<void> {
        if (!this.isInitialized) {
            await this.init();
        }
    }

    /**
     * Appends correct file extension based on MIME type if not present
     * @param mimetype - The MIME type of the file
     * @param fileName - The name of the file
     * @returns The file name with proper extension
     * @throws {BadRequestException} If MIME type is invalid or unsupported
     */
    private setFileExtension(mimetype: MIME_TYPE, fileName: string): string {
        try {
            if (!mimetype) throw new BadRequestException('MIME type is required');

            if (fileName && /\.[^.]+$/.test(fileName)) return fileName;

            const extension = MimeToExtension[mimetype];
            if (!extension) throw new BadRequestException(`Unsupported MIME type: ${mimetype}`);

            return fileName ? `${fileName}.${extension}` : `${uuid()}.${extension}`;
        } catch (error) {
            this.logger.error('Error in setFileExtension:', { mimetype, fileName, error });
            throw error;
        }
    }

    /**
     * Generates a presigned URL for uploading objects
     * @param mimetype - The MIME type of the file to be uploaded
     * @param fileName - The name of the file to be uploaded
     * @returns Promise resolving to the presigned PUT URL
     * @throws {BadRequestException} If parameters are invalid
     * @throws {InternalServerErrorException} If URL generation fails
     */
    async presignedPutObject(mimetype: MIME_TYPE, fileName: string): Promise<string> {
        await this.ensureInitialized();

        try {
            const { bucketName, expiry = DEFAULT_EXPIRY } = this.additionalParams;
            const objectName = this.setFileExtension(mimetype, fileName);

            const url = await this.client.presignedPutObject(bucketName, objectName, expiry);
            this.logger.debug('Generated presigned PUT URL', { objectName, expiry });

            return url;
        } catch (error) {
            this.logger.error('Failed to generate presigned PUT URL:', { mimetype, fileName, error: error.message });
            throw new InternalServerErrorException('Failed to generate upload URL');
        }
    }

    /**
     * Generates a presigned URL for downloading objects
     * @param objectName - The name of the object to download
     * @returns Promise resolving to the presigned GET URL
     * @throws {BadRequestException} If object name is empty
     * @throws {InternalServerErrorException} If URL generation fails
     */
    async presignedGetObject(objectName: string): Promise<string> {
        await this.ensureInitialized();

        try {
            if (!objectName || objectName === '') throw new BadRequestException('Object name is required');

            const { bucketName, expiry } = this.additionalParams;
            const filename = objectName.split('/').pop();
            const url = await this.client.presignedGetObject(bucketName, objectName, expiry ?? DEFAULT_EXPIRY, {
                'response-content-disposition': `attachment; filename="${filename ?? bucketName}"`,
            });

            this.logger.debug('Generated presigned GET URL', { objectName });
            return url;
        } catch (error) {
            this.logger.error('Failed to generate presigned GET URL:', { objectName, error: error.message });
            throw new InternalServerErrorException('Failed to generate download URL');
        }
    }

    /**
     * Deletes an object from the bucket
     * @param objectName - The name of the object to delete
     * @throws {BadRequestException} If object name is empty
     * @throws {InternalServerErrorException} If deletion fails
     */
    async deleteObject(objectName: string): Promise<void> {
        await this.ensureInitialized();

        try {
            if (!objectName || objectName === '') throw new BadRequestException('Object name is required');

            const { bucketName } = this.additionalParams;
            await this.client.removeObject(bucketName, objectName);
            this.logger.debug('Deleted object successfully', { objectName });
        } catch (error) {
            this.logger.error('Failed to delete object:', { objectName, error: error.message });
            throw new InternalServerErrorException('Failed to delete file');
        }
    }

    /**
     * Lists objects in the bucket with optional prefix filtering
     * @param prefix - Optional prefix to filter objects
     * @returns Promise resolving to array of object names
     * @throws {InternalServerErrorException} If listing fails
     */
    async listObjects(prefix?: string): Promise<string[]> {
        await this.ensureInitialized();

        try {
            const { bucketName } = this.additionalParams;
            const stream = this.client.listObjects(bucketName, prefix);
            const objects: string[] = [];

            for await (const obj of stream) {
                objects.push(obj.name);
            }

            return objects;
        } catch (error) {
            this.logger.error('Failed to list objects:', { prefix, error: error.message });
            throw new InternalServerErrorException('Failed to list files');
        }
    }

    async getObjectStream(objectName: string) {
        await this.ensureInitialized();
        const { bucketName } = this.additionalParams;

        if (!objectName) {
            throw new BadRequestException('Object name is required');
        }

        try {
            return await this.client.getObject(bucketName, objectName);
        } catch (error) {
            this.logger.error('Failed to get object stream', { objectName, error: error.message });
            throw new InternalServerErrorException('Failed to load object');
        }
    }

    /**
     * Checks if an object exists in the bucket
     * @param objectName - The name of the object to check
     * @returns Promise resolving to boolean indicating existence
     * @throws {InternalServerErrorException} If check fails for reasons other than not found
     */
    async objectExists(objectName: string): Promise<boolean> {
        await this.ensureInitialized();

        try {
            const { bucketName } = this.additionalParams;
            await this.client.statObject(bucketName, objectName);
            return true;
        } catch (error) {
            if (error.code === 'NotFound') return false;
            throw error;
        }
    }
}
