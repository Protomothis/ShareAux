import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../types/index.js';
import { AdminService } from './admin.service.js';
import { CreateReportDto } from './dto/create-report.dto.js';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  @ApiOperation({ summary: '신고 접수' })
  createReport(@Body() dto: CreateReportDto, @Req() req: AuthenticatedRequest) {
    return this.adminService.createReport(req.user.userId, dto.targetType, dto.targetId, dto.reason, dto.details);
  }
}
