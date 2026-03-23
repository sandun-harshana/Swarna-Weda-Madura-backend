import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config();

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

function formatErrorMessage(error) {
    if (!error) return "Unknown database error";

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

async function run() {
    if (!process.env.MONGO_URI) {
        console.error(`${RED}[DB CHECK] FAIL${RESET} MONGO_URI is not configured`);
        process.exit(1);
    }

    const startedAt = Date.now();

    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 7000,
            socketTimeoutMS: 45000,
        });

        const duration = Date.now() - startedAt;
        const dbName = mongoose.connection?.name || "unknown";
        console.log(`${GREEN}[DB CHECK] OK${RESET} Connected to '${dbName}' in ${duration}ms`);
        process.exit(0);
    } catch (error) {
        const duration = Date.now() - startedAt;
        console.error(`${RED}[DB CHECK] FAIL${RESET} ${formatErrorMessage(error)} (${duration}ms)`);
        console.error(`${YELLOW}[Hint]${RESET} Atlas Network Access should allow your current IP.`);
        process.exit(1);
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    }
}

run();
