import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import {
  Warehouse,
  MapPin,
  Thermometer,
  AlertTriangle,
  Plus,
  X,
  ChevronRight,
  Home,
} from "lucide-react";
import { useDashboard } from "../hooks/useDashboard";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "../components/ui/breadcrumb";
import type { Warehouse as WarehouseType } from "../types";

export function WarehousesPage() {
  const navigate = useNavigate();
  const { warehouses: apiWarehouses, loading } = useDashboard();

  // Trạng thái đóng mở Modal
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Trạng thái dữ liệu form mới
  const [formData, setFormData] = useState({
    name: "",
    location: "",
    targetTemp: "",
    targetHumidity: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Gọi API tạo kho mới
    console.log("Dữ liệu kho mới:", formData);
    setIsModalOpen(false);
    setFormData({ name: "", location: "", targetTemp: "", targetHumidity: "" });
  };

  return (
    <div className="p-8 space-y-6 relative min-h-screen bg-gray-50/50">
      {/* 1. BREADCRUMB HOÀN CHỈNH */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-1 cursor-pointer text-gray-500 hover:text-[#2ECC71] transition-colors"
            >
              <Home className="w-4 h-4" />
              Tổng quan
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator>
            <ChevronRight className="w-4 h-4" />
          </BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage className="font-semibold text-gray-900">
              Kho lạnh
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 2. HEADER & NÚT THÊM KHO */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Kho lạnh</h1>
          <p className="text-gray-500 text-sm">
            Hệ thống quản lý {loading ? "..." : apiWarehouses.length} kho lưu
            trữ thực phẩm sạch
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-[#2ECC71] hover:bg-[#27AE60] text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm active:scale-95"
        >
          <Plus className="w-5 h-5" />
          Thêm kho mới
        </button>
      </div>

      {/* 3. DANH SÁCH CARD KHO LẠNH */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading && (
          <div className="col-span-full bg-white rounded-2xl p-12 text-center border border-gray-100">
            <p className="text-gray-400 font-medium">
              Đang tải dữ liệu kho lạnh...
            </p>
          </div>
        )}

        {!loading && apiWarehouses.length === 0 && (
          <div className="col-span-full bg-white rounded-2xl p-12 text-center border-2 border-dashed border-gray-100">
            <p className="text-gray-400 font-medium">
              Chưa có kho lạnh nào. Nhấn "Thêm kho mới" để tạo.
            </p>
          </div>
        )}

        {apiWarehouses.map((warehouse: WarehouseType) => (
          <div
            key={warehouse.id}
            onClick={() => {
              console.log("Clicking warehouse:", {
                id: warehouse.id,
                name: warehouse.name,
              });
              navigate(`/areas/${warehouse.id}`);
            }}
            className="group bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-[#2ECC71]/30 transition-all cursor-pointer"
          >
            {/* Header của Card */}
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2ECC71] to-[#27AE60] flex items-center justify-center shadow-lg shadow-green-100">
                  <Warehouse className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 group-hover:text-[#2ECC71] transition-colors">
                    {warehouse.name}
                  </h3>
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    {warehouse.location}
                  </p>
                </div>
              </div>
              <span
                className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  warehouse.status === "normal"
                    ? "bg-green-50 text-green-600 border border-green-100"
                    : warehouse.status === "warning"
                      ? "bg-orange-50 text-orange-600 border border-orange-100"
                      : "bg-red-50 text-red-600 border border-red-100"
                }`}
              >
                {warehouse.status === "normal"
                  ? "Ổn định"
                  : warehouse.status === "warning"
                    ? "Cảnh báo"
                    : "Nguy hiểm"}
              </span>
            </div>

            {/* Thông số thống kê */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="text-center py-2 bg-gray-50 rounded-xl border border-gray-50">
                <p className="text-lg font-bold text-gray-900">
                  {warehouse.areaCount}
                </p>
                <p className="text-[10px] text-gray-400 uppercase font-semibold">
                  Khu vực
                </p>
              </div>
              <div className="text-center py-2 bg-gray-50 rounded-xl border border-gray-50">
                <p className="text-lg font-bold text-gray-900">
                  {warehouse.deviceCount}
                </p>
                <p className="text-[10px] text-gray-400 uppercase font-semibold">
                  Thiết bị
                </p>
              </div>
              <div className="text-center py-2 bg-orange-50/50 rounded-xl border border-orange-50">
                <p className="text-lg font-bold text-orange-600">
                  {warehouse.activeAlerts}
                </p>
                <p className="text-[10px] text-orange-400 uppercase font-semibold">
                  Sự cố
                </p>
              </div>
            </div>

            {/* Footer của Card (Nhiệt độ & Độ ẩm) */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-red-50 rounded-lg">
                  <Thermometer className="w-4 h-4 text-red-500" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 leading-none">
                    Nhiệt độ TB
                  </p>
                  <p className="font-bold text-gray-900">
                    {warehouse.averageTemp}°C
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 leading-none">
                  Độ ẩm TB
                </p>
                <p className="font-bold text-gray-900">
                  {warehouse.averageHumidity}%
                </p>
              </div>
            </div>

            {warehouse.activeAlerts > 0 && (
              <div className="mt-4 flex items-center gap-2 bg-red-50/80 p-2.5 rounded-lg text-red-600 text-xs font-medium animate-pulse">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Cần kiểm tra ngay {warehouse.activeAlerts} thiết bị</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 4. MODAL THÊM KHO MỚI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm transition-all">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden">
            {/* Trang trí góc Modal */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#2ECC71]/5 rounded-full -mr-16 -mt-16" />

            <div className="flex justify-between items-center mb-8 relative">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Tạo kho mới
                </h2>
                <p className="text-sm text-gray-500">
                  Thiết lập thông số cho kho lưu trữ mới
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form className="space-y-5 relative" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 ml-1">
                  Tên kho lạnh
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2ECC71] focus:bg-white transition-all outline-none"
                  placeholder="VD: Kho đông lạnh trung tâm"
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 ml-1">
                  Địa điểm
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-3.5 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2ECC71] focus:bg-white transition-all outline-none"
                    placeholder="Quận/Huyện, TP.HCM"
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 ml-1">
                    Nhiệt độ mục tiêu
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2ECC71] focus:bg-white transition-all outline-none"
                      placeholder="-18"
                      onChange={(e) =>
                        setFormData({ ...formData, targetTemp: e.target.value })
                      }
                    />
                    <span className="absolute right-4 top-3.5 text-gray-400 text-sm">
                      °C
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-semibold text-gray-700 ml-1">
                    Độ ẩm mục tiêu
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2ECC71] focus:bg-white transition-all outline-none"
                      placeholder="85"
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          targetHumidity: e.target.value,
                        })
                      }
                    />
                    <span className="absolute right-4 top-3.5 text-gray-400 text-sm">
                      %
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-bold transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#2ECC71] to-[#27AE60] text-white rounded-xl hover:opacity-90 font-bold shadow-lg shadow-green-100 transition-all active:scale-95"
                >
                  Tạo kho ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
