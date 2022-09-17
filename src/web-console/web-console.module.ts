import { Module } from '@nestjs/common';
import { WebConsoleController } from './web-console.controller';
import { DiscordModule } from 'src/discord/discord.module';

@Module({
  imports: [DiscordModule],
  controllers: [WebConsoleController],
})
export class WebConsoleModule {}
