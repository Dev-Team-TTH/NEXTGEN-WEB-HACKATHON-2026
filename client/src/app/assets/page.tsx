"use client";

import { useState, useMemo, ChangeEvent, FormEvent } from "react";
import { 
  useGetAssetsQuery, 
  useCreateAssetMutation, 
  useDeleteAssetMutation 
} from "@/state/api";
import { PlusCircleIcon, Search, Briefcase, Trash2, X, Save, BoxSelect } from "lucide-react";
import Header from "@/app/(components)/Header";
import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

const AssetsPage = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "", category: "Thiết bị điện tử", status: "Sẵn sàng", assignedTo: "", purchaseDate: "", price: 0
  });

  const { data: assets, isLoading, isError } = useGetAssetsQuery();
  const [createAsset, { isLoading: isCreating }] = useCreateAssetMutation();
  const [deleteAsset] = useDeleteAssetMutation();

  const CustomNoRowsOverlay = () => (
    <div className="flex flex-col items-center justify-center h-full text-gray-500">
      <BoxSelect className="w-16 h-16 mb-4 text-gray-300" />
      <span className="text-lg font-medium">{t("assets.empty")}</span>
    </div>
  );

  const filteredAssets = useMemo(() => {
    if (!assets) return [];
    if (!searchTerm) return assets;
    return assets.filter((a) => a.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [assets, searchTerm]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: name === "price" ? parseFloat(value) || 0 : value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    try {
      await createAsset({
        ...formData,
        assignedTo: formData.assignedTo || undefined,
        purchaseDate: new Date(formData.purchaseDate).toISOString(),
      }).unwrap();
      toast.success("Thành công! / Success!");
      setIsModalOpen(false);
      setFormData({ name: "", category: "Thiết bị điện tử", status: "Sẵn sàng", assignedTo: "", purchaseDate: "", price: 0 });
    } catch (error) {
      toast.error("Lỗi! / Error!");
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Bạn có chắc chắn muốn xóa? / Are you sure?")) {
      try {
        await deleteAsset(id).unwrap();
        toast.success("Đã xóa! / Deleted!");
      } catch (error) {
        toast.error("Lỗi xóa! / Delete error!");
      }
    }
  };

  const columns: GridColDef[] = [
    { field: "assetId", headerName: t("assets.columns.id"), width: 130 },
    { field: "name", headerName: t("assets.columns.name"), minWidth: 250, flex: 1 },
    { 
      field: "category", headerName: t("assets.columns.category"), width: 180,
      renderCell: (params) => {
        switch(params.value) {
          case "Thiết bị điện tử": return t("assets.options.electronics");
          case "Nội thất": return t("assets.options.furniture");
          case "Phương tiện": return t("assets.options.vehicles");
          case "Máy móc công nghiệp": return t("assets.options.machinery");
          default: return params.value;
        }
      }
    },
    { 
      field: "status", headerName: t("assets.columns.status"), width: 150,
      renderCell: (params) => {
        let colorClass = "bg-gray-100 text-gray-800";
        let label = params.value;
        if (params.value === "Đang sử dụng") { colorClass = "bg-blue-100 text-blue-800"; label = t("assets.options.inUse"); }
        if (params.value === "Sẵn sàng") { colorClass = "bg-green-100 text-green-800"; label = t("assets.options.ready"); }
        if (params.value === "Đang bảo trì") { colorClass = "bg-yellow-100 text-yellow-800"; label = t("assets.options.maintenance"); }
        return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colorClass}`}>{label}</span>;
      }
    },
    { field: "assignedTo", headerName: t("assets.columns.assignedTo"), width: 180, renderCell: (params) => params.value || "-" },
    { 
      field: "purchaseDate", headerName: t("assets.columns.purchaseDate"), width: 130,
      renderCell: (params) => new Date(params.value).toLocaleDateString("vi-VN")
    },
    { 
      field: "price", headerName: t("assets.columns.price"), width: 150, type: "number",
      renderCell: (params) => <span className="font-semibold text-blue-600">${params.value}</span>
    },
    {
      field: "actions", headerName: t("assets.columns.actions"), width: 100, sortable: false, filterable: false,
      renderCell: (params) => (
        <button onClick={() => handleDelete(params.row.assetId)} className="mt-3 p-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-colors shadow-sm">
          <Trash2 className="w-4 h-4" />
        </button>
      )
    }
  ];

  if (isLoading) return <div className="py-4 text-center text-gray-500 font-medium">Loading...</div>;
  if (isError) return <div className="text-center text-red-500 py-4 font-semibold mt-5">Error!</div>;

  return (
    <div className="flex flex-col w-full pb-10 relative">
      <Header 
        name={t("assets.title")} 
        subtitle={t("assets.subtitle")}
        icon={Briefcase}
        action={
          <button onClick={() => setIsModalOpen(true)} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95">
            <PlusCircleIcon className="w-5 h-5 mr-2" /> {t("assets.createBtn")}
          </button>
        }
      />

      <div className="mt-2 mb-6 flex items-center border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 shadow-sm w-full md:w-1/2 focus-within:border-blue-500 overflow-hidden">
        <Search className="w-5 h-5 text-gray-400 ml-4 mr-2" />
        <input
          type="text" placeholder={t("assets.searchPlaceholder")}
          value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full py-3 px-2 bg-transparent focus:outline-none dark:text-white text-gray-800 font-medium"
        />
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-xl rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700 h-[65vh]">
        <DataGrid
          rows={filteredAssets} columns={columns} getRowId={(row) => row.assetId}
          disableRowSelectionOnClick slots={{ noRowsOverlay: CustomNoRowsOverlay }}
          className="!border-none !text-gray-700 dark:!text-gray-200"
          sx={{
            "& .MuiDataGrid-cell": { borderBottom: "1px solid rgba(229, 231, 235, 0.4)", display: "flex", alignItems: "center" },
            "& .MuiDataGrid-columnHeaders": { backgroundColor: "rgba(243, 244, 246, 0.8)", borderBottom: "1px solid rgba(229, 231, 235, 0.5)", fontWeight: "bold" },
          }}
        />
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4 transition-all">
          <div className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-blue-600" /> {t("assets.modal.title")}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 bg-white dark:bg-gray-700 rounded-full shadow-sm transition-all"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t("assets.modal.name")} <span className="text-red-500">*</span></label>
                <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 outline-none" required />
              </div>
              
              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t("assets.modal.category")}</label>
                  <select name="category" value={formData.category} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 outline-none">
                    <option value="Thiết bị điện tử">{t("assets.options.electronics")}</option>
                    <option value="Nội thất">{t("assets.options.furniture")}</option>
                    <option value="Phương tiện">{t("assets.options.vehicles")}</option>
                    <option value="Máy móc công nghiệp">{t("assets.options.machinery")}</option>
                  </select>
                </div>
                <div className="w-1/2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t("assets.modal.status")}</label>
                  <select name="status" value={formData.status} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 outline-none">
                    <option value="Sẵn sàng">{t("assets.options.ready")}</option>
                    <option value="Đang sử dụng">{t("assets.options.inUse")}</option>
                    <option value="Đang bảo trì">{t("assets.options.maintenance")}</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-1/2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t("assets.modal.purchaseDate")} <span className="text-red-500">*</span></label>
                  <input type="date" name="purchaseDate" value={formData.purchaseDate} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 outline-none" required />
                </div>
                <div className="w-1/2">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t("assets.modal.price")} <span className="text-red-500">*</span></label>
                  <input type="number" name="price" value={formData.price} onChange={handleChange} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 outline-none" required min="0" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">{t("assets.modal.assignedTo")}</label>
                <input type="text" name="assignedTo" value={formData.assignedTo} onChange={handleChange} placeholder={t("assets.modal.assignedToPlaceholder")} className="w-full px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-600 focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 outline-none" />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-700 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">{t("assets.modal.cancel")}</button>
                <button type="submit" disabled={isCreating} className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all flex items-center gap-2">
                  <Save className="w-4 h-4" /> {t("assets.modal.save")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetsPage;