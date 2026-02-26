"use client";

import React, { useEffect, useState } from "react";
import { Hexagon, Loader2, Cpu } from "lucide-react";

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Fake Progress Bar chạy số % (Nhanh dần lúc đầu, chậm lại lúc sau)
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.floor(Math.random() * 12) + 3;
      });
    }, 100);

    // Chờ 2.5s thì bắt đầu hiệu ứng biến mất (Fade Out + Phóng to)
    const timer = setTimeout(() => {
      setIsFadingOut(true);
      // Đợi thêm 0.8s cho animation chạy xong rồi mới gỡ Component khỏi DOM
      setTimeout(onFinish, 800); 
    }, 2500);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [onFinish]);

  return (
    <div 
      className={`fixed inset-0 z-[99999] bg-[#050B14] flex flex-col items-center justify-center transition-all duration-800 ease-in-out ${
        isFadingOut ? 'opacity-0 scale-110 blur-xl' : 'opacity-100 scale-100 blur-0'
      }`}
    >
      {/* Background Glow (Lõi phát sáng ma mị) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[35rem] h-[35rem] bg-indigo-600/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[20rem] h-[20rem] bg-cyan-600/10 blur-[100px] rounded-full pointer-events-none"></div>

      {/* Animation Logo Lõi Công Nghệ */}
      <div className="relative flex items-center justify-center mb-10">
        <Hexagon className="w-36 h-36 text-indigo-500/30 animate-[spin_5s_linear_infinite]" strokeWidth={1} />
        <Hexagon className="w-28 h-28 text-cyan-400 absolute animate-[spin_3s_linear_infinite_reverse]" strokeWidth={1.5} />
        <Cpu className="w-12 h-12 text-white absolute animate-pulse shadow-cyan-500" />
      </div>

      {/* Tên Thương Hiệu TTH TEAM */}
      <h1 className="text-5xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 tracking-[0.25em] mb-3 animate-in fade-in slide-in-from-bottom-5 duration-1000">
        TTH TEAM
      </h1>
      <p className="text-cyan-200/60 text-xs md:text-sm tracking-[0.4em] uppercase font-bold mb-14 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-200">
        Enterprise Management System
      </p>

      {/* Thanh Loading Bar */}
      <div className="w-72 md:w-96 flex flex-col items-center gap-5">
        <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden backdrop-blur-sm border border-slate-700/50">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 rounded-full transition-all duration-200 ease-out shadow-[0_0_20px_rgba(6,182,212,0.6)] relative"
            style={{ width: `${Math.min(progress, 100)}%` }}
          >
            {/* Vệt sáng lướt trên thanh loading */}
            <div className="absolute top-0 right-0 bottom-0 w-12 bg-white/50 blur-[3px] animate-[pulse_1s_ease-in-out_infinite]"></div>
          </div>
        </div>
        
        {/* Text Loading */}
        <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px] md:text-xs uppercase tracking-wider">
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" /> 
          <span>Đang thiết lập không gian làm việc... {Math.min(progress, 100)}%</span>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;