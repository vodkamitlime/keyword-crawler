import { Controller, Get, HttpStatus, Query, Res } from '@nestjs/common';
import { ScraperService } from './scraper.service';
import { Response } from 'express';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NaverViewResDTO } from 'src/common/dto/scraper-naver.dto';
@Controller('scraper')
export class ScraperController {
  constructor(private scraperService: ScraperService) {}

  @Get('/naver/view')
  @ApiTags('Scraper-naver')
  @ApiOkResponse({
    type: NaverViewResDTO,
  })
  @ApiOperation({
    summary: '네이버 View 영역 크롤러 모듈',
    description: '주어진 키워드로, 지난 1주일 간의 게시글 크롤링',
  })
  async crawlNaverView(
    @Res() res: Response,
    @Query('keyword') keyword: string,
  ): Promise<void> {
    const resCrawlNaverView = await this.scraperService.crawlNaverView(keyword);
    res.status(HttpStatus.OK).json(resCrawlNaverView);
  }

  // @Get('cafe')
  // async crawlNaverCafe() {
  //   await this.scraperService.crawlNaverCafeArticle();
  // }

  // @Get('blog')
  // async crawlNaverBlog() {
  //   await this.scraperService.crawlNaverBlog(
  //     'https://blog.naver.com/ek60044/222971891429',
  //   );
  // }
}
