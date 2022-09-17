import { Module } from '@nestjs/common';
import { SoundboardService } from './soundboard.service';
import { DiscordModule } from 'src/discord/discord.module';

@Module({
  imports: [DiscordModule],
  providers: [SoundboardService],
})
export class SoundboardModule {}
