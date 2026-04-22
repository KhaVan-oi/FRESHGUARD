import { useEffect, useMemo, useState } from "react";
import { getSensorHistory } from "../api/dashboardApi";

/* ================= TYPE ================= */

type Range = "minute" | "hour" | "day";

type SensorRecord = {
  reading_value: number;
  recorded_at: string;
};

/* ================= RANGE CONFIG ================= */

const RANGE_CONFIG = {
  minute: {
    getKey: (d: Date) =>
      `${d.getHours().toString().padStart(2, "0")}:${d
        .getMinutes()
        .toString()
        .padStart(2, "0")}`,
    sortValue: (d: Date) => d.getTime(),
  },

  hour: {
    getKey: (d: Date) =>
      `${d.getHours().toString().padStart(2, "0")}:00`,
    sortValue: (d: Date) => d.getHours(),
  },

  day: {
    getKey: (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    },
    sortValue: (d: Date) => d.getTime(),
  },
} as const;

/* ================= UTILS ================= */

function groupSensorData(data: SensorRecord[], range: Range) {
  const config = RANGE_CONFIG[range];

  const map = new Map<
    string,
    { sum: number; count: number; sort: number }
  >();

  for (const item of data) {
    const date = new Date(item.recorded_at);
    const key = config.getKey(date);

    if (!map.has(key)) {
      map.set(key, {
        sum: 0,
        count: 0,
        sort: config.sortValue(date),
      });
    }

    const bucket = map.get(key)!;
    bucket.sum += item.reading_value;
    bucket.count += 1;
  }

  return Array.from(map.entries())
    .map(([time, v]) => ({
      time,
      value: v.sum / v.count,
      sort: v.sort,
    }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ time, value }) => ({ time, value }));
}

/* ================= HOOK ================= */

export function useSensorHistory(areaIds: string[], range: Range) {
  const [tempRaw, setTempRaw] = useState<SensorRecord[]>([]);
  const [humiRaw, setHumiRaw] = useState<SensorRecord[]>([]);
  const [co2Raw, setCo2Raw] = useState<SensorRecord[]>([]);

  /* ================= FETCH ================= */

  useEffect(() => {
    if (!areaIds.length) return;

    const fetchData = async () => {
      try {
        const [temp, humi, co2] = await Promise.all([
          Promise.all(
            areaIds.map((id) =>
              getSensorHistory({
                type: "TEMP",
                area_id: id,
                limit: 200,
              }),
            ),
          ),
          Promise.all(
            areaIds.map((id) =>
              getSensorHistory({
                type: "HUMI",
                area_id: id,
                limit: 200,
              }),
            ),
          ),
          Promise.all(
            areaIds.map((id) =>
              getSensorHistory({
                type: "CO2",
                area_id: id,
                limit: 200,
              }),
            ),
          ),
        ]);

        setTempRaw(temp.flat());
        setHumiRaw(humi.flat());
        setCo2Raw(co2.flat());
      } catch (err) {
        console.error("sensor history error:", err);
      }
    };

    fetchData();
  }, [areaIds]);

  /* ================= TRANSFORM ================= */

  const chartData = useMemo(() => {
    const temp = groupSensorData(tempRaw, range);
    const humi = groupSensorData(humiRaw, range);
    const co2 = groupSensorData(co2Raw, range);

    const map = new Map<
      string,
      {
        time: string;
        temperature?: number;
        humidity?: number;
        co2?: number;
      }
    >();

    for (const t of temp) {
      map.set(t.time, { time: t.time, temperature: t.value });
    }

    for (const h of humi) {
      map.set(h.time, {
        time: h.time,
        ...(map.get(h.time) || {}),
        humidity: h.value,
      });
    }

    for (const c of co2) {
      map.set(c.time, {
        time: c.time,
        ...(map.get(c.time) || {}),
        co2: c.value,
      });
    }

    return Array.from(map.values());
  }, [tempRaw, humiRaw, co2Raw, range]);

  /* ================= RETURN ================= */

  return {
    chartData,
  };
}