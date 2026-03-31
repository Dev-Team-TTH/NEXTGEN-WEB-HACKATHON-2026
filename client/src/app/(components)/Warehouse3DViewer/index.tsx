"use client";

import React, { useState, useMemo, Suspense, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { 
  OrbitControls, Html, Box, Environment, 
  ContactShadows, Grid, MeshReflectorMaterial, Text 
} from "@react-three/drei";
import * as THREE from "three";
import { 
  Loader2, PackageSearch, Box as BoxIcon, 
  AlertOctagon, Maximize, Target, Zap, CheckCircle2, RotateCcw, Building2
} from "lucide-react";
import { toast } from "react-hot-toast"; 

// --- REDUX & API ---
import { useAppSelector } from "@/app/redux"; // 🚀 BỔ SUNG: Context Chi nhánh
import { 
  useGetBinsQuery, 
  useGetProductsQuery,
  useGetWarehousesQuery,
  useAutoPickStockMutation 
} from "@/state/api";

// ==========================================
// 1. COMPONENT 3D: Ô KỆ, PALLET & KIỆN HÀNG
// ==========================================
interface Bin3DProps {
  position: [number, number, number];
  binData?: any; 
  index: number;
  binCode: string;
  isHighlighted: boolean;
  pickQuantity?: number;
}

const BinNode = ({ position, binData, index, binCode, isHighlighted, pickQuantity }: Bin3DProps) => {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const emptyWireframeRef = useRef<THREE.Mesh>(null);

  const capacityPercent = binData ? ((binData.currentLoad || 0) / (binData.capacity || 100)) * 100 : 0;
  const hasItem = capacityPercent > 0 || isHighlighted; 
  
  const getColor = () => {
    if (isHighlighted) return "#06b6d4"; 
    if (capacityPercent >= 85) return "#ef4444"; 
    if (capacityPercent >= 40) return "#f59e0b"; 
    return "#10b981"; 
  };

  useFrame((state) => {
    if (groupRef.current) {
      const targetScale = (hovered || isHighlighted) ? 1.05 : 1;
      const targetY = (hovered || isHighlighted) ? position[1] + 0.15 : position[1]; 
      
      const finalScale = isHighlighted 
        ? targetScale + Math.sin(state.clock.elapsedTime * 6) * 0.03 
        : targetScale;

      groupRef.current.scale.lerp(new THREE.Vector3(finalScale, finalScale, finalScale), 0.15);
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, targetY, 0.15);
    }
    
    if (!hasItem && emptyWireframeRef.current && !hovered) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3 + index) * 0.02;
      emptyWireframeRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <group position={position}>
      <Box 
        args={[2.8, 1.4, 2.8]} 
        visible={false} 
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
      />

      <group ref={groupRef}>
        <Box args={[2.5, 0.15, 2.5]} position={[0, -0.55, 0]} castShadow receiveShadow>
           <meshStandardMaterial color="#8b5cf6" roughness={0.9} metalness={0.1} />
        </Box>

        {hasItem ? (
          <Box args={[2.4, 1.1, 2.4]} position={[0, 0.1, 0]} castShadow receiveShadow>
            <meshStandardMaterial 
              color={hovered ? "#60a5fa" : getColor()} 
              emissive={isHighlighted ? "#06b6d4" : "#000000"} 
              emissiveIntensity={isHighlighted ? 0.6 : 0}
              roughness={0.3}
              metalness={0.2}
            />
          </Box>
        ) : (
          <Box ref={emptyWireframeRef} args={[2.4, 1.1, 2.4]} position={[0, 0.1, 0]}>
            <meshBasicMaterial color={getColor()} wireframe transparent opacity={hovered ? 0.8 : 0.3} />
          </Box>
        )}
      </group>

      {(hovered || isHighlighted) && (
        <Html position={[0, isHighlighted ? 2.0 : 1.5, 0]} center zIndexRange={[100, 0]} className="pointer-events-none">
          <motion.div 
            initial={{ opacity: 0, scale: 0.5, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            className={`backdrop-blur-xl px-4 py-3 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] border flex flex-col min-w-[200px] transition-colors duration-500 ${
              isHighlighted 
                ? "bg-cyan-900/90 border-cyan-400 text-white shadow-cyan-500/50" 
                : "bg-white/95 dark:bg-slate-900/95 border-slate-200 dark:border-white/10"
            }`}
          >
            <div className="flex items-center gap-2 mb-2 border-b border-current/20 pb-2 transition-colors duration-500">
              <BoxIcon className={`w-4 h-4 transition-colors duration-500 ${isHighlighted ? "text-cyan-300" : "text-indigo-500"}`} />
              <span className={`font-black text-sm transition-colors duration-500 ${isHighlighted ? "text-white" : "text-slate-900 dark:text-white"}`}>
                {binCode}
              </span>
            </div>
            
            {isHighlighted ? (
              <div className="flex flex-col gap-1 items-center bg-cyan-950/50 p-2 rounded-xl transition-colors duration-500">
                <span className="text-xs text-cyan-200 font-bold uppercase tracking-wider transition-colors duration-500">Hệ thống yêu cầu lấy</span>
                <span className="text-3xl font-black text-cyan-400 drop-shadow-md transition-colors duration-500">{pickQuantity}</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center text-xs mb-1 transition-colors duration-500">
                  <span className="font-bold text-slate-500 transition-colors duration-500">Sức chứa:</span>
                  <span className={`font-black transition-colors duration-500 ${capacityPercent >= 85 ? 'text-rose-500' : 'text-emerald-500'}`}>
                    {Math.round(capacityPercent)}%
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 font-medium flex justify-between mb-2 transition-colors duration-500">
                  <span className="transition-colors duration-500">Đang lưu: {binData?.currentLoad || 0}</span>
                  <span className="transition-colors duration-500">Max: {binData?.capacity || 100}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden shadow-inner transition-colors duration-500">
                  <div className="h-full rounded-full transition-colors duration-500" style={{ width: `${capacityPercent}%`, backgroundColor: getColor() }} />
                </div>
              </>
            )}
          </motion.div>
        </Html>
      )}
    </group>
  );
};

// ==========================================
// 2. COMPONENT 3D: KIẾN TRÚC KỆ SẮT & CAMERA LERP
// ==========================================
const WarehouseScene = ({ 
  binsData, 
  highlightedPicksMap, // 🚀 TỐI ƯU HÓA O(1) Hash Map
  focusTarget,
  isWarehouseSelected
}: { 
  binsData: any[]; 
  highlightedPicksMap: Map<string, any>; // 🚀 O(1) Lookup Map
  focusTarget: THREE.Vector3 | null;
  isWarehouseSelected: boolean;
}) => {
  const aisles = 3, bays = 4, levels = 3; 
  const bayWidth = 3, bayDepth = 3, levelHeight = 1.6, aisleSpacing = 5.5; 

  const controlsRef = useRef<any>(null);
  const { camera } = useThree();

  const layout = useMemo(() => {
    let positions: any[] = [];
    let dataIndex = 0;

    for (let a = 0; a < aisles; a++) {
      for (let b = 0; b < bays; b++) {
        for (let l = 0; l < levels; l++) {
          const binData = binsData[dataIndex] || null;
          const binCode = binData?.code || binData?.binCode || `BIN-${a}-${b}-${l}`;
          positions.push({
            pos: [
              (b - bays / 2 + 0.5) * bayWidth, 
              l * levelHeight + (levelHeight / 2), 
              (a - aisles / 2 + 0.5) * aisleSpacing
            ] as [number, number, number],
            data: binData,
            binCode
          });
          dataIndex++;
        }
      }
    }
    return positions;
  }, [binsData]);

  useFrame((state) => {
    if (controlsRef.current) {
      if (focusTarget) {
        controlsRef.current.autoRotate = false;
        controlsRef.current.target.lerp(focusTarget, 0.05);
        const idealCameraPos = new THREE.Vector3(focusTarget.x + 8, focusTarget.y + 6, focusTarget.z + 12);
        camera.position.lerp(idealCameraPos, 0.03);
      } else {
        controlsRef.current.autoRotate = true;
      }
      controlsRef.current.update();
    }
  });

  return (
    <>
      <ambientLight intensity={0.7} color="#ffffff" />
      <directionalLight position={[20, 40, 20]} intensity={1.5} castShadow shadow-mapSize={[2048, 2048]} />
      <Environment preset="warehouse" />

      <Grid
        position={[0, 0.01, 0]} args={[100, 100]} cellSize={1} cellThickness={1} cellColor="#cbd5e1"
        sectionSize={5} sectionThickness={1.5} sectionColor="#94a3b8" fadeDistance={40} fadeStrength={1.5}
      />
      
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <MeshReflectorMaterial
          blur={[300, 100]} resolution={1024} mixBlur={1} mixStrength={40} roughness={0.8}
          depthScale={1.2} minDepthThreshold={0.4} maxDepthThreshold={1.4} color="#1e293b" metalness={0.5} mirror={0.5}
        />
      </mesh>

      {/* RACKS - Chỉ render khi đã chọn Kho */}
      {isWarehouseSelected && Array.from({ length: aisles }).map((_, a) => {
        const zPos = (a - aisles / 2 + 0.5) * aisleSpacing;
        return (
          <group key={`aisle-${a}`} position={[0, 0, zPos]}>
            <Text 
              position={[-(bays * bayWidth) / 2 - 1.5, levels * levelHeight + 1, 0]} 
              fontSize={0.8} color="#38bdf8" anchorX="center" anchorY="middle" rotation={[0, Math.PI / 2, 0]} fontWeight="bold"
            >
              Khu {String.fromCharCode(65 + a)}
            </Text>
            {Array.from({ length: bays + 1 }).map((_, b) => (
              <group key={`pillar-${b}`}>
                  <Box args={[0.15, levels * levelHeight, 0.15]} position={[(b - bays / 2) * bayWidth, (levels * levelHeight) / 2, bayDepth / 2]} castShadow receiveShadow><meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} /></Box>
                  <Box args={[0.15, levels * levelHeight, 0.15]} position={[(b - bays / 2) * bayWidth, (levels * levelHeight) / 2, -bayDepth / 2]} castShadow receiveShadow><meshStandardMaterial color="#334155" metalness={0.8} roughness={0.2} /></Box>
              </group>
            ))}
            {Array.from({ length: levels }).map((_, l) => (
              <group key={`beam-${l}`}>
                <Box args={[bays * bayWidth, 0.08, 0.15]} position={[0, l * levelHeight, bayDepth / 2]} castShadow receiveShadow><meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.4} /></Box>
                <Box args={[bays * bayWidth, 0.08, 0.15]} position={[0, l * levelHeight, -bayDepth / 2]} castShadow receiveShadow><meshStandardMaterial color="#f59e0b" metalness={0.5} roughness={0.4} /></Box>
              </group>
            ))}
          </group>
        );
      })}

      {/* BINS & ITEMS */}
      {isWarehouseSelected && layout.map((item, index) => {
        // 🚀 O(1) LOOKUP THAY VÌ O(N): Giải cứu GPU khỏi việc lặp Array.find()
        const pickData = highlightedPicksMap.get(item.binCode);
        return (
          <BinNode 
            key={index} 
            index={index} 
            position={item.pos} 
            binData={item.data} 
            binCode={item.binCode}
            isHighlighted={!!pickData}
            pickQuantity={pickData?.quantity}
          />
        );
      })}

      <OrbitControls 
        ref={controlsRef}
        makeDefault 
        minPolarAngle={0} 
        maxPolarAngle={Math.PI / 2 - 0.05} 
        minDistance={10} 
        maxDistance={60}
        enableDamping={true}
        dampingFactor={0.05}
        autoRotate={!focusTarget} // Chỉ xoay tự động khi không focus
        autoRotateSpeed={0.3} 
      />
      
      <ContactShadows resolution={1024} scale={80} blur={2.5} opacity={0.5} far={10} color="#0f172a" />
    </>
  );
};

