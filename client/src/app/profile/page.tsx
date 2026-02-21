"use client";

import Header from "@/app/(components)/Header";
import Image from "next/image";
import React from "react";
import { useTranslation } from "react-i18next";
import { Mail, Phone, MapPin, Briefcase } from "lucide-react";

const Profile = () => {
  const { t } = useTranslation();

  return (
    <div className="w-full">
      <Header name={t("navbar.profile")} />
      
      <div className="mt-5 bg-white rounded-2xl shadow-md p-8 max-w-3xl flex flex-col md:flex-row gap-8 items-center md:items-start">
        {/* AVATAR KHU VỰC TRÁI */}
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/profile.jpg"
            alt="Profile Avatar"
            width={150}
            height={150}
            className="rounded-full border-4 border-blue-100 shadow-sm object-cover w-32 h-32 md:w-40 md:h-40"
          />
          <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-sm">
            Cập nhật ảnh
          </button>
        </div>

        {/* THÔNG TIN KHU VỰC PHẢI */}
        <div className="flex-grow w-full">
          <div className="mb-6 border-b pb-4">
            <h2 className="text-3xl font-bold text-gray-800">Leader Tâm</h2>
            <p className="text-blue-600 font-medium mt-1 flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> Quản trị viên hệ thống (Admin)
            </p>
          </div>

          <div className="space-y-4 text-gray-600">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-full"><Mail className="w-5 h-5 text-gray-500"/></div>
              <div>
                <p className="text-sm text-gray-400">Email liên hệ</p>
                <p className="font-medium text-gray-800">tam.leader@team-tth.com</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-full"><Phone className="w-5 h-5 text-gray-500"/></div>
              <div>
                <p className="text-sm text-gray-400">Số điện thoại</p>
                <p className="font-medium text-gray-800">+84 987 654 321</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-full"><MapPin className="w-5 h-5 text-gray-500"/></div>
              <div>
                <p className="text-sm text-gray-400">Khu vực làm việc</p>
                <p className="font-medium text-gray-800">Kho Tổng - Chi nhánh Miền Nam</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;