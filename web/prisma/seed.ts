import "dotenv/config";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill in your credentials.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const SEED_PASSWORD = "password123";

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

async function main() {
  console.log("Seeding AquaTrace database...");

  const existingUserCount = await prisma.user.count();
  if (existingUserCount > 0) {
    console.log(`Database already has ${existingUserCount} users. Skipping seed.`);
    console.log("   Run `npx prisma db seed --force` to reseed (will not wipe existing data).");
    return;
  }

  const hashedPassword = await hashPassword(SEED_PASSWORD);

  const users = await Promise.all([
    prisma.user.create({ data: { email: "alex@aquatrace.dev", name: "Alex Chen", role: "CITIZEN", emailVerified: true } }),
    prisma.user.create({ data: { email: "maria@aquatrace.dev", name: "Maria Santos", role: "CITIZEN", emailVerified: true } }),
    prisma.user.create({ data: { email: "james@aquatrace.dev", name: "James Okonkwo", role: "CITIZEN", emailVerified: true } }),
    prisma.user.create({ data: { email: "irene@aquatrace.dev", name: "Irene Petrov", role: "INSPECTOR", emailVerified: true } }),
    prisma.user.create({ data: { email: "david@aquatrace.dev", name: "David Kim", role: "INSPECTOR", emailVerified: true } }),
    prisma.user.create({ data: { email: "waterwatch@aquatrace.dev", name: "WaterWatch NGO", role: "NGO", emailVerified: true } }),
    prisma.user.create({ data: { email: "greenriver@aquatrace.dev", name: "Green River Foundation", role: "NGO", emailVerified: true } }),
    prisma.user.create({ data: { email: "epa@aquatrace.dev", name: "EPA Regional Office", role: "AUTHORITY", emailVerified: true } }),
    prisma.user.create({ data: { email: "waterboard@aquatrace.dev", name: "National Water Board", role: "AUTHORITY", emailVerified: true } }),
    prisma.user.create({ data: { email: "admin@aquatrace.dev", name: "Ari Admin", role: "ADMIN", emailVerified: true } }),
  ]);

  for (const user of users) {
    await prisma.account.create({
      data: { accountId: user.id, providerId: "credential", userId: user.id, password: hashedPassword },
    });
  }

  const [alex, maria, james, irene, david, waterwatch, greenriver, epa, waterboard, admin] = users;

  const waterBodies = await Promise.all([
    prisma.waterBody.create({ data: { name: "River Serpentine", type: "RIVER", description: "A major river flowing through the industrial corridor. Monitored for heavy metals and chemical discharge.", coordinates: { lat: 51.5074, lng: -0.1278, path: [[51.51, -0.13], [51.50, -0.12]] } } }),
    prisma.waterBody.create({ data: { name: "Lake Clearwater", type: "LAKE", description: "Recreational lake surrounded by residential areas. Popular for swimming and fishing.", coordinates: { lat: 51.45, lng: -0.2 } } }),
    prisma.waterBody.create({ data: { name: "Northfield Reservoir", type: "RESERVOIR", description: "Municipal water supply reservoir serving 50,000 households.", coordinates: { lat: 51.55, lng: -0.08 } } }),
    prisma.waterBody.create({ data: { name: "Chalk Aquifer System", type: "GROUNDWATER", description: "Underground aquifer feeding regional wells and agricultural irrigation.", coordinates: { lat: 51.48, lng: -0.15 } } }),
    prisma.waterBody.create({ data: { name: "Harbor Bay Coastline", type: "COASTAL", description: "Coastal zone with commercial fishing and tourism. Sensitive marine ecosystem.", coordinates: { lat: 51.42, lng: -0.25 } } }),
    prisma.waterBody.create({ data: { name: "Millbrook Creek", type: "RIVER", description: "Small tributary running through agricultural land. Seasonal flow variations.", coordinates: { lat: 51.52, lng: -0.18 } } }),
    prisma.waterBody.create({ data: { name: "Pine Lake", type: "LAKE", description: "Mountain lake in protected forest area. Pristine water quality baseline.", coordinates: { lat: 51.6, lng: -0.05 } } }),
    prisma.waterBody.create({ data: { name: "Southside Reservoir", type: "RESERVOIR", description: "Secondary municipal reservoir. Backup water supply for the southern district.", coordinates: { lat: 51.43, lng: -0.12 } } }),
    prisma.waterBody.create({ data: { name: "Nara Canal - Sukkur", type: "RIVER", description: "Nara Canal section near Sukkur, Sindh, Pakistan.", coordinates: { lat: 27.7139, lng: 68.8369 }, latitude: 27.7139, longitude: 68.8369, waterAreaKm2: 42.5, riskLevel: "HIGH", geometry: { type: "LineString", coordinates: [[68.821, 27.724], [68.833, 27.718], [68.846, 27.711], [68.861, 27.704], [68.878, 27.697], [68.894, 27.691]] } } }),
  ]);

  const incidentData = [
    { title: "Industrial discharge at Serpentine Bend", description: "Thick orange plume visible downstream of the chemical plant outfall. Strong chemical odor reported by nearby residents. Water discoloration extends 200m downstream.", lat: 51.509, lng: -0.129, pollution: "Chemical", severity: "CRITICAL" as const, status: "UNDER_REVIEW" as const, reporter: alex, wb: 0, daysBack: 1 },
    { title: "Algal bloom on Lake Clearwater", description: "Extensive green algal bloom covering the eastern shoreline. Fish kills reported along 500m stretch. Likely caused by agricultural runoff after recent rainfall.", lat: 51.452, lng: -0.198, pollution: "Agricultural Runoff", severity: "HIGH" as const, status: "VERIFIED" as const, reporter: waterwatch, wb: 1, daysBack: 3 },
    { title: "Oil sheen near Northfield intake", description: "Rainbow-colored sheen visible on the reservoir surface near the public water intake. Estimated coverage area of 200 square meters.", lat: 51.553, lng: -0.082, pollution: "Oil", severity: "HIGH" as const, status: "OPEN" as const, reporter: maria, wb: 2, daysBack: 0 },
    { title: "Sewage overflow at Mill Creek", description: "Combined sewer overflow discharging untreated sewage after heavy rainfall. Visible brown discharge into the creek with strong odor.", lat: 51.522, lng: -0.178, pollution: "Sewage", severity: "MEDIUM" as const, status: "RESOLVED" as const, reporter: irene, wb: 5, daysBack: 7 },
    { title: "Plastic waste accumulation at Harbor Bay", description: "Large concentration of plastic debris washed ashore after storm. Estimated 500kg of plastic waste along 1km of coastline.", lat: 51.421, lng: -0.248, pollution: "Plastic", severity: "MEDIUM" as const, status: "OPEN" as const, reporter: james, wb: 4, daysBack: 2 },
    { title: "Chemical spill at Pine Lake access road", description: "Tanker truck accident resulted in unknown chemical spill entering the lake drainage. Emergency containment booms deployed.", lat: 51.601, lng: -0.052, pollution: "Chemical", severity: "CRITICAL" as const, status: "UNDER_REVIEW" as const, reporter: greenriver, wb: 6, daysBack: 0 },
    { title: "Unusual foam on River Serpentine", description: "White foam accumulating along river banks near the old textile factory. Foam extends for approximately 300m downstream.", lat: 51.505, lng: -0.131, pollution: "Industrial Waste", severity: "HIGH" as const, status: "OPEN" as const, reporter: alex, wb: 0, daysBack: 5 },
    { title: "Fish kill event at Lake Clearwater south end", description: "Approximately 200 dead fish found along southern shoreline. Water testing shows low dissolved oxygen levels.", lat: 51.448, lng: -0.202, pollution: "Agricultural Runoff", severity: "HIGH" as const, status: "VERIFIED" as const, reporter: waterwatch, wb: 1, daysBack: 10 },
    { title: "Illegal dumping near Chalk Aquifer", description: "Construction waste and chemical containers found dumped near aquifer recharge zone. Several containers appear to be leaking.", lat: 51.481, lng: -0.152, pollution: "Industrial Waste", severity: "CRITICAL" as const, status: "VERIFIED" as const, reporter: david, wb: 3, daysBack: 4 },
    { title: "Sewage leak at Southside treatment facility", description: "Treated effluent pipe crack causing raw sewage to leak into nearby drainage channel leading to reservoir.", lat: 51.432, lng: -0.118, pollution: "Sewage", severity: "HIGH" as const, status: "RESOLVED" as const, reporter: epa, wb: 7, daysBack: 14 },
    { title: "Microplastics detected in Northfield water tests", description: "Routine water quality testing reveals elevated microplastic particle count exceeding safe thresholds.", lat: 51.548, lng: -0.085, pollution: "Plastic", severity: "MEDIUM" as const, status: "VERIFIED" as const, reporter: waterboard, wb: 2, daysBack: 8 },
    { title: "Agricultural runoff in Millbrook Creek", description: "Brown murky water with strong fertilizer smell after heavy rain. Downstream farms reporting livestock illness.", lat: 51.518, lng: -0.182, pollution: "Agricultural Runoff", severity: "MEDIUM" as const, status: "OPEN" as const, reporter: james, wb: 5, daysBack: 6 },
    { title: "Thermal pollution at Serpentine power plant", description: "Water temperature 8C above normal downstream of power plant discharge. Thermal stress affecting aquatic ecosystem.", lat: 51.511, lng: -0.126, pollution: "Industrial Waste", severity: "LOW" as const, status: "OPEN" as const, reporter: greenriver, wb: 0, daysBack: 12 },
    { title: "Oil leak from marina at Harbor Bay", description: "Diesel fuel leaking from damaged storage tank at recreational marina. Containment booms in place but some leakage escaping.", lat: 51.419, lng: -0.252, pollution: "Oil", severity: "HIGH" as const, status: "UNDER_REVIEW" as const, reporter: maria, wb: 4, daysBack: 1 },
    { title: "E. coli contamination at Lake Clearwater beach", description: "Water quality monitoring detects E. coli levels 3x above safe swimming limits. Beach advisory issued.", lat: 51.451, lng: -0.196, pollution: "Sewage", severity: "CRITICAL" as const, status: "VERIFIED" as const, reporter: epa, wb: 1, daysBack: 2 },
    { title: "Sediment plume from construction site", description: "Active construction site discharging muddy runoff into storm drain feeding River Serpentine. Visibility reduced to less than 1m in affected area.", lat: 51.507, lng: -0.133, pollution: "Other", severity: "LOW" as const, status: "RESOLVED" as const, reporter: alex, wb: 0, daysBack: 20 },
    { title: "Pesticide runoff after crop spraying", description: "Heavy rain following aerial pesticide application on farmland. Runoff carrying chemicals into Millbrook Creek.", lat: 51.521, lng: -0.175, pollution: "Agricultural Runoff", severity: "HIGH" as const, status: "OPEN" as const, reporter: david, wb: 5, daysBack: 3 },
    { title: "Groundwater contamination near landfill", description: "Monitoring wells near closed landfill showing elevated VOC levels. Contamination plume appears to be migrating toward aquifer.", lat: 51.478, lng: -0.148, pollution: "Chemical", severity: "CRITICAL" as const, status: "UNDER_REVIEW" as const, reporter: waterboard, wb: 3, daysBack: 15 },
    { title: "Tire dump site leaching into creek", description: "Abandoned tire pile leaching chemicals into Millbrook Creek after rain. Dark oily film visible on water surface.", lat: 51.524, lng: -0.171, pollution: "Industrial Waste", severity: "MEDIUM" as const, status: "OPEN" as const, reporter: irene, wb: 5, daysBack: 9 },
    { title: "Beach closure at Harbor Bay due to pollution", description: "Beach closed after routine testing reveals elevated bacteria levels. Likely source is stormwater discharge from urban area.", lat: 51.423, lng: -0.245, pollution: "Sewage", severity: "HIGH" as const, status: "VERIFIED" as const, reporter: james, wb: 4, daysBack: 5 },
    { title: "Unknown substance in Pine Lake", description: "Residents report milky white water near the lake's northern inlet. Source unidentified. Testing underway.", lat: 51.603, lng: -0.048, pollution: "Unknown", severity: "MEDIUM" as const, status: "OPEN" as const, reporter: greenriver, wb: 6, daysBack: 1 },
    { title: "Reservoir algae warning", description: "Blue-green algae detected in Southside Reservoir. Toxin levels being monitored. Public advised to avoid contact.", lat: 51.434, lng: -0.122, pollution: "Agricultural Runoff", severity: "HIGH" as const, status: "OPEN" as const, reporter: maria, wb: 7, daysBack: 0 },
    { title: "Historic contamination resurfaces at Serpentine", description: "Dredging work has disturbed contaminated sediment. Heavy metals detected above safe levels in water column.", lat: 51.508, lng: -0.127, pollution: "Chemical", severity: "HIGH" as const, status: "UNDER_REVIEW" as const, reporter: epa, wb: 0, daysBack: 2 },
    { title: "Minor litter accumulation at Lake Clearwater", description: "Recreational visitors leaving litter around the lake perimeter. Mostly food packaging and plastic bottles.", lat: 51.453, lng: -0.199, pollution: "Plastic", severity: "LOW" as const, status: "OPEN" as const, reporter: waterwatch, wb: 1, daysBack: 4 },
    { title: "Chlorine discharge from water treatment plant", description: "Dechlorination equipment malfunction at treatment facility causing elevated chlorine levels in discharge to River Serpentine.", lat: 51.506, lng: -0.13, pollution: "Chemical", severity: "MEDIUM" as const, status: "RESOLVED" as const, reporter: irene, wb: 0, daysBack: 18 },
  ];

  const incidents = [];
  for (const d of incidentData) {
    const incident = await prisma.incident.create({
      data: {
        title: d.title,
        description: d.description,
        latitude: d.lat,
        longitude: d.lng,
        pollutionType: d.pollution,
        severity: d.severity,
        status: d.status,
        reportedAt: daysAgo(d.daysBack),
        resolvedAt: d.status === "RESOLVED" ? daysAgo(Math.max(0, d.daysBack - 2)) : null,
        reportedById: d.reporter.id,
        waterBodyId: waterBodies[d.wb].id,
      },
    });
    incidents.push(incident);
  }

  const evidenceData = [
    { incidentIdx: 0, url: "https://res.cloudinary.com/demo/image/upload/v1700000000/aquatrace/orange-plume.jpg", type: "IMAGE" as const, desc: "Orange plume visible at outfall pipe", status: "VERIFIED" as const, conf: 0.92, uploader: alex },
    { incidentIdx: 0, url: "https://res.cloudinary.com/demo/image/upload/v1700000100/aquatrace/water-sample.jpg", type: "IMAGE" as const, desc: "Water sample showing discoloration", status: "VERIFIED" as const, conf: 0.88, uploader: irene },
    { incidentIdx: 1, url: "https://res.cloudinary.com/demo/image/upload/v1700000200/aquatrace/algal-bloom.jpg", type: "IMAGE" as const, desc: "Algal bloom along eastern shoreline", status: "VERIFIED" as const, conf: 0.95, uploader: waterwatch },
    { incidentIdx: 1, url: "https://res.cloudinary.com/demo/image/upload/v1700000300/aquatrace/lab-report.pdf", type: "DOCUMENT" as const, desc: "Lab analysis confirming elevated phosphorus levels", status: "PENDING" as const, conf: null, uploader: irene },
    { incidentIdx: 2, url: "https://res.cloudinary.com/demo/image/upload/v1700000400/aquatrace/oil-sheen.jpg", type: "IMAGE" as const, desc: "Rainbow sheen on water surface near intake", status: "PENDING" as const, conf: null, uploader: maria },
    { incidentIdx: 5, url: "https://res.cloudinary.com/demo/image/upload/v1700000500/aquatrace/spill-site.jpg", type: "IMAGE" as const, desc: "Overturned tanker near lake drainage", status: "VERIFIED" as const, conf: 0.9, uploader: greenriver },
    { incidentIdx: 8, url: "https://res.cloudinary.com/demo/image/upload/v1700000600/aquatrace/dumped-barrels.jpg", type: "IMAGE" as const, desc: "Leaking chemical containers at dump site", status: "VERIFIED" as const, conf: 0.93, uploader: david },
    { incidentIdx: 8, url: "https://res.cloudinary.com/demo/image/upload/v1700000700/aquatrace/soil-sample.pdf", type: "DOCUMENT" as const, desc: "Soil analysis from surrounding area", status: "VERIFIED" as const, conf: 0.87, uploader: irene },
    { incidentIdx: 14, url: "https://res.cloudinary.com/demo/image/upload/v1700000800/aquatrace/beach-sign.jpg", type: "IMAGE" as const, desc: "Beach advisory warning sign posted", status: "VERIFIED" as const, conf: 0.96, uploader: epa },
    { incidentIdx: 4, url: "https://res.cloudinary.com/demo/image/upload/v1700000900/aquatrace/plastic-shore.jpg", type: "IMAGE" as const, desc: "Plastic debris along Harbor Bay shoreline", status: "PENDING" as const, conf: null, uploader: james },
  ];

  for (const e of evidenceData) {
    await prisma.evidence.create({
      data: {
        fileUrl: e.url,
        fileType: e.type,
        description: e.desc,
        status: e.status,
        verificationConfidence: e.conf,
        incidentId: incidents[e.incidentIdx].id,
        uploadedById: e.uploader.id,
      },
    });
  }

  const criticalIncidents = [0, 5, 8, 14, 17];
  for (const idx of criticalIncidents) {
    const agentOutputs = [
      { agentName: "evidence", output: { evidence_count: 2, has_photos: true, confidence: 0.85, summary: "Multiple evidence items support the report." }, confidence: 0.85 },
      { agentName: "water_quality", output: { estimated_ph: 5.2, likely_contaminants: ["heavy_metals", "industrial_runoff"] }, confidence: 0.8 },
      { agentName: "verification", output: { verification_score: 0.78, data_consistency: "high" }, confidence: 0.78 },
      { agentName: "risk_assessment", output: { risk_level: "HIGH", priority: 1, affected_area_km2: 12.5, population_at_risk: 3400 }, confidence: 0.82 },
      { agentName: "resolution", output: { urgency: "immediate", timeline_days: 14, recommended_actions: ["Deploy field team", "Issue public advisory"] }, confidence: 0.75 },
    ];
    for (const agent of agentOutputs) {
      await prisma.agentAnalysis.create({
        data: {
          agentName: agent.agentName,
          status: "COMPLETED",
          input: { incidentId: incidents[idx].id },
          output: agent.output,
          confidence: agent.confidence,
          incidentId: incidents[idx].id,
        },
      });
    }
  }

  const alertRecipients = [epa, waterboard, admin];
  const alertData = [
    { type: "CRITICAL_POLLUTION" as const, title: "Critical: Industrial discharge at Serpentine Bend", message: "Critical chemical pollution detected. Orange plume extends 200m downstream. Immediate inspection required.", idx: 0 },
    { type: "CRITICAL_POLLUTION" as const, title: "Critical: Chemical spill at Pine Lake", message: "Tanker accident resulted in chemical spill entering protected lake. Emergency response needed.", idx: 5 },
    { type: "CRITICAL_POLLUTION" as const, title: "Critical: Illegal dumping near Chalk Aquifer", message: "Chemical containers leaking near aquifer recharge zone. Drinking water supply at risk.", idx: 8 },
    { type: "HIGH_RISK" as const, title: "High severity: E. coli at Lake Clearwater", message: "E. coli levels 3x above safe limits. Beach advisory issued. Source investigation needed.", idx: 14 },
    { type: "NEW_INCIDENT" as const, title: "New report: Oil sheen near Northfield intake", message: "Oil sheen reported near municipal water intake. 200 square meter coverage area.", idx: 2 },
    { type: "NEW_INCIDENT" as const, title: "New report: Marina oil leak at Harbor Bay", message: "Diesel fuel leaking from damaged marina storage tank. Containment partially in place.", idx: 13 },
    { type: "VERIFICATION" as const, title: "Incident verified: Algal bloom on Lake Clearwater", message: "Field inspection confirmed extensive algal bloom with fish kills.", idx: 1 },
    { type: "VERIFICATION" as const, title: "Incident verified: Beach closure at Harbor Bay", message: "Bacteria levels confirmed above safe limits. Source traced to stormwater discharge.", idx: 19 },
    { type: "RESOLUTION" as const, title: "Resolved: Sewage overflow at Mill Creek", message: "Sewer overflow contained and repairs completed. Water quality returning to normal.", idx: 3 },
    { type: "RESOLUTION" as const, title: "Resolved: Sediment plume from construction", message: "Construction site installed proper sediment controls. Water clarity restored.", idx: 15 },
    { type: "HIGH_RISK" as const, title: "Groundwater contamination near landfill", message: "VOC plume migrating toward aquifer. Long-term remediation may be required.", idx: 17 },
    { type: "NEW_INCIDENT" as const, title: "Reservoir algae warning: Southside", message: "Blue-green algae detected. Toxin monitoring underway. Public contact advisory.", idx: 21 },
  ];

  for (const a of alertData) {
    for (const recipient of alertRecipients) {
      await prisma.alert.create({
        data: {
          type: a.type,
          title: a.title,
          message: a.message,
          incidentId: incidents[a.idx].id,
          userId: recipient.id,
          isRead: a.type === "RESOLUTION",
        },
      });
    }
  }

  await prisma.assignment.create({
    data: { notes: "Conduct on-site water sampling and submit lab results. Priority inspection.", incidentId: incidents[0].id, inspectorId: irene.id, assignedById: epa.id },
  });
  await prisma.assignment.create({
    data: { notes: "Inspect chemical spill site. Coordinate with emergency services.", incidentId: incidents[5].id, inspectorId: david.id, assignedById: waterboard.id },
  });
  await prisma.assignment.create({
    data: { notes: "Sample groundwater monitoring wells. Test for VOC levels.", incidentId: incidents[8].id, inspectorId: irene.id, assignedById: epa.id },
  });

  const indusRiver = await prisma.waterBody.create({
    data: {
      name: "Indus River (Darya-e-Sindh)",
      type: "RIVER",
      description: "Primary test monitoring area. Indus River section in Sindh, Pakistan. Monitored for abnormal water decrease via Sentinel-2 satellite imagery.",
      coordinates: { lat: 27.7032, lng: 68.8570, geometry: { type: "LineString", coordinates: [[27.67, 68.81], [27.70, 68.85], [27.74, 68.89]] }, waterAreaKm2: 125.0, risk: "WATCH" },
      latitude: 27.7032,
      longitude: 68.8570,
      waterAreaKm2: 125.0,
      riskLevel: "WATCH",
      geometry: { type: "LineString", coordinates: [[68.81, 27.67], [68.85, 27.70], [68.89, 27.74]] },
    },
  });

  await prisma.satelliteMonitoring.create({
    data: {
      waterBodyId: indusRiver.id,
      latitude: 27.7032,
      longitude: 68.8570,
      bboxNorth: 27.9,
      bboxSouth: 27.5,
      bboxEast: 69.1,
      bboxWest: 68.6,
      status: "ACTIVE",
      thresholdWatch: 10,
      thresholdHigh: 20,
      thresholdCritical: 35,
    },
  });

  await prisma.auditLog.create({
    data: {
      action: "SEED_COMPLETED",
      entityType: "System",
      entityId: "seed",
      metadata: { users: 10, waterBodies: 8, incidents: 25, evidence: 10, analyses: 25, alerts: alertData.length * alertRecipients.length },
      userId: admin.id,
    },
  });

  console.log("Seed complete:");
  console.log(`   - 10 users (password: ${SEED_PASSWORD})`);
  console.log("   - 8 water bodies");
  console.log("   - 25 incidents");
  console.log("   - 10 evidence items");
  console.log("   - 25 agent analyses (5 incidents x 5 agents)");
  console.log(`   - ${alertData.length * alertRecipients.length} alerts`);
  console.log("   - 3 inspector assignments");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
