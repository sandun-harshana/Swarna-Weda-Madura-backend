export function notFoundHandler(req, res, next) {
	const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
	error.statusCode = 404;
	next(error);
}

export function errorHandler(err, req, res, next) {
	const statusCode = err.statusCode || err.status || 500;
	const requestId = req.requestId || "unknown";

	const log = {
		timestamp: new Date().toISOString(),
		level: "error",
		event: "unhandled_error",
		requestId,
		method: req.method,
		path: req.originalUrl,
		statusCode,
		message: err.message || "Internal Server Error",
		stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
	};

	console.error(JSON.stringify(log));

	res.status(statusCode).json({
		message: statusCode === 500 ? "Internal server error" : err.message,
		requestId,
	});
}
