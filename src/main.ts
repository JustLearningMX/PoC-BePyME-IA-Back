import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const allowedOrigins = [
    'http://127.0.0.1:5500',
    'http://localhost:5500',
    'http://localhost:4200',
    "https://poc-bepyme-ia-f28d9a.gitlab.io",
  ];
  const frontendOrigin = configService.get<string>('FRONTEND_ORIGIN');

  if (frontendOrigin) {
    allowedOrigins.push(frontendOrigin);
  }

  app.setGlobalPrefix('api/v1', {
    exclude: [{ path: 'stream-answers', method: RequestMethod.ALL }],
  });
  app.enableCors({ origin: allowedOrigins, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = Number(configService.get<string>('PORT') ?? 3001);
  await app.listen(port);
  // Keep an explicit startup message for local development and ops visibility.
  console.log(`Backend escuchando en http://localhost:${port}`);
}

void bootstrap();
