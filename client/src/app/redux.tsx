"use client";

import { useRef, useEffect } from "react";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import {
  TypedUseSelectorHook,
  useDispatch,
  useSelector,
  Provider,
} from "react-redux";

// Nhập globalReducer và lệnh khôi phục phiên bản quyền (restoreSession) từ state
import globalReducer, { restoreSession } from "@/state";
import { api } from "@/state/api";
import { setupListeners } from "@reduxjs/toolkit/query";

// ==========================================
// 1. TÍCH HỢP REDUCERS (KẾT NỐI API VÀ GLOBAL STATE)
// ==========================================
const rootReducer = combineReducers({
  global: globalReducer,
  [api.reducerPath]: api.reducer,
});

// ==========================================
// 2. CẤU HÌNH REDUX STORE KHÔNG ĐỘ TRỄ
// ==========================================
export const makeStore = () => {
  return configureStore({
    reducer: rootReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        // Tắt cảnh báo serializable vì chúng ta đang quản lý Store cực kỳ chuẩn mực
        serializableCheck: false,
      }).concat(api.middleware),
  });
};

// ==========================================
// 3. KHAI BÁO KIỂU DỮ LIỆU CHUẨN TYPESCRIPT
// ==========================================
export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

// ==========================================
// 4. XUẤT CÁC HOOKS ĐƯỢC CUSTOM TYPE 
// (Bắt buộc dùng các hook này thay vì useDispatch/useSelector mặc định để có Auto-complete)
// ==========================================
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// ==========================================
// 5. COMPONENT PROVIDER (BỌC NGOÀI CÙNG ỨNG DỤNG)
// ==========================================
export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const storeRef = useRef<AppStore>();
  
  if (!storeRef.current) {
    // Khởi tạo Store một lần duy nhất trong suốt vòng đời Client
    storeRef.current = makeStore();

    // 🔥 VÁ LỖ HỔNG REHYDRATION (PHỤC HỒI PHIÊN ĐĂNG NHẬP) THÔNG MINH:
    // Chạy đồng bộ (synchronous) ngay lần render đầu tiên trên Client.
    // Điều này chộp lấy Token, UI (Dark Mode), và Bối cảnh (Branch/Warehouse) 
    // đắp thẳng vào RAM trước khi giao diện kịp vẽ ra, giúp F5 mượt mà tuyệt đối!
    if (typeof window !== "undefined") {
      storeRef.current.dispatch(restoreSession());
    }
  }

  // NÂNG CẤP ĐỈNH CAO CHUẨN NEXT.JS 14+:
  // Đưa setupListeners vào useEffect để tránh can thiệp vào SSR và React 18 Strict Mode.
  useEffect(() => {
    if (storeRef.current != null) {
      // Kích hoạt lắng nghe các sự kiện (Ví dụ: focus lại vào tab, kết nối lại mạng)
      const unsubscribe = setupListeners(storeRef.current.dispatch);
      
      // Cleanup function: Dọn dẹp bộ nhớ (Memory Leak) khi component bị unmount
      return unsubscribe;
    }
  }, []);

  return (
    <Provider store={storeRef.current}>
      {children}
    </Provider>
  );
}