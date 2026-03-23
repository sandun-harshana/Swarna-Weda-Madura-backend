import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/user.js";

dotenv.config();

const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

function parseEmails() {
    const cliEmails = process.argv.slice(2).map((email) => email.trim().toLowerCase()).filter(Boolean);
    if (cliEmails.length > 0) {
        return [...new Set(cliEmails)];
    }

    const envEmails = (process.env.ADMIN_EMAILS || "")
        .split(",")
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);

    return [...new Set(envEmails)];
}

async function run() {
    if (!process.env.MONGO_URI) {
        console.error(`${RED}[ADMIN PROMOTE] FAIL${RESET} MONGO_URI is not configured`);
        process.exit(1);
    }

    const emails = parseEmails();
    if (emails.length === 0) {
        console.error(`${YELLOW}[ADMIN PROMOTE] Usage${RESET} npm run promote-admins -- user@example.com`);
        console.error(`${YELLOW}[ADMIN PROMOTE] Hint${RESET} or define ADMIN_EMAILS in .env`);
        process.exit(1);
    }

    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 7000,
            socketTimeoutMS: 45000,
        });

        const users = await User.find({ email: { $in: emails } }).select("email role isEmailVerified");
        const foundEmails = new Set(users.map((user) => user.email));
        const missingEmails = emails.filter((email) => !foundEmails.has(email));

        if (users.length > 0) {
            await User.updateMany(
                { email: { $in: Array.from(foundEmails) } },
                { $set: { role: "admin", isEmailVerified: true } }
            );
        }

        if (users.length > 0) {
            console.log(`${GREEN}[ADMIN PROMOTE] OK${RESET} Promoted: ${Array.from(foundEmails).join(", ")}`);
        }

        if (missingEmails.length > 0) {
            console.log(`${YELLOW}[ADMIN PROMOTE] NOT FOUND${RESET} ${missingEmails.join(", ")}`);
        }

        if (users.length === 0) {
            process.exit(1);
        }
    } catch (error) {
        console.error(`${RED}[ADMIN PROMOTE] FAIL${RESET} ${error.message || "Unknown error"}`);
        process.exit(1);
    } finally {
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }
    }
}

run();