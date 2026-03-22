import { MasterDataField } from "./UniversalMasterDataModal";

export const getFormConfig = (
  subTab: string, 
  ctx: { companies: any[], branches: any[], warehouses: any[], currencies: any[], taxes: any[], accounts: any[] }
): { title: string, subtitle: string, fields: MasterDataField[] } => {
  switch (subTab) {
    case "branches": return { 
      title: "Cấu hình Chi nhánh", subtitle: "Khai báo Cơ sở / Chi nhánh trực thuộc Công ty", 
      fields: [
        { name: "companyId", label: "Thuộc Công ty (Pháp nhân)", type: "select", options: (ctx.companies || []).map(c => ({ label: c.name, value: c.companyId || c.id })), required: true },
        { name: "code", label: "Mã Chi nhánh", type: "text", required: true }, 
        { name: "name", label: "Tên Chi nhánh", type: "text", required: true }, 
        { name: "address", label: "Địa chỉ", type: "textarea" }
      ] 
    };
    case "departments": return { 
      title: "Phòng ban", subtitle: "Cấu trúc tổ chức nhân sự", 
      fields: [
        { name: "branchId", label: "Thuộc Chi nhánh", type: "select", options: (ctx.branches || []).map(b => ({ label: `[${b.code}] ${b.name}`, value: b.branchId || b.id })), required: true },
        { name: "code", label: "Mã Phòng", type: "text", required: true }, 
        { name: "name", label: "Tên Phòng", type: "text", required: true }
      ] 
    };
    case "warehouses": return { 
      title: "Kho lưu trữ", subtitle: "Không gian vật lý chứa hàng", 
      fields: [
        { name: "branchId", label: "Thuộc Chi nhánh quản lý", type: "select", options: (ctx.branches || []).map(b => ({ label: `[${b.code}] ${b.name}`, value: b.branchId || b.id })), required: true },
        { name: "code", label: "Mã Kho", type: "text", required: true }, 
        { name: "name", label: "Tên Kho", type: "text", required: true }, 
        { name: "address", label: "Địa chỉ Kho", type: "textarea" }
      ] 
    }; 
    case "bins": return { 
      title: "Vị trí Kệ (Bin)", subtitle: "Tọa độ chi tiết trong kho", 
      fields: [
        { 
          name: "warehouseId", 
          label: "Thuộc Kho vật lý", 
          type: "select", 
          options: (ctx.warehouses || []).map(w => {
            const branch = (ctx.branches || []).find(b => (b.branchId || b.id) === w.branchId);
            return { 
              label: `[Kho: ${w.code}] ${w.name} ${branch ? `(CN: ${branch.name})` : ''}`, 
              value: w.warehouseId || w.id 
            };
          }), 
          required: true 
        },
        { name: "code", label: "Mã Kệ (Bin Code)", type: "text", required: true }, 
        { name: "description", label: "Mô tả / Ghi chú", type: "text" }
      ] 
    }; 
    
    case "suppliers": return { 
      title: "Nhà Cung Cấp", subtitle: "Quản lý đối tác bán hàng, vật tư cho công ty", 
      fields: [
        { name: "code", label: "Mã NCC", type: "text", required: true }, 
        { name: "name", label: "Tên Pháp nhân / Công ty", type: "text", required: true }, 
        { name: "taxCode", label: "Mã số Thuế", type: "text" }, 
        { name: "contactPerson", label: "Người liên hệ (Đại diện)", type: "text" }, 
        { name: "phone", label: "Số điện thoại", type: "tel" }, 
        { name: "email", label: "Email Giao dịch", type: "email" }, 
        { name: "currencyCode", label: "Đồng tiền GD mặc định", type: "select", options: (ctx.currencies || []).map(c => ({ label: `${c.currencyCode} - ${c.name}`, value: c.currencyCode })) },
        { name: "paymentTerms", label: "Điều khoản Thanh toán (VD: Net 30)", type: "text" },
        { name: "address", label: "Địa chỉ trụ sở", type: "textarea" }
      ] 
    };
    case "customers": return { 
      title: "Khách hàng", subtitle: "Quản lý đối tác mua hàng, dịch vụ", 
      fields: [
        { name: "code", label: "Mã KH", type: "text", required: true }, 
        { name: "name", label: "Tên Khách hàng", type: "text", required: true }, 
        { name: "taxCode", label: "Mã số Thuế", type: "text" }, 
        { name: "contactPerson", label: "Người liên hệ (Đại diện)", type: "text" }, 
        { name: "phone", label: "Số điện thoại", type: "tel" }, 
        { name: "email", label: "Email Giao dịch", type: "email" }, 
        { name: "currencyCode", label: "Đồng tiền GD mặc định", type: "select", options: (ctx.currencies || []).map(c => ({ label: `${c.currencyCode} - ${c.name}`, value: c.currencyCode })) },
        { name: "creditLimit", label: "Hạn mức nợ (Credit Limit)", type: "number", placeholder: "VD: 500000000" },
        { name: "address", label: "Địa chỉ", type: "textarea" }
      ] 
    };
    case "categories": return { 
      title: "Nhóm Hàng (Category)", subtitle: "Phân loại Hàng hóa & Thiết lập Thuế suất mặc định", 
      fields: [
        { name: "code", label: "Mã Nhóm", type: "text", required: true }, 
        { name: "name", label: "Tên Nhóm Hàng", type: "text", required: true }, 
        { name: "taxId", label: "Thuế suất mặc định (Áp dụng cho Hàng hóa)", type: "select", options: (ctx.taxes || []).map(t => ({ label: `[${t.code || t.taxCode}] ${t.name} (${t.rate}%)`, value: t.taxId || t.id })) },
        { name: "description", label: "Mô tả Ngành hàng", type: "textarea" }
      ] 
    };
    case "uoms": return { 
      title: "Đơn vị tính (UoM)", subtitle: "Từ điển chuẩn hóa thước đo Khối lượng/Số lượng", 
      fields: [
        { name: "code", label: "Mã ĐVT (VD: KG, CAI)", type: "text", required: true }, 
        { name: "name", label: "Tên hiển thị (Kilogram, Cái)", type: "text", required: true },
        { name: "uomType", label: "Phân loại Đơn vị (UoM Type)", type: "select", options: [{ label: "Số lượng (Cái, Hộp, Thùng)", value: "UNIT" }, { label: "Khối lượng (Kg, Gam, Tấn)", value: "WEIGHT" }, { label: "Thể tích (Lít, ml, Khối)", value: "VOLUME" }, { label: "Chiều dài/DT (Mét, m2)", value: "LENGTH" }], required: true }
      ] 
    };
    case "taxes": return { 
      title: "Biểu Thuế (Taxes)", subtitle: "Danh mục thuế suất phục vụ Bán hàng và Mua hàng", 
      fields: [
        { name: "code", label: "Mã Thuế (VD: VAT10)", type: "text", required: true }, 
        { name: "name", label: "Tên gọi/Nhóm Thuế", type: "text", required: true }, 
        { name: "rate", label: "Thuế suất (%)", type: "number", required: true },
        { name: "description", label: "Diễn giải chi tiết", type: "textarea" }
      ] 
    };
    case "currencies": return { 
      title: "Tiền tệ & Tỷ giá", subtitle: "Từ điển đồng tiền và tỷ giá hạch toán tham chiếu", 
      fields: [
        { name: "currencyCode", label: "Mã Tiền tệ ISO (VD: USD, VND)", type: "text", required: true }, 
        { name: "name", label: "Tên gọi (VD: Đô la Mỹ)", type: "text", required: true }, 
        { name: "symbol", label: "Ký hiệu tiền tệ (VD: $, ₫, €)", type: "text", required: true }, 
        { name: "exchangeRate", label: "Tỷ giá tham chiếu", type: "number", required: true }
      ] 
    };
    case "accounts": return { 
      title: "Sổ cái Tài khoản (Chart of Accounts)", subtitle: "Cấu trúc Cây tài khoản phục vụ Kế toán Tổng hợp", 
      fields: [
        { name: "accountCode", label: "Số hiệu TK (VD: 111, 1111)", type: "text", required: true }, 
        { name: "name", label: "Tên Tài khoản", type: "text", required: true }, 
        { 
          name: "type", 
          label: "Nhóm Tài khoản (Type)", 
          type: "select", 
          options: [
            {label: "Tiền mặt & Tương đương (CASH)", value: "CASH"}, 
            {label: "Tài khoản Ngân hàng (BANK)", value: "BANK"}, 
            {label: "Các khoản Phải thu (AR)", value: "AR"}, 
            {label: "Các khoản Phải trả (AP)", value: "AP"}, 
            {label: "Chi phí (EXPENSE)", value: "EXPENSE"}, 
            {label: "Doanh thu (REVENUE)", value: "REVENUE"},
            {label: "Hàng tồn kho (INVENTORY)", value: "INVENTORY"},
            {label: "Tài sản cố định (ASSET)", value: "ASSET"},
            {label: "Vốn Chủ sở hữu (EQUITY)", value: "EQUITY"}
          ], 
          required: true 
        },
        { 
          name: "parentAccountId", 
          label: "Trực thuộc Tài khoản Cấp trên (Tài khoản Cha)", 
          type: "select", 
          options: (ctx.accounts || []).map(a => ({ label: `[${a.accountCode}] ${a.name}`, value: a.accountId || a.id })) 
        }
      ] 
    };
    default: return { title: "Dữ liệu", subtitle: "", fields: [] };
  }
};