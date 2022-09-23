import { Injectable } from '@nestjs/common';
import { DiscordService } from 'src/discord/discord.service';
import * as path from 'path';
import * as fs from 'fs';
import { promisify } from 'util';
import {
  StageChannel,
  VoiceChannel,
  SlashCommandBuilder,
  SlashCommandStringOption,
  GuildMember,
  ChatInputCommandInteraction,
  CacheType,
} from 'discord.js';
import {
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
} from '@discordjs/voice';

const fsAccess = promisify(fs.access);

@Injectable()
export class SoundboardService {
  constructor(private readonly discordService: DiscordService) {
    this.regiserCommand();
  }

  async regiserCommand() {
    const command = new SlashCommandBuilder()
      .setName('sound')
      .setDescription('Plays selected sound')
      .addStringOption(
        new SlashCommandStringOption()
          .setName('name')
          .setDescription('Name of the sound to play')
          .setRequired(true)
          .addChoices(
            ...(await this.getSounds()).map((name) => ({
              name,
              value: name,
            })),
          ),
      );

    const onCommand = async (
      interaction: ChatInputCommandInteraction<CacheType>,
    ) => {
      const soundName = interaction.options.getString('name') ?? '';
      const voice = (interaction.member as GuildMember).voice;

      if (voice?.channel == null) {
        await interaction.reply({
          content: 'Oh nio! you need to join a voice channew fiwst.',
          ephemeral: true,
        });
        return;
      }

      this.playSound(soundName, voice.channel)
        .then(
          async () =>
            await interaction.reply({ content: 'Done', ephemeral: true }),
        )
        .catch(
          async (err: Error) =>
            await interaction.reply({
              content: err.message,
              ephemeral: true,
            }),
        );
    };

    this.discordService.subscribeSlash(command, onCommand);
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
      const resource = createAudioResource(`./bin/${soundName}.mp3`, {
        inlineVolume: true,
      });
      const dispatcher = connection.subscribe(player);

      player.on('error', (err) => {
        console.log('Something went wrong :(. Error: ' + err);
        player.stop();
      });

      resource.volume?.setVolume(0.2);
      player.play(resource);
    } catch (error) {
      console.error(error);
      throw new Error("I can't make this sound UwU");
    }
  }
}
