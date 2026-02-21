"use client";

import React, { useState } from "react";
import Header from "@/app/(components)/Header";
import { useTranslation } from "react-i18next";
import { useAppDispatch, useAppSelector } from "@/app/redux";
import { setIsDarkMode, setIsNotificationsEnabled } from "@/state";
import { toast } from "react-toastify";
import { SlidersHorizontal } from "lucide-react";

type SystemSetting = {
  label: string;
  value: string | boolean;
  type: "text" | "toggle" | "select"; 
  options?: { value: string; label: string }[];
};

const mockSettings: SystemSetting[] = [
  { label: "Notification", value: true, type: "toggle" },
  { label: "Dark Mode", value: false, type: "toggle" },
  { 
    label: "Language", 
    value: "en", 
    type: "select",
    options: [
      { value: "en", label: "English" },
      { value: "vi", label: "Tiếng Việt" }
    ]
  },
];

const Settings = () => {
  const [systemSettings, setsystemSettings] = useState<SystemSetting[]>(mockSettings);
  const { i18n, t } = useTranslation();

  const dispatch = useAppDispatch();
  const isDarkMode = useAppSelector((state) => state.global.isDarkMode);
  const isNotificationsEnabled = useAppSelector((state) => state.global.isNotificationsEnabled);

  // ĐỒNG BỘ BẢNG DỮ LIỆU VỚI REDUX STATE
  const currentSettings = systemSettings.map((setting) => {
    if (setting.label === "Dark Mode") return { ...setting, value: isDarkMode };
    if (setting.label === "Language") return { ...setting, value: i18n.language };
    if (setting.label === "Notification") return { ...setting, value: isNotificationsEnabled };
    return setting;
  });

  // XỬ LÝ NÚT GẠT (TOGGLE)
  const handleToggleChange = (index: number) => {
    const settingLabel = currentSettings[index].label;

    if (settingLabel === "Dark Mode") {
      dispatch(setIsDarkMode(!isDarkMode));
      if (!isDarkMode) toast.dark("🌙 Chế độ Ban đêm đã bật");
      else toast.info("☀️ Chế độ Ban ngày đã bật");
    } 
    else if (settingLabel === "Notification") {
      dispatch(setIsNotificationsEnabled(!isNotificationsEnabled));
      
      if (!isNotificationsEnabled) {
        toast.success("🔔 Đã bật thông báo hệ thống!");
      } else {
        toast.warning("🔕 Đã tắt thông báo hệ thống.");
      }
    }
  };

  // XỬ LÝ DROPDOWN (SELECT)
  const handleSelectChange = (index: number, val: string) => {
    const settingLabel = currentSettings[index].label;
    
    if (settingLabel === "Language") {
      i18n.changeLanguage(val);
      toast.success(`Ngôn ngữ đã đổi sang: ${val === 'vi' ? 'Tiếng Việt' : 'English'}`);
    }
  };

  return (
    <div className="w-full">
      <Header 
        name={t("sidebar.settings")} 
        subtitle="Quản lý cấu hình hệ thống, ngôn ngữ và giao diện."
        icon={SlidersHorizontal} 
      />
      <div className="overflow-x-auto mt-5 shadow-md">
        <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg">
          <thead className="bg-gray-800 dark:bg-gray-900 text-white">
            <tr>
              <th className="text-left py-3 px-4 uppercase font-semibold text-sm">
                Setting
              </th>
              <th className="text-left py-3 px-4 uppercase font-semibold text-sm">
                Value
              </th>
            </tr>
          </thead>
          <tbody>
            {currentSettings.map((setting, index) => (
              <tr className="hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors" key={setting.label}>
                <td className="py-2 px-4 dark:text-gray-200">{setting.label}</td>
                <td className="py-2 px-4">
                  {setting.type === "toggle" ? (
                    <label className="inline-flex relative items-center cursor-pointer">
                      <input
                        type="checkbox"
                        className="sr-only peer"
                        checked={setting.value as boolean}
                        onChange={() => handleToggleChange(index)}
                      />
                      <div className="w-11 h-6 bg-gray-200 dark:bg-gray-600 rounded-full peer peer-focus:ring-blue-400 peer-focus:ring-4 transition peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  ) : setting.type === "select" ? (
                    <select
                      className="px-4 py-2 border dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-200 focus:outline-none focus:border-blue-500 bg-white dark:bg-gray-700"
                      value={setting.value as string}
                      onChange={(e) => handleSelectChange(index, e.target.value)}
                    >
                      {setting.options?.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Settings;