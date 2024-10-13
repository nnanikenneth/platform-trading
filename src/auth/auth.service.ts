import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { RegisterDto } from "./dtos/register.dto";
import { LoginDto } from "./dtos/login.dto";
import * as bcrypt from "bcryptjs";
import { UsersService } from "@src/users/users.service";
import { PrismaService } from "@src/database/prisma.service";
import { User, Role } from "@prisma/client";

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Registers a new user, hashes their password, and generates a JWT token.
   * If the user is a seller, additional seller data is created.
   * @returns Newly created user data and JWT token
   */
  async register(registerDto: RegisterDto) {
    const { email, name, password, role, publicAccess } = registerDto;

    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new BadRequestException("User with this email already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.usersService.create({
      email,
      name,
      password: hashedPassword,
      role,
    });

    if (role === Role.SELLER) {
      await this.prisma.seller.create({
        data: {
          userId: user.id,
          apiKey: this.generateApiKey(),
          publicAccess: publicAccess ?? false,
        },
      });
    } else if (role === Role.BUYER) {
      await this.prisma.buyer.create({
        data: {
          userId: user.id,
          webhookUrl: null,
          secretKey: null,
        },
      });
    }

    const token = this.generateJwtToken(user);

    return { user, token };
  }

  /**
   * Authenticates a user by validating their credentials and generating a JWT token.
   * @returns User data and JWT token
   */
  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const token = this.generateJwtToken(user);
    return { user, token };
  }

  /**
   * Generates a JWT token for the user with their ID and role.
   * @returns A signed JWT token
   */
  private generateJwtToken(user: User): string {
    const payload = { sub: user.id, role: user.role };
    return this.jwtService.sign(payload);
  }

  /**
   * Validates a user based on the provided JWT payload.
   * Throws an exception if the user is not found.
   * @returns The corresponding user entity
   */
  async validateUser(payload: any): Promise<User> {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException("User not found or invalid token");
    }
    return user;
  }

  /**
   * Decodes a JWT token and returns the corresponding user.
   * @returns The user associated with the decoded token
   */
  async decodeToken(token: string): Promise<User> {
    try {
      const decoded = this.jwtService.verify(token);
      const userId = decoded.sub;

      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new UnauthorizedException(
          "User not found for the provided token"
        );
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }

  /**
   * Generates a random API key for sellers.
   * @returns A randomly generated API key string
   */
  private generateApiKey(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}
