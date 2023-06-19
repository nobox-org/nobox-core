import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { GateWayService } from './gateway.service';

@ApiBearerAuth()
@Controller("gateway/*")
export class GatewayController {
  constructor(private readonly gatewayService: GateWayService) { }

  @Get("projects")
  getProjects() {
    return this.gatewayService.getProjects();
  }

}
