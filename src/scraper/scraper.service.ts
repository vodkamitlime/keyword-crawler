import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import * as playwright from 'playwright';
import { lastValueFrom } from 'rxjs';
import * as wait from 'waait';
import * as cheerio from 'cheerio';
import { publisherType } from 'src/common/enum/local.enum';
import dayjs from 'dayjs';
import nodeTest from 'node:test';

@Injectable()
export class ScraperService {
  constructor(private readonly httpService: HttpService) {}

  async crawlNaverView() {
    const URL =
      'https://search.naver.com/search.naver?where=view&query=%EC%B9%B4%EB%8B%A5&sm=tab_opt&nso=so%3Ar%2Cp%3A1w%2Ca%3Aall';
    const browser = await playwright.chromium.launch();
    const page = await browser.newPage({
      userAgent: 'Mozilla/5.0',
    });
    await page.goto(URL);
    // for (let i = 0; i < 10; i++) {
    //   await page.evaluate(() => window.scrollBy(0, 1000));
    //   await wait.default(500);
    // }

    const posts = await page.$$eval('.total_area', (nodes) => {
      const data = [];
      console.log(nodes.length);
      nodes.forEach((el) => {
        const url = el.children[1].getAttribute('href');
        console.log(url);
        // if (this.isBlog(url)) {
        //   const blogData = await this.crawlNaverBlog(url);
        //   data.push({
        //     title: blogData.title,
        //     content: blogData.content,
        //     totalViews: null,
        //     publisherType: publisherType.NAVER_BLOG,
        //     publisherName: blogData.publisherName,
        //     publishedAt: blogData.publishedAt,
        //     crawledAt: dayjs().format(),
        //     parsedData: {
        //       originalUrl: url,
        //       parsedUrl: blogData.parsedUrl,
        //       postId: blogData.postId,
        //     },
        //   });
        // } else if (this.isCafe(url)) {
        //   data.push({
        //     // title: blogData.title,
        //     // content: blogData.content,
        //     // totalViews: null,
        //     // publisherType: publisherType.NAVER_BLOG,
        //     // publisherName: blogData.publisherName,
        //     // publishedAt: blogData.publishedAt,
        //     // crawledAt: dayjs().format(),
        //     parsedData: {
        //       originalUrl: url,
        //       // parsedUrl: blogData.parsedUrl,
        //       // postId: blogData.postId,
        //     },
        //   });
        // }
      });
      return data;
    });
    // console.log(posts);
    console.log('END');
    await browser.close();
  }

  async crawlNaverCafeArticle() {
    try {
    } catch (e) {
      console.log(e);
    }
  }

  /**
   * @param url https://blog.naver.com/blogId/logNo
   */
  async crawlNaverBlog(url: string): Promise<{
    title: string;
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

      const title = $('.pcol1').text().trim();
      const publisherName = $('.user_blog_name').text().trim();
      const publishedAt = $('.se_publishDate').text().trim();
      const content = $('.se-main-container')
        .text()
        .replaceAll('\n', ' ')
        .split('    ')
        .join('')
        .trim();

      return {
        title,
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
}
