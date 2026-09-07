export const SEVERITY_CONFIG = {
  LOW: { label: "Low", color: "text-green-600 bg-green-50 border-green-200" },
  MEDIUM: { label: "Medium", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  HIGH: { label: "High", color: "text-orange-600 bg-orange-50 border-orange-200" },
  CRITICAL: { label: "Critical", color: "text-red-600 bg-red-50 border-red-200" },
} as const;

export const STATUS_CONFIG = {
  DETECTED: { label: "Detected", color: "text-cyan-600 bg-cyan-50 border-cyan-200" },
  OPEN: { label: "Open", color: "text-blue-600 bg-blue-50 border-blue-200" },
  UNDER_REVIEW: { label: "Under Review", color: "text-amber-600 bg-amber-50 border-amber-200" },
  VERIFIED: { label: "Verified", color: "text-purple-600 bg-purple-50 border-purple-200" },
  RESOLVED: { label: "Resolved", color: "text-green-600 bg-green-50 border-green-200" },
  CLOSED: { label: "Closed", color: "text-gray-600 bg-gray-50 border-gray-200" },
} as const;

export const POLLUTION_TYPES = [
  "Chemical",
  "Sewage",
  "Plastic",
  "Oil",
  "Industrial Waste",
  "Agricultural Runoff",
  "Unknown",
  "Other",
] as const;

export const AGENT_STATUS_CONFIG = {
  PENDING: { label: "Pending", color: "text-slate-600 bg-slate-50 border-slate-200" },
  RUNNING: { label: "Running", color: "text-blue-600 bg-blue-50 border-blue-200" },
  COMPLETED: { label: "Completed", color: "text-green-600 bg-green-50 border-green-200" },
  FAILED: { label: "Failed", color: "text-red-600 bg-red-50 border-red-200" },
} as const;

export const ALERT_TYPE_CONFIG = {
  CRITICAL_POLLUTION: { label: "Critical Pollution", color: "text-red-600 bg-red-50 border-red-200" },
  HIGH_RISK: { label: "High Risk", color: "text-orange-600 bg-orange-50 border-orange-200" },
  NEW_INCIDENT: { label: "New Incident", color: "text-blue-600 bg-blue-50 border-blue-200" },
  VERIFICATION: { label: "Verification", color: "text-purple-600 bg-purple-50 border-purple-200" },
  RESOLUTION: { label: "Resolution", color: "text-green-600 bg-green-50 border-green-200" },
  SATELLITE_ALERT: { label: "Satellite Alert", color: "text-cyan-600 bg-cyan-50 border-cyan-200" },
} as const;

export const WATER_BODY_TYPES = {
  RIVER: "River",
  LAKE: "Lake",
  RESERVOIR: "Reservoir",
  GROUNDWATER: "Groundwater",
  COASTAL: "Coastal",
} as const;

export const ROLE_LABELS = {
  CITIZEN: "Citizen",
  INSPECTOR: "Inspector",
  NGO: "NGO",
  AUTHORITY: "Authority",
  ADMIN: "Admin",
} as const;

export const RISK_LEVEL_CONFIG = {
  NORMAL: { label: "Normal", color: "text-green-600 bg-green-50 border-green-200" },
  WATCH: { label: "Watch", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  HIGH: { label: "High", color: "text-orange-600 bg-orange-50 border-orange-200" },
  CRITICAL: { label: "Critical", color: "text-red-600 bg-red-50 border-red-200" },
} as const;

export const MONITORING_STATUS_CONFIG = {
  ACTIVE: { label: "Active", color: "text-green-600 bg-green-50 border-green-200" },
  PAUSED: { label: "Paused", color: "text-gray-600 bg-gray-50 border-gray-200" },
  ERROR: { label: "Error", color: "text-red-600 bg-red-50 border-red-200" },
} as const;
