import { Star } from "lucide-react";
import React from "react";

type RatingProps = {
  rating: number;
};

const Rating = ({ rating }: RatingProps) => {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((index) => {
        // Tính toán tỷ lệ phần trăm lấp đầy cho từng ngôi sao (từ 0 đến 1)
        // VD với rating = 4.3:
        // Sao 1, 2, 3, 4 sẽ có fillValue = 1 (100%)
        // Sao 5 sẽ có fillValue = 0.3 (30%)
        const fillValue = Math.max(0, Math.min(1, rating - (index - 1)));

        return (
          <div key={index} className="relative w-4 h-4">
            {/* 1. Ngôi sao nền (Rỗng - Màu xám nhạt) */}
            <Star
              className="absolute top-0 left-0 w-4 h-4"
              color="#E4E5E9"
              fill="transparent"
            />
            
            {/* 2. Ngôi sao Foreground (Đặc - Màu vàng) bị cắt xén bằng CSS width */}
            <div
              className="absolute top-0 left-0 h-full overflow-hidden"
              style={{ width: `${fillValue * 100}%` }}
            >
              <Star
                className="w-4 h-4"
                color="#FFC107"
                fill="#FFC107"
              />
            </div>
          </div>
        );
      })}
      
      {/* Tuỳ chọn: Hiển thị con số text nhỏ bên cạnh để UI thêm rõ ràng */}
      <span className="ml-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
        {Number(rating.toFixed(2))}
      </span>
    </div>
  );
};

export default Rating;