"use client";

import React, { useState, useMemo, Suspense, useRef } from "react";
import { motion } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { 
  OrbitControls, Html, Box, Environment, 
  ContactShadows, Grid, MeshReflectorMaterial, Text 
} from "@react-three/drei";
import * as THREE from "three";
import { Loader2, PackageSearch, Box as BoxIcon, Info, AlertOctagon, Maximize, Target } from "lucide-react";

// --- REDUX & API ---
import { useGetBinsQuery } from "@/state/api";

// ==========================================
// 1. COMPONENT 3D: Ô KỆ, PALLET & KIỆN HÀNG
// ==========================================
interface Bin3DProps {
  position: [number, number, number];
  binData?: any; 
  index: number;
}

const BinNode = ({ position, binData, index }: Bin3DProps) => {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const emptyWireframeRef = useRef<THREE.Mesh>(null);

  // Tính toán sức chứa
  const capacityPercent = binData ? ((binData.currentLoad || 0) / (binData.capacity || 100)) * 100 : 0;
  const hasItem = capacityPercent > 0;
  
  // Data Viz Heatmap Color
  const getColor = () => {
    if (capacityPercent >= 85) return "#ef4444"; // Đỏ (Quá tải)
    if (capacityPercent >= 40) return "#f59e0b"; // Cam (Đang dùng)
    return "#10b981"; // Xanh (Trống)
  };

  // Animation mượt mà bằng Lerp (60fps)
  useFrame((state) => {
    if (groupRef.current) {
      const targetScale = hovered ? 1.05 : 1;
      const targetY = hovered ? position[1] + 0.15 : position[1]; 
      
      groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15);
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, 0.15);
    }
    
    // Hiệu ứng "Thở" (Breathing) cho các ô trống để thu hút chú ý
    if (!hasItem && emptyWireframeRef.current && !hovered) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3 + index) * 0.02;
      emptyWireframeRef.current.scale.set(scale, scale, scale);
    }
  });

  const binCode = binData?.binCode || `BIN-${100 + index}`;

  return (
    <group position={position}>
      {/* KHU VỰC TƯƠNG TÁC CHÍNH (HITBOX) */}
      <Box 
        args={[2.8, 1.4, 2.8]} 
        visible={false} 
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
      />

      {/* VẬT THỂ HIỂN THỊ */}
      <group ref={groupRef}>
        {/* Tấm Pallet Gỗ (Luôn hiện dưới đáy ô) */}
        <Box args={[2.5, 0.15, 2.5]} position={[0, -0.55, 0]} castShadow receiveShadow>
           <meshStandardMaterial color="#8b5cf6" roughness={0.9} metalness={0.1} /> {/* Pallet màu tím nhạt thương hiệu */}
        </Box>

        {hasItem ? (
          // Thùng hàng Carton / Container
          <Box args={[2.4, 1.1, 2.4]} position={[0, 0.1, 0]} castShadow receiveShadow>
            <meshStandardMaterial 
              color={hovered ? "#60a5fa" : getColor()} 
              roughness={0.7}
              metalness={0.1}
            />
          </Box>
        ) : (
          // Wireframe Không gian Ảo cho ô trống
          <Box ref={emptyWireframeRef} args={[2.4, 1.1, 2.4]} position={[0, 0.1, 0]}>
            <meshBasicMaterial color={getColor()} wireframe transparent opacity={hovered ? 0.8 : 0.3} />
          </Box>
        )}
      </group>

      {/* TOOLTIP HTML MƯỢT MÀ */}
      {hovered && (
        <Html position={[0, 1.5, 0]} center zIndexRange={[100, 0]} className="pointer-events-none">
          <motion.div 
            initial={{ opacity: 0, scale: 0.5, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl px-4 py-3 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] border border-slate-200 dark:border-white/10 flex flex-col min-w-[200px]"
          >
            <div className="flex items-center gap-2 mb-2 border-b border-slate-200 dark:border-white/10 pb-2">
              <BoxIcon className="w-4 h-4 text-indigo-500" />
              <span className="font-black text-slate-900 dark:text-white text-sm">{binCode}</span>
            </div>
            <div className="flex justify-between items-center text-xs mb-1">
              <span className="font-bold text-slate-500">Sức chứa:</span>
              <span className={`font-black ${capacityPercent >= 85 ? 'text-rose-500' : 'text-emerald-500'}`}>
                {Math.round(capacityPercent)}%
              </span>
            </div>
            <div className="text-[10px] text-slate-400 font-medium flex justify-between mb-2">
              <span>Đang lưu: {binData?.currentLoad || 0}</span>
              <span>Max: {binData?.capacity || 100}</span>
            </div>
            <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner">
              <div className="h-full rounded-full" style={{ width: `${capacityPercent}%`, backgroundColor: getColor() }} />
            </div>
          </motion.div>
        </Html>
      )}
    </group>
  );
};

