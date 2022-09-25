import { Injectable } from '@nestjs/common';
import { Message } from 'discord.js';
import { DiscordService } from './discord/discord.service';

@Injectable()
export class AppService {
  constructor() {}
}
