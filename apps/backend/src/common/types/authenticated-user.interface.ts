import { UserRole } from '@prisma/client';

export interface AuthenticatedUser {
  id: string;
  tenantId: string | null;
  role: UserRole;
}
