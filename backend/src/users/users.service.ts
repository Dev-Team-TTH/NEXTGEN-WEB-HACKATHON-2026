import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma.service'; // Đảm bảo import đúng file này

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Tạo User
  create(createUserDto: CreateUserDto) {
    return this.prisma.user.create({
      data: createUserDto,
    });
  }

  // Lấy danh sách
  findAll() {
    return this.prisma.user.findMany();
  }

  // Lấy 1 người
  findOne(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  // Sửa
  update(id: number, updateUserDto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  // Xóa
  remove(id: number) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}