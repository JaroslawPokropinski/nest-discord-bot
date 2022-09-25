import { Test, TestingModule } from '@nestjs/testing';
import { ShinigamiService } from './shinigami.service';

describe('ShinigamiService', () => {
  let service: ShinigamiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ShinigamiService],
    }).compile();

    service = module.get<ShinigamiService>(ShinigamiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
