export type UserRole = "Admin" | "Operator";

export interface User {
  id: string;
  username: string;
  password: string;
  fullName: string;
  email?: string;
  role: UserRole;
  createdAt: Date;
}

export interface FoodType {
  id: string;
  name: string;
  minTemp: number;
  maxTemp: number;
  minHumidity: number;
  maxHumidity: number;
  description: string;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  areaCount: number;
  deviceCount: number;
  activeAlerts: number;
  status: "normal" | "warning" | "alert";
  averageTemp: number;
  averageHumidity: number;
}

export interface Area {
  id: string;
  name: string;
  warehouseId: string;
  type: "vegetable" | "meat";
  operatorId?: string;
  foodTypeIds: string[];
  currentTemp: number;
  currentHumidity: number;
  minTemp: number;
  maxTemp: number;
  minHumidity: number;
  maxHumidity: number;
  status: "normal" | "warning" | "alert";
  deviceCount: number;
}

export type DeviceType =
  | "temperature"
  | "humidity"
  | "cooling"
  | "fan"
  | "light";
export type DeviceCategory = "sensor" | "control";
export type ControlMode = "manual" | "automatic" | "scheduled";

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  category: DeviceCategory;
  areaId: string;
  status: "online" | "offline" | "error";
  isActive: boolean;
  controlMode: ControlMode;
  value?: number;
  lastUpdate: Date;
}

export interface DeviceLog {
  id: string;
  deviceId: string;
  timestamp: Date;
  action: string;
  value?: number;
  user?: string;
}

export interface Alert {
  id: string;
  areaId: string;
  areaName: string;
  type: "temperature" | "humidity";
  severity: "warning" | "critical";
  message: string;
  value: number;
  threshold: number;
  timestamp: Date;
  acknowledged: boolean;
}

export interface Schedule {
  id: string;
  deviceId: string;
  deviceName: string;
  action: "on" | "off";
  startTime: string;
  endTime: string;
  days: number[];
  enabled: boolean;
}

export interface EnvironmentData {
  timestamp: Date;
  temperature: number;
  humidity: number;
}

/////////////////////////////////////////

export interface DashboardDeviceApi {
  id: number;
  device_code: string;
  device_name: string;
  adafruit_feed_key: string;
  device_type:
    | "TEMP"
    | "HUMI"
    | "BRIGHT"
    | "CO2_SENSOR"
    | "EMERGENCY_BTN"
    | "DOOR_SENSOR"
    | "ACTUATOR"
    | "COOLING"
    | "FAN"
    | "LIGHT";
  status: string; // e.g., "ONLINE", "OFF", "RED_BLINK"
}

export interface DashboardAreaApi {
  id: number;
  area_name: string;
  auto_door_timeout_sec: number;
  manual_override_mins: number;
  current_food_type: {
    id: number;
    food_name: string;
    min_temp: number;
    max_temp: number;
    min_humi: number;
    max_humi: number;
  } | null;
  devices: DashboardDeviceApi[];
}

export interface WarehouseApiArea {
  id: number;
  area_name: string;
  auto_door_timeout_sec: number;
  manual_override_mins: number;

  operating_mode?: string;

  current_food_type: {
    id: number;
    food_name: string;
    min_temp: number;
    max_temp: number;
    min_humi: number;
    max_humi: number;
  } | null;

  devices: DashboardDeviceApi[];
}

export interface WarehouseApi {
  id: number;
  warehouse_name: string;
  areas: WarehouseApiArea[];
}

export interface DashboardApiResponse {
  status: string;
  data: DashboardAreaApi[];
}

export interface FoodTypeApi {
  id: number;
  food_name: string;
  min_temp: number;
  max_temp: number;
  min_humi: number;
  max_humi: number;
}

export interface SensorHistoryRecord {
  id: number;
  sensor_type: string;
  reading_value: number;
  recorded_at: string;
}

export interface LiveSensorDataPayload {
  khu_vuc: string;
  thiet_bi: string;
  loai_cam_bien: string;
  gia_tri: string;
}
