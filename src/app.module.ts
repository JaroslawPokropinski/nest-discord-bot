import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { DiscordModule } from './discord/discord.module';
import { SoundboardModule } from './soundboard/soundboard.module';
import { YtdlModule } from './ytdl/ytdl.module';
import { WebConsoleModule } from './web-console/web-console.module';
import { ShinigamiService } from './shinigami/shinigami.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    DiscordModule,
    SoundboardModule,
    YtdlModule,
    WebConsoleModule,
  ],
  controllers: [AppController],
  providers: [AppService, ShinigamiService],
})
export class AppModule {}
