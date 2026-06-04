export const sparkline = (n = 16, base = 50, amp = 20) =>
  Array.from({ length: n }, (_, i) => ({
    x: i,
    y: Math.round(base + Math.sin(i / 2) * amp + (Math.random() - 0.5) * amp * 0.6),
  }));

export const timeSeries = (n = 30, base = 60, amp = 10) =>
  Array.from({ length: n }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (n - i));
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      temperature: +(base + Math.sin(i / 3) * amp + Math.random() * 5).toFixed(1),
      vibration: +(2 + Math.cos(i / 4) * 1.2 + Math.random() * 0.4).toFixed(2),
      health: Math.max(40, Math.min(100, Math.round(85 + Math.sin(i / 5) * 8 - i * 0.3))),
      failure: +(Math.min(0.9, 0.08 + i * 0.012 + Math.random() * 0.05)).toFixed(2),
      cost: Math.round(1200 + Math.sin(i / 4) * 400 + Math.random() * 300),
    };
  });

export type DeviceStatus = "healthy" | "warning" | "critical";

export interface Device {
  id: string;
  name: string;
  location: string;
  type: string;
  temperature: number;
  vibration: number;
  health: number;
  status: DeviceStatus;
  failureProb: number;
  rul: number; // days
  lastSeen: string;
}

const types = ["Centrifugal Pump", "Industrial Motor", "Compressor", "Turbine", "Gearbox", "Conveyor", "HVAC Unit", "Generator"];
const locations = ["Plant A — Line 1", "Plant A — Line 3", "Plant B — Cooling", "Plant B — Assembly", "Plant C — Packaging", "Plant C — Utilities"];

export const devices: Device[] = Array.from({ length: 14 }, (_, i) => {
  const health = Math.round(40 + Math.random() * 60);
  const status: DeviceStatus = health >= 80 ? "healthy" : health >= 60 ? "warning" : "critical";
  return {
    id: `DV-${(1024 + i).toString()}`,
    name: `${types[i % types.length]} #${i + 1}`,
    location: locations[i % locations.length],
    type: types[i % types.length],
    temperature: +(55 + Math.random() * 40).toFixed(1),
    vibration: +(1 + Math.random() * 4).toFixed(2),
    health,
    status,
    failureProb: +(((100 - health) / 100) * 0.9 + Math.random() * 0.05).toFixed(2),
    rul: Math.round((health / 100) * 180 + Math.random() * 20),
    lastSeen: `${Math.floor(Math.random() * 60)}s ago`,
  };
});

export const alerts = [
  { id: 1, severity: "critical", device: "Centrifugal Pump #3", message: "Bearing temperature exceeded 95°C threshold", time: "2 min ago" },
  { id: 2, severity: "warning", device: "Industrial Motor #7", message: "Vibration trending upward over 6h window", time: "18 min ago" },
  { id: 3, severity: "info", device: "Compressor #2", message: "Scheduled maintenance window starts in 4h", time: "1 hr ago" },
  { id: 4, severity: "critical", device: "Turbine #1", message: "Predicted bearing failure within 48 hours", time: "2 hr ago" },
  { id: 5, severity: "warning", device: "Gearbox #5", message: "Oil pressure below optimal range", time: "3 hr ago" },
  { id: 6, severity: "info", device: "HVAC Unit #4", message: "Filter replacement recommended", time: "5 hr ago" },
  { id: 7, severity: "warning", device: "Conveyor #6", message: "Belt tension drift detected", time: "8 hr ago" },
  { id: 8, severity: "critical", device: "Generator #2", message: "Coolant flow rate critically low", time: "12 hr ago" },
] as const;

export const predictions = [
  { device: "Centrifugal Pump #3", fault: "Bearing Wear", confidence: 94, failure: 87, rul: 6, risk: "Critical" as const },
  { device: "Turbine #1", fault: "Blade Imbalance", confidence: 88, failure: 72, rul: 12, risk: "High" as const },
  { device: "Industrial Motor #7", fault: "Winding Insulation Degradation", confidence: 81, failure: 54, rul: 28, risk: "Medium" as const },
  { device: "Gearbox #5", fault: "Lubrication Loss", confidence: 76, failure: 41, rul: 45, risk: "Medium" as const },
  { device: "Compressor #2", fault: "Valve Leakage", confidence: 69, failure: 28, rul: 62, risk: "Low" as const },
  { device: "Generator #2", fault: "Cooling System Failure", confidence: 92, failure: 81, rul: 9, risk: "Critical" as const },
];
