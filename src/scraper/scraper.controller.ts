import { Controller, Get } from '@nestjs/common';
import { ScraperService } from './scraper.service';

@Controller('scraper')
export class ScraperController {
  constructor(private scraperService: ScraperService) {}

  @Get()
  async crawlNaverView() {
    await this.scraperService.crawlNaverView();
  }

  @Get('cafe')
  async crawlNaverCafe() {
    await this.scraperService.crawlNaverCafeArticle();
  }

  // @Get('blog')
  // async crawlNaverBlog() {
  //   const res = await this.scraperService.crawlNaverBlog(
  //     'https://blog.naver.com/haeun_yah/222279700857',
  //   );
  //   console.log(res);
  // }
}
