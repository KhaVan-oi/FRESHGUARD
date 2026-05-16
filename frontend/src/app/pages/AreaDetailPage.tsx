// src/pages/AreaDetailPage.tsx
import { useParams, useNavigate } from 'react-router';
import {
  Thermometer, Droplets, Tag, Power, PowerOff,
  Plus, Pencil, Trash2, X, ChevronRight, Calendar
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';
import {
  Breadcrumb, BreadcrumbList, BreadcrumbItem,
  BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage
} from '../components/ui/breadcrumb';
import {
  getWarehouses, getLatestSensors, getSensorHistory,
  updateAreaSettings, controlDevice, getFoodTypes,
  createDevice, updateDevice, deleteDevice, addFoodToArea,
  getCurrentUser, canAccessArea,
  AreaApi, DeviceApi, SensorReadingApi, FoodTypeApi, WarehouseApi
} from '../api/apiService';

const DEVICE_TYPES = ['SENSOR', 'ACTUATOR', 'TEMP', 'HUMI', 'DOOR_SENSOR', 'EMERGENCY_BTN', 'CO2_SENSOR'];

const emptyDeviceForm = {
  device_name: '',
  device_code: '',
  device_type: 'SENSOR',
  adafruit_feed_key: '',
  status: 'ONLINE',
};

const toDateInputValue = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export function AreaDetailPage() {
  const { warehouseId, areaId } = useParams();
  const navigate = useNavigate();

  const [warehouse, setWarehouse] = useState<WarehouseApi | null>(null);
  const [area, setArea] = useState<AreaApi | null>(null);
  const [tempHistory, setTempHistory] = useState<SensorReadingApi[]>([]);
  const [humiHistory, setHumiHistory] = useState<SensorReadingApi[]>([]);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [historyError, setHistoryError] = useState<string>('');
  const [allFoodTypes, setAllFoodTypes] = useState<FoodTypeApi[]>([]);
  const [loading, setLoading] = useState(true);

  // Device modal
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState<DeviceApi | null>(null);
  const [deviceForm, setDeviceForm] = useState(emptyDeviceForm);
  const [savingDevice, setSavingDevice] = useState(false);

  // Food modal
  const [showFoodModal, setShowFoodModal] = useState(false);
  const [selectedFoodTypeId, setSelectedFoodTypeId] = useState<number | null>(null);
  const [savingFood, setSavingFood] = useState(false);
  const [savingMode, setSavingMode] = useState(false);

  // Phân quyền: ADMIN luôn có quyền; OPERATOR chỉ được nếu được gán vào area này
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role?.toUpperCase() === 'ADMIN';
  // canManageFood sẽ được cập nhật sau khi area được load

  // Controlling device (track which device is being controlled)
  const [controllingId, setControllingId] = useState<number | null>(null);

  const fetchAll = async () => {
    try {
      setLoading(true);
      const [whRes, foodRes] = await Promise.all([getWarehouses(), getFoodTypes()]);
      const wh = whRes.data.data.find((w: WarehouseApi) => String(w.id) === warehouseId);
      setWarehouse(wh || null);
      const foundArea = wh?.areas.find((a: AreaApi) => String(a.id) === areaId);
      setArea(foundArea || null);
      if (foundArea) {
        setSelectedFoodTypeId(foundArea.current_food_type?.id ?? null);
      }
      setAllFoodTypes(foodRes.data.data);
    } catch (err) {
      console.error('Lỗi load AreaDetailPage:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, [warehouseId, areaId]);

  useEffect(() => {
    const fetchHistoryByDateRange = async () => {
      if (!area?.id) return;
      const today = toDateInputValue(new Date());
      const effectiveStartDate = startDate || today;
      const effectiveEndDate = endDate || today;

      if (effectiveStartDate > effectiveEndDate) {
        setHistoryError('Ngày bắt đầu không được lớn hơn ngày kết thúc.');
        setTempHistory([]);
        setHumiHistory([]);
        return;
      }
      setHistoryError('');

      try {
        const [tempRes, humiRes] = await Promise.all([
          getSensorHistory({
            type: 'TEMP',
            area_id: area.id,
            start_time: `${effectiveStartDate} 00:00:00`,
            end_time: `${effectiveEndDate} 23:59:59`,
            limit: 1000
          }),
          getSensorHistory({
            type: 'HUMI',
            area_id: area.id,
            start_time: `${effectiveStartDate} 00:00:00`,
            end_time: `${effectiveEndDate} 23:59:59`,
            limit: 1000
          }),
        ]);
        setTempHistory(tempRes.data.data);
        setHumiHistory(humiRes.data.data);
      } catch (err) {
        console.error('Lỗi load lịch sử cảm biến:', err);
      }
    };

    fetchHistoryByDateRange();
  }, [area?.id, startDate, endDate]);

  if (loading) return <div className="p-8 flex items-center justify-center min-h-screen text-gray-500">Đang tải dữ liệu...</div>;
  if (!area) return <div className="p-8 text-gray-500">Không tìm thấy khu vực</div>;

  // Kiểm tra quyền quản lý thực phẩm: ADMIN toàn quyền, OPERATOR chỉ area của mình
  const canManageFood = isAdmin || canAccessArea(area);

  const food = area.current_food_type;
  const sensors = area.devices.filter((d: DeviceApi) => d.device_type?.toUpperCase() === 'SENSOR' || d.device_type === 'TEMP' || d.device_type === 'HUMI');
  const actuators = area.devices.filter((d: DeviceApi) => d.device_type?.toUpperCase() === 'ACTUATOR');

  const tempSensor = sensors.find((d: DeviceApi) => d.adafruit_feed_key?.toLowerCase().includes('temp') || d.device_name?.toLowerCase().includes('nhiệt'));
  const humiSensor = sensors.find((d: DeviceApi) => d.adafruit_feed_key?.toLowerCase().includes('humi') || d.device_name?.toLowerCase().includes('ẩm'));
  const currentTemp = tempSensor?.latest_value ?? null;
  const currentHumi = humiSensor?.latest_value ?? null;
  const tempWarning = food && currentTemp !== null ? (currentTemp < food.min_temp || currentTemp > food.max_temp) : false;
  const humiWarning = food && currentHumi !== null ? (currentHumi < food.min_humi || currentHumi > food.max_humi) : false;
  const today = toDateInputValue(new Date());
  const effectiveStartDate = startDate || today;
  const effectiveEndDate = endDate || today;
  const isMultiDayRange = effectiveStartDate !== effectiveEndDate;

  const tempChartData = tempHistory.map((r: SensorReadingApi) => ({
    time: isMultiDayRange
      ? new Date(r.recorded_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      : new Date(r.recorded_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    value: r.reading_value
  }));
  const humiChartData = humiHistory.map((r: SensorReadingApi) => ({
    time: isMultiDayRange
      ? new Date(r.recorded_at).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
      : new Date(r.recorded_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    value: r.reading_value
  }));

  // === Đổi chế độ AUTO/MANUAL ===
  const handleToggleMode = async () => {
    const newMode = area.operating_mode === 'AUTO' ? 'MANUAL' : 'AUTO';
    setSavingMode(true);
    try {
      const res = await updateAreaSettings(area.id, { operating_mode: newMode });
      setArea(res.data.data);
    } catch {
      alert('Đổi chế độ thất bại!');
    } finally {
      setSavingMode(false);
    }
  };

  // === Lưu loại thực phẩm ===
  const handleSaveFoodType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFoodTypeId) return;
    setSavingFood(true);
    try {
      await addFoodToArea(area.id, selectedFoodTypeId);
      // Reload để lấy food_types mới nhất
      await fetchAll();
      setShowFoodModal(false);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Cập nhật thực phẩm thất bại!');
    } finally {
      setSavingFood(false);
    }
  };

  // === Điều khiển thiết bị — cập nhật state ngay, không cần reload ===
  const handleControlDevice = async (device: DeviceApi, action: string) => {
    setControllingId(device.id);
    try {
      await controlDevice({ device_id: device.adafruit_feed_key, action });
      // Cập nhật status ngay trong state
      setArea(prev => prev ? {
        ...prev,
        devices: prev.devices.map((d: DeviceApi) =>
          d.id === device.id ? { ...d, status: action === 'ON' ? 'ONLINE' : 'OFFLINE' } : d
        )
      } : prev);
    } catch {
      alert('Gửi lệnh thất bại!');
    } finally {
      setControllingId(null);
    }
  };

  // === CRUD Thiết bị ===
  const openAddDevice = () => {
    setEditingDevice(null);
    setDeviceForm(emptyDeviceForm);
    setShowDeviceModal(true);
  };

  const openEditDevice = (device: DeviceApi, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingDevice(device);
    setDeviceForm({
      device_name: device.device_name,
      device_code: device.device_code ?? '', 
      device_type: device.device_type,
      adafruit_feed_key: device.adafruit_feed_key || '',
      status: device.status || 'ONLINE',
    });
    setShowDeviceModal(true);
  };

  const handleDeleteDevice = async (device: DeviceApi, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Xóa thiết bị "${device.device_name}"?`)) return;
    try {
      await deleteDevice(device.id);
      setArea(prev => prev ? { ...prev, devices: prev.devices.filter((d: DeviceApi) => d.id !== device.id) } : prev);
    } catch {
      alert('Xóa thiết bị thất bại!');
    }
  };

  const handleSaveDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingDevice(true);
    try {
      if (editingDevice) {
        await updateDevice(editingDevice.id, deviceForm);
        setArea(prev => prev ? {
          ...prev,
          devices: prev.devices.map((d: DeviceApi) => d.id === editingDevice.id ? { ...d, ...deviceForm } : d)
        } : prev);
      } else {
        const res = await createDevice({ ...deviceForm, area: { id: area.id } });
        setArea(prev => prev ? { ...prev, devices: [...prev.devices, res.data.data] } : prev);
      }
      setShowDeviceModal(false);
    } catch {
      alert('Lưu thiết bị thất bại!');
    } finally {
      setSavingDevice(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate('/dashboard')} className="cursor-pointer text-gray-600 hover:text-gray-900">Tổng quan</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator><ChevronRight className="w-4 h-4" /></BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate('/warehouses')} className="cursor-pointer text-gray-600 hover:text-gray-900">Kho lạnh</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator><ChevronRight className="w-4 h-4" /></BreadcrumbSeparator>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigate(`/warehouses/${warehouseId}`)} className="cursor-pointer text-gray-600 hover:text-gray-900">
              {warehouse?.warehouse_name}
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator><ChevronRight className="w-4 h-4" /></BreadcrumbSeparator>
          <BreadcrumbItem><BreadcrumbPage className="text-gray-900">{area.area_name}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header card */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{area.area_name}</h1>
            <p className="text-gray-500 text-sm mt-1">{warehouse?.warehouse_name}</p>
          </div>
          <div className="flex gap-3">
          <div className="flex gap-3">
            {canManageFood && (
              <button
                onClick={() => setShowFoodModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Gán thực phẩm
              </button>
            )}
            <div className="flex flex-wrap gap-2">
              {area.food_types && area.food_types.map(f => (
                <span key={f.id} className="bg-green-100 text-green-700 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
                  <Tag className="w-3 h-3" /> {f.food_name}
                </span>
              ))}
            </div>
          </div>
          </div>
        </div>

        {/* Sensor cards */}
        <div className="grid grid-cols-2 gap-6">
          <div className={`p-5 rounded-xl ${tempWarning ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Thermometer className={`w-5 h-5 ${tempWarning ? 'text-orange-500' : 'text-red-400'}`} />
              <span className="font-medium text-gray-700">Nhiệt độ</span>
            </div>
            <p className={`text-4xl font-bold ${tempWarning ? 'text-orange-600' : 'text-gray-900'}`}>
              {currentTemp !== null ? `${currentTemp}°C` : '—'}
            </p>
            {food && <p className="text-xs text-gray-400 mt-2">Ngưỡng: {food.min_temp} ~ {food.max_temp}°C</p>}
          </div>
          <div className={`p-5 rounded-xl ${humiWarning ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Droplets className={`w-5 h-5 ${humiWarning ? 'text-orange-500' : 'text-blue-400'}`} />
              <span className="font-medium text-gray-700">Độ ẩm</span>
            </div>
            <p className={`text-4xl font-bold ${humiWarning ? 'text-orange-600' : 'text-gray-900'}`}>
              {currentHumi !== null ? `${currentHumi}%` : '—'}
            </p>
            {food && <p className="text-xs text-gray-400 mt-2">Ngưỡng: {food.min_humi} ~ {food.max_humi}%</p>}
          </div>
        </div>
      </div>

      
      {/* Filter card */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-4">Lọc lịch sử theo thời gian</h2>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Từ ngày
            </label>
            <input
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ECC71]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-2" />
              Đến ngày
            </label>
            <input
              type="date"
              value={endDate}
              min={startDate || undefined}
              max={toDateInputValue(new Date())}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ECC71]"
            />
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-3">Để trống sẽ lấy dữ liệu ngày hiện tại.</p>
        {historyError && <p className="text-xs text-red-600 mt-3">{historyError}</p>}
      </div>

      {/* Charts */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-4">Lịch sử nhiệt độ</h2>
        {tempChartData.length === 0 ? (
          <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">
            Chưa có dữ liệu cảm biến
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={tempChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="time" stroke="#6B7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6B7280" />
              <Tooltip formatter={(v) => [`${v}°C`, 'Nhiệt độ']} />
              <Line type="monotone" dataKey="value" stroke="#E74C3C" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-4">Lịch sử độ ẩm</h2>
        {humiChartData.length === 0 ? (
          <div className="flex items-center justify-center h-[220px] text-gray-400 text-sm">
            Chưa có dữ liệu cảm biến
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={humiChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="time" stroke="#6B7280" tick={{ fontSize: 11 }} />
              <YAxis stroke="#6B7280" />
              <Tooltip formatter={(v) => [`${v}%`, 'Độ ẩm']} />
              <Line type="monotone" dataKey="value" stroke="#3498DB" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Danh sách thiết bị */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900">Thiết bị ({area.devices.length})</h2>
          <button onClick={openAddDevice}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2ECC71] text-white rounded-lg text-sm font-medium hover:bg-[#27AE60] transition-colors">
            <Plus className="w-4 h-4" /> Thêm thiết bị
          </button>
        </div>

        {area.devices.length === 0 ? (
          <p className="text-gray-400 text-center py-8">Chưa có thiết bị nào</p>
        ) : (
          <div className="space-y-3">
            {area.devices.map((device: DeviceApi) => {
              const isActuator = device.device_type?.toUpperCase() === 'ACTUATOR';
              const isOnline = device.status?.toUpperCase() === 'ONLINE';
              const isControlling = controllingId === device.id;

              return (
                <div key={device.id}
                  onClick={() => navigate(`/warehouses/${warehouseId}/areas/${areaId}/devices/${device.id}`)}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full shrink-0 ${isOnline ? 'bg-green-400' : 'bg-gray-300'}`} />
                    <div>
                      <p className="font-medium text-gray-900">{device.device_name}</p>
                      <p className="text-xs text-gray-400">{device.device_type} • {device.adafruit_feed_key || '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    {device.latest_value !== undefined && (
                      <span className="text-sm font-bold text-gray-700 bg-white px-2 py-1 rounded-lg border border-gray-200">
                        {device.latest_value}
                      </span>
                    )}
                    {isActuator && (
                      <div className="flex gap-2">
                        <button
                          disabled={isControlling}
                          onClick={() => handleControlDevice(device, 'ON')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${
                            isOnline ? 'bg-green-500 text-white' : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          <Power className="w-3 h-3" /> {isControlling ? '...' : 'BẬT'}
                        </button>
                        <button
                          disabled={isControlling}
                          onClick={() => handleControlDevice(device, 'OFF')}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-50 ${
                            !isOnline ? 'bg-gray-400 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          <PowerOff className="w-3 h-3" /> {isControlling ? '...' : 'TẮT'}
                        </button>
                      </div>
                    )}
                    {/* Edit / Delete */}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => openEditDevice(device, e)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => handleDeleteDevice(device, e)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Food Type */}
      {showFoodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFoodModal(false)} />
          <div className="relative bg-white rounded-xl w-full max-w-lg shadow-2xl z-10" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Chọn loại thực phẩm</h2>
              <button onClick={() => setShowFoodModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveFoodType} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {allFoodTypes.map((ft: FoodTypeApi) => (
                  <button key={ft.id} type="button" onClick={() => setSelectedFoodTypeId(ft.id)}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      selectedFoodTypeId === ft.id ? 'border-[#2ECC71] bg-green-50' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                    <p className={`font-semibold ${selectedFoodTypeId === ft.id ? 'text-[#2ECC71]' : 'text-gray-900'}`}>{ft.food_name}</p>
                    <p className="text-xs text-gray-500 mt-1">🌡 {ft.min_temp}~{ft.max_temp}°C &nbsp; 💧 {ft.min_humi}~{ft.max_humi}%</p>
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowFoodModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg">Hủy</button>
                <button type="submit" disabled={!selectedFoodTypeId || savingFood} className="px-6 py-2 bg-[#2ECC71] text-white rounded-lg hover:bg-[#27AE60] disabled:opacity-50">
                  {savingFood ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Device */}
      {showDeviceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowDeviceModal(false)} />
          <div className="relative bg-white rounded-xl w-full max-w-md shadow-2xl z-10" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">{editingDevice ? 'Sửa thiết bị' : 'Thêm thiết bị mới'}</h2>
              <button onClick={() => setShowDeviceModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveDevice} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tên thiết bị</label>
                <input type="text" required value={deviceForm.device_name}
                  onChange={(e) => setDeviceForm({ ...deviceForm, device_name: e.target.value })}
                  placeholder="VD: Cảm biến nhiệt khu A"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ECC71]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Mã thiết bị</label>
                <input type="text" required value={deviceForm.device_code}
                  onChange={(e) => setDeviceForm({ ...deviceForm, device_code: e.target.value })}
                  placeholder="VD: DHT_TU_01"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ECC71]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Loại thiết bị</label>
                <select value={deviceForm.device_type} onChange={(e) => setDeviceForm({ ...deviceForm, device_type: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ECC71]">
                  {DEVICE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Adafruit Feed Key</label>
                <input type="text" value={deviceForm.adafruit_feed_key}
                  onChange={(e) => setDeviceForm({ ...deviceForm, adafruit_feed_key: e.target.value })}
                  placeholder="VD: nhietdo1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ECC71]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Trạng thái</label>
                <select value={deviceForm.status} onChange={(e) => setDeviceForm({ ...deviceForm, status: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2ECC71]">
                  <option value="ONLINE">ONLINE</option>
                  <option value="OFFLINE">OFFLINE</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowDeviceModal(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">Hủy</button>
                <button type="submit" disabled={savingDevice} className="px-4 py-2 bg-[#2ECC71] text-white rounded-lg hover:bg-[#27AE60] disabled:opacity-50">
                  {savingDevice ? 'Đang lưu...' : editingDevice ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}