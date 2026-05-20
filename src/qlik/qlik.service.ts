import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { AssistantQueryDto } from './dto/assistant-query.dto';
import { CreateQlikDto } from './dto/create-qlik.dto';
import { StreamQueryDto } from './dto/stream-query.dto';
import { QlikResponse } from './entities/qlik-response.entity';

@Injectable()
export class QlikService {
  private readonly logger = new Logger(QlikService.name);

  constructor(private readonly configService: ConfigService) {}

  health(): QlikResponse {
    return {
      ok: true,
      mensaje: 'El servidor backend está funcionando correctamente.',
    };
  }

  debugEnv(): QlikResponse {
    return {
      QLIK_HOST: this.qlikHost,
      QLIK_ASSISTANT_ID: this.qlikAssistantId ?? null,
      QLIK_OAUTH_REDIRECT_URI: this.qlikOauthRedirectUri ?? null,
      API_KEY_CONFIGURADA: Boolean(this.qlikToken),
    };
  }

  async createThread(createQlikDto: CreateQlikDto): Promise<QlikResponse> {
    const token = this.getQlikToken();
    const assistantId = createQlikDto.assistantId ?? this.qlikAssistantId;
    const question = createQlikDto.question ?? 'Pregunta inicial';
    const url = `${this.normalizedQlikHost}/api/v1/cloud-assistants/threads`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Accept-Language': 'es',
      },
      body: JSON.stringify({
        name: `Assistant for ${question}`,
        context: this.buildAssistantContext(assistantId),
        messages: [],
      }),
    });

    const data = await this.readJson(response);

    if (!response.ok) {
      throw new HttpException(
        { error: 'Error al crear el thread en Qlik', details: data },
        response.status,
      );
    }

    return data;
  }

  async streamAnswers(
    input: Partial<StreamQueryDto>,
    response: Response,
  ): Promise<void> {
    const question = this.ensureString(input.question);
    const threadId = this.ensureString(input.threadId);
    const assistantId = this.ensureString(input.assistantId) ?? this.qlikAssistantId;

    if (!question || !threadId) {
      throw new BadRequestException({
        error: "Se requiere 'question' y 'threadId'",
      });
    }

    const token = this.getQlikToken();
    const streamResponse = await fetch(
      `${this.normalizedQlikHost}/api/v1/cloud-assistants/${threadId}/actions/stream`,
      {
        method: 'POST',
        headers: {
          Accept: 'text/event-stream',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'Accept-Language': 'es',
        },
        body: JSON.stringify({
          context: this.buildAssistantContext(assistantId),
          content: [{ text: question.trim() }],
        }),
      },
    );

    response.writeHead(HttpStatus.OK, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });

    if (!streamResponse.ok) {
      const details = await this.readTextOrJson(streamResponse);
      this.logger.error('Qlik stream failed', JSON.stringify(details));
      response.write(
        `data: ${JSON.stringify({
          kind: 'error',
          error: 'El stream de Qlik falló',
          details,
        })}\n\n`,
      );
      response.write(`data: ${JSON.stringify({ kind: 'done' })}\n\n`);
      response.end();
      return;
    }

    if (!streamResponse.body) {
      response.write(
        `data: ${JSON.stringify({
          kind: 'error',
          error: 'El stream de Qlik no devolvió cuerpo de respuesta',
        })}\n\n`,
      );
      response.end();
      return;
    }

    const reader = streamResponse.body.getReader();

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        response.write(Buffer.from(value));
      }
    } finally {
      reader.releaseLock();
      response.end();
    }
  }

  async getAssistant(query: AssistantQueryDto): Promise<QlikResponse> {
    const token = this.getQlikToken();
    const assistantId = query.assistantId ?? this.qlikAssistantId;

    if (!assistantId) {
      throw new BadRequestException({ error: 'Se requiere assistantId' });
    }

    const response = await fetch(
      `${this.normalizedQlikHost}/api/v1/assistants/${assistantId}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Accept-Language': 'es',
        },
      },
    );

    const data = await this.readJson(response);

    if (!response.ok) {
      throw new HttpException(
        { error: 'Error al obtener el asistente de Qlik', details: data },
        response.status,
      );
    }

    return data;
  }

  async getCurrentUser(authorization?: string): Promise<QlikResponse> {
    const token = this.getAuthorizationToken(authorization);
    const response = await fetch(`${this.normalizedQlikHost}/api/v1/users/me`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await this.readJson(response);

    if (!response.ok) {
      throw new HttpException(
        { error: 'Error al obtener usuario actual', details: data },
        response.status,
      );
    }

    return data;
  }

  async getUserById(id: string, authorization?: string): Promise<QlikResponse> {
    const token = this.getAuthorizationToken(authorization);
    const response = await fetch(`${this.normalizedQlikHost}/api/v1/users/${id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    const data = await this.readJson(response);

    if (!response.ok) {
      throw new HttpException(
        { error: 'Error al obtener detalles del usuario', details: data },
        response.status,
      );
    }

    return data;
  }

  private get qlikHost(): string {
    const host = this.configService.get<string>('QLIK_HOST');

    if (!host) {
      throw new InternalServerErrorException({
        error: 'Falta configurar QLIK_HOST en el archivo .env',
      });
    }

    return host;
  }

  private get normalizedQlikHost(): string {
    return this.qlikHost.replace(/\/$/, '');
  }

  private get qlikToken(): string | undefined {
    return this.configService.get<string>('QLIK_TOKEN');
  }

  private get qlikAssistantId(): string | undefined {
    return this.configService.get<string>('QLIK_ASSISTANT_ID');
  }

  private get qlikOauthRedirectUri(): string | undefined {
    return this.configService.get<string>('QLIK_OAUTH_REDIRECT_URI');
  }

  private getQlikToken(): string {
    if (!this.qlikToken) {
      throw new InternalServerErrorException({
        error: 'Falta configurar QLIK_TOKEN (ApiKey) en el archivo .env',
      });
    }

    return this.qlikToken;
  }

  private getAuthorizationToken(authorization?: string): string {
    const token = authorization?.replace(/^Bearer\s+/i, '').trim();

    if (!token) {
      throw new UnauthorizedException({
        error: 'Falta enviar token de usuario en Authorization',
      });
    }

    return token;
  }

  private buildAssistantContext(assistantId?: string): QlikResponse {
    return {
      type: 'assistant',
      id: assistantId,
      data: {
        embedded: true,
        route: 'assistants',
      },
    };
  }

  private ensureString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  private async readJson(response: globalThis.Response): Promise<QlikResponse> {
    try {
      const data: unknown = await response.json();
      return this.toQlikResponse(data);
    } catch (error: unknown) {
      this.logger.error('Failed to parse Qlik JSON response', error);
      throw new InternalServerErrorException({
        error: 'La respuesta de Qlik no es JSON válido',
      });
    }
  }

  private async readTextOrJson(response: globalThis.Response): Promise<unknown> {
    const text = await response.text();

    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }

  private toQlikResponse(data: unknown): QlikResponse {
    if (data && typeof data === 'object' && !Array.isArray(data)) {
      return data as QlikResponse;
    }

    return { data };
  }
}
