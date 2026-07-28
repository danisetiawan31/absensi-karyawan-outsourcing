import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { RequestWithId } from '../middlewares/request-id.middleware';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();
    
    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INTERNAL_SERVER_ERROR';
    let message = 'Internal server error';
    let details = undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse() as any;
      
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        code = exceptionResponse.code || exceptionResponse.error || 'ERROR';
        message = exceptionResponse.message || exception.message;
        details = exceptionResponse.details;
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      // Log error asli untuk debugging server-side
      console.error('Unhandled Exception:', exception);
      // Jangan expose raw error ke client
      message = 'Terjadi kesalahan pada server';
    } else {
      console.error('Unknown Exception:', exception);
      message = 'Terjadi kesalahan pada server';
    }

    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: request.id,
        path: request.url,
      },
    });
  }
}
