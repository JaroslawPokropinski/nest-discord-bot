import { Test, TestingModule } from '@nestjs/testing';
import { WebConsoleController } from './web-console.controller';

describe('WebConsole Controller', () => {
  let controller: WebConsoleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebConsoleController],
    }).compile();

    controller = module.get<WebConsoleController>(WebConsoleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
