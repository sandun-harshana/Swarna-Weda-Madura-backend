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

const connectionString = process.env.MONGO_URI;


mongoose.connect(connectionString, {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
}).then(
    ()=>{
        console.log("Database connected Successfully")
    }
).catch(
    (err)=>{
        console.log("Database connection failed:", err.message)
        process.exit(1)
    }
)

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

app.listen(PORT, 
    ()=>{
        console.log(`Server is running on port ${PORT}`)
    }
)