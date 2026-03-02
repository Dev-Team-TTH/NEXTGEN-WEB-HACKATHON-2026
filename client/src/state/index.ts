import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// ==========================================
// 1. KHAI BÁO KIỂU DỮ LIỆU ĐẦY ĐỦ (INTERFACES)
// ==========================================

export interface UserProfile {
  userId: string;
  email: string;
  fullName: string;
  departmentId?: string | null;
  permissions?: string[]; 
  is2FAEnabled?: boolean; 
  branchId?: string | null; 
  role?: string; 
}

export interface InitialStateTypes {
  // --- A. UI & Tùy chọn người dùng (Preferences) ---
  isSidebarCollapsed: boolean;
  isDarkMode: boolean;
  isNotificationsEnabled: boolean;
  language: string;

  // --- B. Xác thực & Danh tính (Authentication & Identity) ---
  isAuthenticated: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  currentUser: UserProfile | null;

  // --- C. Bối cảnh làm việc ERP (ERP Context) ---
  activeCompanyId: string | null;      
  activeBranchId: string | null;       
  activeWarehouseId: string | null;    
  activeFiscalPeriodId: string | null; 
}

// ==========================================
// 2. KHỞI TẠO TRẠNG THÁI MẶC ĐỊNH (INITIAL STATE)
// ==========================================
const initialState: InitialStateTypes = {
  isSidebarCollapsed: false,
  isDarkMode: false,
  isNotificationsEnabled: true,
  language: "vi", 
  isAuthenticated: false,
  accessToken: null,
  refreshToken: null,
  currentUser: null,
  activeCompanyId: null,
  activeBranchId: null,
  activeWarehouseId: null,
  activeFiscalPeriodId: null,
};

