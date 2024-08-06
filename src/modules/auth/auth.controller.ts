import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CreateLocalUserDto, LoginLocalUserDto, SendOtpDto, VerifyOtpDto } from './dto';

@Controller('auth/_/')
export class AuthController {
   constructor(private readonly authService: AuthService) { }

   @Get('google')
   @ApiOperation({ summary: 'Endpoint to Call for Google Auth' })
   async googleAuth(@Req() req: Request, @Res() res: Response) {
      return this.authService.redirectToGoogleOauth(req, res);
   }

   @Get('google/callback')
   googleAuthRedirect(@Req() req: Request, @Res() res: Response) {
      return this.authService.processGoogleCallback(req, res);
   }

   @Get('github')
   @ApiOperation({ summary: 'Endpoint to Call for Github Auth' })
   async githubAuth(@Req() req: Request, @Res() res: Response) {
      return this.authService.redirectToGithubOauth(req, res);
   }

   @Get('github/callback')
   @ApiOperation({ summary: 'Endpoint to Github Callback' })
   githubAuthRedirect(@Req() req: Request, @Res() res: Response) {
      return this.authService.processGithubCallback(req, res);
   }

   @Get('connection_token')
   @ApiOperation({ summary: 'Generate Connection Token from authorization token' })
   getEternalToken(@Req() req: any) {
      return this.authService.getEternalToken(req);
   }

   @Get('refresh_connection_token')
   @ApiOperation({ summary: 'Refresh Connection Token from authorization token' })
   refreshEternalToken(@Req() req: string) {
      return this.authService.refreshEternalToken(req);
   }

   @Get('auth_check/:token')
   @ApiOperation({ summary: 'Check if a token is valid' })
   authCheck(@Param('token') token: string) {
      return this.authService.authCheck({ token })
   }

   @Post('register')
   register(@Body() createlocalUserDto: CreateLocalUserDto) {
      return this.authService.registerWithDirectEmail(createlocalUserDto)
   }

   @Post('login')
   login(@Body() loginlocalUserDto: LoginLocalUserDto) {
      return this.authService.loginWithDirect(loginlocalUserDto)
   }

   @Post('login/otp')
   @ApiOperation({ summary: 'Endpoint to send OTP' })
   @HttpCode(HttpStatus.OK)
   sendOtp(
      @Body() body: SendOtpDto ,
   ) {
      return this.authService.loginWithOtp(body);
   }

   @Post('login/verify-otp')
   @ApiOperation({ summary: 'Endpoint to verify OTP' })
   @HttpCode(HttpStatus.OK)
   verifyOtp(
      @Body() body: VerifyOtpDto ,
   ) {
      return this.authService.verifyOtp(body);
   }
}
