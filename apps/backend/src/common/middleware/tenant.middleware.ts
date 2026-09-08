import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

export interface TenantRequest extends Request {
  tenantId?: string | null;
}

/**
 * Autentifikatsiyadan oldingi (guest, login/register) so'rovlar uchun
 * tenant kontekstini `x-tenant-id` headeridan chiqarib oladi. Login qilingan
 * so'rovlarda esa AuthController orqali JWT payload'dagi tenantId ustunlik qiladi.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: TenantRequest, res: Response, next: NextFunction) {
    req.tenantId = req.header('x-tenant-id') ?? null;
    next();
  }
}