// ==========================================
// 2. COMPONENT 3D: KIẾN TRÚC KỆ SẮT & SÀN
// ==========================================
const WarehouseScene = ({ binsData }: { binsData: any[] }) => {
  const aisles = 3; 
  const bays = 4; 
  const levels = 3; 
  
  const bayWidth = 3; 
  const bayDepth = 3; 
  const levelHeight = 1.6; 
  const aisleSpacing = 5.5; // Mở rộng lối đi một chút cho thoáng

  const layout = useMemo(() => {
    let positions: any[] = [];
    let dataIndex = 0;

    for (let a = 0; a < aisles; a++) {
      for (let b = 0; b < bays; b++) {
        for (let l = 0; l < levels; l++) {
          positions.push({
            pos: [
              (b - bays / 2 + 0.5) * bayWidth, 
              l * levelHeight + (levelHeight / 2), 
              (a - aisles / 2 + 0.5) * aisleSpacing
            ] as [number, number, number],
            data: binsData[dataIndex] || null
          });
          dataIndex++;
        }
      }
    }
    return positions;
  }, [binsData]);

  return (
    <>
      {/* HỆ THỐNG CHIẾU SÁNG & PBR ENVIRONMENT */}
      <ambientLight intensity={0.7} color="#ffffff" />
      <directionalLight position={[20, 40, 20]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} shadow-camera-far={50} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={20} shadow-camera-bottom={-20} shadow-bias={-0.0001} />
      <Environment preset="warehouse" />

      {/* ✅ CÁCH FIX TYPESCRIPT SÀN KHO: Sử dụng <Grid> từ Drei thay cho gridHelper */}
      <Grid
        position={[0, 0.01, 0]}
        args={[100, 100]}
        cellSize={1}
        cellThickness={1}
        cellColor="#cbd5e1"
        sectionSize={5}
        sectionThickness={1.5}
        sectionColor="#94a3b8"
        fadeDistance={40}
        fadeStrength={1.5}
      />
      
      {/* Sàn Epoxy phản chiếu ánh sáng chuẩn nhà kho hiện đại */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <MeshReflectorMaterial
          blur={[300, 100]}
          resolution={1024}
          mixBlur={1}
          mixStrength={40}
          roughness={0.8}
          depthScale={1.2}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#1e293b" // Màu nền sàn tối sang trọng
          metalness={0.5}
          mirror={0.5}
        />
      </mesh>

      {/* VẼ KHUNG KỆ SẮT & BIỂN BÁO (PROCEDURAL RACKS) */}
      {Array.from({ length: aisles }).map((_, a) => {
        const zPos = (a - aisles / 2 + 0.5) * aisleSpacing;
        return (
          <group key={`aisle-${a}`} position={[0, 0, zPos]}>
            
            {/* Biển báo 3D nổi trên đầu dãy (3D Text Data Viz) */}
            <Text 
              position={[-(bays * bayWidth) / 2 - 1.5, levels * levelHeight + 1, 0]} 
              fontSize={0.8} 
              color="#38bdf8" 
              anchorX="center" 
              anchorY="middle"
              rotation={[0, Math.PI / 2, 0]}
              fontWeight="bold"
            >
              Khu {String.fromCharCode(65 + a)} {/* Khu A, B, C */}
            </Text>

            {/* Các cột trụ đứng */}
            {Array.from({ length: bays + 1 }).map((_, b) => (
              <group key={`pillar-${b}`}>
                  <Box args={[0.15, levels * levelHeight, 0.15]} position={[(b - bays / 2) * bayWidth, (levels * levelHeight) / 2, bayDepth / 2]} castShadow receiveShadow>
                    <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
                  </Box>
                  <Box args={[0.15, levels * levelHeight, 0.15]} position={[(b - bays / 2) * bayWidth, (levels * levelHeight) / 2, -bayDepth / 2]} castShadow receiveShadow>
                    <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} />
                  </Box>
              </group>
            ))}

            {/* Các thanh đỡ ngang */}
            {Array.from({ length: levels }).map((_, l) => (
              <group key={`beam-${l}`}>
                <Box args={[bays * bayWidth, 0.08, 0.15]} position={[0, l * levelHeight, bayDepth / 2]} castShadow receiveShadow>
                  <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.4} />
                </Box>
                <Box args={[bays * bayWidth, 0.08, 0.15]} position={[0, l * levelHeight, -bayDepth / 2]} castShadow receiveShadow>
                  <meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.4} />
                </Box>
              </group>
            ))}
          </group>
        );
      })}

      {/* RENDER CÁC KIỆN HÀNG LÊN KỆ */}
      {layout.map((item, index) => (
        <BinNode key={index} index={index} position={item.pos} binData={item.data} />
      ))}

      {/* CAMERA & CONTROLS MƯỢT MÀ */}
      <OrbitControls 
        makeDefault 
        minPolarAngle={0} 
        maxPolarAngle={Math.PI / 2 - 0.05} 
        minDistance={10} 
        maxDistance={60}
        enableDamping={true}
        dampingFactor={0.05}
        autoRotate
        autoRotateSpeed={0.3} // Xoay chậm rãi biểu diễn
      />
      
      {/* BÓNG ĐỔ MẶT ĐẤT */}
      <ContactShadows resolution={1024} scale={80} blur={2.5} opacity={0.5} far={10} color="#0f172a" />
    </>
  );
};

