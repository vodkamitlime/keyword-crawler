import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ScraperController } from './scraper.controller';
import { ScraperService } from './scraper.service';

@Module({
  imports: [HttpModule],
  controllers: [ScraperController],
  providers: [ScraperService],
})
export class ScraperModule {}
