import React, { useMemo, useState } from "react";
import { Warehouse, MapPin, Cpu, Bell } from "lucide-react";
import {
  Line,
  LineChart,
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
  Cell,
} from "recharts";

import { useDashboard } from "../hooks/useDashboard";
import { useSensorHistory } from "../hooks/useSensorHistory";
import { store } from "../store";

import { StatCard } from "../components/StatCard";
import { AreaCard } from "../components/AreaCard";

/* ================= TYPE ================= */

type Range = "minute" | "hour" | "day";

/* ================= COMPONENT ================= */

export function DashboardPage() {
  const { warehouses, areas, devices, loading } = useDashboard();

  const alerts = store.getAlerts().filter((a) => !a.acknowledged);

  const [selectedWarehouseId, setSelectedWarehouseId] = useState("all");
  const [selectedRange, setSelectedRange] = useState<Range>("minute");

  /* ================= FILTER AREAS ================= */

  const chartAreas = useMemo(() => {
    if (selectedWarehouseId === "all") return areas;
    return areas.filter((a) => a.warehouseId === selectedWarehouseId);
  }, [areas, selectedWarehouseId]);

  const areaIds = useMemo(
    () => chartAreas.map((a) => a.id),
    [chartAreas],
  );

  const chartDevices = useMemo(
    () => devices.filter((d) => areaIds.includes(d.areaId)),
    [devices, areaIds],
  );

  const chartAlerts = useMemo(
    () => alerts.filter((a) => areaIds.includes(a.areaId)),
    [alerts, areaIds],
  );

  const activeDevices = chartDevices.filter(
    (d) => d.status === "online",
  ).length;

  /* ================= SENSOR DATA ================= */

  const { chartData } = useSensorHistory(areaIds, selectedRange);

  /* ================= ALERT CHART (REFAC CLEAN) ================= */

  const alertData = useMemo(() => {
    const labels =
      selectedRange === "minute"
        ? []
        : selectedRange === "hour"
          ? Array.from({ length: 24 }, (_, i) =>
              i.toString().padStart(2, "0") + ":00",
            )
          : Array.from({ length: 7 }, (_, i) => `T${i + 2}`);

    const getBucket = (date: Date) => {
      if (selectedRange === "hour") return date.getHours();
      if (selectedRange === "day")
        return (date.getDay() + 6) % 7;
      return 0; // minute → optional alert grouping (hoặc bỏ chart này nếu muốn)
    };

    const count = Array(labels.length).fill(0);

    chartAlerts.forEach((a) => {
      const idx = getBucket(new Date(a.timestamp));
      if (idx >= 0 && idx < count.length) count[idx]++;
    });

    return labels.map((label, i) => ({
      label,
      value: count[i],
    }));
  }, [chartAlerts, selectedRange]);

  /* ================= DEVICE CHART ================= */

  const deviceTypeNames: Record<string, string> = {
    temperature: "Cảm biến nhiệt độ",
    humidity: "Cảm biến độ ẩm",
    cooling: "Máy lạnh",
    fan: "Quạt",
    light: "Đèn",
  };

  const deviceColors: Record<string, string> = {
    temperature: "#3b82f6",
    humidity: "#8b5cf6",
    cooling: "#06b6d4",
    fan: "#14b8a6",
    light: "#f59e0b",
  };

  const deviceData = useMemo(() => {
    const types = Object.keys(deviceTypeNames);

    return types.map((t) => ({
      name: deviceTypeNames[t],
      value: chartDevices.filter((d) => d.type === t).length,
      fill: deviceColors[t],
    }));
  }, [chartDevices]);

  /* ================= LOADING ================= */

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">Tổng quan hệ thống</h1>
        <p className="text-gray-500">
          Giám sát kho lạnh & thiết bị realtime
        </p>
      </div>

      {/* STATS */}
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
          label="Thiết bị online"
          value={`${activeDevices}/${devices.length}`}
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

      {/* FILTER */}
      <div className="bg-white p-4 rounded-xl">
        <div className="flex gap-4">
          <select
            value={selectedWarehouseId}
            onChange={(e) =>
              setSelectedWarehouseId(e.target.value)
            }
            className="px-4 py-2 border rounded-lg"
          >
            <option value="all">Tất cả kho</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>

          {(["minute", "hour", "day"] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setSelectedRange(r)}
              className={`px-4 py-2 rounded-lg ${
                selectedRange === r
                  ? "bg-green-500 text-white"
                  : "bg-gray-200"
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* AREAS */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Khu vực</h2>
        <div className="grid grid-cols-2 gap-6">
          {chartAreas.map((a) => (
            <AreaCard
              key={a.id}
              area={a}
              warehouseId={a.warehouseId}
            />
          ))}
        </div>
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-2 gap-6">
        {/* ALERT */}
        <div className="bg-white p-4 rounded-xl">
          <h3 className="font-semibold mb-4">Cảnh báo</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={alertData}>
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Line dataKey="value" stroke="#f97316" />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* DEVICE */}
        <div className="bg-white p-4 rounded-xl">
          <h3 className="font-semibold mb-4">Thiết bị</h3>

          {deviceData.every((d) => d.value === 0) ? (
            <div className="flex items-center justify-center h-[250px] text-gray-400">
              Chưa có dữ liệu thiết bị
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={deviceData}
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  dataKey="value"
                  nameKey="name"
                  label={({ value }) => (value > 0 ? value : "")}
                >
                  {deviceData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* SENSOR */}
        <div className="bg-white p-4 rounded-xl">
          <h3 className="font-semibold mb-4">
            Nhiệt độ & độ ẩm
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line
                dataKey="temperature"
                stroke="#f97316"
                dot={false}
              />
              <Line
                dataKey="humidity"
                stroke="#06b6d4"
                dot={false}
              />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* CO2 */}
        <div className="bg-white p-4 rounded-xl">
          <h3 className="font-semibold mb-4">CO2</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line
                dataKey="co2"
                stroke="#8b5cf6"
                dot={false}
              />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}