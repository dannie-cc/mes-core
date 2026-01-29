import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';
import { CustomLoggerService } from '../logger/logger.service';

describe('MailService', () => {
    let service: MailService;
    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MailService,
                {
                    provide: ConfigService,
                    useValue: {
                        getOrThrow: jest.fn().mockReturnValue({
                            smtp: {
                                host: 'host',
                                port: 587,
                                from: 'test@example.com',
                                username: 'username',
                                password: 'password',
                            },
                            server: {
                                url: 'http://localhost:3000',
                            },
                        }),
                    },
                },
                {
                    provide: CustomLoggerService,
                    useValue: {
                        log: jest.fn(),
                        error: jest.fn(),
                        debug: jest.fn(),
                        setContext: jest.fn(),
                    },
                },
            ],
        }).compile();
        service = module.get<MailService>(MailService);
    });
    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
