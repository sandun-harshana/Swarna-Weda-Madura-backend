import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
	senderEmail: {
		type: String,
		required: true,
	},
	senderName: {
		type: String,
		required: true,
	},
	senderRole: {
		type: String,
		enum: ["user", "admin"],
		required: true,
	},
	// Recipient email (for admin-to-user messages)
	recipientEmail: {
		type: String,
		default: null,
	},
	recipientName: {
		type: String,
		default: null,
	},
	category: {
		type: String,
		enum: ["chat", "orders", "activity", "promo"],
		required: true,
	},
	subject: {
		type: String,
		required: true,
	},
	message: {
		type: String,
		required: true,
	},
	status: {
		type: String,
		enum: ["pending", "replied", "closed"],
		default: "pending",
	},
	replies: [
		{
			senderEmail: {
				type: String,
				required: true,
			},
			senderName: {
				type: String,
				required: true,
			},
			senderRole: {
				type: String,
				enum: ["user", "admin"],
				required: true,
			},
			message: {
				type: String,
				required: true,
			},
			createdAt: {
				type: Date,
				default: Date.now,
			},
		},
	],
	createdAt: {
		type: Date,
		default: Date.now,
	},
	updatedAt: {
		type: Date,
		default: Date.now,
	},
	// Whether admin has read/seen this message in the admin panel
	adminRead: {
		type: Boolean,
		default: false,
	},
	// Whether user has read this message (for messages from admin)
	userRead: {
		type: Boolean,
		default: true, // Default true for user-initiated messages
	},
	// Whether message is archived by user
	archived: {
		type: Boolean,
		default: false,
	},
	// Whether message is starred/important by user
	starred: {
		type: Boolean,
		default: false,
	},
});

const Message = mongoose.model("Message", messageSchema);

export default Message;
