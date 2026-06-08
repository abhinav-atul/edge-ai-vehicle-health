// ============================================
// Edge AI Vehicle Health — Sensor Simulation Engine
// Welford's Online Algorithm + Z-Score Anomaly Detection
// ============================================

// ===== TYPES =====
export interface SensorConfig {
  name: string;
  unit: string;
  baseline: number;
  noiseStd: number;
  min: number;
  max: number;
  normalMin: number;
  normalMax: number;
  warningMin: number;
  warningMax: number;
  color: string;
}

export interface SensorReading {
  value: number;
  zScore: number;
  status: 'normal' | 'warning' | 'critical';
  mean: number;
  std: number;
  trend: 'stable' | 'rising' | 'falling';
}

export interface AnomalyInfo {
  sensor: string;
  sensorName: string;
  faultType: string;
  zScore: number;
  value: number;
  severity: 'warning' | 'critical';
  timestamp: Date;
  duration: number;
}

export interface RULComponent {
  name: string;
  daysLeft: number;
  totalDays: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  relatedSensors: string[];
}

export interface EngineTickData {
  sensors: Record<string, SensorReading>;
  healthScore: number;
  anomalies: AnomalyInfo[];
  rul: RULComponent[];
  tickCount: number;
  activeAnomaly: ActiveAnomaly | null;
}

interface WelfordStats {
  mean: number;
  variance: number;
  count: number;
}

interface ActiveAnomaly {
  sensor: string;
  type: 'spike' | 'drift' | 'drop';
  magnitude: number;
  ticksLeft: number;
  totalTicks: number;
  startTime: Date;
}

// ===== SENSOR CONFIGURATIONS =====
export const SENSORS: Record<string, SensorConfig> = {
  engineTemp: {
    name: 'Engine Temp', unit: '°C',
    baseline: 92, noiseStd: 2.5,
    min: 60, max: 130,
    normalMin: 80, normalMax: 105,
    warningMin: 70, warningMax: 115,
    color: '#f87171',
  },
  vibration: {
    name: 'Vibration', unit: 'mm/s',
    baseline: 1.2, noiseStd: 0.4,
    min: 0, max: 12,
    normalMin: 0, normalMax: 4.5,
    warningMin: 0, warningMax: 7,
    color: '#c084fc',
  },
  oilPressure: {
    name: 'Oil Pressure', unit: 'PSI',
    baseline: 42, noiseStd: 3,
    min: 0, max: 80,
    normalMin: 25, normalMax: 65,
    warningMin: 15, warningMax: 72,
    color: '#fbbf24',
  },
  batteryVoltage: {
    name: 'Battery Voltage', unit: 'V',
    baseline: 13.8, noiseStd: 0.2,
    min: 10, max: 16,
    normalMin: 12.4, normalMax: 14.7,
    warningMin: 11.5, warningMax: 15.2,
    color: '#60a5fa',
  },
  coolantFlow: {
    name: 'Coolant Flow', unit: 'L/min',
    baseline: 8.4, noiseStd: 0.8,
    min: 0, max: 18,
    normalMin: 6, normalMax: 12,
    warningMin: 4, warningMax: 14,
    color: '#22d3ee',
  },
  exhaustTemp: {
    name: 'Exhaust Temp', unit: '°C',
    baseline: 420, noiseStd: 25,
    min: 100, max: 900,
    normalMin: 300, normalMax: 600,
    warningMin: 200, warningMax: 700,
    color: '#fb7185',
  },
};

// ===== RUL COMPONENT DEFINITIONS =====
const RUL_DEFAULTS: RULComponent[] = [
  { name: 'Brake Pads', daysLeft: 142, totalDays: 365, urgency: 'low', confidence: 91, relatedSensors: ['vibration'] },
  { name: 'Engine Oil', daysLeft: 28, totalDays: 90, urgency: 'high', confidence: 87, relatedSensors: ['oilPressure', 'engineTemp'] },
  { name: 'Air Filter', daysLeft: 67, totalDays: 180, urgency: 'medium', confidence: 83, relatedSensors: ['engineTemp', 'exhaustTemp'] },
  { name: 'Timing Belt', daysLeft: 312, totalDays: 730, urgency: 'low', confidence: 78, relatedSensors: ['vibration', 'engineTemp'] },
  { name: 'Battery', daysLeft: 89, totalDays: 365, urgency: 'medium', confidence: 85, relatedSensors: ['batteryVoltage'] },
  { name: 'Spark Plugs', daysLeft: 201, totalDays: 365, urgency: 'low', confidence: 80, relatedSensors: ['engineTemp', 'exhaustTemp'] },
  { name: 'Transmission Fluid', daysLeft: 45, totalDays: 120, urgency: 'high', confidence: 88, relatedSensors: ['vibration'] },
  { name: 'Coolant', daysLeft: 14, totalDays: 60, urgency: 'critical', confidence: 92, relatedSensors: ['coolantFlow', 'engineTemp'] },
];

