import { Injectable } from '@nestjs/common';
import { DiscordService } from 'src/discord/discord.service';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import { StageChannel, VoiceChannel, Interaction } from 'discord.js';
import {
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
} from '@discordjs/voice';

const fsAccess = promisify(fs.access);

@Injectable()
export class SoundboardService {
  constructor(private readonly discordService: DiscordService) {
    const p = discordService.getPrefix();
    const cname = 'sound';
    const soundboardRegex = new RegExp(`\\${p}${cname} ([a-zA-Z0-9]*)`);

    discordService.subscribe(cname, async (msg) => {
      if (!msg.guild) return;
      const m = soundboardRegex.exec(msg.content);
      if (m) {
        if (!m[0]) {
          msg.reply('You need to name a sound!');
          return;
        }

        if (msg.member.voice.channel) {
          const soundName = m[1];
          this.playSound(soundName, msg.member.voice.channel)
            .then(() => null)
            .catch((e: Error) => msg.reply(e.message));
        } else {
          msg.reply('You need to join a voice channel first!');
        }
      }
    });
    discordService.client.once('ready', async () => {
      const client = discordService.client as any;
      const slashGuilds: Array<string> = JSON.parse(process.env.GUILD_IDS);
      const data = {
        name: 'sound',
        description: 'Plays selected sound',
        options: [
          {
            name: 'sound_name',
            description: 'Name of the sound to play',
            required: true,
            type: 3,
            choices: (await this.getSounds()).map((name) => ({
              name,
              value: name,
            })),
          },
        ],
      };
      slashGuilds.forEach((gid) =>
        discordService.client.guilds.cache.get(gid)?.commands.create(data),
      );
      client.on('interaction', async (interaction: Interaction) => {
        if (!interaction.isCommand()) return;
        if (interaction.commandName === 'sound') {
          const soundName = interaction.options?.[0].value.toString();

          const voice = interaction.command.guild.members.cache.get(
            interaction.member.user.id,
          )?.voice;

          if (voice == null) return;
          this.playSound(soundName, voice.channel);

          await interaction.reply({ content: 'Done', ephemeral: true });
        }
      });
    });
  }

  async getSounds(): Promise<string[]> {
    return promisify(fs.readdir)('./bin').then((files) =>
      files
        .filter((file) => file.endsWith('.mp3'))
        .map((file) => file.slice(0, -4)),
    );
  }

  async playSound(soundName: string, channel: VoiceChannel | StageChannel) {
    const soundPath = path.resolve('./bin', `${soundName}.mp3`);
    try {
      await fsAccess(soundPath, fs.constants.R_OK);
      const connection = await joinVoiceChannel({
        guildId: channel.guildId,
        channelId: channel.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
      });

      const player = createAudioPlayer();
      const resource = createAudioResource(`./bin/${soundName}.mp3`, {});
      const dispatcher = connection.subscribe(player);

      player.on('error', (err) => {
        console.log('Something went wrong :(. Error: ' + err);
        player.stop();
      });
    } catch (error) {
      console.error(error);
      throw new Error("I can't make this sound UwU");
    }
  }
}
