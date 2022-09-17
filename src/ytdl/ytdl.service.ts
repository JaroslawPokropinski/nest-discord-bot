import { Injectable } from '@nestjs/common';
import { DiscordService } from 'src/discord/discord.service';
import { Message } from 'discord.js';
import {
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  PlayerSubscription,
  VoiceConnection,
} from '@discordjs/voice';

import ytdl = require('ytdl-core');

type SongInfo = {
  url: string;
  title: string;
};

class GuildHandler {
  connection: VoiceConnection;
  currentSong?: PlayerSubscription;
  queue: Array<SongInfo>;
}

@Injectable()
export class YtdlService {
  handlers = new Map<string, GuildHandler>();

  constructor(private readonly discordService: DiscordService) {
    const p = discordService.getPrefix();
    const cname = 'ytdl';
    const regex = new RegExp(String.raw`\\${p}${cname} (\w+) ?(.*)`);

    discordService.subscribe(
      cname,
      async (msg) => {
        if (!msg.guild) return;
        const m = regex.exec(msg.content);
        if (!m || !m[1]) return;

        const command = m[1];
        const carg = m[2];

        switch (command) {
          case 'play':
            return await this.playCommand(msg, carg);
          case 'skip':
            return this.skipCommand(msg);
          case 'queue':
            return this.printQueue(msg);
          case 'stop':
            return this.stopCommand();
          default:
            msg.channel.send(`Unknown ytdl command: ${command}`);
        }
      },
      `${cname} [play|skip|stop|queue] [args]`,
    );
  }

  printQueue(msg: Message) {
    const serverHandler = this.handlers.get(msg.guild.id);
    if (serverHandler == null || serverHandler.queue.length === 0) {
      msg.channel.send(`Song queue is empty.`);
      return;
    }
    const songList = serverHandler.queue.reduce((slist, songInfo) => {
      return slist + `${songInfo.title}\n`;
    }, '*');

    msg.channel.send(`Playing:\n\`\`\`${songList}\`\`\``);
  }

  playNext(serverHandler: GuildHandler) {
    serverHandler.queue.shift();
    serverHandler.currentSong?.unsubscribe();
    serverHandler.currentSong = null;

    if (serverHandler.queue.length > 0) {
      this.startPlaying(serverHandler);
    }
  }

  startPlaying(serverHandler: GuildHandler): void {
    const player = createAudioPlayer();
    const resource = createAudioResource(ytdl(serverHandler.queue[0].url), {});
    const dispatcher = serverHandler.connection.subscribe(player);
    player.play(resource);
    serverHandler.currentSong = dispatcher;

    player.on('error', (err) => {
      console.log('Something went wrong :(. Error: ' + err);
      this.playNext(serverHandler);
    });
    player.on('stateChange', (_, newState) => {
      this.playNext(serverHandler);
    });
  }

  async playCommand(msg: Message, songUrl?: string): Promise<void> {
    if (songUrl == null) {
      msg.channel.send('Pass me a song url pwease');
    }
    if (this.handlers.get(msg.guild.id) == null) {
      const connection = await joinVoiceChannel({
        guildId: msg.member.voice.channel.guild.id,
        channelId: msg.member.voice.channel.id,
        adapterCreator: msg.member.voice.channel.guild.voiceAdapterCreator,
      }); // msg.member.voice.channel.join();
      const gh = { queue: new Array<SongInfo>(), connection };
      this.handlers.set(msg.guild.id, gh);
    }

    const serverHandler = this.handlers.get(msg.guild.id);
    const songYTDLInfo = await ytdl.getInfo(songUrl);
    const songInfo: SongInfo = {
      url: songUrl,
      title: songYTDLInfo.videoDetails.title,
    };

    serverHandler.queue.push(songInfo);

    if (serverHandler.queue.length === 1) {
      this.startPlaying(serverHandler);
    }
  }

  skipCommand(msg: Message): void {
    const handler = this.handlers.get(msg.guild.id);
    if (handler == null || handler.queue.length === 0) {
      msg.channel.send('Queue is empty');
      return;
    }

    this.playNext(handler);
  }

  stopCommand(): void {
    return;
  }
}
