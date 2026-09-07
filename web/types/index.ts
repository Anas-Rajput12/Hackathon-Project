export type Role = "CITIZEN" | "INSPECTOR" | "NGO" | "AUTHORITY" | "ADMIN";
export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IncidentStatus = "DETECTED" | "OPEN" | "UNDER_REVIEW" | "VERIFIED" | "RESOLVED" | "CLOSED";
export type EvidenceType = "IMAGE" | "DOCUMENT" | "VIDEO";
export type EvidenceStatus = "PENDING" | "VERIFIED" | "REJECTED";
export type AlertType = "CRITICAL_POLLUTION" | "HIGH_RISK" | "NEW_INCIDENT" | "VERIFICATION" | "RESOLUTION" | "SATELLITE_ALERT";
export type AgentStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
export type WaterBodyType = "RIVER" | "LAKE" | "RESERVOIR" | "GROUNDWATER" | "COASTAL";
export type RiskLevel = "NORMAL" | "WATCH" | "HIGH" | "CRITICAL";
export type MonitoringStatus = "ACTIVE" | "PAUSED" | "ERROR";

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: Date;
}

export interface WaterBody {
  id: string;
  name: string;
  type: WaterBodyType;
  description: string | null;
  coordinates: {
    lat: number;
    lng: number;
    geometry?: GeoJSON.Geometry;
    waterAreaKm2?: number;
    risk?: RiskLevel;
  } | null;
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  latitude: number;
  longitude: number;
  pollutionType: string;
  severity: Severity;
  status: IncidentStatus;
  reportedAt: Date;
  resolvedAt: Date | null;
  reportedById: string;
  reportedBy: User;
  waterBodyId: string | null;
  waterBody: { id: string; name: string; type: WaterBodyType } | null;
  satelliteScanId?: string | null;
  evidence: Evidence[];
  agentAnalyses: AgentAnalysis[];
}

export interface Evidence {
  id: string;
  fileUrl: string;
  fileType: EvidenceType;
  description: string | null;
  status: EvidenceStatus;
  verificationConfidence: number | null;
  uploadedAt: Date;
  incidentId: string;
}

export interface Alert {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  isRead: boolean;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
  incidentId: string | null;
}

export interface AgentAnalysis {
  id: string;
  agentName: string;
  status: AgentStatus;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  confidence: number | null;
  runAt: Date;
  incidentId: string;
}

export interface DashboardStats {
  totalReports: number;
  activeIncidents: number;
  criticalIncidents: number;
  resolvedIncidents: number;
}

export interface SatelliteMonitoring {
  id: string;
  waterBodyId: string;
  waterBody: { id: string; name: string; type: WaterBodyType };
  latitude: number;
  longitude: number;
  bboxNorth: number;
  bboxSouth: number;
  bboxEast: number;
  bboxWest: number;
  status: MonitoringStatus;
  thresholdWatch: number;
  thresholdHigh: number;
  thresholdCritical: number;
  lastCheckedAt: Date | null;
  previousObservationDate: Date | null;
  previousWaterAreaKm2: number | null;
  latestObservationDate: Date | null;
  latestWaterAreaKm2: number | null;
  latestChangePercent: number | null;
  latestRiskLevel: RiskLevel | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SatelliteScan {
  id: string;
  monitoringId: string;
  observationDate: Date;
  previousObservationDate: Date | null;
  waterAreaKm2: number;
  previousWaterAreaKm2: number | null;
  changePercent: number;
  riskLevel: RiskLevel;
  cloudCoverage: number | null;
  dataSource: string;
  isSimulation: boolean;
  alertCreated: boolean;
  status: string;
  errorMessage: string | null;
  productId: string | null;
  productTitle: string | null;
  acquisitionBbox: unknown;
  waterPixels: number | null;
  totalPixels: number | null;
  pixelAreaKm2: number | null;
  ndwiImageRef: string | null;
  rgbImageRef: string | null;
  anomaly: boolean;
  createdAt: Date;
}
