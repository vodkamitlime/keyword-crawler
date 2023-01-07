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

  async crawlNaverView(keyword: string) {
    const encodedKeyword = encodeURIComponent(keyword);
    const URL = `https://search.naver.com/search.naver?where=view&query=${encodedKeyword}&sm=tab_opt&nso=so%3Ar%2Cp%3A1w%2Ca%3Aall`;
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
            blogData.content.includes(keyword) ||
            blogData.title.includes(keyword);
          if (hasKeyword) {
            return {
              title: blogData.title,
              content: blogData.content,
              totalViews: null,
              totalComments: blogData.totalComments,
              totallikes: blogData.totalLikes,
              publisherType: publisherType.NAVER_BLOG,
              publisherName: blogData.publisherName,
              publishedAt: blogData.publishedAt,
              crawledAt: dayjs().tz('Asia/Seoul').format(),
              parsedData: {
                originalUrl: url,
                parsedUrl: blogData.parsedUrl,
                postId: blogData.postId,
              },
            };
          }
        } else if (this.isCafe(url)) {
          const cafeData = await this.crawlNaverCafeArticle(url);
          const hasKeyword =
            cafeData.content.includes(keyword) ||
            cafeData.title.includes(keyword);
          if (hasKeyword) {
            return {
              title: cafeData.title,
              content: cafeData.content,
              totalViews: cafeData.totalViews,
              totalComments: cafeData.totalComments,
              publisherType: publisherType.NAVER_CAFE,
              publisherName: cafeData.publisherName,
              publishedAt: cafeData.publishedAt,
              crawledAt: dayjs().tz('Asia/Seoul').format(),
              parsedData: {
                originalUrl: url,
                parsedUrl: cafeData.parsedUrl,
                postId: cafeData.postId,
              },
            };
          }
        }
      }),
    );

    // fs.writeFile('result.json', JSON.stringify(result), 'utf8', (e) => {
    //   console.log(e);
    // });
    await browser.close();
    return result.map((e) => new NaverViewDTO(e));
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
  }> {
    try {
      const [urlParams, token] = url.split('?');
      const parsedToken = token.split('=')[1];

      const params = urlParams.split('/');
      const cafeName = params[params.length - 2];
      const postId = params[params.length - 1];
      const parsedUrl = `https://apis.naver.com/cafe-web/cafe-articleapi/v2/cafes/${cafeName}/articles/${postId}?query=&art=${parsedToken}&useCafeId=false&requestFrom=A`;
      // const parsedUrl =
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
      return {
        title,
        totalViews,
        totalComments,
        publisherName,
        publishedAt,
        content,
        parsedUrl,
        postId: articleId,
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
    totalLikes: number;
    totalComments: number;
    publisherName: string;
    publishedAt: string;
    content: string;
    parsedUrl: string;
    postId: string;
  }> {
    try {
      const urlParams = url.split('/');
      const blogId = urlParams[urlParams.length - 2];
      const logNo = urlParams[urlParams.length - 1];
      const parsedUrl = `https://blog.naver.com/PostView.naver?blogId=${blogId}&logNo=${logNo}&redirect=Dlog&widgetTypeCall=true&directAccess=false`;
      const html = await lastValueFrom(this.httpService.get(parsedUrl));
      const $ = cheerio.load(html.data);

      const totalLikes = $('.btn_sympathy').text();
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
      console.log(title, totalLikes, totalComments);
      return {
        title,
        totalLikes: 0,
        totalComments,
        publisherName,
        publishedAt,
        content,
        parsedUrl,
        postId: blogId,
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
}
