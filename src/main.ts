import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ScraperModule } from './scraper/scraper.module';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const swaggerOptions = new DocumentBuilder()
    .setTitle(`CatchUp-${process.env.ENVIRONMENT}`)
    .setDescription('APIs for keyword CatchUp crawler module')
    .setVersion(`v${process.env.npm_package_version}`)
    .build();
  const catchUpSwagger = SwaggerModule.createDocument(app, swaggerOptions, {
    include: [ScraperModule],
  });
  SwaggerModule.setup('spec', app, catchUpSwagger);
  await app.listen(process.env.PORT);
}
bootstrap();