// ===== CONFIG =====
const WARMUP_PERIOD = 15;
const Z_WARNING = 2.5;
const Z_CRITICAL = 3.75;
const ANOMALY_COOLDOWN_TICKS = 10;

// ===== BOX-MULLER TRANSFORM =====
function gaussianRandom(): number {
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ===== SINGLETON ENGINE STATE =====
class SimulationEngine {
  private stats: Record<string, WelfordStats> = {};
  private history: Record<string, number[]> = {};
  private currentValues: Record<string, number> = {};
  private activeAnomaly: ActiveAnomaly | null = null;
  private recentAnomalies: AnomalyInfo[] = [];
  private rul: RULComponent[];
  private tickCount = 0;
  private lastAnomalyTick: Record<string, number> = {};
  private healthScore = 90;
  private lastHealthPersist = 0;

  constructor() {
    this.rul = JSON.parse(JSON.stringify(RUL_DEFAULTS));
    for (const key of Object.keys(SENSORS)) {
      const s = SENSORS[key];
      this.stats[key] = { mean: s.baseline, variance: s.noiseStd * s.noiseStd, count: 0 };
      this.history[key] = [];
      this.currentValues[key] = s.baseline;
    }
  }

  // ===== MAIN TICK =====
  tick(): EngineTickData {
    this.tickCount++;
    const sensorReadings: Record<string, SensorReading> = {};
    const newAnomalies: AnomalyInfo[] = [];

    for (const [key, sensor] of Object.entries(SENSORS)) {
      // Generate base value
      let value = this.generateValue(key, sensor);

      // Apply active anomaly if targeting this sensor
      if (this.activeAnomaly?.sensor === key && this.activeAnomaly.ticksLeft > 0) {
        value = this.applyAnomaly(key, sensor, value);
      }

      // Clamp to physical limits
      value = Math.max(sensor.min, Math.min(sensor.max, value));
      this.currentValues[key] = value;

      // Maintain history buffer (last 200 readings for context)
      this.history[key].push(value);
      if (this.history[key].length > 200) {
        this.history[key].shift();
      }

      // Welford's online stats update
      this.updateStats(key, value);

      // Z-score anomaly detection
      const detection = this.detectAnomaly(key, sensor, value);
      sensorReadings[key] = detection;

      // Record anomaly if detected
      if (detection.status !== 'normal' && this.shouldRecordAnomaly(key)) {
        const anomaly: AnomalyInfo = {
          sensor: key,
          sensorName: sensor.name,
          faultType: this.activeAnomaly?.sensor === key ? this.activeAnomaly.type : 'natural',
          zScore: detection.zScore,
          value: detection.value,
          severity: detection.status as 'warning' | 'critical',
          timestamp: new Date(),
          duration: this.activeAnomaly?.sensor === key
            ? Math.round((this.activeAnomaly.totalTicks - this.activeAnomaly.ticksLeft) * 0.3)
            : 0,
        };
        newAnomalies.push(anomaly);
        this.recentAnomalies.unshift(anomaly);
        if (this.recentAnomalies.length > 100) this.recentAnomalies.pop();
        this.lastAnomalyTick[key] = this.tickCount;

        // Degrade RUL for related components
        this.degradeRUL(key, detection.status === 'critical' ? 3 : 1);
      }
    }

    // Tick down active anomaly
    if (this.activeAnomaly && this.activeAnomaly.ticksLeft > 0) {
      this.activeAnomaly.ticksLeft--;
      if (this.activeAnomaly.ticksLeft <= 0) {
        this.activeAnomaly = null;
      }
    }

    // Decay RUL every ~80 ticks (~24s)
    if (this.tickCount % 80 === 0) {
      this.decayRUL();
    }

    // Compute health score
    this.healthScore = this.computeHealthScore();

    return {
      sensors: sensorReadings,
      healthScore: this.healthScore,
      anomalies: newAnomalies,
      rul: this.rul,
      tickCount: this.tickCount,
      activeAnomaly: this.activeAnomaly,
    };
  }

  // ===== SENSOR VALUE GENERATION =====
  private generateValue(key: string, sensor: SensorConfig): number {
    const drift = Math.sin(this.tickCount * 0.02 + key.length) * sensor.noiseStd * 0.5;
    return sensor.baseline + drift + gaussianRandom() * sensor.noiseStd;
  }

  // ===== ANOMALY APPLICATION =====
  private applyAnomaly(key: string, sensor: SensorConfig, baseValue: number): number {
    const a = this.activeAnomaly!;
    const progress = 1 - (a.ticksLeft / a.totalTicks);
    switch (a.type) {
      case 'spike':
        return baseValue + Math.sin(progress * Math.PI) * a.magnitude * sensor.noiseStd * 3 * (Math.random() > 0.5 ? 1 : -1);
      case 'drift':
        return baseValue + progress * a.magnitude * sensor.noiseStd * 2;
      case 'drop':
        return baseValue - a.magnitude * sensor.noiseStd * 2.5;
      default:
        return baseValue;
    }
  }

  // ===== WELFORD'S ONLINE ALGORITHM =====
  private updateStats(key: string, value: number): void {
    const s = this.stats[key];
    s.count++;
    const delta = value - s.mean;
    s.mean += delta / s.count;
    const delta2 = value - s.mean;
    s.variance += (delta * delta2 - s.variance) / s.count;
  }

  // ===== Z-SCORE ANOMALY DETECTION =====
  private detectAnomaly(key: string, sensor: SensorConfig, value: number): SensorReading {
    const s = this.stats[key];
    const std = Math.sqrt(Math.max(s.variance, 0.001));
    const zScore = s.count < WARMUP_PERIOD ? 0 : Math.abs((value - s.mean) / std);

    const outWarning = value < sensor.warningMin || value > sensor.warningMax;
    const outNormal = value < sensor.normalMin || value > sensor.normalMax;

    // Determine trend from recent history
    const trend = this.computeTrend(key, sensor);

    let status: 'normal' | 'warning' | 'critical' = 'normal';
    if (s.count >= WARMUP_PERIOD) {
      if (zScore > Z_CRITICAL || outWarning) {
        status = 'critical';
      } else if (zScore > Z_WARNING || outNormal) {
        status = 'warning';
      }
    }

    return { value, zScore, status, mean: s.mean, std, trend };
  }

  private computeTrend(key: string, sensor: SensorConfig): 'stable' | 'rising' | 'falling' {
    const h = this.history[key];
    if (h.length < 5) return 'stable';
    const recent = h.slice(-5);
    const avg1 = recent.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
    const avg2 = recent.slice(-2).reduce((a, b) => a + b, 0) / 2;
    const diff = avg2 - avg1;
    if (Math.abs(diff) < sensor.noiseStd * 0.3) return 'stable';
    return diff > 0 ? 'rising' : 'falling';
  }

  private shouldRecordAnomaly(key: string): boolean {
    const lastTick = this.lastAnomalyTick[key] ?? 0;
    return (this.tickCount - lastTick) >= ANOMALY_COOLDOWN_TICKS;
  }

  // ===== ANOMALY INJECTION =====
  injectAnomaly(sensorKey?: string, faultType?: string): AnomalyInfo {
    const keys = Object.keys(SENSORS);
    const targetKey = sensorKey && keys.includes(sensorKey) ? sensorKey : keys[Math.floor(Math.random() * keys.length)];
    const types: Array<'spike' | 'drift' | 'drop'> = ['spike', 'drift', 'drop'];
    const type = faultType && types.includes(faultType as 'spike' | 'drift' | 'drop')
      ? faultType as 'spike' | 'drift' | 'drop'
      : types[Math.floor(Math.random() * types.length)];

    const totalTicks = 20 + Math.floor(Math.random() * 15); // 20-35 ticks = 6-10.5s at 300ms

    this.activeAnomaly = {
      sensor: targetKey,
      type,
      magnitude: 2 + Math.random() * 3,
      ticksLeft: totalTicks,
      totalTicks,
      startTime: new Date(),
    };

    const sensor = SENSORS[targetKey];
    return {
      sensor: targetKey,
      sensorName: sensor.name,
      faultType: type,
      zScore: 0,
      value: this.currentValues[targetKey],
      severity: 'warning',
      timestamp: new Date(),
      duration: Math.round(totalTicks * 0.3),
    };
  }

  // ===== RUL DEGRADATION =====
  private degradeRUL(sensorKey: string, amount: number): void {
    for (const component of this.rul) {
      if (component.relatedSensors.includes(sensorKey)) {
        component.daysLeft = Math.max(0, component.daysLeft - amount);
        this.updateUrgency(component);
      }
    }
  }

  private decayRUL(): void {
    for (const component of this.rul) {
      component.daysLeft = Math.max(0, component.daysLeft - 1);
      this.updateUrgency(component);
    }
  }

  private updateUrgency(component: RULComponent): void {
    if (component.daysLeft < 15) component.urgency = 'critical';
    else if (component.daysLeft < 30) component.urgency = 'high';
    else if (component.daysLeft < 90) component.urgency = 'medium';
    else component.urgency = 'low';
  }

  // ===== HEALTH SCORE =====
  private computeHealthScore(): number {
    // 40% — Average RUL percentage
    const avgRulPct = this.rul.reduce((sum, c) => sum + (c.daysLeft / c.totalDays), 0) / this.rul.length;
    const rulScore = avgRulPct * 100;

    // 40% — Recent anomaly frequency (inverse)
    const recentAnomalies = this.recentAnomalies.filter(
      a => Date.now() - a.timestamp.getTime() < 60000
    ).length;
    const anomalyScore = Math.max(0, 100 - recentAnomalies * 15);

    // 20% — Current Z-score stability
    let avgZ = 0;
    let count = 0;
    for (const key of Object.keys(SENSORS)) {
      const s = this.stats[key];
      if (s.count >= WARMUP_PERIOD) {
        const std = Math.sqrt(Math.max(s.variance, 0.001));
        avgZ += Math.abs((this.currentValues[key] - s.mean) / std);
        count++;
      }
    }
    avgZ = count > 0 ? avgZ / count : 0;
    const stabilityScore = Math.max(0, 100 - avgZ * 20);

    return Math.max(0, Math.min(100, Math.round(
      rulScore * 0.4 + anomalyScore * 0.4 + stabilityScore * 0.2
    )));
  }

  // ===== GETTERS =====
  getHealthScore(): number {
    return this.healthScore;
  }

  getRUL(): RULComponent[] {
    return this.rul;
  }

  getRecentReadings(sensorKey: string, count: number = 20): number[] {
    return this.history[sensorKey]?.slice(-count) ?? [];
  }

  getAllRecentReadings(count: number = 20): Record<string, number[]> {
    const result: Record<string, number[]> = {};
    for (const key of Object.keys(SENSORS)) {
      result[key] = this.getRecentReadings(key, count);
    }
    return result;
  }

  getCurrentValues(): Record<string, number> {
    return { ...this.currentValues };
  }

  getRecentAnomalies(count: number = 10): AnomalyInfo[] {
    return this.recentAnomalies.slice(0, count);
  }

  getActiveAnomaly(): ActiveAnomaly | null {
    return this.activeAnomaly;
  }

  getTickCount(): number {
    return this.tickCount;
  }

  getShouldPersistHealth(): boolean {
    const now = Date.now();
    if (now - this.lastHealthPersist >= 60000) {
      this.lastHealthPersist = now;
      return true;
    }
    return false;
  }

  // Build context payload for Gemini
  buildDiagnosticContext(): object {
    const currentReadings: Record<string, { value: number; unit: string; status: string; zScore: number }> = {};
    for (const [key, sensor] of Object.entries(SENSORS)) {
      const s = this.stats[key];
      const std = Math.sqrt(Math.max(s.variance, 0.001));
      const zScore = s.count >= WARMUP_PERIOD ? Math.abs((this.currentValues[key] - s.mean) / std) : 0;
      currentReadings[key] = {
        value: Math.round(this.currentValues[key] * 100) / 100,
        unit: sensor.unit,
        status: zScore > Z_CRITICAL ? 'critical' : zScore > Z_WARNING ? 'warning' : 'normal',
        zScore: Math.round(zScore * 100) / 100,
      };
    }

    const componentRUL: Record<string, number> = {};
    for (const c of this.rul) {
      componentRUL[c.name] = c.daysLeft;
    }

    return {
      currentReadings,
      recentReadings: this.getAllRecentReadings(20),
      componentRUL,
      vehicleHealthScore: this.healthScore,
      activeAnomaly: this.activeAnomaly ? {
        sensor: this.activeAnomaly.sensor,
        sensorName: SENSORS[this.activeAnomaly.sensor]?.name,
        faultType: this.activeAnomaly.type,
      } : null,
      recentAnomalies: this.recentAnomalies.slice(0, 5).map(a => ({
        sensor: a.sensorName,
        faultType: a.faultType,
        zScore: a.zScore,
        severity: a.severity,
        timestamp: a.timestamp.toISOString(),
      })),
    };
  }
}

// ===== GLOBAL SINGLETON =====
// In Next.js dev, modules are re-evaluated on hot reload. We store the instance
// on globalThis to persist state across HMR boundaries.
const globalForEngine = globalThis as unknown as { engine: SimulationEngine };
export const engine = globalForEngine.engine ?? new SimulationEngine();
if (process.env.NODE_ENV !== 'production') globalForEngine.engine = engine;
