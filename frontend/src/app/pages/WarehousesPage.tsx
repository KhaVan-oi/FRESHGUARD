// src/pages/WarehousesPage.tsx
// CRUD đầy đủ: Xem danh sách, Tạo kho, Đổi tên kho, Xóa kho

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import {
  Warehouse, Thermometer, Droplets, AlertTriangle,
  Plus, X, ChevronRight, Home, RefreshCw, Pencil, Trash2,
} from 'lucide-react';
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem,
  BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage,
} from '../components/ui/breadcrumb';
import {
  getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse,
  getCurrentUser, WarehouseApi,
} from '../api/apiService';

type ModalMode = 'create' | 'edit' | null;

export function WarehousesPage() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role?.toUpperCase() === 'ADMIN';
  const [warehouses, setWarehouses] = useState<WarehouseApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingWarehouse, setEditingWarehouse] = useState<WarehouseApi | null>(null);
  const [warehouseName, setWarehouseName] = useState('');
  const [searchQuery, setSearchQuery] = useState("");
  const fetchWarehouses = async () => {
    try {
      setLoading(true);
      const res = await getWarehouses();
      setWarehouses(res.data.data);
    } catch (err) {
      console.error('Lỗi load warehouses:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchWarehouses(); }, []);

  // Tính thống kê từ data API
  const getStats = (wh: WarehouseApi) => {
    const allDevices = wh.areas.flatMap(a => a.devices);
    const onlineDevices = allDevices.filter(d => d.status?.toUpperCase() === 'ONLINE').length;
    let alertCount = 0;
    const tempValues: number[] = [];
    const humiValues: number[] = [];

    wh.areas.forEach(area => {
      const food = area.current_food_type;
      area.devices.forEach(d => {
        if (d.device_type?.toUpperCase() !== 'SENSOR' || d.latest_value === undefined) return;
        const key = (d.adafruit_feed_key ?? '').toLowerCase();
        const nm = (d.device_name ?? '').toLowerCase();
        if (key.includes('temp') || nm.includes('nhiệt')) {
          tempValues.push(d.latest_value);
          if (food && (d.latest_value < food.min_temp || d.latest_value > food.max_temp)) alertCount++;
        }
        if (key.includes('humi') || nm.includes('ẩm')) {
          humiValues.push(d.latest_value);
          if (food && (d.latest_value < food.min_humi || d.latest_value > food.max_humi)) alertCount++;
        }
      });
    });

    const avg = (arr: number[]) =>
      arr.length ? (arr.reduce((s, v) => s + v, 0) / arr.length).toFixed(1) : null;

    return { allDevices, onlineDevices, alertCount, avgTemp: avg(tempValues), avgHumi: avg(humiValues) };
  };

  const openCreate = () => {
    setEditingWarehouse(null);
    setWarehouseName('');
    setModalMode('create');
  };

  const openEdit = (wh: WarehouseApi, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingWarehouse(wh);
    setWarehouseName(wh.warehouse_name);
    setModalMode('edit');
  };

  const handleDelete = async (wh: WarehouseApi, e: React.MouseEvent) => {
    e.stopPropagation();
    if (wh.areas.length > 0) {
      alert(`Không thể xóa! Kho "${wh.warehouse_name}" còn ${wh.areas.length} khu vực.\nXóa hết khu vực trước rồi mới xóa kho.`);
      return;
    }
    if (!confirm(`Xóa kho "${wh.warehouse_name}"?`)) return;
    try {
      await deleteWarehouse(wh.id);
      setWarehouses(prev => prev.filter(w => w.id !== wh.id));
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Xóa kho thất bại!');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseName.trim()) return;
    setSubmitting(true);
    try {
      if (modalMode === 'create') {
        await createWarehouse({ warehouse_name: warehouseName.trim() });
        await fetchWarehouses(); // refresh để có areas[]
      } else if (modalMode === 'edit' && editingWarehouse) {
        await updateWarehouse(editingWarehouse.id, { warehouse_name: warehouseName.trim() });
        setWarehouses(prev =>
          prev.map(w => w.id === editingWarehouse.id
            ? { ...w, warehouse_name: warehouseName.trim() } : w
          )
        );
      }
      setModalMode(null);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Thao tác thất bại!');
    } finally {
      setSubmitting(false);
    }
  };
  // Thêm đoạn này trước phần return (cùng cấp với các hàm handle...)
  const filteredWarehouses = useMemo(() => {
    return warehouses.filter(w => 
      w.warehouse_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [warehouses, searchQuery]);
  return (
    <div className="p-8 space-y-6 min-h-screen bg-gray-50/50">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-1 cursor-pointer text-gray-500 hover:text-[#2ECC71] transition-colors"
            >
              <Home className="w-4 h-4" /> Tổng quan
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator><ChevronRight className="w-4 h-4" /></BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbPage className="font-semibold text-gray-900">Kho lạnh</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Kho lạnh</h1>
          <p className="text-gray-500 text-sm">
            {loading ? 'Đang tải...' : `${warehouses.length} kho lưu trữ thực phẩm`}
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchWarehouses}
            disabled={loading}
            className="p-2.5 border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Làm mới"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {isAdmin && (
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-[#2ECC71] hover:bg-[#27AE60] text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-sm active:scale-95"
            >
              <Plus className="w-5 h-5" /> Thêm kho mới
            </button>
          )}
        </div>
      </div>
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center">
        <input
          type="text"
          placeholder="Tìm kiếm kho theo tên..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ECC71]"
        />
      </div>
      {/* Danh sách */}
      {loading ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400">Đang tải dữ liệu...</div>
      ) : filteredWarehouses.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-gray-200 text-gray-400">
          Không tìm thấy kho nào phù hợp.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredWarehouses.map((wh: WarehouseApi) => {
            const { allDevices, onlineDevices, alertCount, avgTemp, avgHumi } = getStats(wh);
            const hasAlert = alertCount > 0;

            return (
              <div
                key={wh.id}
                onClick={() => navigate(`/warehouses/${wh.id}`)}
                className="group relative bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-[#2ECC71]/40 transition-all cursor-pointer"
              >
                {/* Action buttons — hiện khi hover, chỉ ADMIN */}
                {isAdmin && (
                  <div
                    className="absolute top-4 right-4 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onClick={e => e.stopPropagation()}
                  >
                    <button
                      onClick={e => openEdit(wh, e)}
                      title="Đổi tên kho"
                      className="p-1.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={e => handleDelete(wh, e)}
                      title="Xóa kho"
                      className="p-1.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Card header */}
                <div className="flex items-start gap-4 mb-5 pr-16">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#2ECC71] to-[#27AE60] flex items-center justify-center shadow-lg shadow-green-100 shrink-0">
                    <Warehouse className="w-6 h-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-gray-900 group-hover:text-[#2ECC71] transition-colors truncate">
                      {wh.warehouse_name}
                    </h3>
                    <p className="text-xs text-gray-400 mt-0.5">{wh.areas.length} khu vực</p>
                  </div>
                 
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="text-center py-2.5 bg-gray-50 rounded-xl">
                    <p className="text-lg font-bold text-gray-900">{wh.areas.length}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Khu vực</p>
                  </div>
                  <div className="text-center py-2.5 bg-gray-50 rounded-xl">
                    <p className="text-lg font-bold text-gray-900">{onlineDevices}/{allDevices.length}</p>
                    <p className="text-[10px] text-gray-400 uppercase font-semibold">Online</p>
                  </div>
                  <div className={`text-center py-2.5 rounded-xl ${hasAlert ? 'bg-orange-50' : 'bg-gray-50'}`}>
                    <p className={`text-lg font-bold ${hasAlert ? 'text-orange-600' : 'text-gray-900'}`}>{alertCount}</p>
                    <p className={`text-[10px] uppercase font-semibold ${hasAlert ? 'text-orange-400' : 'text-gray-400'}`}>Sự cố</p>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-red-50 rounded-lg"><Thermometer className="w-4 h-4 text-red-500" /></div>
                    <div>
                      <p className="text-[10px] text-gray-400 leading-none">Nhiệt độ TB</p>
                      <p className="font-bold text-gray-900 text-sm">{avgTemp !== null ? `${avgTemp}°C` : '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 rounded-lg"><Droplets className="w-4 h-4 text-blue-500" /></div>
                    <div>
                      <p className="text-[10px] text-gray-400 leading-none">Độ ẩm TB</p>
                      <p className="font-bold text-gray-900 text-sm">{avgHumi !== null ? `${avgHumi}%` : '—'}</p>
                    </div>
                  </div>
                </div>

                {hasAlert && (
                  <div className="mt-4 flex items-center gap-2 bg-red-50 p-2.5 rounded-lg text-red-600 text-xs font-medium">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{alertCount} khu vực vượt ngưỡng bảo quản</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Tạo / Đổi tên kho */}
      {modalMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#2ECC71]/5 rounded-full -mr-16 -mt-16 pointer-events-none" />

            <div className="flex justify-between items-start mb-8 relative">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {modalMode === 'create' ? 'Tạo kho mới' : 'Đổi tên kho'}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {modalMode === 'edit' && editingWarehouse
                    ? `Đang sửa: "${editingWarehouse.warehouse_name}"`
                    : 'Nhập tên cho kho lưu trữ mới'}
                </p>
              </div>
              <button onClick={() => setModalMode(null)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 relative">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-gray-700 ml-1">Tên kho lạnh</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={warehouseName}
                  onChange={e => setWarehouseName(e.target.value)}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#2ECC71] focus:bg-white transition-all outline-none"
                  placeholder="VD: Kho đông lạnh trung tâm"
                />
              </div>
              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 font-bold transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={submitting || !warehouseName.trim()}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-[#2ECC71] to-[#27AE60] text-white rounded-xl font-bold shadow-lg shadow-green-100 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Đang lưu...' : modalMode === 'create' ? 'Tạo kho ngay' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}