// src/pages/LogsPage.tsx
import React, { useState, useEffect } from "react";
import { Search, Settings, Power, Thermometer, Droplets, User as UserIcon, Calendar, ClipboardList } from "lucide-react";
import { getActionLogs, ActionLogApi } from "../api/apiService";

/**
 * Parse datetime string từ backend thành Date object đúng UTC.
 * Backend trả về "2026-05-17T13:05:00" (không có 'Z' hay offset),
 * JavaScript sẽ tự hiểu là local time thay vì UTC → bị lệch 7 giờ.
 * Hàm này đảm bảo luôn parse đúng là UTC bằng cách thêm 'Z' nếu thiếu.
 */
function parseUTC(dateStr: string): Date {
  if (!dateStr) return new Date(NaN);
  // Nếu đã có timezone info (Z, +, -) thì parse bình thường
  if (/[Zz]$/.test(dateStr) || /[+-]\d{2}:\d{2}$/.test(dateStr)) {
    return new Date(dateStr);
  }
  // Không có timezone → backend lưu UTC nhưng thiếu 'Z', thêm vào
  return new Date(dateStr + "Z");
}

export function LogsPage() {
  const [logs, setLogs] = useState<ActionLogApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDate, setFilterDate] = useState(""); // yyyy-mm-dd
  

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const res = await getActionLogs();
        setLogs(res.data.data);
      } catch (err) {
        console.error("Lỗi lấy logs:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);
 
  const filteredLogs = logs.filter((log) => {
    // Lọc theo từ khoá
    const content = `${log.action_type} ${log.action_value}`.toLowerCase();
    if (searchTerm && !content.includes(searchTerm.toLowerCase())) return false;

    // Lọc theo ngày
    if (filterDate) {
      const logDate = parseUTC(log.created_at).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }); // en-CA = yyyy-mm-dd
      if (logDate !== filterDate) return false;
    }

    return true;
  });
    const uniqueFilteredLogs = filteredLogs.filter(
      (log, index, self) => self.findIndex((l) => l.id === log.id) === index
    )

  const getLogIcon = (action_type: string) => {
    const t = action_type.toUpperCase();
    if (t.includes("MANUAL_CONTROL")) return <Power className="w-4 h-4 text-orange-500" />;
    if (t.includes("MODE_CHANGE")) return <Settings className="w-4 h-4 text-blue-500" />;
    if (t.includes("TEMP")) return <Thermometer className="w-4 h-4 text-red-500" />;
    if (t.includes("HUMI")) return <Droplets className="w-4 h-4 text-blue-500" />;
    return <Settings className="w-4 h-4 text-gray-500" />;
  };

  const getActionLabel = (type: string) => {
    const map: Record<string, string> = {
      MANUAL_CONTROL: "Điều khiển thủ công",
      MODE_CHANGE: "Đổi chế độ",
      AUTO_CONTROL: "Tự động",
      AUTO_SCHEDULE: "Lịch trình",
      TEMP_ALERT: "Cảnh báo nhiệt độ",
      DOOR_WARNING: "Cảnh báo cửa",
      EMERGENCY_SOS: "Khẩn cấp",
      USER_LOGIN: "Đăng nhập",
    };
    return map[type.toUpperCase()] || type;
  };

  const getTriggerLabel = (type: string) => {
    const t = type.toUpperCase();
    if (t.includes("MANUAL_CONTROL")) return "MANUAL";
    if (t.includes("AUTO")) return "AUTO";
    if (t.includes("SCHEDULE")) return "LỊCH";
    return "SYSTEM";
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Nhật ký hệ thống</h1>
          <p className="text-gray-500">Theo dõi toàn bộ hoạt động vận hành</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-lg border border-gray-100 shadow-sm">
          <Calendar className="w-4 h-4 text-[#2ECC71]" />
          <span className="text-sm font-medium text-gray-600">{new Date().toLocaleDateString("vi-VN")}</span>
        </div>
      </div>

      {/* Tìm kiếm + lọc ngày */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm kiếm theo loại hành động, nội dung..."
            className="w-full pl-12 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#2ECC71] transition-all shadow-sm text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        {/* Lọc theo ngày */}
        <div className="relative">
          <Calendar className="absolute left-3 top-3 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-[#2ECC71] shadow-sm text-sm text-gray-700"
          />
        </div>
        {filterDate && (
          <button
            onClick={() => setFilterDate("")}
            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 border border-gray-200 rounded-xl bg-white hover:bg-gray-50 transition-colors"
          >
            Xóa lọc
          </button>
        )}
      </div>

      {filterDate && (
        <p className="text-xs text-gray-400">
          Đang lọc: <strong className="text-gray-600">{new Date(filterDate).toLocaleDateString('vi-VN')}</strong>
          {' '}— {filteredLogs.length} kết quả
        </p>
      )}

      <div className="grid gap-4">
        {loading && <div className="bg-white rounded-xl p-12 text-center text-gray-400">Đang tải nhật ký...</div>}

        {!loading && uniqueFilteredLogs.map((log) => (
          <div key={log.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:border-[#2ECC71]/30 transition-all group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="w-24 border-r border-gray-100 pr-4">
                  <p className="font-bold text-gray-900 text-base">
                    {parseUTC(log.created_at).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" })}
                  </p>
                  <p className="text-[11px] text-gray-400 font-medium">
                    {parseUTC(log.created_at).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
                  </p>
                </div>
                <div className="space-y-1">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-gray-50 border border-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    {getLogIcon(log.action_type)}
                    {getActionLabel(log.action_type)}
                  </span>
                  <p className="text-sm text-gray-700">{log.action_value}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-xl group-hover:bg-green-50 transition-colors">
                <UserIcon className="w-4 h-4 text-[#2ECC71]" />
                <span className="text-xs font-bold text-gray-600 uppercase tracking-tighter">
                  {getTriggerLabel(log.action_type)}
                </span>
              </div>
            </div>
          </div>
        ))}

        {!loading && uniqueFilteredLogs.length === 0 && (
          <div className="bg-white rounded-xl p-16 text-center shadow-sm border border-gray-100">
            <ClipboardList className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 font-bold uppercase text-xs tracking-widest">Không có dữ liệu nhật ký</p>
          </div>
        )}
      </div>
    </div>
  );
}