import { Injectable } from '@nestjs/common';
import { Message } from 'discord.js';
import { DiscordService } from './discord/discord.service';

@Injectable()
export class AppService {
  constructor(discordService: DiscordService) {
    const client = discordService.getClient();

    client.on('message', (msg: Message) => {
      if (msg.content === 'ping') {
        msg.reply('pong');
      }

      const animeRegex = /.*anime.*/gi;
      const noAnimeRegex = /.*no( |_)anime.*/gi;
      if (!msg.author.bot && animeRegex.exec(msg.content)) {
        if (noAnimeRegex.exec(msg.content)) {
          msg.channel.send('<:mero_anime:709888187232682067>');
        } else {
          msg.channel.send('<:sayori:654759470534098964>');
        }
      }
      const redactedRegex = /scp-173/gi;
      if (!msg.author.bot && msg.content.match(/^.*scp-173.*$/gi)) {
        msg
          .delete()
          .then((msg) => {
            const newMsg =
              `Redacted message of ${msg.author}:\n` +
              `\`\`\`${msg.content.replace(redactedRegex, '[REDACTED]')}\`\`\``;
            msg.channel.send(newMsg);
          })
          .catch(console.error);
      }
      const animememesRegex = /.*\/r\/animememes.*/gi;
      if (animememesRegex.exec(msg.content)) {
        msg.channel.send('Fucking weeb');
      }
    });
  }
}
