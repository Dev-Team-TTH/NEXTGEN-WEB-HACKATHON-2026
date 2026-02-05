# 🚀 NEXTGEN WEB HACKATHON 2026 - TEAM TTH

Dự án Monorepo bao gồm Backend (NestJS) và Frontend (Next.js 14).

## 👥 Thành viên
- **Leader/Backend:** Tạ Duy Tâm
- **Database:** Phạm Nguyễn Minh Tiến
- **Frontend:** Phạm Khánh Hưng

## 🛠️ Cài đặt dự án (Cho người mới)

1. **Clone code về máy:**
   ```bash
   git clone [https://github.com/Dev-Team-TTH/NEXTGEN-WEB-HACKATHON-2026.git](https://github.com/Dev-Team-TTH/NEXTGEN-WEB-HACKATHON-2026.git)
   cd NEXTGEN-WEB-HACKATHON-2026

2. **Cài đặt thư viện (Chạy ở thư mục gốc):**

Bash

npm run install:all

3. **Cấu hình môi trường (.env):**

Vào folder backend, tạo file .env.

Liên hệ Leader (Tâm) để lấy nội dung file này (Chứa mật khẩu Database Supabase).

4. **Đồng bộ Database (Nếu máy báo lỗi Prisma):**

Bash

cd backend

npx prisma generate

**▶️ Cách chạy dự án**
Tại thư mục gốc, chạy lệnh:

Bash

npm run dev

Frontend: http://localhost:3000

Backend API: http://localhost:3001


API Docs (Swagger): http://localhost:3001/api
