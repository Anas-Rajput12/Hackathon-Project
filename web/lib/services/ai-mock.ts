export type AgentStage = {
  name: string;
  label: string;
  description: string;
  status: "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
  confidence: number | null;
  output: Record<string, unknown>;
};

export function getMockAgentPipeline(incidentId: string): AgentStage[] {
  void incidentId;
  return [
    {
      name: "evidence",
      label: "Evidence Agent",
      description: "Analyzes uploaded photos, documents, and descriptions for credibility.",
      status: "COMPLETED",
      confidence: 0.85,
      output: {
        evidence_count: 3,
        has_photos: true,
        summary:
          "Evidence shows visible discoloration and surface contamination near the discharge point. Image metadata confirms the reported time and location.",
        key_signals: ["visible discoloration", "surface sheen", "consistent metadata"],
      },
    },
    {
      name: "water_quality",
      label: "Water Quality Agent",
      description: "Estimates water quality parameters and likely contaminants based on evidence.",
      status: "COMPLETED",
      confidence: 0.8,
      output: {
        estimated_ph: 5.2,
        likely_contaminants: ["heavy_metals", "industrial_runoff"],
        risk_factors: ["proximity_to_industrial_zone", "downstream_residential"],
        summary:
          "Water quality indicators suggest industrial contamination with heavy metals. pH is below normal range.",
      },
    },
    {
      name: "verification",
      label: "Verification Agent",
      description: "Cross-checks evidence for internal consistency and historical patterns.",
      status: "COMPLETED",
      confidence: 0.78,
      output: {
        verification_score: 0.78,
        anomaly_flags: [],
        data_consistency: "high",
        summary:
          "Evidence is internally consistent. Cross-references with historical data support the report.",
      },
    },
    {
      name: "risk_assessment",
      label: "Risk Assessment Agent",
      description: "Evaluates population and environmental impact risk.",
      status: "COMPLETED",
      confidence: 0.82,
      output: {
        risk_level: "HIGH",
        priority: 1,
        affected_area_km2: 12.5,
        population_at_risk: 3400,
        summary:
          "High risk incident affecting downstream communities. Immediate action recommended.",
      },
    },
    {
      name: "resolution",
      label: "Resolution Agent",
      description: "Recommends next actions and stakeholders to involve.",
      status: "COMPLETED",
      confidence: 0.75,
      output: {
        urgency: "immediate",
        timeline_days: 14,
        recommended_actions: [
          "Deploy field team for water sampling",
          "Issue public health advisory",
          "Notify upstream industrial facilities",
          "Set up monitoring stations",
        ],
        stakeholders_to_notify: ["local_authority", "water_utility", "environmental_agency"],
        summary:
          "Immediate intervention required. Estimated 14-day resolution with coordinated response.",
      },
    },
  ];
}
