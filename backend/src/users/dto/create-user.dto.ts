// backend/src/users/dto/create-user.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'leader@gmail.com', description: 'Email của user' })
  email: string;

  @ApiProperty({ example: 'Nguyen Van A', description: 'Tên của user', required: false })
  name?: string;
}