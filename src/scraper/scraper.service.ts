import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import * as playwright from 'playwright';
import { lastValueFrom } from 'rxjs';
import * as cheerio from 'cheerio';
import { publisherType } from 'src/common/enum/local.enum';
import * as dayjs from 'dayjs';
import * as fs from 'fs';

import * as utc from 'dayjs/plugin/utc';
import * as timezone from 'dayjs/plugin/timezone';
import { NaverViewDTO } from 'src/common/dto/scraper-naver.dto';
dayjs.extend(utc);
dayjs.extend(timezone);

@Injectable()
export class ScraperService {
  constructor(private readonly httpService: HttpService) {}

  async crawlNaverView(keyword: string, startDate: string, endDate: string) {
    const encodedKeyword = encodeURIComponent(keyword);
    const URL = `https://search.naver.com/search.naver?where=view&query=${encodedKeyword}&sm=tab_opt&nso=so%3Ar%2Cp%3Afrom${startDate}to${endDate}%2Ca%3Aall`;
    const browser = await playwright.chromium.launch();
    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0',
    });
    await page.goto(URL);
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, 1000));
      await this.sleep(0.5);
    }

    const urls = await page.$$eval('.total_area', async (nodes) => {
      const data = [];
      nodes.forEach((el) => {
        data.push(el.children[1].getAttribute('href'));
      });
      return data;
    });

    const result = await Promise.all(
      urls.map(async (url) => {
        if (this.isBlog(url)) {
          const blogData = await this.crawlNaverBlog(url);
          const hasKeyword =
            blogData?.content.includes(keyword) ||
            blogData?.title.includes(keyword);
          if (hasKeyword) {
            return {
              title: blogData.title,
              content: blogData.content,
              totalViews: null,
              totalComments: blogData.totalComments,
              publisherType: publisherType.NAVER_BLOG,
              publisherName: blogData.publisherName,
              publishedAt: this.parseDate(blogData.publishedAt),
              crawledAt: dayjs().tz('Asia/Seoul').format(),
              parsedData: {
                originalUrl: url,
                parsedUrl: blogData.parsedUrl,
                postId: blogData.postId,
              },
              negativeTotal: blogData.negativeTotal,
              negativeString: blogData.negativeString,
            };
          }
        } else if (this.isCafe(url)) {
          const cafeData = await this.crawlNaverCafeArticle(url);
          const hasKeyword =
            cafeData?.content.includes(keyword) ||
            cafeData?.title.includes(keyword);
          if (hasKeyword) {
            const r = {
              title: cafeData.title,
              content: cafeData.content,
              totalViews: cafeData.totalViews,
              totalComments: cafeData.totalComments,
              publisherType: publisherType.NAVER_CAFE,
              publisherName: cafeData.publisherName,
              publishedAt: this.parseDate(cafeData.publishedAt),
              crawledAt: dayjs().tz('Asia/Seoul').format(),
              parsedData: {
                originalUrl: url,
                parsedUrl: cafeData.parsedUrl,
                postId: cafeData.postId,
              },
              negativeTotal: cafeData.negativeTotal,
              negativeString: cafeData.negativeString,
            };
            return r;
          }
        }
      }),
    );
    // fs.writeFile('result.json', JSON.stringify(result), 'utf8', (e) => {
    //   console.log(e);
    // });
    await browser.close();
    return result
      .filter((e) => e)
      .map((e) => new NaverViewDTO(e))
      .sort((a, b) => dayjs(a.발행일).unix() - dayjs(b.발행일).unix());
  }

  /**
   *
   * @param url https://cafe.naver.com/clubrav4/89357?art=ZXh0ZXJuYWwtc2VydmljZS1uYXZlci1zZWFyY2gtY2FmZS1wcg.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJjYWZlVHlwZSI6IkNBRkVfVVJMIiwiY2FmZVVybCI6ImNsdWJyYXY0IiwiYXJ0aWNsZUlkIjo4OTM1NywiaXNzdWVkQXQiOjE2NzE3MTY0MDcxMjl9.f5lXdmN4pWF52cX4yteoOLv7Wa5B82tOH6Jdxj-XaI0
   *
   */
  async crawlNaverCafeArticle(url: string): Promise<{
    title: string;
    totalViews: number;
    totalComments: number;
    publisherName: string;
    publishedAt: string;
    content: string;
    parsedUrl: string;
    postId: string;
    negativeTotal: number;
    negativeString: string;
  }> {
    try {
      const [urlParams, token] = url.split('?');
      const parsedToken = token.split('=')[1];

      const params = urlParams.split('/');
      const cafeName = params[params.length - 2];
      const postId = params[params.length - 1];
      const parsedUrl = `https://apis.naver.com/cafe-web/cafe-articleapi/v2/cafes/${cafeName}/articles/${postId}?query=&art=${parsedToken}&useCafeId=false&requestFrom=A`;

      const html = await lastValueFrom(this.httpService.get(parsedUrl));
      const response = html.data;
      const $ = cheerio.load(response.result.article.contentHtml);

      const articleId = response.result.article.id;
      const title = response.result.article.subject;
      const totalViews = response.result.article.readCount;
      const totalComments = response.result.article.commentCount;
      const publisherName = response.result.cafe.pcCafeName;
      const publishedAt = dayjs(response.result.article.writeDate)
        .tz('Asia/Seoul')
        .format();
      const content = $('.se-main-container')
        .text()
        .replaceAll('\n', ' ')
        .split('    ')
        .join('')
        .trim();
      const [negativeTotal, negativeString] = this.negativeWordsScale(content);
      return {
        title,
        totalViews,
        totalComments,
        publisherName,
        publishedAt,
        content,
        parsedUrl,
        postId: articleId,
        negativeTotal,
        negativeString,
      };
    } catch (e) {
      console.log(e);
    }
  }

  /**
   * @param url https://blog.naver.com/blogId/logNo
   */
  async crawlNaverBlog(url: string): Promise<{
    title: string;
    totalComments: number;
    publisherName: string;
    publishedAt: string;
    content: string;
    parsedUrl: string;
    postId: string;
    negativeTotal: number;
    negativeString: string;
  }> {
    try {
      const urlParams = url.split('/');
      const blogId = urlParams[urlParams.length - 2];
      const logNo = urlParams[urlParams.length - 1];
      const parsedUrl = `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}&redirect=Dlog&widgetTypeCall=true&directAccess=false`;
      const html = await lastValueFrom(this.httpService.get(parsedUrl));
      const $ = cheerio.load(html.data);

      const totalComments = Number($('._commentCount').text());
      const title = $('.pcol1').text().trim();
      const publisherName = $('.user_blog_name').text().trim();
      const publishedAt = $('.se_publishDate').text().trim();
      const content = $('.se-main-container')
        .text()
        .replaceAll('\n', ' ')
        .split('    ')
        .join('')
        .trim();
      const [negativeTotal, negativeString] = this.negativeWordsScale(content);
      return {
        title,
        totalComments,
        publisherName,
        publishedAt,
        content,
        parsedUrl,
        postId: blogId,
        negativeTotal,
        negativeString,
      };
    } catch (e) {
      console.log(e);
    }
  }

  private isBlog(url: string): boolean {
    return url.includes('blog.naver.com');
  }

  private isCafe(url: string): boolean {
    return url.includes('cafe.naver.com');
  }

  private sleep(sec) {
    return new Promise((resolve) => setTimeout(resolve, sec * 1000));
  }

  private negativeWordsScale(content: string): [number, string] {
    if (!content) return [0, ''];

    // 23.01.07 updated
    // 상 = 1, 중 = 2, 하 = 3
    const dict = {
      별로: 0,
      비추: 0,
      최악: 0,
      불만: 0,
      불만족: 0,
      단점: 0,
      믿거: 0,
      양아치: 0,
    };

    for (const key of Object.keys(dict)) {
      dict[key] = Array.from(content.matchAll(new RegExp(key, 'g'))).length;
    }

    const total = Object.values(dict).reduce((acc, cur) => acc + cur, 0);
    const result = Object.keys(dict)
      .filter((e) => dict[e])
      .sort((a, b) => dict[b] - dict[a])
      .map((e) => `${e} (${dict[e]})`)
      .join(', ');

    return [total, result];
  }

  parseDate(date: string): string {
    return date.includes('시간')
      ? dayjs()
          .subtract(Number(date.split(' ')[0]), 'minutes')
          .format('YYYY-MM-DD HH:mm')
      : dayjs(date).format('YYYY-MM-DD HH:mm');
  }
}
