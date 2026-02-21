import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// 1. KHAI BÁO KIỂU DỮ LIỆU ĐẦY ĐỦ
export interface InitialStateTypes {
  isSidebarCollapsed: boolean;
  isDarkMode: boolean;
  isAuthenticated: boolean;
  isNotificationsEnabled: boolean;
}

// 2. KHỞI TẠO TRẠNG THÁI MẶC ĐỊNH
const initialState: InitialStateTypes = {
  isSidebarCollapsed: false,
  isDarkMode: false,
  isAuthenticated: false, // Mặc định chưa đăng nhập
  isNotificationsEnabled: true, // Mặc định bật thông báo
};

// 3. TẠO CÁC LỆNH ĐIỀU KHIỂN (REDUCERS)
export const globalSlice = createSlice({
  name: "global",
  initialState,
  reducers: {
    setIsSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.isSidebarCollapsed = action.payload;
    },
    setIsDarkMode: (state, action: PayloadAction<boolean>) => {
      state.isDarkMode = action.payload;
    },
    setIsAuthenticated: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
    },
    setIsNotificationsEnabled: (state, action: PayloadAction<boolean>) => {
      state.isNotificationsEnabled = action.payload;
    },
  },
});

// 4. XUẤT CÁC LỆNH ĐỂ CÁC COMPONENT SỬ DỤNG
export const { 
  setIsSidebarCollapsed, 
  setIsDarkMode, 
  setIsAuthenticated, 
  setIsNotificationsEnabled 
} = globalSlice.actions;

export default globalSlice.reducer;