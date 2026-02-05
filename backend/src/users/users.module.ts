import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from '../prisma.service'; // Import cái file vừa tạo

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService], // Thêm PrismaService vào đây
})
export class UsersModule {}