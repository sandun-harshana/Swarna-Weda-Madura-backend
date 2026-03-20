import Message from "../models/message.js";

// Helper function to check if user is admin
function isAdmin(req) {
	if (req.user == null) {
		return false;
	}
	if (req.user.role === "admin") {
		return true;
	}
	return false;
}

// Create a new message (user)
export async function createMessage(req, res) {
	if (!req.user) {
		res.status(401).json({
			message: "Unauthorized",
		});
		return;
	}

	const { category, subject, message } = req.body;

	if (!category || !subject || !message) {
		res.status(400).json({
			message: "Category, subject, and message are required",
		});
		return;
	}

	try {
		const newMessage = new Message({
			senderEmail: req.user.email,
			senderName: `${req.user.firstName} ${req.user.lastName}`,
			senderRole: "user",
			category: category,
			subject: subject,
			message: message,
		});

		await newMessage.save();

		res.json({
			message: "Message sent successfully",
			data: newMessage,
		});
	} catch (err) {
		res.status(500).json({
			message: "Failed to send message",
		});
	}
}

// Get all messages for logged-in user
export async function getUserMessages(req, res) {
	if (!req.user) {
		res.status(401).json({
			message: "Unauthorized",
		});
		return;
	}

	try {
		// Fetch messages sent BY user OR messages sent TO user (from admin)
		const messages = await Message.find({
			$or: [
				{ senderEmail: req.user.email }, // Messages sent by user
				{ recipientEmail: req.user.email } // Messages sent to user by admin
			]
		}).sort({ createdAt: -1 });

		res.json(messages);
	} catch (err) {
		res.status(500).json({
			message: "Failed to get messages",
		});
	}
}

// Get all messages (admin only)
export async function getAllMessages(req, res) {
	if (!isAdmin(req)) {
		res.status(403).json({
			message: "Forbidden",
		});
		return;
	}

	const { category, status } = req.query;

	try {
		let query = {};
		if (category) query.category = category;
		if (status) query.status = status;

		const messages = await Message.find(query).sort({ createdAt: -1 });

		res.json(messages);
	} catch (err) {
		res.status(500).json({
			message: "Failed to get messages",
		});
	}
}

// Mark message as read by admin
export async function markMessageRead(req, res) {
	if (!isAdmin(req)) {
		res.status(403).json({ message: "Forbidden" });
		return;
	}

	const messageId = req.params.id;

	try {
		const message = await Message.findById(messageId);
		if (!message) {
			res.status(404).json({ message: "Message not found" });
			return;
		}

		message.adminRead = true;
		await message.save();

		res.json({ message: "Message marked as read" });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Failed to mark message as read" });
	}
}

// Get single message by ID
export async function getMessageById(req, res) {
	if (!req.user) {
		res.status(401).json({
			message: "Unauthorized",
		});
		return;
	}

	const messageId = req.params.id;

	try {
		const message = await Message.findById(messageId);

		if (!message) {
			res.status(404).json({
				message: "Message not found",
			});
			return;
		}

		// Check if user owns the message or is admin
		if (message.senderEmail !== req.user.email && !isAdmin(req)) {
			res.status(403).json({
				message: "Forbidden",
			});
			return;
		}

		res.json(message);
	} catch (err) {
		res.status(500).json({
			message: "Failed to get message",
		});
	}
}

// Reply to a message
export async function replyToMessage(req, res) {
	if (!req.user) {
		res.status(401).json({
			message: "Unauthorized",
		});
		return;
	}

	const messageId = req.params.id;
	const { message } = req.body;

	if (!message) {
		res.status(400).json({
			message: "Reply message is required",
		});
		return;
	}

	try {
		const existingMessage = await Message.findById(messageId);

		if (!existingMessage) {
			res.status(404).json({
				message: "Message not found",
			});
			return;
		}

		// Check if user owns the message or is admin
		if (existingMessage.senderEmail !== req.user.email && !isAdmin(req)) {
			res.status(403).json({
				message: "Forbidden",
			});
			return;
		}

		const reply = {
			senderEmail: req.user.email,
			senderName: `${req.user.firstName} ${req.user.lastName}`,
			senderRole: isAdmin(req) ? "admin" : "user",
			message: message,
		};

		existingMessage.replies.push(reply);
		existingMessage.updatedAt = Date.now();
		
		// Update status to replied if admin is replying
		if (isAdmin(req) && existingMessage.status === "pending") {
			existingMessage.status = "replied";
		}

		await existingMessage.save();

		res.json({
			message: "Reply sent successfully",
			data: existingMessage,
		});
	} catch (err) {
		res.status(500).json({
			message: "Failed to send reply",
		});
	}
}

// Update message status (admin only)
export async function updateMessageStatus(req, res) {
	if (!isAdmin(req)) {
		res.status(403).json({
			message: "Forbidden",
		});
		return;
	}

	const messageId = req.params.id;
	const { status } = req.body;

	if (!status || !["pending", "replied", "closed"].includes(status)) {
		res.status(400).json({
			message: "Valid status is required (pending, replied, closed)",
		});
		return;
	}

	try {
		const message = await Message.findByIdAndUpdate(
			messageId,
			{ status: status, updatedAt: Date.now() },
			{ new: true }
		);

		if (!message) {
			res.status(404).json({
				message: "Message not found",
			});
			return;
		}

		res.json({
			message: "Status updated successfully",
			data: message,
		});
	} catch (err) {
		res.status(500).json({
			message: "Failed to update status",
		});
	}
}

