import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiOperation } from '@nestjs/swagger';
import { UserService } from './user.service';

@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Get("auth/_/google")
  @ApiOperation({ summary: "Endpoint to Call for Google Auth" })
  async googleAuth(@Req() req: Request, @Res() res: Response) {
    return this.userService.redirectToGoogleOauth(req, res);
  }

  @Get("auth/_/github")
  @ApiOperation({ summary: "Endpoint to Call for Github Auth" })
  async githubAuth(@Req() req: Request, @Res() res: Response) {
    return this.userService.redirectToGithubOauth(req, res);
  }

  @Get('auth/_/google/callback')
  googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    return this.userService.processGoogleCallback(req, res);
  }

  @Get('auth/_/github/callback')
  githubAuthRedirect(@Req() req: Request, @Res() res: Response) {
    return this.userService.processGithubCallback(req, res);
  }
}