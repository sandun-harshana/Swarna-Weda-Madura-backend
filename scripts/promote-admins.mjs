import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/user.js";

dotenv.config();

const defaultEmails = [
	"erandaisuru1315@gmail.com",
	"sandunharshana2020@gmail.com",
];

const cliEmails = process.argv.slice(2).map((email) => email.trim()).filter(Boolean);
const emails = cliEmails.length > 0 ? cliEmails : defaultEmails;

if (!process.env.MONGO_URI) {
	console.error("MONGO_URI is missing. Add it to backend/.env before running this script.");
	process.exit(1);
}

if (emails.length === 0) {
	console.error("No email addresses provided. Usage: node scripts/promote-admins.mjs user@example.com");
	process.exit(1);
}

async function run() {
	await mongoose.connect(process.env.MONGO_URI);

	const result = await User.updateMany(
		{ email: { $in: emails } },
		{ $set: { role: "admin", isEmailVerified: true } }
	);

	const users = await User.find(
		{ email: { $in: emails } },
		{ email: 1, role: 1, isEmailVerified: 1, _id: 0 }
	).lean();

	const found = users.map((u) => u.email);
	const missing = emails.filter((e) => !found.includes(e));

	console.log(
		JSON.stringify(
			{
				matched: result.matchedCount,
				modified: result.modifiedCount,
				users,
				missing,
			},
			null,
			2
		)
	);

	await mongoose.connection.close();
}

run().catch(async (error) => {
	console.error("Failed to promote admins:", error.message);
	await mongoose.connection.close();
	process.exit(1);
});
