import { useParams, useNavigate } from "react-router";
import {
  ArrowLeft,
  MapPin,
  Thermometer,
  Droplets,
  Cpu,
  Bell,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertCircle,
  Layers,
} from "lucide-react";
import { store } from "../store";
import { AreaCard } from "../components/AreaCard";
import { useState } from "react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "../components/ui/breadcrumb";
import { Area } from "../types";

export function WarehouseDetailPage() {
  const { warehouseId } = useParams();
  const navigate = useNavigate();
  const warehouse = store.getWarehouse(warehouseId!);

  const [showAreaModal, setShowAreaModal] = useState(false);
  const [editingArea, setEditingArea] = useState<Area | null>(null);
  const [areas, setAreas] = useState(store.getAreasByWarehouse(warehouseId!));
  const [error, setError] = useState<string | null>(null);

  const users = store.getUsers().filter((u) => u.role === "Operator");
  const foodTypes = store.getFoodTypes();

  const [formData, setFormData] = useState({
    name: "",
    warehouseId: warehouseId!,
    type: "vegetable" as "vegetable" | "meat",
    operatorId: "",
    foodTypeIds: [] as string[],
    currentTemp: 0,
    currentHumidity: 0,
    minTemp: 0,
    maxTemp: 0,
    minHumidity: 0,
    maxHumidity: 0,
    status: "normal" as "normal" | "warning" | "alert",
    deviceCount: 0,
  });

  if (!warehouse) return <div className="p-8">Không tìm thấy kho lạnh</div>;

  if (!warehouse) return <div className="p-8">Không tìm thấy kho lạnh</div>;

  // Logic tính toán ngưỡng tối ưu
  const calculateThresholds = (selectedIds: string[]) => {
    if (selectedIds.length === 0)
      return { minT: 0, maxT: 0, minH: 0, maxH: 0, conflict: false };
    const selectedFoods = foodTypes.filter((ft) => selectedIds.includes(ft.id));

    let minT = Math.max(...selectedFoods.map((f) => f.minTemp));
    let maxT = Math.min(...selectedFoods.map((f) => f.maxTemp));
    let minH = Math.max(...selectedFoods.map((f) => f.minHumidity));
    let maxH = Math.min(...selectedFoods.map((f) => f.maxHumidity));

    return { minT, maxT, minH, maxH, conflict: minT > maxT || minH > maxH };
  };

  const handleAddArea = () => {
    setEditingArea(null);
    setError(null);
    setFormData({
      name: "",
      warehouseId: warehouseId!,
      type: "vegetable",
      operatorId: "",
      foodTypeIds: [],
      currentTemp: 0,
      currentHumidity: 0,
      minTemp: 0,
      maxTemp: 0,
      minHumidity: 0,
      maxHumidity: 0,
      status: "normal",
      deviceCount: 0,
    });
    setShowAreaModal(true);
  };

  const handleEditArea = (area: Area, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingArea(area);
    setError(null);
    setFormData({ ...area });
    setShowAreaModal(true);
  };

  const toggleFoodType = (id: string) => {
    const nextIds = formData.foodTypeIds.includes(id)
      ? formData.foodTypeIds.filter((fid) => fid !== id)
      : [...formData.foodTypeIds, id];

    const result = calculateThresholds(nextIds);
    setError(
      result.conflict
        ? "Xung đột: Các thực phẩm chọn không có dải an toàn chung!"
        : null,
    );

    setFormData((prev) => ({
      ...prev,
      foodTypeIds: nextIds,
      minTemp: result.minT,
      maxTemp: result.maxT,
      minHumidity: result.minH,
      maxHumidity: result.maxH,
    }));
  };

  const handleDeleteArea = (areaId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Bạn có chắc chắn muốn xóa khu vực này?")) {
      // TODO: Call API to delete area
      store.deleteArea(areaId);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (calculateThresholds(formData.foodTypeIds).conflict) {
      alert("Không thể thiết lập do xung đột thực phẩm!");
      return;
    }

    if (editingArea) {
      // TODO: Call API to update area
      store.updateArea(editingArea.id, formData);
    } else {
      // TODO: Call API to create area
      store.addArea(formData);
    }

    setShowAreaModal(false);
  };

  return (
    <div className="p-8 space-y-6 font-sans">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              onClick={() => navigate("/dashboard")}
              className="cursor-pointer text-gray-500 hover:text-gray-900"
            >
              Tổng quan
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink
              onClick={() => navigate("/warehouses")}
              className="cursor-pointer text-gray-500 hover:text-gray-900"
            >
              Kho lạnh
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="text-gray-900 font-semibold">
              {warehouse.name}
            </BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* --- Warehouse Info Card --- */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {warehouse.name}
            </h1>
            <p className="text-gray-500 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {warehouse.location}
            </p>
          </div>
          <span
            className={`inline-flex px-3 py-2 rounded-lg text-sm font-medium ${warehouse.status === "normal" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}
          >
            {warehouse.status === "normal"
              ? "Hoạt động bình thường"
              : "Có cảnh báo"}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-6">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl relative group">
            <span className="text-sm text-blue-700 font-medium">Khu vực</span>
            <p className="text-3xl font-bold text-blue-900 mt-1">
              {warehouse.areaCount}
            </p>
            <Layers className="absolute top-4 right-4 w-5 h-5 text-blue-400 opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl relative group">
            <span className="text-sm text-green-700 font-medium">Thiết bị</span>
            <p className="text-3xl font-bold text-green-900 mt-1">
              {activeDevices}/{allWarehouseDevices.length}
            </p>
            <Cpu className="absolute top-4 right-4 w-5 h-5 text-green-400 opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl relative group">
            <span className="text-sm text-orange-700 font-medium">
              Cảnh báo
            </span>
            <p className="text-3xl font-bold text-orange-900 mt-1">
              {warehouse.activeAlerts}
            </p>
            <Bell className="absolute top-4 right-4 w-5 h-5 text-orange-400 opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl relative group">
            <span className="text-sm text-purple-700 font-medium">
              Nhiệt độ TB
            </span>
            <p className="text-3xl font-bold text-purple-900 mt-1">
              {warehouse.averageTemp}°C
            </p>
            <Thermometer className="absolute top-4 right-4 w-5 h-5 text-purple-400 opacity-50 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-100 flex gap-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-50 rounded-lg text-red-500">
              <Thermometer className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Nhiệt độ trung bình</p>
              <p className="font-bold text-gray-900">
                {warehouse.averageTemp}°C
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-500">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">Độ ẩm trung bình</p>
              <p className="font-bold text-gray-900">
                {warehouse.averageHumidity}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* --- Area Cards Section --- */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 tracking-tight">
            Khu vực trong kho
          </h2>
          <button
            onClick={handleAddArea}
            className="flex items-center gap-2 bg-[#2ECC71] text-white px-4 py-2 rounded-lg hover:bg-[#27AE60] transition-colors font-bold shadow-sm"
          >
            <Plus className="w-5 h-5" /> Thêm khu vực
          </button>
        </div>
        {areas.length > 0 ? (
          <div className="grid grid-cols-2 gap-6">
            {areas.map((area) => (
              <div key={area.id} className="relative group">
                <AreaCard area={area} warehouseId={warehouseId!} />
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleEditArea(area, e)}
                    className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-blue-50 hover:text-blue-600 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => handleDeleteArea(area.id, e)}
                    className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-100 text-gray-500">
            Chưa có khu vực nào
          </div>
        )}
      </div>

      {/* --- AREA MODAL --- */}
      {showAreaModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {editingArea ? "Chỉnh sửa" : "Thêm"} khu vực mới
              </h2>
              <button
                onClick={() => setShowAreaModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="p-6 space-y-4 overflow-y-auto"
            >
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-lg flex gap-2 items-center text-sm font-bold animate-shake">
                  <AlertCircle className="w-4 h-4" /> {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">
                  Tên khu vực
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ECC71]"
                  placeholder="Nhập tên khu vực..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">
                  Loại thực phẩm bảo quản (Hệ thống tự tính ngưỡng)
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {foodTypes.map((ft) => {
                    const isSelected = formData.foodTypeIds.includes(ft.id);
                    return (
                      <button
                        key={ft.id}
                        type="button"
                        onClick={() => toggleFoodType(ft.id)}
                        className={`p-4 rounded-lg border-2 text-left transition-all relative ${isSelected ? "border-[#2ECC71] bg-green-50 shadow-sm" : "border-gray-100 bg-white hover:border-gray-200"}`}
                      >
                        <p
                          className={`font-bold text-sm ${isSelected ? "text-[#2ECC71]" : "text-gray-800"}`}
                        >
                          {ft.name}
                        </p>
                        <div className="flex flex-col text-[11px] text-gray-500 mt-1 font-medium">
                          <span className="flex items-center gap-1">
                            <Thermometer className="w-3 h-3 text-red-400" />{" "}
                            {ft.minTemp}~{ft.maxTemp}°C
                          </span>
                          <span className="flex items-center gap-1">
                            <Droplets className="w-3 h-3 text-blue-400" />{" "}
                            {ft.minHumidity}~{ft.maxHumidity}%
                          </span>
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 w-2 h-2 bg-[#2ECC71] rounded-full"></div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5 ml-1">
                  Người vận hành
                </label>
                <select
                  value={formData.operatorId}
                  onChange={(e) =>
                    setFormData({ ...formData, operatorId: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ECC71]"
                >
                  <option value="">Chưa phân công</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.fullName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ngưỡng tối ưu - Chỉ xem không sửa */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-100 shadow-inner">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block text-center">
                    Nhiệt độ tối ưu chung
                  </label>
                  <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg font-black text-red-500 shadow-sm text-center text-lg italic">
                    {formData.minTemp}°C → {formData.maxTemp}°C
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block text-center">
                    Độ ẩm tối ưu chung
                  </label>
                  <div className="px-4 py-3 bg-white border border-gray-200 rounded-lg font-black text-blue-500 shadow-sm text-center text-lg italic">
                    {formData.minHumidity}% → {formData.maxHumidity}%
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAreaModal(false)}
                  className="px-6 py-2 border border-gray-300 text-gray-600 rounded-lg font-bold hover:bg-gray-50 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!!error || formData.foodTypeIds.length === 0}
                  className={`px-8 py-2 rounded-lg font-bold shadow-lg transition-all ${error || formData.foodTypeIds.length === 0 ? "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none" : "bg-[#2ECC71] text-white hover:bg-[#27AE60] active:scale-95 shadow-green-100"}`}
                >
                  {editingArea ? "Cập nhật" : "Xác nhận thiết lập"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
