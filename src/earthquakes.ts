export interface UsgsFeature {
  id: string;
  type: "Feature";
  properties: {
    mag: number | null;
    place: string | null;
    time: number;
    updated: number;
    url: string | null;
    detail: string | null;
    felt: number | null;
    cdi: number | null;
    mmi: number | null;
    alert: "green" | "yellow" | "orange" | "red" | null;
    status: string | null;
    tsunami: number;
    sig: number | null;
    title: string | null;
  };
  geometry: {
    type: "Point";
    coordinates: [number, number, number];
  } | null;
}

export interface UsgsCollection {
  type: "FeatureCollection";
  metadata?: {
    generated?: number;
    count?: number;
    title?: string;
  };
  features: UsgsFeature[];
}

export interface Earthquake {
  id: string;
  magnitude: number | null;
  place: string | null;
  occurredAt: string;
  updatedAt: string;
  coordinates: {
    longitude: number;
    latitude: number;
    depthKm: number;
  } | null;
  tsunamiFlag: boolean;
  alert: UsgsFeature["properties"]["alert"];
  significance: number | null;
  detailUrl: string | null;
}

export interface RiskAssessment {
  score: number;
  level: "low" | "moderate" | "high" | "severe";
  factors: string[];
  disclaimer: string;
}

export function normalizeFeature(feature: UsgsFeature): Earthquake {
  const coordinates = feature.geometry?.coordinates;
  return {
    id: feature.id,
    magnitude: feature.properties.mag,
    place: feature.properties.place,
    occurredAt: new Date(feature.properties.time).toISOString(),
    updatedAt: new Date(feature.properties.updated).toISOString(),
    coordinates: coordinates
      ? { longitude: coordinates[0], latitude: coordinates[1], depthKm: coordinates[2] }
      : null,
    tsunamiFlag: feature.properties.tsunami === 1,
    alert: feature.properties.alert,
    significance: feature.properties.sig,
    detailUrl: feature.properties.url
  };
}

export function assessRisk(feature: UsgsFeature): RiskAssessment {
  const magnitude = Math.max(feature.properties.mag ?? 0, 0);
  const depthKm = feature.geometry?.coordinates[2] ?? 999;
  const factors: string[] = [];
  let score = Math.min(60, Math.round(magnitude * 10));

  if (magnitude >= 6) factors.push(`high magnitude (${magnitude.toFixed(1)})`);
  else if (magnitude >= 4.5) factors.push(`notable magnitude (${magnitude.toFixed(1)})`);

  if (depthKm < 30) {
    score += 12;
    factors.push(`shallow depth (${depthKm.toFixed(1)} km)`);
  } else if (depthKm < 70) {
    score += 5;
    factors.push(`moderate depth (${depthKm.toFixed(1)} km)`);
  }

  if (feature.properties.tsunami === 1) {
    score += 18;
    factors.push("USGS tsunami flag is set");
  }

  const alertPoints = { green: 2, yellow: 8, orange: 15, red: 25 } as const;
  const alert = feature.properties.alert;
  if (alert) {
    score += alertPoints[alert];
    factors.push(`USGS PAGER alert is ${alert}`);
  }

  score = Math.min(100, score);
  const level = score >= 80 ? "severe" : score >= 60 ? "high" : score >= 35 ? "moderate" : "low";
  if (factors.length === 0) factors.push("no elevated machine-readable indicators");

  return {
    score,
    level,
    factors,
    disclaimer: "Informational screening only. Follow official emergency-management guidance."
  };
}
