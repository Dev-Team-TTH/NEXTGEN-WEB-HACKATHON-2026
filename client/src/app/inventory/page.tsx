"use client";

import { 
  useGetProductsQuery, 
  useUpdateProductMutation, 
  useDeleteProductMutation,
  Product 
} from "@/state/api";
import Header from "@/app/(components)/Header";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Archive, Download, Search, PackageOpen, Edit, Trash2, X, Save } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { useState, useMemo, ChangeEvent, FormEvent } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";

// GIAO DIỆN KHI KHÔNG TÌM THẤY DỮ LIỆU
const CustomNoRowsOverlay = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
      <PackageOpen className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
      <span className="text-lg font-medium">Không tìm thấy vật tư / sản phẩm nào</span>
    </div>
  );
};

const Inventory = () => {
  const { t } = useTranslation();
  
  // 1. STATES
  const [searchTerm, setSearchTerm] = useState("");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // 2. API HOOKS
  const { data: products, isError, isLoading } = useGetProductsQuery();
  const [updateProduct] = useUpdateProductMutation();
  const [deleteProduct] = useDeleteProductMutation();

  // 3. THUẬT TOÁN SMART SEARCH
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!searchTerm) return products;
    
    const lowerCaseSearch = searchTerm.toLowerCase();
    
    return products.filter((product) => 
      product.name.toLowerCase().includes(lowerCaseSearch) ||
      product.productId.toLowerCase().includes(lowerCaseSearch)
    );
  }, [products, searchTerm]);

  // 4. HÀM XỬ LÝ XÓA SẢN PHẨM (DELETE)
  const handleDelete = async (productId: string) => {
    if (window.confirm(t("inventory.deleteConfirm"))) {
      try {
        await deleteProduct(productId).unwrap();
        toast.success(t("inventory.deleteSuccess"));
      } catch (error) {
        toast.error("Lỗi khi xóa sản phẩm!");
      }
    }
  };

  // 5. HÀM XỬ LÝ MỞ MODAL SỬA SẢN PHẨM (UPDATE)
  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsEditModalOpen(true);
  };

  const handleEditChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!editingProduct) return;
    const { name, value } = e.target;
    setEditingProduct({
      ...editingProduct,
      [name]:
        name === "price" || name === "stockQuantity" || name === "rating"
          ? parseFloat(value) || 0
          : value,
    });
  };

  const submitEdit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      await updateProduct({
        productId: editingProduct.productId,
        updatedProduct: {
          name: editingProduct.name,
          price: editingProduct.price,
          rating: editingProduct.rating,
          stockQuantity: editingProduct.stockQuantity,
        }
      }).unwrap();
      
      toast.success(t("inventory.updateSuccess"));
      setIsEditModalOpen(false);
      setEditingProduct(null);
    } catch (error) {
      toast.error("Lỗi khi cập nhật sản phẩm!");
    }
  };

  // 6. HÀM XUẤT EXCEL CHUẨN DOANH NGHIỆP (EXCELJS)
  const handleExport = async () => {
    if (!filteredProducts || filteredProducts.length === 0) {
      toast.warning("Không có dữ liệu để xuất!");
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(t("inventory.exportFileName") || "TonKho");

    worksheet.columns = [
      { header: t("inventory.columns.id"), key: "id", width: 15 },
      { header: t("inventory.columns.name"), key: "name", width: 45 },
      { header: t("inventory.columns.price"), key: "price", width: 18 },
      { header: t("inventory.columns.rating"), key: "rating", width: 15 },
      { header: t("inventory.columns.stock"), key: "stock", width: 20 },
    ];

    worksheet.autoFilter = "A1:E1";

    const headerRow = worksheet.getRow(1);
    headerRow.height = 30;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E3A8A" },
      };
      cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      };
    });

    filteredProducts.forEach((item, index) => {
      const row = worksheet.addRow({
        id: item.productId,
        name: item.name,
        price: item.price,
        rating: item.rating || "N/A",
        stock: item.stockQuantity,
      });

      const isEvenRow = index % 2 === 0;

      row.eachCell((cell, colNumber) => {
        cell.alignment = {
          vertical: "middle",
          horizontal: colNumber === 2 ? "left" : "center",
        };

        if (colNumber === 3) cell.numFmt = '"$"#,##0.00';
        if (colNumber === 5) cell.numFmt = '#,##0';

        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: isEvenRow ? "FFFFFFFF" : "FFF3F4F6" },
        };

        cell.border = {
          top: { style: "thin", color: { argb: "FFD1D5DB" } },
          left: { style: "thin", color: { argb: "FFD1D5DB" } },
          bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
          right: { style: "thin", color: { argb: "FFD1D5DB" } },
        };
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const today = new Date();
    const dateString = `${today.getDate().toString().padStart(2, "0")}-${(today.getMonth() + 1).toString().padStart(2, "0")}-${today.getFullYear()}`;
    const fileName = `${t("inventory.exportFileName") || "Danh_Sach_Ton_Kho"}_${dateString}.xlsx`;

    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, fileName);
    toast.success("Xuất file Excel chuyên nghiệp thành công!");
  };

  // 7. CẤU HÌNH CỘT CHO BẢNG DATAGRID (CÓ THÊM CỘT ACTIONS)
  const columns: GridColDef[] = [
    { field: "productId", headerName: t("inventory.columns.id"), width: 120 },
    { field: "name", headerName: t("inventory.columns.name"), width: 300 },
    {
      field: "price",
      headerName: t("inventory.columns.price"),
      width: 150,
      type: "number",
      valueGetter: (value, row) => row.price,
      renderCell: (params) => (
        <span className="font-semibold text-blue-600 dark:text-blue-400">
          ${params.row.price}
        </span>
      ), 
    },
    {
      field: "rating",
      headerName: t("inventory.columns.rating"),
      width: 150,
      type: "number",
      valueGetter: (value, row) => (row.rating ? row.rating : 0),
      renderCell: (params) => (params.row.rating ? params.row.rating : "N/A"),
    },
    {
      field: "stockQuantity",
      headerName: t("inventory.columns.stock"),
      width: 180,
      type: "number",
      renderCell: (params) => {
        const stock = params.row.stockQuantity;
        const isLowStock = stock < 100000;
        
        return (
          <div className="flex items-center gap-2 mt-3">
            <span className={`w-2.5 h-2.5 rounded-full shadow-sm ${isLowStock ? "bg-red-500 animate-pulse" : "bg-green-500"}`}></span>
            <span className={isLowStock ? "text-red-500 font-bold" : "text-green-600 dark:text-green-400 font-medium"}>
              {stock.toLocaleString()}
            </span>
          </div>
        );
      }
    },
    // CỘT HÀNH ĐỘNG (SỬA / XÓA)
    {
      field: "actions",
      headerName: t("inventory.columns.actions") || "Hành động",
      width: 150,
      sortable: false,
      filterable: false,
      renderCell: (params) => (
        <div className="flex items-center gap-3 mt-2.5">
          <button
            onClick={() => openEditModal(params.row)}
            className="p-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-600 dark:hover:text-white rounded-lg transition-colors shadow-sm tooltip"
            title={t("inventory.edit")}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDelete(params.row.productId)}
            className="p-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-600 dark:hover:text-white rounded-lg transition-colors shadow-sm tooltip"
            title={t("inventory.delete")}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  if (isLoading) {
    return <div className="py-4 text-center text-gray-500 dark:text-gray-400 font-medium">{t("inventory.loading")}</div>;
  }

  if (isError || !products) {
    return (
      <div className="text-center text-red-500 py-4 font-semibold bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 mt-5">
        {t("inventory.error")}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full pb-10">
      <Header 
        name={t("sidebar.inventory")} 
        subtitle={t("pages.inventorySubtitle")}
        icon={Archive}
        action={
          <button 
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95"
            onClick={handleExport}
          >
            <Download className="w-5 h-5" />
            {t("inventory.exportBtn")}
          </button>
        }
      />
      
      <div className="mt-2 mb-6 flex items-center border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 transition-colors shadow-sm w-full md:w-1/2 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100 dark:focus-within:ring-blue-900/30 overflow-hidden">
        <Search className="w-5 h-5 text-gray-400 ml-4 mr-2" />
        <input
          className="w-full py-3 px-2 bg-transparent focus:outline-none dark:text-white text-gray-800 font-medium"
          placeholder={t("products.searchPlaceholder") || "Tìm kiếm vật tư theo Tên hoặc Mã ID..."}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 transition-colors h-[65vh]">
        <DataGrid
          rows={filteredProducts}
          columns={columns}
          getRowId={(row) => row.productId}
          checkboxSelection
          disableRowSelectionOnClick
          slots={{
            noRowsOverlay: CustomNoRowsOverlay,
          }}
          className="!border-none !text-gray-700 dark:!text-gray-200"
          sx={{
            "& .MuiDataGrid-cell": {
              borderColor: "rgba(229, 231, 235, 0.2) !important",
              display: "flex",
              alignItems: "center",
              fontSize: "0.9rem",
            },
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "rgba(243, 244, 246, 0.8) !important",
              borderBottom: "1px solid rgba(229, 231, 235, 0.5) !important",
              color: "inherit",
              fontSize: "0.85rem",
              fontWeight: "700",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            },
            "& .MuiDataGrid-footerContainer": {
              borderTop: "1px solid rgba(229, 231, 235, 0.5) !important",
              color: "inherit",
            },
            "& .MuiTablePagination-root": {
              color: "inherit",
            },
            "& .MuiCheckbox-root": {
              color: "inherit",
            }
          }}
        />
      </div>

      {/* MODAL CHỈNH SỬA SẢN PHẨM NHÚNG TRỰC TIẾP */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-gray-900/60 backdrop-blur-sm p-4 transition-all">
          <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-600" />
                {t("inventory.editTitle")}
              </h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 bg-white dark:bg-gray-700 rounded-full shadow-sm hover:bg-gray-100 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={submitEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t("inventory.columns.name")}
                </label>
                <input
                  type="text"
                  name="name"
                  value={editingProduct.name}
                  onChange={handleEditChange}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white outline-none transition-all"
                  required
                />
              </div>
              
              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t("inventory.columns.price")}
                  </label>
                  <input
                    type="number"
                    name="price"
                    value={editingProduct.price}
                    onChange={handleEditChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white outline-none transition-all"
                    required
                  />
                </div>
                <div className="w-1/2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    {t("inventory.columns.rating")}
                  </label>
                  <input
                    type="number"
                    name="rating"
                    min="0"
                    max="5"
                    value={editingProduct.rating}
                    onChange={handleEditChange}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 dark:text-white outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t("inventory.columns.stock")}
                </label>
                <input
                  type="number"
                  name="stockQuantity"
                  value={editingProduct.stockQuantity}
                  onChange={handleEditChange}
                  className="w-full px-4 py-3 text-lg font-bold text-blue-600 dark:text-blue-400 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 outline-none transition-all"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700 mt-6">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                  {t("inventory.cancel")}
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 active:scale-95"
                >
                  <Save className="w-4 h-4" /> {t("inventory.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;