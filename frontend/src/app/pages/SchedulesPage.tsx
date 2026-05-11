// src/pages/SchedulesPage.tsx
import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Clock,
  Pencil,
  Trash2,
  X,
  Power,
  PowerOff,
  ChevronRight,
  Warehouse,
  LayoutGrid,
  Cpu,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import {
  getWarehouses,
  getSchedulesByArea,
  createScheduleInArea,
  updateScheduleInArea,
  deleteScheduleInArea,
  canAccessArea,
  getCurrentUser,
  WarehouseApi,
  AreaApi,
  DeviceApi,
  DeviceScheduleGroup,
} from "../api/apiService";

// ─── Constants ──────────────────────────────────────────────────────────────

const ACTION_OPTIONS = ["ON", "OFF"];
const ACTION_LABEL: Record<string, string> = {
  ON: "Bật",
  OFF: "Tắt",
};

const ACTION_COLOR: Record<string, string> = {
  ON: "bg-emerald-100 text-emerald-700 border-emerald-200",
  OFF: "bg-gray-100 text-gray-500 border-gray-200",
};

const emptyForm = {
  device_id: "" as number | "",
  action: "ON",
  start_time: "",
  end_time: "",
  is_active: true,
};

type FormState = typeof emptyForm;

interface EditTarget {
  scheduleId: number;
  deviceId: number;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Breadcrumb({
  warehouse,
  area,
  onResetWarehouse,
  onResetArea,
}: {
  warehouse: WarehouseApi | null;
  area: AreaApi | null;
  onResetWarehouse: () => void;
  onResetArea: () => void;
}) {
  return (
    <nav className="flex items-center gap-1.5 text-sm text-gray-500 flex-wrap">
      <button
        onClick={onResetWarehouse}
        className="flex items-center gap-1 hover:text-[#2ECC71] transition-colors font-medium"
      >
        <Warehouse className="w-3.5 h-3.5" />
        Lịch trình
      </button>
      {warehouse && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          <button
            onClick={onResetArea}
            className={`hover:text-[#2ECC71] transition-colors font-medium ${!area ? "text-gray-900" : ""}`}
          >
            {warehouse.warehouse_name}
          </button>
        </>
      )}
      {area && (
        <>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
          <span className="text-gray-900 font-semibold">{area.area_name}</span>
        </>
      )}
    </nav>
  );
}

