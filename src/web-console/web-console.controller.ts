import {
  Controller,
  Post,
  BadRequestException,
  Body,
  Get,
  Req,
  Res,
  InternalServerErrorException,
} from '@nestjs/common';
import { DiscordService } from 'src/discord/discord.service';
import * as request from 'request';
import { Client, TextChannel } from 'discord.js';

type Command = {
  text?: string;
  args?: string[];
};

@Controller('console')
export class WebConsoleController {
  client: Client;
  constructor(private readonly discordService: DiscordService) {
    this.client = discordService.getClient();
  }

  @Post('/command')
  postCommand(@Body() cmd: Command): string | void {
    if (cmd == null || cmd.text == null || cmd.args == null)
      throw new BadRequestException('Command must contain text!');
    const { text: command, args } = cmd;

    switch (command) {
      case 'send': {
        if (!args[0] || !args[1])
          throw new BadRequestException(`Unknown command params!`);

        const channelName = args[0];
        const msg = args[1];

        const channel = this.client.guilds.cache.flatMap((guild) =>
          guild.channels.cache.filter(
            (channel) => channel.name === channelName,
          ),
        )[0];

        if (channel == null)
          throw new BadRequestException(`Channel not found!`);
        if (channel.type !== 'text')
          throw new BadRequestException(`Channel is not a text channel!`);

        const textChannel = channel as TextChannel;
        textChannel.send(msg);

        return;
      }
      case 'list': {
        if (args[0] && args[0] === 'channels') {
          const channels = [...this.client.guilds.cache].flatMap(([_, guild]) =>
            guild.channels.cache.map((channel) => channel.name),
          );
          return `[${[...channels].join(', ')}]`;
        }
        throw new BadRequestException(`Unknown command params!`);
      }
      default:
        throw new BadRequestException(`Unknown command ${cmd.text}!`);
    }
  }

  @Get('/login')
  login(@Req() req, @Res() res): void {
    const oauthUrl = `https://discordapp.com/api/oauth2/authorize?client_id=436936230660210689&redirect_uri=${process.env.DC_REDIRECT}&response_type=code&scope=identify%20guilds`;
    if (req.query.code) {
      res.redirect(`${process.env.FRONTEND_URL}?code=${req.query.code}`);
    } else {
      res.redirect(oauthUrl);
    }
  }

  @Get('/accessToken')
  getAccessTokengrant(@Req() req, @Res() res): void {
    if (!req.query.code) throw new BadRequestException('Code is not set!');

    const code = req.query.code;
    const data = {
      // eslint-disable-next-line @typescript-eslint/camelcase
      client_id: '436936230660210689',
      // eslint-disable-next-line @typescript-eslint/camelcase
      client_secret: process.env.DC_SECRET,
      // eslint-disable-next-line @typescript-eslint/camelcase
      grant_type: 'authorization_code',
      code: code,
      // eslint-disable-next-line @typescript-eslint/camelcase
      redirect_uri: process.env.DC_REDIRECT,
      scope: 'identify%20guilds',
    };
    const dataEncoded = [];
    for (const k in data) {
      dataEncoded.push(`${k}=${data[k]}`);
    }

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    request.post(
      {
        url: 'https://discord.com/api/v6/oauth2/token',
        form: dataEncoded.join('&'),
        headers: headers,
      },
      function (err, httpResponse, body) {
        if (err) throw new InternalServerErrorException(err);

        res.send(JSON.parse(body));
      },
    );
  }
}
