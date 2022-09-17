import { Test, TestingModule } from '@nestjs/testing';
import { SoundboardService } from './soundboard.service';

describe('SoundboardService', () => {
  let service: SoundboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SoundboardService],
    }).compile();

    service = module.get<SoundboardService>(SoundboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
