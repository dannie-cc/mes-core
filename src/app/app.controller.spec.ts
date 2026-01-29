import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
    let appController: AppController;
    beforeEach(async () => {
        const app: TestingModule = await Test.createTestingModule({
            controllers: [AppController],
            providers: [
                {
                    provide: AppService,
                    useValue: {
                        getHello: () => 'SomeTestFunction',
                        getHealthInfo: () => 'Healthy', // Add this missing method
                    },
                },
            ],
        }).compile();
        appController = app.get<AppController>(AppController);
    });
    describe('root', () => {
        it('should return health info object', () => {
            const result = appController.getHello();
            expect(result).toEqual({
                _data: 'Healthy',
                _message: 'API is healthy',
                _pagination: undefined,
            });
        });
    });
});
