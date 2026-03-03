"use client";

import React, { useRef } from "react";
import { Provider } from "react-redux";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import { setupListeners } from "@reduxjs/toolkit/query";
import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";

// --- REDUX PERSIST ---
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import { PersistGate } from "redux-persist/integration/react";
import createWebStorage from "redux-persist/lib/storage/createWebStorage";

// --- IMPORT STATE & API ---
import globalReducer from "@/state";
import { api } from "@/state/api";

// ==========================================
// 1. GIẢI PHÁP SSR-SAFE CHO REDUX PERSIST
// ==========================================
// Khắc phục triệt để lỗi "localStorage is not defined" khi Next.js render trên Server
const createNoopStorage = () => {
  return {
    getItem(_key: string) {
      return Promise.resolve(null);
    },
    setItem(_key: string, value: any) {
      return Promise.resolve(value);
    },
    removeItem(_key: string) {
      return Promise.resolve();
    },
  };
};

// Nếu đang ở trình duyệt (Client) -> Dùng localStorage thật.
// Nếu đang ở máy chủ (Server) -> Dùng bộ nhớ ảo (NoopStorage).
const storage =
  typeof window !== "undefined"
    ? createWebStorage("local")
    : createNoopStorage();

// ==========================================
// 2. CẤU HÌNH ROOT REDUCER & PERSIST
// ==========================================
const persistConfig = {
  key: "root",
  version: 1,
  storage,
  // Chỉ lưu trữ những Slice cần thiết xuống ổ cứng (Theme, Auth, Sidebar state)
  // Tuyệt đối KHÔNG đưa 'api' vào whitelist để tránh phình to dung lượng ổ cứng
  whitelist: ["global"], 
};

const rootReducer = combineReducers({
  global: globalReducer,
  [api.reducerPath]: api.reducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

// ==========================================
// 3. KHỞI TẠO STORE & MIDDLEWARE CHUẨN ENTERPRISE
// ==========================================
export const makeStore = () => {
  return configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        // Tắt cảnh báo Serializable cho các action của Redux Persist
        serializableCheck: {
          ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
        },
      }).concat(api.middleware), // Gắn Middleware của RTK Query (Caching, Invalidation, Polling)
  });
};

// Định nghĩa các Type cốt lõi
export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

// ==========================================
// 4. XUẤT HOOKS ĐƯỢC ĐỊNH KIỂU SẴN (TYPED HOOKS)
// Sử dụng những hooks này thay vì useDispatch/useSelector gốc để TypeScript hỗ trợ auto-complete
// ==========================================
export const useAppDispatch = () => useDispatch<AppStore["dispatch"]>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// ==========================================
// 5. REDUX PROVIDER WRAPPER
// ==========================================
export default function StoreProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Sử dụng useRef để đảm bảo Store chỉ được tạo ĐÚNG 1 LẦN duy nhất trên mỗi phiên người dùng
  const storeRef = useRef<AppStore>();
  
  if (!storeRef.current) {
    storeRef.current = makeStore();
    // Bật các tính năng lắng nghe nâng cao của RTK Query (như refetchOnFocus, refetchOnReconnect)
    setupListeners(storeRef.current.dispatch);
  }

  // Khởi tạo Persistor để điều khiển quá trình rehydrate
  const persistor = persistStore(storeRef.current);

  return (
    <Provider store={storeRef.current}>
      {/* PersistGate: Hoãn việc render UI cho đến khi lấy xong dữ liệu từ localStorage dập vào RAM */}
      <PersistGate loading={null} persistor={persistor}>
        {children}
      </PersistGate>
    </Provider>
  );
}