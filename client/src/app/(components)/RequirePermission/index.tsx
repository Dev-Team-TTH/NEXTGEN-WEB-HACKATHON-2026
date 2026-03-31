"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useAppSelector } from "@/app/redux";

interface RequirePermissionProps {
  roles?: string[];
  permissions?: string[];
  requireAll?: boolean;
  children: React.ReactNode; 
  fallback?: React.ReactNode;
}

export const checkUniversalPermission = (user: any, requiredRoles?: string[], requiredPerms?: string[], requireAll: boolean = false) => {
  if (!user) return false;

  // 1. TRÍCH XUẤT MÃ QUYỀN (DYNAMIC EXTRACTION)
  // Backend có thể trả về mảng String, hoặc mảng Object { permission: { code: '...' } }
  let extractedCodes: string[] = [];
  if (Array.isArray(user.permissions)) {
    extractedCodes = user.permissions.map((p: any) => {
       if (typeof p === 'string') return p;
       if (p?.permission?.code) return p.permission.code;
       if (p?.code) return p.code;
       return "";
    }).filter(Boolean);
  }

  // 2. TẠO HASH SET ĐỂ KIỂM TRA O(1)
  const userPermsSet = new Set(extractedCodes.map(c => c.toUpperCase()));

  // 3. KIỂM TRA QUYỀN TỐI CAO
  if (userPermsSet.has("ALL") || userPermsSet.has("*") || userPermsSet.has("FULL_ACCESS")) {
    return true;
  }

  // 4. MỞ CỬA NẾU KHÔNG YÊU CẦU GÌ
  if ((!requiredRoles || requiredRoles.length === 0) && (!requiredPerms || requiredPerms.length === 0)) {
    return true;
  }

  const userRole = (user.role || "").toUpperCase();

  // 5. KIỂM TRA THEO TÊN ROLE
  let hasRole = false;
  let checkRole = false;
  if (requiredRoles && requiredRoles.length > 0) {
    checkRole = true;
    hasRole = requiredRoles.some((r: string) => userRole === r.toUpperCase());
  }

  // 6. KIỂM TRA EXACT MATCH QUYỀN HẠN
  let hasPerm = false;
  let checkPerm = false;
  if (requiredPerms && requiredPerms.length > 0) {
    checkPerm = true;
    
    if (requireAll) {
      hasPerm = requiredPerms.every((reqP: string) => userPermsSet.has(reqP.toUpperCase()));
    } else {
      hasPerm = requiredPerms.some((reqP: string) => userPermsSet.has(reqP.toUpperCase()));
    }
  }

  // 7. TRẢ VỀ KẾT QUẢ LOGIC
  if (checkRole && checkPerm) {
    return requireAll ? (hasRole && hasPerm) : (hasRole || hasPerm);
  } else if (checkRole) {
    return hasRole;
  } else if (checkPerm) {
    return hasPerm;
  }

  return false;
};

export default function RequirePermission({
  roles,
  permissions,
  requireAll = false,
  children,
  fallback = null
}: RequirePermissionProps) {
  const [isMounted, setIsMounted] = useState(false);
  const currentUser = useAppSelector((state: any) => state.global?.currentUser);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const isAllowed = useMemo(() => {
    if (!isMounted) return false;
    return checkUniversalPermission(currentUser, roles, permissions, requireAll);
  }, [currentUser, roles, permissions, requireAll, isMounted]);

  if (!isMounted) return <span className="transition-colors duration-500">{fallback}</span>;

  if (isAllowed) {
    return <span className="transition-colors duration-500">{children}</span>;
  }

  return <span className="transition-colors duration-500">{fallback}</span>;
}