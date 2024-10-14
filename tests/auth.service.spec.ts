import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../src/auth/auth.service';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '@src/users/users.service';
import { PrismaService } from '@src/database/prisma.service';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { mockUser, mockSeller, mockBuyer } from './fixtures/auth-service-mock-data';
import { DeepMockProxy } from 'jest-mock-extended';

describe('AuthService', () => {
  let authService: AuthService;
  let usersServiceMock: jest.Mocked<UsersService>;
  let jwtServiceMock: jest.Mocked<JwtService>;
  let prismaMock: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    usersServiceMock = {
      findByEmail: jest.fn(),
      create: jest.fn(),
      findById: jest.fn(),
    } as any;

    jwtServiceMock = {
      sign: jest.fn(),
      verify: jest.fn(),
    } as any;

    prismaMock = {
      seller: { create: jest.fn() },
      buyer: { create: jest.fn() },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersServiceMock },
        { provide: JwtService, useValue: jwtServiceMock },
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new seller and return a JWT token', async () => {
      usersServiceMock.findByEmail.mockResolvedValue(null);
      usersServiceMock.create.mockResolvedValue(mockUser);
      prismaMock.seller.create.mockResolvedValue(mockSeller);
      jwtServiceMock.sign.mockReturnValue('mockToken');

      const result = await authService.register({
        email: 'test@example.com',
        name: 'Test User',
        password: 'password',
        role: 'SELLER',
        publicAccess: true,
      });

      expect(result.user).toEqual(mockUser);
      expect(result.token).toEqual('mockToken');
      expect(prismaMock.seller.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockUser.id,
          }),
        }),
      );
    });

    it('should throw BadRequestException if user already exists', async () => {
      usersServiceMock.findByEmail.mockResolvedValue(mockUser);

      await expect(
        authService.register({
          email: 'test@example.com',
          name: 'Test User',
          password: 'password',
          role: 'SELLER',
          publicAccess: true,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should register a new buyer and return a JWT token', async () => {
      usersServiceMock.findByEmail.mockResolvedValue(null);
      usersServiceMock.create.mockResolvedValue(mockUser);
      prismaMock.buyer.create.mockResolvedValue(mockBuyer);
      jwtServiceMock.sign.mockReturnValue('mockToken');

      const result = await authService.register({
        email: 'buyer@example.com',
        name: 'Test Buyer',
        password: 'password',
        role: 'BUYER',
      });

      expect(result.user).toEqual(mockUser);
      expect(result.token).toEqual('mockToken');
      expect(prismaMock.buyer.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: mockUser.id,
          }),
        }),
      );
    });
  });

  describe('login', () => {
    it('should throw UnauthorizedException for invalid email', async () => {
      usersServiceMock.findByEmail.mockResolvedValue(null);

      await expect(
        authService.login({
          email: 'wrong@example.com',
          password: 'password',
        }),
      ).rejects.toThrow(UnauthorizedException);
    });


  });

  describe('validateUser', () => {
    it('should return the user for valid token payload', async () => {
      usersServiceMock.findById.mockResolvedValue(mockUser);

      const result = await authService.validateUser({ sub: mockUser.id });

      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException for invalid token payload', async () => {
      usersServiceMock.findById.mockResolvedValue(null);

      await expect(authService.validateUser({ sub: 'invalidId' })).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('decodeToken', () => {
    it('should decode token and return the user', async () => {
      jwtServiceMock.verify.mockReturnValue({ sub: mockUser.id });
      usersServiceMock.findById.mockResolvedValue(mockUser);

      const result = await authService.decodeToken('mockToken');
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException for invalid or expired token', async () => {
      jwtServiceMock.verify.mockImplementation(() => {
        throw new Error('Token error');
      });

      await expect(authService.decodeToken('invalidToken')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
