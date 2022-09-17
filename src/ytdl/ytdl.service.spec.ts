import { Test, TestingModule } from '@nestjs/testing';
import { YtdlService } from './ytdl.service';

describe('YtdlService', () => {
  let service: YtdlService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [YtdlService],
    }).compile();

    service = module.get<YtdlService>(YtdlService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
