import { randomUUID } from "crypto";

export function requestLogger(req, res, next) {
	const requestId = req.header("x-request-id") || randomUUID();
	const start = process.hrtime.bigint();

	req.requestId = requestId;
	res.setHeader("x-request-id", requestId);

	res.on("finish", () => {
		const durationMs = Number(process.hrtime.bigint() - start) / 1_000_000;
		const log = {
			timestamp: new Date().toISOString(),
			level: res.statusCode >= 500 ? "error" : "info",
			event: "http_request",
			requestId,
			method: req.method,
			path: req.originalUrl,
			statusCode: res.statusCode,
			durationMs: Number(durationMs.toFixed(2)),
			ip: req.ip,
			userAgent: req.get("user-agent") || "unknown",
			user: req.user?.email || null,
		};

		console.log(JSON.stringify(log));
	});

	next();
}
