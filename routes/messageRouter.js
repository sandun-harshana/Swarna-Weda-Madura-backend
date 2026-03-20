import express from "express";
import {
	createMessage,
	getUserMessages,
	getAllMessages,
	getMessageById,
	replyToMessage,
	updateMessageStatus,
	deleteMessage,
	sendAdminMessage,
	markMessageRead,
	deleteUserMessage,
	toggleArchiveMessage,
	toggleStarMessage,
	markUserMessageRead,
} from "../controllers/messageController.js";

const messageRouter = express.Router();

// User routes
messageRouter.post("/", createMessage); // Create new message
messageRouter.get("/my-messages", getUserMessages); // Get user's messages
messageRouter.delete("/user/:id", deleteUserMessage); // Delete user's own message
messageRouter.put("/:id/archive", toggleArchiveMessage); // Toggle archive status
messageRouter.put("/:id/star", toggleStarMessage); // Toggle star status
messageRouter.put("/:id/mark-read", markUserMessageRead); // Mark message as read (user)

// Shared routes
messageRouter.get("/:id", getMessageById); // Get single message
messageRouter.post("/:id/reply", replyToMessage); // Reply to message

// Admin routes
messageRouter.get("/", getAllMessages); // Get all messages (admin)
messageRouter.post("/admin/send", sendAdminMessage); // Send message to user (admin)
messageRouter.put("/:id/status", updateMessageStatus); // Update status (admin)
messageRouter.post("/:id/admin-mark-read", markMessageRead); // Mark message as read (admin)
messageRouter.delete("/:id", deleteMessage); // Delete message (admin)

export default messageRouter;
