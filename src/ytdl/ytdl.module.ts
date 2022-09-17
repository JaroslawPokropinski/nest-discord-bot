import { Module } from '@nestjs/common';
import { YtdlService } from './ytdl.service';
import { DiscordModule } from 'src/discord/discord.module';

@Module({
  imports: [DiscordModule],
  providers: [YtdlService],
})
export class YtdlModule {}
