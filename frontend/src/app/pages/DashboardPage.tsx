import React, { useMemo, useState } from 'react';
import { Warehouse, MapPin, Cpu, Bell } from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { StatCard } from '../components/StatCard';
import { AreaCard } from '../components/AreaCard';
import { store } from '../store';

export function DashboardPage() {
  const warehouses = store.getWarehouses();
  const areas = store.getAreas();
  const devices = store.getDevices();
  const alerts = store.getAlerts().filter(a => !a.acknowledged);

  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('all');
  const [selectedRange, setSelectedRange] = useState<'day' | 'week' | 'month'>('day');

  // Filter inputs are used only for charts (not for KPI cards / area list).
  const chartAreas = useMemo(
    () => (selectedWarehouseId === 'all' ? areas : areas.filter(area => area.warehouseId === selectedWarehouseId)),
    [areas, selectedWarehouseId]
  );

  const chartAreaIdSet = useMemo(() => new Set(chartAreas.map(a => a.id)), [chartAreas]);
  const chartFilteredDevices = useMemo(
    () => devices.filter(d => chartAreaIdSet.has(d.areaId)),
    [devices, chartAreaIdSet]
  );
  const chartFilteredAlerts = useMemo(
    () => alerts.filter(a => chartAreaIdSet.has(a.areaId)),
    [alerts, chartAreaIdSet]
  );

  const activeDevicesAll = devices.filter(d => d.status === 'online').length;

  const rangeLabels = {
    day: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
    week: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
    month: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4']
  } as const;

  const rangeTitleSuffix = selectedRange === 'day' ? '24h' : selectedRange === 'week' ? '7 ngày' : '30 ngày';

  const avg = (nums: number[]) => {
    if (nums.length === 0) return 0;
    return nums.reduce((s, n) => s + n, 0) / nums.length;
  };

  const avgTempAll = avg(chartAreas.map(a => a.currentTemp));
  const avgHumidityAll = avg(chartAreas.map(a => a.currentHumidity));

  // Kết hợp nhiệt độ + độ ẩm vào 1 biểu đồ (AreaChart) có 2 trục Y khác đơn vị
  const tempHumidityTrendData = useMemo(() => {
    const labels = rangeLabels[selectedRange];

    const temperatureFactors =
      selectedRange === 'day'
        ? [0.98, 1.03, 0.99, 1.02, 1.01, 0.97]
        : selectedRange === 'week'
          ? [1.01, 0.99, 1.02, 0.98, 1, 1.03, 0.97]
          : [0.99, 1.02, 1, 1.01];

    const humidityFactors =
      selectedRange === 'day'
        ? [1, 0.99, 1.01, 1, 0.98, 1.02]
        : selectedRange === 'week'
          ? [1.02, 1, 0.98, 1.01, 0.99, 1.02, 1]
          : [1.01, 0.99, 1.02, 1];

    return labels.map((time, idx) => ({
      time,
      temperature: Number((avgTempAll * temperatureFactors[idx]).toFixed(1)),
      humidity: Number((avgHumidityAll * humidityFactors[idx]).toFixed(1))
    }));
  }, [avgHumidityAll, avgTempAll, rangeLabels, selectedRange]);

  const getAlertBucketIndex = (date: Date) => {
    if (selectedRange === 'day') return Math.min(5, Math.max(0, Math.floor(date.getHours() / 4)));
    if (selectedRange === 'week') return (date.getDay() + 6) % 7; // Monday=0 .. Sunday=6
    return Math.min(3, Math.floor((date.getDate() - 1) / 7)); // Week of month: 0..3
  };

  const alertsTimeBucketData = useMemo(() => {
    const labels = rangeLabels[selectedRange];
    const counts = labels.map(() => 0);

    for (const alert of chartFilteredAlerts) {
      const idx = getAlertBucketIndex(new Date(alert.timestamp));
      counts[idx] += 1;
    }

    return labels.map((label, i) => ({ label, value: counts[i] }));
  }, [chartFilteredAlerts, rangeLabels, selectedRange]);

  const deviceTypeLabels: Record<string, string> = {
    temperature: 'Nhiệt độ',
    humidity: 'Độ ẩm',
    cooling: 'Làm lạnh',
    fan: 'Quạt',
    light: 'Đèn'
  };

  const electronicCountData = useMemo(() => {
    const typeOrder = ['temperature', 'humidity', 'cooling', 'fan', 'light'] as const;

    return typeOrder.map(type => ({
      name: deviceTypeLabels[type] ?? type,
      count: chartFilteredDevices.filter(d => d.type === type).length
    }));
  }, [deviceTypeLabels, chartFilteredDevices]);

  // ước lượng tổng điện năng tiêu thụ theo trạng thái online + hệ số theo loại thiết bị
  const energyTimeData = useMemo(() => {
    const labels = rangeLabels[selectedRange];

    const weights: Record<string, number> = {
      temperature: 0.05,
      humidity: 0.05,
      cooling: 1.8,
      fan: 0.9,
      light: 0.4
    };

    const onlineDevices = chartFilteredDevices.filter(d => d.status === 'online');
    const base = Object.keys(weights).reduce((sum, type) => {
      const count = onlineDevices.filter(d => d.type === type).length;
      return sum + count * weights[type];
    }, 0);

    const baseKwh = base * 0.25; // scale để hiển thị đẹp (khi có dữ liệu thực sẽ thay thế)

    const factors =
      selectedRange === 'day'
        ? [0.85, 1.05, 0.95, 1.15, 1.0, 0.9]
        : selectedRange === 'week'
          ? [0.92, 1.03, 1.01, 0.98, 1.06, 1.1, 0.97]
          : [0.95, 1.02, 1.08, 0.99];

    return labels.map((time, idx) => ({
      time,
      energyKwh: Number((baseKwh * factors[idx]).toFixed(2))
    }));
  }, [chartFilteredDevices, rangeLabels, selectedRange]);

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Tổng quan hệ thống</h1>
        <p className="text-gray-500">Giám sát và quản lý khu vực lưu trữ thực phẩm tươi sống</p>
      </div>

      <div className="grid grid-cols-4 gap-6">
        <StatCard
          icon={Warehouse}
          label="Kho lạnh"
          value={warehouses.length}
          color="text-purple-600"
          bgColor="bg-purple-100"
        />
        <StatCard
          icon={MapPin}
          label="Khu vực"
          value={areas.length}
          color="text-blue-600"
          bgColor="bg-blue-100"
        />
        <StatCard
          icon={Cpu}
          label="Thiết bị hoạt động"
          value={`${activeDevicesAll}/${devices.length}`}
          color="text-green-600"
          bgColor="bg-green-100"
        />
        <StatCard
          icon={Bell}
          label="Cảnh báo"
          value={alerts.length}
          color="text-orange-600"
          bgColor="bg-orange-100"
        />
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Kho lạnh</label>
            <select
              value={selectedWarehouseId}
              onChange={e => setSelectedWarehouseId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/40"
            >
              <option value="all">Tất cả kho lạnh</option>
              {warehouses.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Khoảng thời gian</label>
            <div className="inline-flex bg-gray-100 rounded-xl p-1">
              {(['day', 'week', 'month'] as const).map(range => (
                <button
                  key={range}
                  type="button"
                  onClick={() => setSelectedRange(range)}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                    selectedRange === range ? 'bg-white text-[#2ECC71] shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {range === 'day' ? 'Ngày' : range === 'week' ? 'Tuần' : 'Tháng'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Khu vực lưu trữ</h2>
        <div className="grid grid-cols-2 gap-6">
          {areas.map(area => (
            <AreaCard key={area.id} area={area} warehouseId={area.warehouseId} />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Cảnh báo theo thời gian ({rangeTitleSuffix})</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={alertsTimeBucketData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="label" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#F97316"
                name="Số cảnh báo"
                strokeWidth={2.5}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Số lượng thiết bị theo loại (electronic)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={electronicCountData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="name" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip />
              <Legend />
              <Bar dataKey="count" fill="#2ECC71" name="Số thiết bị" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Nhiệt độ & độ ẩm ({rangeTitleSuffix})</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={tempHumidityTrendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="time" stroke="#6B7280" />
              <YAxis yAxisId="left" stroke="#2ECC71" />
              <YAxis yAxisId="right" orientation="right" stroke="#3498DB" />
              <Tooltip />
              <Legend />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="temperature"
                name="Nhiệt độ (°C)"
                stroke="#2ECC71"
                fill="#2ECC71"
                fillOpacity={0.12}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="humidity"
                name="Độ ẩm (%)"
                stroke="#3498DB"
                fill="#3498DB"
                fillOpacity={0.12}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4">Tổng điện năng tiêu thụ ({rangeTitleSuffix})</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={energyTimeData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis dataKey="time" stroke="#6B7280" />
              <YAxis stroke="#6B7280" />
              <Tooltip />
              <Legend />
              <Bar dataKey="energyKwh" fill="#8B5CF6" name="kWh" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}