// Delete message (admin only)
export async function deleteMessage(req, res) {
	if (!isAdmin(req)) {
		res.status(403).json({
			message: "Forbidden",
		});
		return;
	}

	const messageId = req.params.id;

	try {
		const message = await Message.findByIdAndDelete(messageId);

		if (!message) {
			res.status(404).json({
				message: "Message not found",
			});
			return;
		}

		res.json({
			message: "Message deleted successfully",
		});
	} catch (err) {
		res.status(500).json({
			message: "Failed to delete message",
		});
	}
}

// Send message from admin to user (admin only)
export async function sendAdminMessage(req, res) {
	if (!isAdmin(req)) {
		res.status(403).json({
			message: "Forbidden",
		});
		return;
	}

	const { recipientEmail, recipientName, category, subject, message } = req.body;

	if (!recipientEmail || !recipientName || !category || !subject || !message) {
		res.status(400).json({
			message: "All fields are required",
		});
		return;
	}

	try {
		const newMessage = new Message({
			senderEmail: req.user.email,
			senderName: `${req.user.firstName} ${req.user.lastName}`,
			senderRole: "admin",
			recipientEmail: recipientEmail,
			recipientName: recipientName,
			category: category,
			subject: subject,
			message: message,
			status: "pending", // Start as pending, waiting for user reply
			userRead: false, // User hasn't read this admin message yet
			replies: [],
		});

		await newMessage.save();

		res.json({
			message: "Message sent to user successfully",
			data: newMessage,
		});
	} catch (err) {
		console.error("Error sending admin message:", err);
		res.status(500).json({
			message: "Failed to send message",
		});
	}
}

// Delete message (user can delete their own messages)
export async function deleteUserMessage(req, res) {
	if (!req.user) {
		res.status(401).json({
			message: "Unauthorized",
		});
		return;
	}

	const messageId = req.params.id;

	try {
		const message = await Message.findById(messageId);

		if (!message) {
			res.status(404).json({
				message: "Message not found",
			});
			return;
		}

		// Users can only delete their own messages
		if (message.senderEmail !== req.user.email) {
			res.status(403).json({
				message: "You can only delete your own messages",
			});
			return;
		}

		await Message.findByIdAndDelete(messageId);

		res.json({
			message: "Message deleted successfully",
		});
	} catch (err) {
		console.error("Error deleting message:", err);
		res.status(500).json({
			message: "Failed to delete message",
		});
	}
}

// Toggle archive status for user
export async function toggleArchiveMessage(req, res) {
	if (!req.user) {
		res.status(401).json({
			message: "Unauthorized",
		});
		return;
	}

	const messageId = req.params.id;

	try {
		const message = await Message.findById(messageId);

		if (!message) {
			res.status(404).json({
				message: "Message not found",
			});
			return;
		}

		// Users can only archive their own messages
		if (message.senderEmail !== req.user.email) {
			res.status(403).json({
				message: "You can only archive your own messages",
			});
			return;
		}

		message.archived = !message.archived;
		await message.save();

		res.json({
			message: message.archived ? "Message archived" : "Message unarchived",
			data: message,
		});
	} catch (err) {
		console.error("Error toggling archive:", err);
		res.status(500).json({
			message: "Failed to toggle archive",
		});
	}
}

// Toggle star status for user
export async function toggleStarMessage(req, res) {
	if (!req.user) {
		res.status(401).json({
			message: "Unauthorized",
		});
		return;
	}

	const messageId = req.params.id;

	try {
		const message = await Message.findById(messageId);

		if (!message) {
			res.status(404).json({
				message: "Message not found",
			});
			return;
		}

		// Users can only star their own messages
		if (message.senderEmail !== req.user.email) {
			res.status(403).json({
				message: "You can only star your own messages",
			});
			return;
		}

		message.starred = !message.starred;
		await message.save();

		res.json({
			message: message.starred ? "Message starred" : "Message unstarred",
			data: message,
		});
	} catch (err) {
		console.error("Error toggling star:", err);
		res.status(500).json({
			message: "Failed to toggle star",
		});
	}
}

// Mark message as read by user
export async function markUserMessageRead(req, res) {
	if (!req.user) {
		res.status(401).json({
			message: "Unauthorized",
		});
		return;
	}

	const messageId = req.params.id;

	try {
		const message = await Message.findById(messageId);

		if (!message) {
			res.status(404).json({
				message: "Message not found",
			});
			return;
		}

		// Users can only mark their own messages as read
		if (message.senderEmail !== req.user.email) {
			res.status(403).json({
				message: "Forbidden",
			});
			return;
		}

		message.userRead = true;
		await message.save();

		res.json({
			message: "Message marked as read",
			data: message,
		});
	} catch (err) {
		console.error("Error marking message as read:", err);
		res.status(500).json({
			message: "Failed to mark message as read",
		});
	}
}