// ==========================================
// 3. COMPONENT BỌC LAZY LOAD & UI OVERLAY
// ==========================================
interface Warehouse3DViewerProps {
  warehouseId?: string; 
}

export default function Warehouse3DViewer({ warehouseId }: Warehouse3DViewerProps) {
  const { data: bins = [], isLoading, isError } = useGetBinsQuery(warehouseId ? { warehouseId } : {});

  // Tính toán số liệu để vẽ Legend
  const stats = useMemo(() => {
    let full = 0, empty = 0, partial = 0;
    bins.forEach((b: any) => {
      const p = ((b.currentLoad || 0) / (b.capacity || 100)) * 100;
      if (p >= 85) full++;
      else if (p < 5) empty++;
      else partial++;
    });
    return { full, empty, partial, total: bins.length };
  }, [bins]);

  if (isError) {
    return (
      <div className="w-full h-[500px] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-rose-200 dark:border-rose-900/50">
        <AlertOctagon className="w-12 h-12 text-rose-500 mb-3 animate-pulse" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Lỗi nạp Động cơ 3D</h3>
        <p className="text-sm text-slate-500 mt-1">Không thể kết xuất dữ liệu không gian.</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-[700px] bg-gradient-to-b from-slate-50 to-slate-200 dark:from-[#090D14] dark:to-[#111827] rounded-3xl overflow-hidden shadow-2xl border border-slate-200 dark:border-white/10 group">
      
      {/* UI OVERLAY TOP */}
      <div className="absolute top-6 left-6 z-10 pointer-events-none">
        <h3 className="text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2 drop-shadow-md">
          <PackageSearch className="w-8 h-8 text-indigo-500" /> Digital Twin Warehouse
        </h3>
        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mt-2 bg-white/70 dark:bg-black/40 backdrop-blur-md w-fit px-4 py-2 rounded-xl border border-white/20 shadow-sm">
          <Target className="w-4 h-4 text-rose-500 animate-pulse"/> Dùng chuột để Cuộn, Zoom & Khám phá 360°
        </p>
      </div>

      {/* UI OVERLAY BOTTOM: Bảng chú giải (Legend) */}
      <div className="absolute bottom-6 left-6 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-5 rounded-2xl shadow-xl border border-white/20 pointer-events-auto transition-transform group-hover:translate-y-[-5px]">
        <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Maximize className="w-4 h-4" /> Heatmap Phân bổ
        </h4>
        <div className="space-y-3 text-sm font-bold text-slate-800 dark:text-slate-200">
          <div className="flex items-center justify-between gap-8">
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-rose-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]"></span> Quá tải ({'>'}85%)
            </span>
            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-rose-500">{stats.full}</span>
          </div>
          <div className="flex items-center justify-between gap-8">
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]"></span> Sẵn sàng
            </span>
            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-amber-500">{stats.partial}</span>
          </div>
          <div className="flex items-center justify-between gap-8">
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 rounded border-2 border-emerald-500 bg-transparent shadow-[0_0_12px_rgba(16,185,129,0.3)]"></span> Trống rỗng
            </span>
            <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-emerald-500">{stats.empty}</span>
          </div>
        </div>
      </div>

      {/* KHU VỰC RENDER ĐỘNG CƠ 3D */}
      <div className="absolute inset-0 cursor-grab active:cursor-grabbing">
        {isLoading ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100/50 dark:bg-slate-900/50 backdrop-blur-sm z-50">
            <Loader2 className="w-12 h-12 animate-spin text-indigo-500 mb-4" />
            <p className="font-bold text-slate-700 dark:text-slate-300">Đang khởi tạo bản sao kỹ thuật số (Digital Twin)...</p>
          </div>
        ) : (
          <Suspense fallback={<div className="w-full h-full flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-indigo-500"/></div>}>
            {/* Cấu hình Camera góc rộng và Khử răng cưa */}
            <Canvas camera={{ position: [25, 20, 30], fov: 40 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
              <WarehouseScene binsData={bins} />
            </Canvas>
          </Suspense>
        )}
      </div>
    </div>
  );
}