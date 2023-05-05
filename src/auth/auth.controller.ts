import { Controller, Get, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@Controller("auth/_/")
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Get("google")
  @ApiOperation({ summary: "Endpoint to Call for Google Auth" })
  async googleAuth(@Req() req: Request, @Res() res: Response) {
    return this.authService.redirectToGoogleOauth(req, res);
  }

  @Get('google/callback')
  googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
    return this.authService.processGoogleCallback(req, res);
  }

  @Get("github")
  @ApiOperation({ summary: "Endpoint to Call for Github Auth" })
  async githubAuth(@Req() req: Request, @Res() res: Response) {
    return this.authService.redirectToGithubOauth(req, res);
  }

  @Get('github/callback')
  githubAuthRedirect(@Req() req: Request, @Res() res: Response) {
    return this.authService.processGithubCallback(req, res);
  }


}