import { Module } from '@nestjs/common';
import { SuperadminAccessGuard } from '../../common/guards/superadmin-access.guard';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { SuperadminAccessController } from './superadmin-access.controller';
import { SuperadminAccessService } from './superadmin-access.service';

@Module({
  controllers: [AdminController, SuperadminAccessController],
  providers: [AdminService, SuperadminAccessService, SuperadminAccessGuard],
  exports: [SuperadminAccessService, SuperadminAccessGuard],
})
export class AdminModule {}
