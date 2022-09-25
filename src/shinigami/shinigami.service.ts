import { Injectable } from '@nestjs/common';
import { Message } from 'discord.js';
import fs from 'fs/promises';
import { DiscordService } from 'src/discord/discord.service';
import { BloomFilter, getIdentifier } from '../utils/bloomfilter';

@Injectable()
export class ShinigamiService {
  bloomFilters: Map<'transphobic' | 't-friendly', any> = new Map();

  constructor(private readonly discordService: DiscordService) {
    this.init();
  }

  async init() {
    try {
      await this.loadBloomFilter('transphobic');
      await this.loadBloomFilter('t-friendly');
    } catch {
      console.error('Failed to load transphobic data');
      return;
    }

    this.discordService.client.on('messageCreate', (msg: Message) => {
      if (msg.author.bot) return;

      const urlRegex = /https?:\/\/[^\s]+/g;
      const urls = urlRegex.exec(msg.content);

      urls?.forEach((url) => {
        if (this.bloomFilters.get('transphobic').test(getIdentifier(url))) {
          msg.reply(`The "${url}" is transphobic`);
          msg.react('❌');
        }

        if (this.bloomFilters.get('t-friendly').test(getIdentifier(url))) {
          msg.react('🏳️‍⚧️');
        }
      });
    });
  }

  async loadBloomFilter(name: 'transphobic' | 't-friendly') {
    const buffer = await fs.readFile('data/' + name + '.dat');

    const array = new Uint32Array(buffer.buffer);
    const b = new BloomFilter(array, 20);

    this.bloomFilters.set(name, b);
  }
}
