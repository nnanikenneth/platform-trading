import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Get,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dtos/login.dto";
import { RegisterDto } from "./dtos/register.dto";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { FastifyRequest } from "fastify";
import { User } from "@prisma/client";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Route: POST /auth/register
   * Registers a new user with the provided details.
   * @param registerDto Data Transfer Object for registration details
   * @returns Success message with user data
   */
  @Post("register")
  async register(@Body() registerDto: RegisterDto) {
    const user = await this.authService.register(registerDto);
    return { message: "Registration successful", user };
  }

  /**
   * Route: POST /auth/login
   * Logs in a user and returns a JWT token.
   * @param loginDto Data Transfer Object for login credentials
   * @returns Success message with a JWT token
   */
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post("login")
  async login(@Body() loginDto: LoginDto) {
    const token = await this.authService.login(loginDto);
    return { message: "Login successful", token };
  }

  /**
   * Route: GET /auth/profile
   * Retrieves the profile of the authenticated user.
   * @param req Request object containing the authenticated user
   * @returns The user's profile data
   */
  @UseGuards(JwtAuthGuard)
  @Get("profile")
  getProfile(@Request() req: FastifyRequest & {user: User}) {
    return req.user;
  }
}
