import { ConfigModule } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
  let appController: AppController, appService: AppService;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ load: [() => ({ serverConfig: { serverName: "test server" } })], })],
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
    appService = app.get<AppService>(AppService);
  });

  describe('root', () => {
    const mockServerMessage = { hi: "hi", knowMore: "/docs" };
    jest.spyOn(AppService.prototype, "getHello").mockImplementation(() => mockServerMessage);

    it(`should return server message"} `, () => {
      expect(appController.getHello()).toBe(mockServerMessage);
    });

  });
});