function SelectionCard({
  icon,
  label,
  sublabel,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        group w-full text-left bg-white border rounded-xl p-5 shadow-sm transition-all
        ${
          disabled
            ? "opacity-40 cursor-not-allowed border-gray-100"
            : "border-gray-200 hover:border-[#2ECC71] hover:shadow-md cursor-pointer"
        }
      `}
    >
      <div className="flex items-center gap-4">
        <div
          className={`
          w-10 h-10 rounded-lg flex items-center justify-center shrink-0
          ${disabled ? "bg-gray-100 text-gray-400" : "bg-[#2ECC71]/10 text-[#2ECC71] group-hover:bg-[#2ECC71] group-hover:text-white transition-colors"}
        `}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{label}</p>
          {sublabel && (
            <p className="text-xs text-gray-400 mt-0.5">{sublabel}</p>
          )}
        </div>
        <ChevronRight
          className={`w-4 h-4 ml-auto shrink-0 transition-colors ${disabled ? "text-gray-300" : "text-gray-300 group-hover:text-[#2ECC71]"}`}
        />
      </div>
    </button>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────

function ScheduleModal({
  devices,
  areaDevices,
  editTarget,
  form,
  setForm,
  submitting,
  onClose,
  onSubmit,
}: {
  devices: DeviceScheduleGroup[];
  areaDevices: {
    id: number;
    device_name: string;
    device_code: string;
    device_type: string;
    adafruit_feed_key: string;
    status: string;
  }[];
  editTarget: EditTarget | null;
  form: FormState;
  setForm: (f: FormState) => void;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  const isEdit = !!editTarget;

  // Các loại thiết bị không thể lên lịch (chỉ đọc giá trị)
  const SENSOR_TYPES = [
    "SENSOR",
    "TEMP",
    "HUMI",
    "CO2_SENSOR",
    "DOOR_SENSOR",
    "BRIGHT",
    "EMERGENCY_BTN",
  ];

  // Danh sách thiết bị để chọn: ưu tiên areaDevices (từ warehouse data),
  // fallback về deviceGroups nếu không có.
  // Hiển thị TẤT CẢ trạng thái (ONLINE/OFFLINE) — không lọc theo status.
  const selectableDevices =
    areaDevices.length > 0
      ? areaDevices.filter((d) => !SENSOR_TYPES.includes(d.device_type))
      : devices.map((d) => ({
          id: d.device_id,
          device_name: d.device_name,
          device_code: d.device_code,
          device_type: d.device_type,
          adafruit_feed_key: d.adafruit_feed_key,
          status: d.device_status,
        }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl z-10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {isEdit ? "Chỉnh sửa lịch trình" : "Thêm lịch trình mới"}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {isEdit
                ? "Cập nhật thông tin lịch trình"
                : "Thiết lập thời gian tự động cho thiết bị"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          {/* Device */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Thiết bị
            </label>
            <select
              value={form.device_id}
              onChange={(e) =>
                setForm({
                  ...form,
                  device_id: e.target.value ? Number(e.target.value) : "",
                })
              }
              className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/40 focus:border-[#2ECC71] bg-gray-50 transition"
              required
              disabled={isEdit}
            >
              <option value="">-- Chọn thiết bị --</option>
              {selectableDevices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.device_name} · {d.adafruit_feed_key ?? d.device_code}
                  {d.status === "OFFLINE" ? " [OFFLINE]" : ""}
                </option>
              ))}
            </select>
            {isEdit && (
              <p className="text-xs text-gray-400 mt-1">
                Không thể thay đổi thiết bị khi chỉnh sửa
              </p>
            )}
          </div>

          {/* Action */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Hành động
            </label>
            <div className="grid grid-cols-2 gap-3">
              {ACTION_OPTIONS.map((a) => (
                <button
                  type="button"
                  key={a}
                  onClick={() => setForm({ ...form, action: a })}
                  className={`py-2.5 rounded-lg font-bold border transition-all ${
                    form.action === a
                      ? `${ACTION_COLOR[a]} ring-2 ring-[#2ECC71]`
                      : "bg-gray-50 text-gray-400"
                  }`}
                >
                  {ACTION_LABEL[a]}
                </button>
              ))}
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Giờ bắt đầu
              </label>
              <input
                type="time"
                value={form.start_time}
                required
                onChange={(e) =>
                  setForm({ ...form, start_time: e.target.value })
                }
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/40 focus:border-[#2ECC71] bg-gray-50 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Giờ kết thúc{" "}
                <span className="text-gray-400 font-normal">(tuỳ chọn)</span>
              </label>
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2ECC71]/40 focus:border-[#2ECC71] bg-gray-50 transition"
              />
            </div>
          </div>

          {/* Active toggle */}
          <button
            type="button"
            onClick={() => setForm({ ...form, is_active: !form.is_active })}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-lg border transition-all ${
              form.is_active
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-gray-50 border-gray-200 text-gray-400"
            }`}
          >
            <span className="text-sm font-semibold">
              {form.is_active ? "Kích hoạt ngay" : "Tạm thời tắt"}
            </span>
            {form.is_active ? (
              <ToggleRight className="w-6 h-6" />
            ) : (
              <ToggleLeft className="w-6 h-6" />
            )}
          </button>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm bg-[#2ECC71] text-white font-semibold rounded-lg hover:bg-[#27AE60] disabled:opacity-50 transition-colors"
            >
              {submitting ? "Đang lưu..." : isEdit ? "Cập nhật" : "Thêm mới"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Device Schedule Card ────────────────────────────────────────────────────

function DeviceScheduleCard({
  group,
  canEdit,
  onAdd,
  onEdit,
  onDelete,
  onToggle,
}: {
  group: DeviceScheduleGroup;
  canEdit: boolean;
  onAdd: (deviceId: number) => void;
  onEdit: (scheduleId: number, deviceId: number, schedule: any) => void;
  onDelete: (scheduleId: number, deviceId: number, label: string) => void;
  onToggle: (scheduleId: number, deviceId: number, current: boolean) => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Device header */}
      <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#2ECC71]/10 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-[#2ECC71]" />
          </div>
          <div>
            <p className="font-semibold text-gray-900 text-sm">
              {group.device_name}
            </p>
            <p className="text-xs text-gray-400">
              {group.device_code} · {group.device_type}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              group.device_status === "ONLINE"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-gray-100 text-gray-400"
            }`}
          >
            {group.device_status}
          </span>
          {canEdit && (
            <button
              onClick={() => onAdd(group.device_id)}
              className="flex items-center gap-1 text-xs font-semibold text-[#2ECC71] hover:bg-[#2ECC71]/10 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Thêm lịch
            </button>
          )}
        </div>
      </div>

      {/* Schedules */}
      {group.schedules.length === 0 ? (
        <div className="px-5 py-6 text-center text-gray-400 text-sm">
          Chưa có lịch trình nào cho thiết bị này
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {group.schedules.map((s) => (
            <div
              key={s.id}
              className="px-5 py-3.5 flex items-center gap-4 hover:bg-gray-50/50 group transition-colors"
            >
              {/* Time */}

              {/* Thay đổi w-28 thành w-fit và thêm gap để thoáng hơn */}
              <div className="flex items-center gap-2 w-fit min-w-[150px] shrink-0">
                <Clock className="w-3.5 h-3.5 text-[#2ECC71]" />
                <span className="font-mono font-bold text-gray-900 text-sm">
                  {s.start_time}
                </span>
                {s.end_time && (
                  <span className="text-xs text-gray-400 flex items-center">
                    <ChevronRight className="w-3 h-3 mx-0.5" /> {s.end_time}
                  </span>
                )}
              </div>
              {/* Action badge */}
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${ACTION_COLOR[s.action] || ACTION_COLOR.OFF}`}
              >
                {s.action === "OFF" ? (
                  <PowerOff className="w-3 h-3" />
                ) : (
                  <Power className="w-3 h-3" />
                )}
                {ACTION_LABEL[s.action] || s.action}
              </span>
              {/* Status */}
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded ${
                  s.is_active
                    ? "text-emerald-600 bg-emerald-50"
                    : "text-gray-400 bg-gray-100"
                }`}
              >
                {s.is_active ? "Hoạt động" : "Tạm dừng"}
              </span>
              {/* Actions */}
              {canEdit && (
                <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onToggle(s.id, group.device_id, s.is_active)}
                    title={s.is_active ? "Tạm dừng" : "Kích hoạt"}
                    className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
                  >
                    {s.is_active ? (
                      <ToggleRight className="w-4 h-4" />
                    ) : (
                      <ToggleLeft className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => onEdit(s.id, group.device_id, s)}
                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() =>
                      onDelete(
                        s.id,
                        group.device_id,
                        `${s.start_time} - ${ACTION_LABEL[s.action]}`,
                      )
                    }
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function SchedulesPage() {
  const currentUser = getCurrentUser();

  // Step state: null → warehouse → area → schedules
  const [warehouses, setWarehouses] = useState<WarehouseApi[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] =
    useState<WarehouseApi | null>(null);
  const [selectedArea, setSelectedArea] = useState<AreaApi | null>(null);

  const [deviceGroups, setDeviceGroups] = useState<DeviceScheduleGroup[]>([]);
  const [loadingWarehouses, setLoadingWarehouses] = useState(true);
  const [loadingSchedules, setLoadingSchedules] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [prefilledDeviceId, setPrefilledDeviceId] = useState<number | "">("");
  const [formData, setFormData] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  // Error
  const [error, setError] = useState<string | null>(null);

  // ── Fetch warehouses ───────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res = await getWarehouses();
        setWarehouses(res.data.data);
      } catch {
        setError("Không thể tải danh sách kho");
      } finally {
        setLoadingWarehouses(false);
      }
    })();
  }, []);

  // ── Fetch schedules when area selected ────────────────────────────────────
  const fetchSchedules = useCallback(async (wId: number, aId: number) => {
    setLoadingSchedules(true);
    setError(null);
    try {
      const res = await getSchedulesByArea(wId, aId);
      // Filter out sensors
      const filtered = res.data.data.filter(
        (g) =>
          !["SENSOR", "TEMP", "HUMI", "CO2_SENSOR", "DOOR_SENSOR"].includes(
            g.device_type,
          ),
      );
      setDeviceGroups(filtered);
    } catch (err: any) {
      const msg = err?.response?.data?.message || "Không thể tải lịch trình";
      setError(msg);
    } finally {
      setLoadingSchedules(false);
    }
  }, []);

  const handleSelectWarehouse = (w: WarehouseApi) => {
    setSelectedWarehouse(w);
    setSelectedArea(null);
    setDeviceGroups([]);
  };

  const handleSelectArea = (a: AreaApi) => {
    if (!selectedWarehouse) return;
    setSelectedArea(a);
    fetchSchedules(selectedWarehouse.id, a.id);
  };

  const handleResetWarehouse = () => {
    setSelectedWarehouse(null);
    setSelectedArea(null);
    setDeviceGroups([]);
    setError(null);
  };

  const handleResetArea = () => {
    setSelectedArea(null);
    setDeviceGroups([]);
    setError(null);
  };

  // ── Access check for current area ─────────────────────────────────────────
  const canEdit = selectedArea ? canAccessArea(selectedArea) : false;

  // ── Modal helpers ─────────────────────────────────────────────────────────
  const openCreate = (deviceId?: number) => {
    setEditTarget(null);
    setFormData({
      ...emptyForm,
      device_id: deviceId ?? "",
    });
    setShowModal(true);
  };

  const openEdit = (scheduleId: number, deviceId: number, schedule: any) => {
    setEditTarget({ scheduleId, deviceId });
    setFormData({
      device_id: deviceId,
      action: schedule.action,
      start_time: schedule.start_time,
      end_time: schedule.end_time ?? "",
      is_active: schedule.is_active,
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWarehouse || !selectedArea || !formData.device_id) return;
    setSubmitting(true);
    try {
      const body = {
        action: formData.action,
        start_time: formData.start_time,
        end_time: formData.end_time || undefined,
        is_active: formData.is_active,
        device_id: formData.device_id as number,
      };

      if (editTarget) {
        await updateScheduleInArea(
          selectedWarehouse.id,
          selectedArea.id,
          editTarget.scheduleId,
          body,
        );
      } else {
        await createScheduleInArea(selectedWarehouse.id, selectedArea.id, body);
      }

      await fetchSchedules(selectedWarehouse.id, selectedArea.id);
      setShowModal(false);
    } catch (err: any) {
      alert(
        err?.response?.data?.message ||
          (editTarget ? "Cập nhật thất bại!" : "Tạo lịch thất bại!"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (
    scheduleId: number,
    _deviceId: number,
    label: string,
  ) => {
    if (!selectedWarehouse || !selectedArea) return;
    if (!confirm(`Xóa lịch "${label}"?`)) return;
    try {
      await deleteScheduleInArea(
        selectedWarehouse.id,
        selectedArea.id,
        scheduleId,
      );
      await fetchSchedules(selectedWarehouse.id, selectedArea.id);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Xóa thất bại!");
    }
  };

  const handleToggle = async (
    scheduleId: number,
    _deviceId: number,
    current: boolean,
  ) => {
    if (!selectedWarehouse || !selectedArea) return;
    try {
      await updateScheduleInArea(
        selectedWarehouse.id,
        selectedArea.id,
        scheduleId,
        {
          is_active: !current,
        },
      );
      await fetchSchedules(selectedWarehouse.id, selectedArea.id);
    } catch (err: any) {
      alert(err?.response?.data?.message || "Cập nhật thất bại!");
    }
  };

  // ── Areas visible to current user ─────────────────────────────────────────
  const visibleAreas =
    selectedWarehouse?.areas.filter((a) => {
      if (!currentUser) return false;
      if (currentUser.role?.toUpperCase() === "ADMIN") return true;
      return a.operators?.some((op) => op.id === currentUser.id);
    }) ?? [];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 md:p-8 space-y-6 min-h-screen bg-gray-50">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Quản lý lịch trình
          </h1>
          <div className="mt-1.5">
            <Breadcrumb
              warehouse={selectedWarehouse}
              area={selectedArea}
              onResetWarehouse={handleResetWarehouse}
              onResetArea={handleResetArea}
            />
          </div>
        </div>
        {selectedArea && canEdit && (
          <button
            onClick={() => openCreate()}
            className="flex items-center gap-2 bg-[#2ECC71] text-white px-4 py-2.5 rounded-xl hover:bg-[#27AE60] transition-colors text-sm font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4" /> Thêm lịch trình
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Step 1: Select warehouse */}
      {!selectedWarehouse && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
            Chọn kho lạnh
          </p>
          {loadingWarehouses ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-20 bg-white rounded-xl border border-gray-100 animate-pulse"
                />
              ))}
            </div>
          ) : warehouses.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center text-gray-400">
              <Warehouse className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Không có kho nào</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {warehouses.map((w) => (
                <SelectionCard
                  key={w.id}
                  icon={<Warehouse className="w-5 h-5" />}
                  label={w.warehouse_name}
                  sublabel={`${w.areas?.length ?? 0} khu vực`}
                  onClick={() => handleSelectWarehouse(w)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Select area */}
      {selectedWarehouse && !selectedArea && (
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">
            Chọn khu vực
          </p>
          {visibleAreas.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
              <LayoutGrid className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm text-gray-400">
                Bạn không được gán vào khu vực nào trong kho này
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visibleAreas.map((a) => (
                <SelectionCard
                  key={a.id}
                  icon={<LayoutGrid className="w-5 h-5" />}
                  label={a.area_name}
                  sublabel={`${a.devices?.length ?? 0} thiết bị · ${a.operating_mode}`}
                  onClick={() => handleSelectArea(a)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Device schedule list */}
      {selectedWarehouse && selectedArea && (
        <div className="space-y-4">
          {/* Area info bar */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs font-semibold bg-[#2ECC71]/10 text-[#2ECC71] px-3 py-1.5 rounded-full">
              {selectedArea.operating_mode}
            </span>
            {selectedArea.current_food_type && (
              <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full">
                🥩 {selectedArea.current_food_type.food_name}
              </span>
            )}
            {!canEdit && (
              <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Chỉ xem — bạn không được gán
                vào khu vực này
              </span>
            )}
          </div>

          {loadingSchedules ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-gray-100 h-32 animate-pulse"
                />
              ))}
            </div>
          ) : deviceGroups.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-16 text-center shadow-sm">
              <Cpu className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400 font-semibold">
                Khu vực này chưa có thiết bị có thể lên lịch
              </p>
            </div>
          ) : (
            deviceGroups.map((group) => (
              <DeviceScheduleCard
                key={group.device_id}
                group={group}
                canEdit={canEdit}
                onAdd={(deviceId) => openCreate(deviceId)}
                onEdit={openEdit}
                onDelete={handleDelete}
                onToggle={handleToggle}
              />
            ))
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <ScheduleModal
          devices={deviceGroups}
          areaDevices={(selectedArea?.devices ?? []).map((d) => ({
            id: d.id,
            device_name: d.device_name,
            device_code: d.device_code,
            device_type: d.device_type,
            adafruit_feed_key: d.adafruit_feed_key,
            status: d.status,
          }))}
          editTarget={editTarget}
          form={formData}
          setForm={setFormData}
          submitting={submitting}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}
