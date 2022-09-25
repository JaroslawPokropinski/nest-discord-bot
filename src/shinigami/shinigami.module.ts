import { Module } from '@nestjs/common';
import { ShinigamiService } from './shinigami.service';
import { DiscordModule } from 'src/discord/discord.module';

@Module({
  imports: [DiscordModule],
  providers: [ShinigamiService],
})
export class SoundboardModule {}
