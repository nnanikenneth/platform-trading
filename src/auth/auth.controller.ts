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
import { Role, User } from "@prisma/client";
import { Roles } from "@src/common/decorators/roles.decorator";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Route: POST /auth/register
   * Registers a new user with the provided details.
   * Assumption: During registration, users can select their role (either Buyer or Seller).
   * This route is open to both buyers and sellers as the entry point into the system. 
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
   * Both buyers and sellers are allowed to access this route.
   * @returns The user's profile data
   */
  @Get("profile")
  @UseGuards(JwtAuthGuard)
  @Roles(Role.BUYER, Role.SELLER)
  getProfile(@Request() req: FastifyRequest & {user: User}) {
    return req.user;
  }
}
