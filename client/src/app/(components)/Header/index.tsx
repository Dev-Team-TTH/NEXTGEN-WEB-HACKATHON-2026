import React from "react";
import { LucideIcon } from "lucide-react";

type HeaderProps = {
  name: string;
  subtitle?: string; // Tiêu đề phụ (Không bắt buộc)
  icon?: LucideIcon; // Icon minh họa (Không bắt buộc)
  action?: React.ReactNode; // Nút bấm bên phải (Không bắt buộc)
};

const Header = ({ name, subtitle, icon: Icon, action }: HeaderProps) => {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-7 gap-4">
      {/* KHU VỰC BÊN TRÁI: ICON & TIÊU ĐỀ */}
      <div className="flex items-center gap-4">
        {/* Nếu truyền icon vào thì mới hiển thị */}
        {Icon && (
          <div className="p-3 bg-blue-100 rounded-xl shadow-sm">
            <Icon className="w-7 h-7 text-blue-600" />
          </div>
        )}
        
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-800 tracking-tight">
            {name}
          </h1>
          {/* Nếu truyền subtitle vào thì mới hiển thị */}
          {subtitle && (
            <p className="text-sm md:text-base text-gray-500 mt-1 font-medium">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* KHU VỰC BÊN PHẢI: NÚT BẤM HOẶC CÔNG CỤ TÌM KIẾM */}
      {action && (
        <div className="w-full sm:w-auto">
          {action}
        </div>
      )}
    </div>
  );
};

export default Header;