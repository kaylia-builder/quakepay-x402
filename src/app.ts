/*
 * x402 server registration follows the Apache-2.0-licensed Kite TypeScript
 * template. QuakePay routing, validation, USGS integration, and responses are
 * project-specific modifications.
 */
import express, {
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response
} from "express";
import { paymentMiddleware, x402ResourceServer } from "@x402/express";
import { ExactEvmScheme } from "@x402/evm/exact/server";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { loadConfig, type AppConfig } from "./config.js";
import { assessRisk, normalizeFeature } from "./earthquakes.js";
import { kiteMoneyParser } from "./kite.js";
import { createUsgsClient, UpstreamError, type UsgsClient } from "./usgs.js";

export interface AppDependencies {
  paymentGuard?: RequestHandler;
  usgsClient?: UsgsClient;
  now?: () => Date;
}

class RequestError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
    this.name = "RequestError";
  }
}

function createPaymentGuard(config: AppConfig): RequestHandler {
  const facilitator = new HTTPFacilitatorClient({ url: config.facilitatorUrl });
  const resourceServer = new x402ResourceServer(facilitator).register(
    config.chain.network,
    new ExactEvmScheme().registerMoneyParser(kiteMoneyParser(config.chain))
  );
  return paymentMiddleware(
    {
      "/v1/*": {
        accepts: {
          scheme: "exact",
          price: config.price,
          network: config.chain.network,
          payTo: config.payTo,
          maxTimeoutSeconds: 60
        },
        description: config.serviceDescription,
        mimeType: "application/json"
      }
    },
    resourceServer
  );
}

function scalar(value: unknown, name: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new RequestError(`${name} must be a single value`);
  return value;
}

function numberParam(
  value: unknown,
  name: string,
  fallback: number,
  min: number,
  max: number
): number {
  const raw = scalar(value, name);
  const parsed = raw === undefined ? fallback : Number(raw);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new RequestError(`${name} must be between ${min} and ${max}`);
  }
  return parsed;
}

function integerParam(
  value: unknown,
  name: string,
  fallback: number,
  min: number,
  max: number
): number {
  const parsed = numberParam(value, name, fallback, min, max);
  if (!Number.isInteger(parsed)) throw new RequestError(`${name} must be an integer`);
  return parsed;
}

function startTime(now: Date, hours: number): string {
  return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
}

export function createApp(config: AppConfig, dependencies: AppDependencies = {}) {
  const app = express();
  const queryUsgs = dependencies.usgsClient ?? createUsgsClient(config.upstreamUrl, config.upstreamTimeoutMs);
  const now = dependencies.now ?? (() => new Date());

  app.disable("x-powered-by");
  app.use(express.json({ limit: "32kb" }));

  app.get("/healthz", (_req, res) => {
    res.json({
      ok: true,
      service: "quakepay-x402",
      network: config.chain.network,
      asset: config.chain.assetSymbol,
      price: config.price,
      upstream: config.upstreamUrl.origin
    });
  });

  app.use(dependencies.paymentGuard ?? createPaymentGuard(config));

  app.get("/v1/earthquakes/recent", async (req, res, next) => {
    try {
      const hours = integerParam(req.query.hours, "hours", 24, 1, 168);
      const minMagnitude = numberParam(req.query.minMagnitude, "minMagnitude", 4.5, 0, 10);
      const limit = integerParam(req.query.limit, "limit", 20, 1, 100);
      const data = await queryUsgs({
        starttime: startTime(now(), hours),
        minmagnitude: minMagnitude,
        orderby: "time",
        limit
      });
      res.json({
        query: { hours, minMagnitude, limit },
        count: data.features.length,
        generatedAt: data.metadata?.generated
          ? new Date(data.metadata.generated).toISOString()
          : now().toISOString(),
        source: "USGS Earthquake Catalog",
        earthquakes: data.features.map(normalizeFeature)
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/v1/earthquakes/nearby", async (req, res, next) => {
    try {
      const latitude = numberParam(req.query.latitude, "latitude", Number.NaN, -90, 90);
      const longitude = numberParam(req.query.longitude, "longitude", Number.NaN, -180, 180);
      const radiusKm = numberParam(req.query.radiusKm, "radiusKm", 250, 1, 2000);
      const hours = integerParam(req.query.hours, "hours", 168, 1, 720);
      const minMagnitude = numberParam(req.query.minMagnitude, "minMagnitude", 2.5, 0, 10);
      const limit = integerParam(req.query.limit, "limit", 20, 1, 100);
      const data = await queryUsgs({
        latitude,
        longitude,
        maxradiuskm: radiusKm,
        starttime: startTime(now(), hours),
        minmagnitude: minMagnitude,
        orderby: "time",
        limit
      });
      res.json({
        query: { latitude, longitude, radiusKm, hours, minMagnitude, limit },
        count: data.features.length,
        source: "USGS Earthquake Catalog",
        earthquakes: data.features.map(normalizeFeature)
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/v1/earthquakes/:eventId/risk", async (req, res, next) => {
    try {
      const eventId = req.params.eventId;
      if (!/^[A-Za-z0-9_-]{3,40}$/.test(eventId)) {
        throw new RequestError("eventId contains unsupported characters");
      }
      const data = await queryUsgs({ eventid: eventId });
      const feature = data.features[0];
      if (!feature) throw new RequestError(`earthquake ${eventId} was not found`, 404);
      res.json({
        source: "USGS Earthquake Catalog",
        earthquake: normalizeFeature(feature),
        risk: assessRisk(feature)
      });
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof RequestError) {
      res.status(error.status).json({ error: "invalid_request", detail: error.message });
      return;
    }
    if (error instanceof UpstreamError) {
      res.status(502).json({ error: "upstream_failure", detail: error.message });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "internal_error" });
  });

  return app;
}

// Vercel recognizes src/app.ts as an Express entry point. Keep initialization
// lazy so importing createApp in tests does not contact the facilitator.
let runtimeApp: ReturnType<typeof createApp> | undefined;

export default function handleRequest(req: Request, res: Response): void {
  runtimeApp ??= createApp(loadConfig());
  runtimeApp(req, res);
}