// ==========================================
// 3. COMPONENT CHÍNH (BỌC OVERLAY UI)
// ==========================================
interface Warehouse3DViewerProps { warehouseId?: string; }

export default function Warehouse3DViewer({ warehouseId }: Warehouse3DViewerProps) {
  
  // 🚀 LÁ CHẮN BẢO MẬT: Bơm Redux Context để giới hạn dữ liệu tra cứu
  const { activeBranchId } = useAppSelector((state: any) => state.global);

  // --- STATES ---
  const [localWarehouseId, setLocalWarehouseId] = useState<string>(warehouseId || "");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [requiredQty, setRequiredQty] = useState<number>(10);
  const [pickResults, setPickResults] = useState<any[]>([]);
  const [focusTarget, setFocusTarget] = useState<THREE.Vector3 | null>(null);
  const [isPicking, setIsPicking] = useState(false);

  // Sync prop changes
  useEffect(() => {
    if (warehouseId) setLocalWarehouseId(warehouseId);
  }, [warehouseId]);

  // --- APIs (🚀 ĐÃ BỌC THEO CHI NHÁNH) ---
  const { data: warehousesData } = useGetWarehousesQuery(
    { branchId: activeBranchId } as any, 
    { skip: !activeBranchId }
  );
  const warehouses = Array.isArray(warehousesData) ? warehousesData : ((warehousesData as any)?.data || []);

  const { data: binsData, isLoading: loadingBins, isError } = useGetBinsQuery(
    { warehouseId: localWarehouseId }, 
    { skip: !localWarehouseId }
  );
  const bins = Array.isArray(binsData) ? binsData : ((binsData as any)?.data || []);
  
  const { data: productsData } = useGetProductsQuery(
    { branchId: activeBranchId, limit: 1000 } as any, 
    { skip: !activeBranchId }
  ); 
  const products = Array.isArray(productsData) ? productsData : ((productsData as any)?.data || []);
  
  const [autoPick] = useAutoPickStockMutation();

  // 🚀 THUẬT TOÁN TỐI ƯU HÓA HASH MAP (O(1) Lookup cho 3D Render)
  const highlightedPicksMap = useMemo(() => {
    const map = new Map<string, any>();
    pickResults.forEach(p => map.set(p.binCode, p));
    return map;
  }, [pickResults]);

  // Tính Legend
  const stats = useMemo(() => {
    let full = 0, empty = 0, partial = 0;
    if (!bins || bins.length === 0) return { full: 0, empty: 0, partial: 0, total: 0 };
    bins.forEach((b: any) => {
      const p = ((b.currentLoad || 0) / (b.capacity || 100)) * 100;
      if (p >= 85) full++; else if (p < 5) empty++; else partial++;
    });
    return { full, empty, partial, total: bins.length };
  }, [bins]);

  // HÀM CHẠY THUẬT TOÁN FEFO
  const handleRunAlgorithm = async () => {
    if (!localWarehouseId || !selectedProductId || requiredQty <= 0) return;
    setIsPicking(true);
    setPickResults([]);
    setFocusTarget(null);

    try {
      const response = await autoPick({ 
        warehouseId: localWarehouseId, 
        productId: selectedProductId, 
        requiredQuantity: requiredQty 
      }).unwrap();

      setPickResults(response.picks || []);

      if (response.picks && response.picks.length > 0) {
        const firstBinCode = response.picks[0].binCode;
        const aisles = 3, bays = 4, levels = 3; 
        const bayWidth = 3, levelHeight = 1.6, aisleSpacing = 5.5; 
        let foundPos: [number, number, number] | null = null;
        let dataIndex = 0;

        for (let a = 0; a < aisles; a++) {
          for (let b = 0; b < bays; b++) {
            for (let l = 0; l < levels; l++) {
              const binItem = bins[dataIndex] as any;
              const currentCode = binItem?.code || binItem?.binCode || `BIN-${a}-${b}-${l}`;
              
              if (currentCode === firstBinCode) {
                foundPos = [
                  (b - bays / 2 + 0.5) * bayWidth, 
                  l * levelHeight + (levelHeight / 2), 
                  (a - aisles / 2 + 0.5) * aisleSpacing
                ];
              }
              dataIndex++;
            }
          }
        }

        if (foundPos) {
          setFocusTarget(new THREE.Vector3(...foundPos));
        }
      } else {
        toast.error("Không tìm thấy đủ hàng trong kho theo yêu cầu.");
      }
    } catch (error) {
      console.error("Lỗi Auto Pick:", error);
      toast.error("Thuật toán tìm kiếm thất bại. Vui lòng thử lại.");
    } finally {
      setIsPicking(false);
    }
  };

  const handleResetCamera = () => {
    setFocusTarget(null);
    setPickResults([]);
  };

  if (isError) return (<div className="w-full h-[500px] flex justify-center items-center bg-slate-50 dark:bg-slate-900 rounded-3xl border border-dashed border-rose-200 transition-colors duration-500"><AlertOctagon className="w-12 h-12 text-rose-500 transition-colors duration-500"/></div>);

  return (
    <div className="relative w-full h-[700px] bg-[#090D14] rounded-3xl overflow-hidden shadow-2xl group transition-colors duration-500">
      
      {/* HEADER OVERLAY */}
      <div className="absolute top-6 left-6 z-10 pointer-events-none transition-colors duration-500">
        <h3 className="text-3xl font-black text-white flex items-center gap-2 drop-shadow-md transition-colors duration-500">
          <PackageSearch className="w-8 h-8 text-indigo-500 transition-colors duration-500" /> Digital Twin Warehouse
        </h3>
        <p className="text-sm font-semibold flex items-center gap-1.5 mt-2 bg-black/40 backdrop-blur-md w-fit px-4 py-2 rounded-xl border border-white/20 text-slate-200 transition-colors duration-500">
          <Target className="w-4 h-4 text-cyan-400 animate-pulse transition-colors duration-500"/> Dùng chuột để Cuộn, Zoom & Khám phá
        </p>
      </div>

      {/* WIDGET: AUTO PICK SMART PANEL */}
      <div className="absolute top-6 right-6 z-10 w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 flex flex-col overflow-hidden transition-colors duration-500">
        <div className="bg-gradient-to-r from-cyan-600 to-blue-600 p-4 flex items-center gap-3 text-white transition-colors duration-500">
          <Zap className="w-5 h-5 fill-white transition-colors duration-500" />
          <h4 className="font-bold text-sm transition-colors duration-500">Thuật toán Gom hàng FEFO</h4>
        </div>
        
        <div className="p-4 flex flex-col gap-4 transition-colors duration-500">
          
          {/* LỰA CHỌN KHO HÀNG (DYNAMICS) */}
          <div className="transition-colors duration-500">
            <label className="text-xs font-bold text-slate-500 mb-1 flex items-center gap-1 transition-colors duration-500"><Building2 className="w-3.5 h-3.5 transition-colors duration-500"/> Vị trí Kho:</label>
            <select 
              value={localWarehouseId} 
              onChange={(e) => {
                setLocalWarehouseId(e.target.value);
                setPickResults([]);
                setFocusTarget(null);
              }}
              className="w-full bg-slate-100 dark:bg-slate-800 p-2.5 rounded-lg text-sm border-none focus:ring-2 focus:ring-cyan-500 outline-none text-slate-900 dark:text-white font-semibold transition-colors duration-500 cursor-pointer"
            >
              <option value="">-- Chọn kho cần xem --</option>
              {warehouses.map((wh: any) => (
                <option key={wh.warehouseId} value={wh.warehouseId}>{wh.code} - {wh.name}</option>
              ))}
            </select>
          </div>

          <div className="transition-colors duration-500">
            <label className="text-xs font-bold text-slate-500 mb-1 block transition-colors duration-500">Chọn Sản phẩm (SKU):</label>
            <select 
              value={selectedProductId} 
              onChange={(e) => setSelectedProductId(e.target.value)}
              disabled={!localWarehouseId}
              className="w-full bg-slate-100 dark:bg-slate-800 p-2.5 rounded-lg text-sm border-none focus:ring-2 focus:ring-cyan-500 outline-none text-slate-900 dark:text-white disabled:opacity-50 transition-colors duration-500 cursor-pointer"
            >
              <option value="">-- Chọn vật tư cần xuất --</option>
              {products.map((p: any) => (
                <option key={p.productId} value={p.productId}>{p.productCode} - {p.name}</option>
              ))}
            </select>
          </div>

          <div className="transition-colors duration-500">
            <label className="text-xs font-bold text-slate-500 mb-1 block transition-colors duration-500">Số lượng cần xuất:</label>
            <input 
              type="number" min="1" 
              value={requiredQty} onChange={(e) => setRequiredQty(Number(e.target.value))}
              disabled={!localWarehouseId || !selectedProductId}
              className="w-full bg-slate-100 dark:bg-slate-800 p-2.5 rounded-lg text-sm border-none focus:ring-2 focus:ring-cyan-500 outline-none text-slate-900 dark:text-white disabled:opacity-50 transition-colors duration-500"
            />
          </div>

          <div className="flex gap-2 mt-2 transition-colors duration-500">
            <button 
              onClick={handleRunAlgorithm}
              disabled={isPicking || !selectedProductId || !localWarehouseId}
              className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2.5 rounded-xl shadow-lg shadow-cyan-600/30 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 duration-500"
            >
              {isPicking ? <Loader2 className="w-4 h-4 animate-spin transition-colors duration-500"/> : <Target className="w-4 h-4 transition-colors duration-500" />}
              Chạy AI Pick
            </button>
            
            {pickResults.length > 0 && (
              <button onClick={handleResetCamera} className="px-3 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl transition-all active:scale-95 duration-500">
                <RotateCcw className="w-5 h-5 transition-colors duration-500" />
              </button>
            )}
          </div>
        </div>

        {/* RESULTS PANEL */}
        <AnimatePresence>
          {pickResults.length > 0 && (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-white/10 p-4 max-h-48 overflow-y-auto custom-scrollbar transition-colors duration-500">
              <h5 className="text-xs font-black text-cyan-600 dark:text-cyan-400 mb-3 flex items-center gap-2 transition-colors duration-500">
                <CheckCircle2 className="w-4 h-4 transition-colors duration-500" /> KẾT QUẢ ĐIỀU HƯỚNG
              </h5>
              <div className="flex flex-col gap-2 transition-colors duration-500">
                {pickResults.map((p, i) => (
                  <div key={i} className="flex justify-between items-center bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-white/5 shadow-sm transition-colors duration-500">
                    <span className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2 transition-colors duration-500">
                      <BoxIcon className="w-4 h-4 text-slate-400 transition-colors duration-500" /> {p.binCode}
                    </span>
                    <span className="text-xs font-black bg-cyan-100 dark:bg-cyan-900/50 text-cyan-700 dark:text-cyan-300 px-2 py-1 rounded transition-colors duration-500">Lấy {p.quantity}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* LEGEND BOTTOM LEFT */}
      {localWarehouseId && (
        <div className="absolute bottom-6 left-6 z-10 bg-black/60 backdrop-blur-xl p-5 rounded-2xl border border-white/10 transition-colors duration-500">
          <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2 transition-colors duration-500"><Maximize className="w-4 h-4 transition-colors duration-500" /> Tình trạng tải</h4>
          <div className="space-y-3 text-sm font-bold text-white transition-colors duration-500">
            <div className="flex items-center justify-between gap-8 transition-colors duration-500"><span className="flex items-center gap-2 transition-colors duration-500"><span className="w-4 h-4 rounded bg-rose-500 transition-colors duration-500"></span> Quá tải</span> <span className="transition-colors duration-500">{stats.full}</span></div>
            <div className="flex items-center justify-between gap-8 transition-colors duration-500"><span className="flex items-center gap-2 transition-colors duration-500"><span className="w-4 h-4 rounded bg-amber-500 transition-colors duration-500"></span> Đang dùng</span> <span className="transition-colors duration-500">{stats.partial}</span></div>
            <div className="flex items-center justify-between gap-8 transition-colors duration-500"><span className="flex items-center gap-2 transition-colors duration-500"><span className="w-4 h-4 rounded border-2 border-emerald-500 transition-colors duration-500"></span> Trống</span> <span className="transition-colors duration-500">{stats.empty}</span></div>
          </div>
        </div>
      )}

      {/* EMPTY STATE OVERLAY (Khi chưa chọn Kho) */}
      {!localWarehouseId && !loadingBins && (
        <div className="absolute inset-0 z-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none transition-colors duration-500">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center justify-center p-8 bg-slate-900/80 rounded-3xl border border-white/10 shadow-2xl transition-colors duration-500"
          >
            <Building2 className="w-16 h-16 text-cyan-500 mb-4 opacity-80 transition-colors duration-500" />
            <h2 className="text-xl font-bold text-white mb-2 transition-colors duration-500">Chưa chọn Kho hàng</h2>
            <p className="text-slate-400 text-sm max-w-sm text-center transition-colors duration-500">Vui lòng chọn một kho hàng từ bảng điều khiển bên phải để tải và hiển thị bản sao kỹ thuật số 3D của hệ thống giá kệ.</p>
          </motion.div>
        </div>
      )}

      {/* 3D RENDER SCENE */}
      <div className="absolute inset-0 cursor-grab active:cursor-grabbing transition-colors duration-500">
        {loadingBins ? (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900/50 backdrop-blur-sm z-50 transition-colors duration-500">
            <Loader2 className="w-12 h-12 animate-spin text-cyan-500 mb-4 transition-colors duration-500" />
          </div>
        ) : (
          <Suspense fallback={null}>
            <Canvas camera={{ position: [25, 20, 30], fov: 40 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}>
              <WarehouseScene 
                binsData={bins} 
                highlightedPicksMap={highlightedPicksMap} // 🚀 ĐÃ TRUYỀN HASH MAP TỐI ƯU
                focusTarget={focusTarget} 
                isWarehouseSelected={!!localWarehouseId}
              />
            </Canvas>
          </Suspense>
        )}
      </div>
    </div>
  );
}