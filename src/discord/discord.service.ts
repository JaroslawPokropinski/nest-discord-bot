import { Injectable, Scope } from '@nestjs/common';
import * as Discord from 'discord.js';
import { ActivityType, Client, GatewayIntentBits } from 'discord.js';

// const HOUR_IN_SEC = 60 * 60;

@Injectable({ scope: Scope.DEFAULT })
export class DiscordService {
  client: Client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildVoiceStates,
    ],
    presence: {
      activities: [
        {
          name: `commands on ${this.getPrefix()}`,
          type: ActivityType.Listening,
        },
      ],
    },
  });
  commands: Array<[string, string?, string?]> = [];
  constructor() {
    this.client.on('ready', () => console.log('I am ready!'));

    this.client.on('message', (msg) => {
      if (msg.author.bot) return;

      if (
        msg.content === `${this.getPrefix()}h` ||
        msg.content === `${this.getPrefix()}help`
      ) {
        const text = this.commands
          .map(
            (v) =>
              (v[1] ? `command: ${v[1]}` : `command: ${v[0]}`) +
              (v[2] ? ` info: ${v[2]}\n` : '\n'),
          )
          .reduce((prev, curr) => prev + curr);
        msg.channel.send(`\`\`\`${text}\`\`\``);
      }
    });

    this.client.on('error', (err) => {
      console.error(err);
    });

    this.client
      .login(process.env.DC_TOKEN)
      .then(async () => {
        if (this.client.user == null)
          throw new Error("Client's user cannot be null");
        console.log(`Logged in as ${this.client.user?.tag}!`);
        console.log(`Listening on prefix: ${this.getPrefix()}`);

        process.on('SIGINT', () => {
          console.log('Destroying client...');
          this.client.destroy();
          process.exit();
        });

        // const client = this.client as any;
        const slashGuilds: Array<string> = JSON.parse(process.env.GUILD_IDS);
        const data: Discord.ApplicationCommandData = {
          name: 'echo',
          description: 'Echoes your text on a screen',
          options: [
            {
              name: 'content',
              description: 'Content for an echo',
              required: true,
              type: 3,
            },
          ],
        };

        const leaveData: Discord.ApplicationCommandData = {
          name: 'leave',
          description: 'Leave voice channel',
        };
        // slashGuilds.forEach((gid) => {
        //   this.client.guilds.cache.get(gid)?.commands.create(data);
        //   this.client.guilds.cache.get(gid)?.commands.create(leaveData);
        // });

        this.client.on(
          'interaction',
          async (interaction: Discord.Interaction) => {
            if (!interaction.isCommand()) return;
            if (interaction.commandName === 'echo') {
              const ch = await interaction.channel;
              if (!ch.isTextBased()) return;

              const text = (interaction.options?.[0].value as string) ?? '';

              await ch.send(text);
              await interaction.reply({ content: 'Done', ephemeral: true });
            }

            // todo: fix
            // if (interaction.commandName === 'leave') {
            //   const ch = await interaction.channel;
            //   if (!ch.isTextBased()) return;

            //   (
            //     interaction.member as Discord.GuildMember
            //   )?.voice.channel. leave();
            //   await interaction.reply('Left', { ephemeral: true });
            // }
          },
        );
      })
      .catch((err) => {
        console.error('Got an error:', err);
        this.client.destroy();
      });
  }

  getClient(): Discord.Client {
    return this.client;
  }

  getPrefix(): string {
    return process.env.BOT_PREFIX;
  }

  subscribe(
    cmd: string,
    callback: (msg: Discord.Message) => Promise<void>,
    usage?: string,
    info?: string,
  ) {
    const regex = new RegExp(`\\${this.getPrefix()}${cmd}`);
    this.commands.push([cmd, usage, info]);

    this.client.on('message', (msg) => {
      if (msg.author.bot) return;

      if (regex.test(msg.content)) {
        callback(msg);
      }
    });
  }

  subscribeSlash(
    cmd: string,
    callback: (msg: Discord.Message) => Promise<void>,
    usage?: string,
    info?: string,
  ) {
    const regex = new RegExp(`\\${this.getPrefix()}${cmd}`);
    this.commands.push([cmd, usage, info]);

    this.client.on('message', (msg) => {
      if (msg.author.bot) return;

      if (regex.test(msg.content)) {
        callback(msg);
      }
    });
  }
}
