// src/pages/WarehouseDetailPage.tsx
import { useParams, useNavigate } from 'react-router';
import {
  Thermometer, Droplets, Cpu, Plus, Pencil, Trash2,
  X, ChevronRight, Home, Layers, ArrowRight, Apple, User
} from 'lucide-react';
import { useState, useEffect } from 'react';
import {
  getWarehouses, updateAreaSettings, getFoodTypes, getUsers,
  assignOperator, getCurrentUser, canAccessArea,
  WarehouseApi, AreaApi, FoodTypeApi, UserApi
} from '../api/apiService';
import axiosClient from '../api/axiosClient';
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem,
  BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage
} from '../components/ui/breadcrumb';

export function WarehouseDetailPage() {
  const { warehouseId } = useParams();
  const navigate = useNavigate();
  const currentUser = JSON.parse(localStorage.getItem('current_user') ?? '{}');
  const isAdmin = currentUser?.role?.toUpperCase() === 'ADMIN';

  /** Kiểm tra OPERATOR có thể edit area này không (phải được gán vào area đó) */
  const canEditArea = (area: AreaApi) =>
    isAdmin || canAccessArea(area);
  const [warehouse, setWarehouse] = useState<WarehouseApi | null>(null);
  const [foodTypes, setFoodTypes] = useState<FoodTypeApi[]>([]);
  const [operators, setOperators] = useState<UserApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAreaModal, setShowAreaModal] = useState(false);
  const [editingArea, setEditingArea] = useState<AreaApi | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    area_name: '',
    food_type_ids: [] as number[],
    operating_mode: 'AUTO' as 'AUTO' | 'MANUAL',
    auto_door_timeout_sec: 30,
    manual_override_mins: 30,
    operator_id: '' as number | '',
  });

  const fetchData = async () => {
    try {
      const [whRes, ftRes, usersRes] = await Promise.all([
        getWarehouses(),
        getFoodTypes(),
        getUsers(),
      ]);
      const wh = whRes.data.data.find(w => w.id === Number(warehouseId));
      if (!wh) {
        navigate('/warehouses');
        return;
      }

      // ✅ OPERATOR chỉ thấy area được phân công — BE đã lọc, nhưng filter thêm FE để chắc chắn
      if (!isAdmin) {
        wh.areas = wh.areas.filter(a =>
          a.operators?.some(op => op.id === currentUser?.id)
        );
      }

      setWarehouse(wh);
      setFoodTypes(ftRes.data.data);
      setOperators(usersRes.data.data.filter(u =>
        u.role?.toUpperCase() === 'OPERATOR'
      ));
    } catch (err) {
      console.error('Lỗi tải dữ liệu:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [warehouseId]);

  if (loading) return <div className="p-8 text-gray-400">Đang tải...</div>;
  if (!warehouse) return <div className="p-8 text-gray-500">Không tìm thấy kho lạnh</div>;

  const areas = warehouse.areas || [];
  const allDevices = areas.flatMap(a => a.devices);

  // ====== HANDLERS ======

  const validateFoodIntersection = (selectedIds: number[]): string | null => {
    if (selectedIds.length < 2) return null;
    const selected = foodTypes.filter(ft => selectedIds.includes(ft.id));
    const bounds = selected.reduce(
      (acc, f) => ({
        minT: Math.max(acc.minT, f.min_temp),
        maxT: Math.min(acc.maxT, f.max_temp),
        minH: Math.max(acc.minH, f.min_humi),
        maxH: Math.min(acc.maxH, f.max_humi),
      }),
      { minT: -99, maxT: 99, minH: 0, maxH: 100 }
    );
    if (bounds.minT > bounds.maxT || bounds.minH > bounds.maxH) {
      const names = selected.map(f => f.food_name).join(', ');
      return `Xung đột thông số! [${names}] không có dải nhiệt độ/độ ẩm chung.`;
    }
    return null;
  };

  const handleAddArea = () => {
    setEditingArea(null);
    setError('');
    setFormData({
      area_name: '',
      food_type_ids: [],
      operating_mode: 'AUTO',
      auto_door_timeout_sec: 30,
      manual_override_mins: 30,
      operator_id: '',
    });
    setShowAreaModal(true);
  };

  const handleEditArea = (area: AreaApi, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingArea(area);
    setError('');
    setFormData({
      area_name: area.area_name,
      food_type_ids: area.food_types?.map(f => f.id) ?? [],
      operating_mode: area.operating_mode as 'AUTO' | 'MANUAL',
      auto_door_timeout_sec: area.auto_door_timeout_sec,
      manual_override_mins: area.manual_override_mins,
       operator_id: area.operators?.[0]?.id ?? '',
    });
    setShowAreaModal(true);
  };

  const handleDeleteArea = async (area: AreaApi, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Xóa khu vực "${area.area_name}"?\n\nLưu ý: Các thiết bị và nhật ký liên quan cũng sẽ bị ảnh hưởng.`)) return;
    try {
      await axiosClient.delete(`/areas/${area.id}`);
      await fetchData();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Xóa thất bại!';
      alert(msg);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    const intersectError = validateFoodIntersection(formData.food_type_ids);
    if (intersectError) {
      setError(intersectError);
      setSubmitting(false);
      return;
    }

    try {
      if (editingArea) {
        await updateAreaSettings(editingArea.id, {
          food_type_ids: formData.food_type_ids,
          operating_mode: formData.operating_mode,
          auto_door_timeout_sec: formData.auto_door_timeout_sec,
          manual_override_mins: formData.manual_override_mins,
          // Chỉ gửi operator_id khi là ADMIN (BE cũng strip nếu là OPERATOR, nhưng rõ ràng hơn)
          ...(isAdmin && { operator_id: formData.operator_id || null }),
        });
        if (isAdmin && formData.operator_id) {
          await assignOperator(editingArea.id, formData.operator_id as number);
        }
      } else {
        const newAreaRes = await axiosClient.post('/areas', {
          area_name: formData.area_name,
          warehouse: { id: Number(warehouseId) },
          food_type_ids: formData.food_type_ids,
          operating_mode: formData.operating_mode,
          auto_door_timeout_sec: formData.auto_door_timeout_sec,
          manual_override_mins: formData.manual_override_mins,
          operator_id: formData.operator_id || null,
        });
        
      }
      await fetchData();
      setShowAreaModal(false);
    } catch (err: any) {
      console.error('Lỗi lưu khu vực:', err);
      const msg = err?.response?.data?.message || 'Lưu thất bại! Kiểm tra lại kết nối BE.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ====== RENDER ======

  return (
    <div className="p-8 space-y-6 font-sans">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate('/dashboard')} className="flex items-center gap-1 cursor-pointer text-gray-500 hover:text-gray-900">
              <Home className="w-4 h-4" /> Tổng quan
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator><ChevronRight className="w-4 h-4" /></BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate('/warehouses')} className="cursor-pointer text-gray-500 hover:text-gray-900">Kho lạnh</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator><ChevronRight className="w-4 h-4" /></BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage className="text-gray-900 font-semibold">{warehouse.warehouse_name}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Warehouse Info */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">{warehouse.warehouse_name}</h1>
            <p className="text-gray-500 text-sm">{areas.length} khu vực • {allDevices.length} thiết bị</p>
          </div>
          <span className="inline-flex px-3 py-2 rounded-lg text-sm font-medium bg-green-100 text-green-700">Hoạt động</span>
        </div>
        <div className="grid grid-cols-3 gap-6">
          <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl relative">
            <span className="text-sm text-blue-700 font-medium">Khu vực</span>
            <p className="text-3xl font-bold text-blue-900 mt-1">{areas.length}</p>
            <Layers className="absolute top-4 right-4 w-5 h-5 text-blue-400 opacity-50" />
          </div>
          <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-xl relative">
            <span className="text-sm text-green-700 font-medium">Thiết bị</span>
            <p className="text-3xl font-bold text-green-900 mt-1">{allDevices.length}</p>
            <Cpu className="absolute top-4 right-4 w-5 h-5 text-green-400 opacity-50" />
          </div>
          <div className="p-4 bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl relative">
            <span className="text-sm text-orange-700 font-medium">Cảm biến</span>
            <p className="text-3xl font-bold text-orange-900 mt-1">
              {allDevices.filter(d => d.device_type?.toUpperCase() !== 'ACTUATOR').length}
            </p>
            <Thermometer className="absolute top-4 right-4 w-5 h-5 text-orange-400 opacity-50" />
          </div>
        </div>
      </div>

      {/* Areas Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Khu vực trong kho</h2>
          {isAdmin && (
            <button
              onClick={handleAddArea}
              className="flex items-center gap-2 bg-[#2ECC71] text-white px-4 py-2 rounded-lg hover:bg-[#27AE60] transition-colors font-bold shadow-sm"
            >
              <Plus className="w-5 h-5" /> Thêm khu vực
            </button>
          )}
        </div>

        {areas.length > 0 ? (
          <div className="grid grid-cols-2 gap-6">
            {areas.map(area => {
              const tempDev = area.devices.find(d =>
                d.device_type?.toUpperCase() === 'TEMP' ||
                d.adafruit_feed_key?.includes('temp') || d.adafruit_feed_key?.includes('nhiet')
              );
              const humiDev = area.devices.find(d =>
                d.device_type?.toUpperCase() === 'HUMI' ||
                d.adafruit_feed_key?.includes('humi')
              );
              const foods = area.food_types?.length
                ? area.food_types
                : area.current_food_type ? [area.current_food_type] : [];
              const tempWarn = foods.length > 0 && tempDev?.latest_value != null &&
                foods.some(f => tempDev.latest_value! < f.min_temp || tempDev.latest_value! > f.max_temp);
              const humiWarn = foods.length > 0 && humiDev?.latest_value != null &&
                foods.some(f => humiDev.latest_value! < f.min_humi || humiDev.latest_value! > f.max_humi);

              return (
                <div
                  key={area.id}
                  // 🔑 Click vào card → navigate tới AreaDetailPage
                  onClick={() => navigate(`/warehouses/${warehouseId}/areas/${area.id}`)}
                  className={`relative group bg-white rounded-xl p-6 border shadow-sm hover:shadow-md transition-all cursor-pointer ${
                    (tempWarn || humiWarn) ? 'border-orange-300' : 'border-gray-100 hover:border-[#2ECC71]/40'
                  }`}
                >
                  {/* Edit/Delete buttons — hiện khi hover */}
                  {/* Edit: ADMIN + OPERATOR được gán; Delete: chỉ ADMIN */}
                  {canEditArea(area) && (
                    <div
                      className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={e => handleEditArea(area, e)}
                        className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-blue-50 hover:text-blue-600 transition-colors"
                        title="Chỉnh sửa"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {isAdmin && (
                        <button
                          onClick={e => handleDeleteArea(area, e)}
                          className="p-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Xóa khu vực"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* Header */}
                  <div className="mb-3 pr-20">
                    <h3 className="font-bold text-gray-900 text-base">{area.area_name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block font-medium ${
                      area.operating_mode === 'AUTO'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {area.operating_mode === 'AUTO' ? '⚡ Tự động' : '🖐 Thủ công'}
                    </span>
                  </div>

                  {/* Sensor values */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className={`p-3 rounded-lg ${tempWarn ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-1 mb-1">
                        <Thermometer className={`w-3.5 h-3.5 ${tempWarn ? 'text-orange-500' : 'text-red-400'}`} />
                        <span className="text-xs text-gray-500">Nhiệt độ</span>
                      </div>
                      <p className={`text-lg font-bold ${tempWarn ? 'text-orange-600' : 'text-gray-900'}`}>
                        {tempDev?.latest_value != null ? `${tempDev.latest_value}°C` : '—'}
                      </p>
                      {foods.length > 0 && (
                        <p className="text-[10px] text-gray-400">
                          {Math.max(...foods.map(f => f.min_temp))}~{Math.min(...foods.map(f => f.max_temp))}°C
                        </p>
                      )}
                    </div>
                    <div className={`p-3 rounded-lg ${humiWarn ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'}`}>
                      <div className="flex items-center gap-1 mb-1">
                        <Droplets className={`w-3.5 h-3.5 ${humiWarn ? 'text-orange-500' : 'text-blue-400'}`} />
                        <span className="text-xs text-gray-500">Độ ẩm</span>
                      </div>
                      <p className={`text-lg font-bold ${humiWarn ? 'text-orange-600' : 'text-gray-900'}`}>
                        {humiDev?.latest_value != null ? `${humiDev.latest_value}%` : '—'}
                      </p>
                      {foods.length > 0 && (
                        <p className="text-[10px] text-gray-400">
                          {Math.max(...foods.map(f => f.min_humi))}~{Math.min(...foods.map(f => f.max_humi))}%
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Food type badges */}
                  {foods.length > 0 && (
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {foods.map(f => (
                        <span key={f.id} className="flex items-center gap-1 text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                          <Apple className="w-3 h-3 text-green-500" />
                          {f.food_name}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Người vận hành */}
                  {area.operators && area.operators.length > 0 ? (
                    <div className="mb-3 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      <span className="text-xs text-gray-500">
                        {area.operators.map(o => o.full_name || o.username).join(', ')}
                      </span>
                    </div>
                  ) : (
                    <div className="mb-3 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-gray-300" />
                      <span className="text-xs text-gray-300 italic">Chưa phân công</span>
                    </div>
                  )}
                  {/* Footer */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">
                        {area.devices.length} thiết bị
                      </span>
                      <span className="text-gray-300">·</span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Thermometer className="w-3 h-3" />
                        {area.devices.filter(d => d.device_type?.toUpperCase() !== 'ACTUATOR').length} cảm biến
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-xs text-[#2ECC71] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Xem thiết bị <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl p-12 text-center border border-gray-100 text-gray-500">
            Chưa có khu vực nào. Nhấn "Thêm khu vực" để tạo mới.
          </div>
        )}
      </div>

      {/* Modal thêm/sửa khu vực */}
      {showAreaModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900">
                {editingArea ? 'Chỉnh sửa khu vực' : 'Thêm khu vực mới'}
              </h2>
              <button onClick={() => setShowAreaModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              {/* Hiển thị lỗi nếu có */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Tên khu vực — chỉ hiện khi thêm mới */}
              {!editingArea && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Tên khu vực *</label>
                  <input
                    type="text"
                    value={formData.area_name}
                    onChange={e => setFormData({ ...formData, area_name: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ECC71]"
                    placeholder="VD: Khu bảo quản rau củ"
                    required
                    autoFocus
                  />
                </div>
              )}

              {/* Loại thực phẩm — multi select */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">
                  Loại thực phẩm
                  {formData.food_type_ids.length > 0 && (
                    <span className="ml-2 text-xs font-normal text-green-600">
                      Đã chọn {formData.food_type_ids.length}
                    </span>
                  )}
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                  {foodTypes.map(ft => {
                    const checked = formData.food_type_ids.includes(ft.id);
                    return (
                      <button
                        key={ft.id}
                        type="button"
                        onClick={() => {
                          const ids = checked
                            ? formData.food_type_ids.filter(id => id !== ft.id)
                            : [...formData.food_type_ids, ft.id];
                          // Validate ngay khi chọn
                          const err = validateFoodIntersection(ids);
                          setError(err ?? '');
                          setFormData({ ...formData, food_type_ids: ids });
                        }}
                        className={`p-3 rounded-lg border-2 text-left transition-all ${
                          checked ? 'border-[#2ECC71] bg-green-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <p className={`text-sm font-bold ${checked ? 'text-[#2ECC71]' : 'text-gray-700'}`}>
                          {ft.food_name}
                        </p>
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {ft.min_temp}~{ft.max_temp}°C · {ft.min_humi}~{ft.max_humi}%
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chế độ hoạt động */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Chế độ hoạt động</label>
                <div className="grid grid-cols-2 gap-3">
                  {(['AUTO', 'MANUAL'] as const).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setFormData({ ...formData, operating_mode: mode })}
                      className={`py-2.5 rounded-lg border-2 text-sm font-bold transition-all ${
                        formData.operating_mode === mode
                          ? 'border-[#2ECC71] bg-green-50 text-green-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300'
                      }`}
                    >
                      {mode === 'AUTO' ? '⚡ Tự động' : '🖐 Thủ công'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cài đặt thời gian */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Timeout cửa (giây)</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.auto_door_timeout_sec}
                    onChange={e => setFormData({ ...formData, auto_door_timeout_sec: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ECC71]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Cooldown thủ công (phút)</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.manual_override_mins}
                    onChange={e => setFormData({ ...formData, manual_override_mins: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ECC71]"
                  />
                </div>
              </div>

              {/* Người vận hành */}
              {isAdmin && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Người vận hành</label>
                  <select
                    value={formData.operator_id}
                    onChange={e => setFormData({ ...formData, operator_id: e.target.value ? Number(e.target.value) : '' })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ECC71]"
                  >
                    <option value="">Chưa phân công</option>
                    {operators.map(u => (
                      <option key={u.id} value={u.id}>{u.full_name || u.username}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAreaModal(false)}
                  className="px-6 py-2.5 border border-gray-300 text-gray-600 rounded-lg font-bold hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting || !!error}
                  className="px-8 py-2.5 bg-[#2ECC71] text-white rounded-lg font-bold hover:bg-[#27AE60] disabled:opacity-50 transition-all active:scale-95"
                >
                  {submitting ? 'Đang lưu...' : editingArea ? 'Cập nhật' : 'Tạo khu vực'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}