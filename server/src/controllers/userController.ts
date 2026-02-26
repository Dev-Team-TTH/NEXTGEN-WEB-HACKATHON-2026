import { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();

// 1. ĐĂNG KÝ TÀI KHOẢN MỚI
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password, phone, address, role} = req.body;

    // Kiểm tra xem email đã bị trùng chưa
    const existingUser = await prisma.users.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ message: "Email này đã được sử dụng trong hệ thống!" });
      return;
    }

    // Mã hóa mật khẩu (Băm 10 vòng)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Lưu vào database
    const newUser = await prisma.users.create({
      data: {
        name,
        email,
        password: hashedPassword, // Lưu mật khẩu đã mã hóa
        phone,
        address,
        role: role || "STAFF",
      },
    });

    // Tách mật khẩu ra, không trả về Frontend để bảo mật
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json({ message: "Đăng ký thành công!", user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống khi đăng ký." });
  }
};

// 2. ĐĂNG NHẬP
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    // Tìm user theo email
    const user = await prisma.users.findUnique({ where: { email } });
    if (!user) {
      res.status(404).json({ message: "Tài khoản không tồn tại!" });
      return;
    }

    // Kiểm tra mật khẩu người dùng gõ có khớp với mã băm trong DB không
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ message: "Mật khẩu không chính xác!" });
      return;
    }

    // Tạo Token (Cái này Frontend sẽ lưu vào Cookie hoặc LocalStorage)
    const token = jwt.sign(
      { userId: user.userId, role: user.role},
      process.env.JWT_SECRET || "nextgen_hackathon_super_secret_key_2026",
      { expiresIn: "1d" } // Token có hạn dùng 1 ngày
    );

    // Ẩn mật khẩu trước khi gửi về
    const { password: _, ...userWithoutPassword } = user;

    res.status(200).json({
      message: "Đăng nhập thành công!",
      token,
      user: userWithoutPassword
    });
  } catch (error) {
    res.status(500).json({ message: "Lỗi hệ thống khi đăng nhập." });
  }
};

// 3. LẤY DANH SÁCH NHÂN VIÊN (Cho Admin)
export const getUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.users.findMany({

    });
    
    // Ẩn toàn bộ mật khẩu trước khi trả về mảng danh sách
    const safeUsers = users.map(user => {
      const { password, ...safeData } = user;
      return safeData;
    });
    
    res.status(200).json(safeUsers);
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi lấy danh sách nhân viên." });
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, phone, address, role} = req.body;

    const updatedUser = await prisma.users.update({
      where: { userId: id },
      data: {
        name,
        phone,
        address,
        role,
      },
    });

    const { password: _, ...safeUser } = updatedUser;
    res.status(200).json({ message: "Cập nhật nhân viên thành công!", user: safeUser });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi cập nhật thông tin nhân viên." });
  }
};

// 5. XÓA TÀI KHOẢN NHÂN VIÊN
export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.users.delete({ where: { userId: id } });
    res.status(200).json({ message: "Đã xóa tài khoản nhân viên!" });
  } catch (error) {
    res.status(500).json({ message: "Lỗi khi xóa nhân viên." });
  }
};