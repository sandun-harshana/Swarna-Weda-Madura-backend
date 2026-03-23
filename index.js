import express from "express";
import mongoose from "mongoose";
import userRouter from "./routes/userRouter.js";
import jwt from "jsonwebtoken";
import productRouter from "./routes/productRouter.js";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import orderRouter from "./routes/orderRoute.js";
import messageRouter from "./routes/messageRouter.js";
import wishlistRouter from "./routes/wishlistRouter.js";
import { requestLogger } from "./middleware/requestLogger.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

dotenv.config();

const app = express();
let mongoConnectionPromise;

function getDatabaseErrorMessage(error) {
    if (!error) {
        return "Unknown database error";
    }

    if (error.name === "MongoServerSelectionError") {
        return "Cannot reach MongoDB cluster. Check Atlas IP access list, DNS, and internet connection.";
    }

    if (error.name === "MongoParseError") {
        return "Invalid MONGO_URI format.";
    }

    if (error.name === "MongoServerError" && error.code === 18) {
        return "MongoDB authentication failed. Check database username/password.";
    }

    return error.message || "Unknown database error";
}

function connectToDatabase() {
    if (!mongoConnectionPromise) {
        if (!process.env.MONGO_URI) {
            throw new Error("MONGO_URI is not configured");
        }

        mongoConnectionPromise = mongoose
            .connect(process.env.MONGO_URI, {
                serverSelectionTimeoutMS: 5000,
                socketTimeoutMS: 45000,
            })
            .then(() => {
                console.log("Database connected successfully");
                return mongoose.connection;
            })
            .catch((err) => {
                mongoConnectionPromise = null;
                console.log("Database connection failed:", err.message);
                throw err;
            });
    }

    return mongoConnectionPromise;
}

const allowedOrigins = [
    process.env.FRONTEND_URL,
    "http://localhost:5173",
    "http://localhost:5174",
    "https://swarna-weda-madura-ayu.web.app",
].filter(Boolean);

app.set("trust proxy", 1);
app.use(helmet());
app.use(
    cors({
        origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                callback(null, true);
                return;
            }
            callback(new Error("CORS blocked for this origin"));
        },
        credentials: true,
    })
);

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 400,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 40,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: "Too many auth requests, please try again later." },
});

app.use(express.json());
app.use("/api", apiLimiter);
app.use("/api/users/login", authLimiter);
app.use("/api/users/register", authLimiter);
app.use(requestLogger);

app.use(async (req, res, next) => {
    try {
        await connectToDatabase();
        next();
    } catch (error) {
        res.status(500).json({
            message: "Database connection failed",
            ...(process.env.NODE_ENV !== "production" && {
                details: getDatabaseErrorMessage(error),
            }),
        });
    }
});

app.use(
    (req, res, next) => {
        let token = req.header("Authorization");

        if (!token) {
            next();
            return;
        }

        try {
            token = token.replace("Bearer ", "");
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
            next();
        } catch {
            res.status(401).json({
                message: "Invalid token please login again",
            });
        }
    }
);

app.get("/health", (req, res) => {
	res.status(200).json({
		status: "ok",
		timestamp: new Date().toISOString(),
	});
});



app.use("/api/users",userRouter)
app.use("/api/products", productRouter)
app.use("/api/orders", orderRouter)
app.use("/api/messages", messageRouter)
app.use("/api/wishlist", wishlistRouter)

app.use(notFoundHandler);
app.use(errorHandler);


const PORT = process.env.PORT || 5000;

if (!process.env.VERCEL) {
    connectToDatabase()
        .then(() => {
            app.listen(PORT, () => {
                console.log(`Server is running on port ${PORT}`);
            });
        })
        .catch((error) => {
            console.error("Startup failed:", getDatabaseErrorMessage(error));
            process.exit(1);
        });
}

export default app;