// ==========================================
// 3. TẠO CÁC LỆNH ĐIỀU KHIỂN (REDUCERS)
// ==========================================
export const globalSlice = createSlice({
  name: "global",
  initialState,
  reducers: {
    // ------------------------------------------
    // LUỒNG 1: ĐIỀU KHIỂN GIAO DIỆN (UI) VÀ LƯU TRỮ VĨNH VIỄN
    // ------------------------------------------
    setIsSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
      state.isSidebarCollapsed = action.payload;
      if (typeof window !== "undefined") {
        localStorage.setItem("isSidebarCollapsed", String(action.payload));
      }
    },
    setIsDarkMode: (state, action: PayloadAction<boolean>) => {
      state.isDarkMode = action.payload;
      if (typeof window !== "undefined") {
        localStorage.setItem("isDarkMode", String(action.payload));
      }
    },
    setIsNotificationsEnabled: (state, action: PayloadAction<boolean>) => {
      state.isNotificationsEnabled = action.payload;
      if (typeof window !== "undefined") {
        localStorage.setItem("isNotificationsEnabled", String(action.payload));
      }
    },
    setLanguage: (state, action: PayloadAction<string>) => {
      state.language = action.payload;
      if (typeof window !== "undefined") {
        localStorage.setItem("language", action.payload);
      }
    },

    // ------------------------------------------
    // LUỒNG 2: QUẢN LÝ XÁC THỰC (AUTH) VÀ PHỤC HỒI (REHYDRATION)
    // ------------------------------------------
    
    // 🔥 TÍNH NĂNG MỚI & HOÀN THIỆN: Khôi phục toàn bộ (UI + Auth + Context) khi F5
    restoreSession: (state) => {
      if (typeof window !== "undefined") {
        // 1. Phục hồi trạng thái UI
        const storedSidebar = localStorage.getItem("isSidebarCollapsed");
        const storedDarkMode = localStorage.getItem("isDarkMode");
        const storedNotif = localStorage.getItem("isNotificationsEnabled");
        const storedLang = localStorage.getItem("language");

        if (storedSidebar !== null) state.isSidebarCollapsed = storedSidebar === "true";
        if (storedDarkMode !== null) state.isDarkMode = storedDarkMode === "true";
        if (storedNotif !== null) state.isNotificationsEnabled = storedNotif === "true";
        if (storedLang !== null) state.language = storedLang;

        // 2. Phục hồi trạng thái Auth
        const storedAccessToken = localStorage.getItem("accessToken");
        const storedRefreshToken = localStorage.getItem("refreshToken");
        const storedUser = localStorage.getItem("currentUser");
        
        // 3. Phục hồi Bối cảnh ERP
        const storedCompanyId = localStorage.getItem("activeCompanyId");
        const storedBranchId = localStorage.getItem("activeBranchId");
        const storedWarehouseId = localStorage.getItem("activeWarehouseId");
        const storedFiscalPeriodId = localStorage.getItem("activeFiscalPeriodId");

        // BỨC TƯỜNG LỬA CHỐNG BẪY CHUỖI "undefined" HOẶC "null"
        if (storedAccessToken && storedAccessToken !== "undefined" && storedAccessToken !== "null") {
          state.accessToken = storedAccessToken;
          state.refreshToken = storedRefreshToken;
          state.isAuthenticated = true;
          
          if (storedUser && storedUser !== "undefined") {
            try {
              state.currentUser = JSON.parse(storedUser);
            } catch (error) {
              console.error("Lỗi khi parse currentUser", error);
            }
          }

          if (storedCompanyId) state.activeCompanyId = storedCompanyId;
          if (storedBranchId) state.activeBranchId = storedBranchId;
          if (storedWarehouseId) state.activeWarehouseId = storedWarehouseId;
          if (storedFiscalPeriodId) state.activeFiscalPeriodId = storedFiscalPeriodId;
        } else {
          // Nếu phát hiện rác "undefined", ra lệnh dọn dẹp sạch sẽ ngay lập tức
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("currentUser");
          state.isAuthenticated = false; // Ép văng ra Login
        }
      }
    },

    setAuthTokens: (state, action: PayloadAction<{ accessToken: string; refreshToken: string }>) => {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;

      if (typeof window !== "undefined") {
        localStorage.setItem("accessToken", action.payload.accessToken);
        localStorage.setItem("refreshToken", action.payload.refreshToken);
      }
    },
    
    updateAccessToken: (state, action: PayloadAction<string>) => {
      state.accessToken = action.payload;
      state.isAuthenticated = true;

      if (typeof window !== "undefined") {
        localStorage.setItem("accessToken", action.payload);
      }
    },

    setCurrentUser: (state, action: PayloadAction<UserProfile | null>) => {
      state.currentUser = action.payload;
      
      if (typeof window !== "undefined") {
        if (action.payload) {
          localStorage.setItem("currentUser", JSON.stringify(action.payload));
        } else {
          localStorage.removeItem("currentUser");
        }
      }
      
      if (action.payload?.branchId && !state.activeBranchId) {
        state.activeBranchId = action.payload.branchId;
        if (typeof window !== "undefined") {
          localStorage.setItem("activeBranchId", action.payload.branchId);
        }
      }
    },

    // ------------------------------------------
    // LUỒNG 3: BỐI CẢNH ERP (CONTEXT)
    // ------------------------------------------
    setActiveCompanyId: (state, action: PayloadAction<string | null>) => {
      state.activeCompanyId = action.payload;
      state.activeBranchId = null;
      state.activeWarehouseId = null;

      if (typeof window !== "undefined") {
        if (action.payload) localStorage.setItem("activeCompanyId", action.payload);
        else localStorage.removeItem("activeCompanyId");
        localStorage.removeItem("activeBranchId");
        localStorage.removeItem("activeWarehouseId");
      }
    },
    setActiveBranchId: (state, action: PayloadAction<string | null>) => {
      state.activeBranchId = action.payload;
      state.activeWarehouseId = null;

      if (typeof window !== "undefined") {
        if (action.payload) localStorage.setItem("activeBranchId", action.payload);
        else localStorage.removeItem("activeBranchId");
        localStorage.removeItem("activeWarehouseId");
      }
    },
    setActiveWarehouseId: (state, action: PayloadAction<string | null>) => {
      state.activeWarehouseId = action.payload;
      
      if (typeof window !== "undefined") {
        if (action.payload) localStorage.setItem("activeWarehouseId", action.payload);
        else localStorage.removeItem("activeWarehouseId");
      }
    },
    setActiveFiscalPeriodId: (state, action: PayloadAction<string | null>) => {
      state.activeFiscalPeriodId = action.payload;

      if (typeof window !== "undefined") {
        if (action.payload) localStorage.setItem("activeFiscalPeriodId", action.payload);
        else localStorage.removeItem("activeFiscalPeriodId");
      }
    },

    // ------------------------------------------
    // LUỒNG 4: ĐĂNG XUẤT TỔNG (LOGOUT)
    // ------------------------------------------
    logout: (state) => {
      state.isAuthenticated = false;
      state.accessToken = null;
      state.refreshToken = null;
      state.currentUser = null;
      state.activeCompanyId = null;
      state.activeBranchId = null;
      state.activeWarehouseId = null;
      state.activeFiscalPeriodId = null;

      if (typeof window !== "undefined") {
        // Chỉ xóa dữ liệu nhạy cảm và bối cảnh ERP. 
        // CỐ TÌNH GIỮ LẠI: isDarkMode, language, isSidebarCollapsed để tôn trọng thói quen người dùng.
        const keysToRemove = [
          "accessToken", 
          "refreshToken", 
          "currentUser", 
          "activeCompanyId", 
          "activeBranchId", 
          "activeWarehouseId", 
          "activeFiscalPeriodId"
        ];
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }
    }
  },
});

// ==========================================
// 4. XUẤT CÁC LỆNH ĐỂ CÁC COMPONENT SỬ DỤNG
// ==========================================
export const { 
  setIsSidebarCollapsed, 
  setIsDarkMode, 
  setIsNotificationsEnabled,
  setLanguage,
  
  restoreSession, 
  setAuthTokens, 
  updateAccessToken,
  setCurrentUser,
  logout,

  setActiveCompanyId,
  setActiveBranchId,
  setActiveWarehouseId,
  setActiveFiscalPeriodId
} = globalSlice.actions;

export default globalSlice.reducer;