import { Injectable } from '@nestjs/common';
import { DiscordService } from 'src/discord/discord.service';
import {
  CacheType,
  ChatInputCommandInteraction,
  GuildMember,
  SlashCommandBuilder,
  SlashCommandStringOption,
} from 'discord.js';
import { PlayerSubscription, VoiceConnection } from '@discordjs/voice';

import ytdl = require('ytdl-core');
import DisTube from 'distube';

type SongInfo = {
  url: string;
  title: string;
};

class GuildHandler {
  connection?: VoiceConnection;
  currentSong?: PlayerSubscription;
  queue?: Array<SongInfo>;
}

@Injectable()
export class YtdlService {
  distube = new DisTube(this.discordService.client, {
    leaveOnFinish: false,
    leaveOnStop: false,
    leaveOnEmpty: false,
  });
  constructor(private readonly discordService: DiscordService) {
    this.distube.on('playSong', (queue) => {
      queue.setVolume(20);
    });

    this.addPlayCommand();
    this.addStopCommand();
    this.addSkipCommand();
  }

  addPlayCommand() {
    const command = new SlashCommandBuilder()
      .setName('play')
      .setDescription('Plays given song')
      .addStringOption(
        new SlashCommandStringOption()
          .setName('song')
          .setDescription('Name of the song to play')
          .setRequired(true),
      );

    const onCommand = async (
      interaction: ChatInputCommandInteraction<CacheType>,
    ) => {
      const soundName = interaction.options.getString('song') ?? '';
      const voiceChannel = (interaction.member as GuildMember).voice.channel;

      if (voiceChannel == null) {
        await interaction.reply({
          content: 'Oh nio! you need to join a voice channew fiwst.',
          ephemeral: true,
        });
        return;
      }

      this.distube.play(voiceChannel, soundName);
      await interaction.reply({ content: 'Done', ephemeral: true });
    };
    this.discordService.subscribeSlash(command, onCommand);
  }

  addStopCommand() {
    const command = new SlashCommandBuilder()
      .setName('stop')
      .setDescription('Stops played song');

    const onCommand = async (
      interaction: ChatInputCommandInteraction<CacheType>,
    ) => {
      if (interaction.guildId) {
        this.distube.stop(interaction.guildId);
      }
      await interaction.reply({ content: 'Done', ephemeral: true });
    };
    this.discordService.subscribeSlash(command, onCommand);
  }

  addSkipCommand() {
    const command = new SlashCommandBuilder()
      .setName('skip')
      .setDescription('Skips played song');

    const onCommand = async (
      interaction: ChatInputCommandInteraction<CacheType>,
    ) => {
      if (interaction.guildId) {
        this.distube.skip(interaction.guildId);
      }
      await interaction.reply({ content: 'Done', ephemeral: true });
    };
    this.discordService.subscribeSlash(command, onCommand);
  }

  addLeaveCommand() {
    const command = new SlashCommandBuilder()
      .setName('leave')
      .setDescription('Leave the voice channel');

    const onCommand = async (
      interaction: ChatInputCommandInteraction<CacheType>,
    ) => {
      if (interaction.guildId) {
        this.distube.voices.get(interaction.guildId)?.leave();
      }
    };

    this.discordService.subscribeSlash(command, onCommand);
  }
}
