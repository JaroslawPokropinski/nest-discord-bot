import { Injectable, Scope } from '@nestjs/common';
import * as Discord from 'discord.js';
import {
  ActivityType,
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  SlashCommandStringOption,
} from 'discord.js';

@Injectable({ scope: Scope.DEFAULT })
export class DiscordService {
  private clientId = process.env.DC_APP_ID!;
  private token = process.env.DC_TOKEN!;
  private guildsToUpdate: string[] = JSON.parse(process.env.GUILD_IDS!);
  rest = new REST({ version: '10' }).setToken(this.token);
  client: Client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildVoiceStates,
    ],
    presence: {
      activities: [
        {
          name: `you ❤️`,
          type: ActivityType.Listening,
        },
      ],
    },
  });
  commands: Pick<SlashCommandBuilder, 'toJSON'>[] = [];
  commandHandlers: Record<
    string,
    (
      interaction: Discord.ChatInputCommandInteraction<Discord.CacheType>,
    ) => void
  > = {};

  constructor() {
    this.client.on('ready', () => console.log('I am ready!'));

    this.client.on('error', (err) => {
      console.error(err);
    });

    this.client
      .login(this.token)
      .then(async () => {
        if (this.client.user == null)
          throw new Error("Client's user cannot be null");
        console.log(`Logged in as ${this.client.user?.tag}!`);

        process.on('SIGINT', () => {
          console.log('Destroying client...');
          this.client.destroy();
          process.exit();
        });

        this.initEchoCommand();

        await this.reloadSlashCommands();
      })
      .catch((err) => {
        console.error('Got an error:', err);
        this.client.destroy();
      });
  }

  private async reloadSlashCommands() {
    console.log(
      `Started refreshing ${this.commands.length} application (/) commands.`,
    );

    const promises = this.guildsToUpdate.map((guildToUpdate) => {
      return this.rest.put(
        Routes.applicationGuildCommands(this.clientId, guildToUpdate),
        {
          body: this.commands.map((command) => command.toJSON()),
        },
      );
    });

    await Promise.all(promises)
      .then(() =>
        console.log(`Successfully registered application (/) commands.`),
      )
      .catch(console.error);

    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      this.commandHandlers[interaction.commandName]?.(interaction);
    });
  }

  initEchoCommand() {
    this.subscribeSlash(
      new SlashCommandBuilder()
        .setName('echo')
        .setDescription('Echoes your text on a screen')
        .addStringOption(
          new SlashCommandStringOption()
            .setName('content')
            .setDescription('Content for an echo')
            .setRequired(true),
        ),
      async (interaction) => {
        const ch = interaction.channel;
        if (!ch || !ch.isTextBased()) {
          await interaction.reply({
            content: 'Oh nio! you need to be in a text channew.',
            ephemeral: true,
          });
          return;
        }

        const text = interaction.options.getString('content') ?? '';

        await ch.send(text);
        await interaction.reply({ content: 'Done', ephemeral: true });
      },
    );
  }

  getClient() {
    return this.client;
  }

  subscribe(
    cmd: string,
    callback: (msg: Discord.Message) => Promise<void>,
    usage?: string,
    info?: string,
  ) {
    console.debug('depreciated');
  }

  subscribeSlash(
    command: Pick<SlashCommandBuilder, 'name' | 'toJSON'>,
    handler: (
      interaction: Discord.ChatInputCommandInteraction<Discord.CacheType>,
    ) => Promise<void>,
  ) {
    this.commands.push(command);
    this.commandHandlers[command.name] = handler;
  }
}
