import Order from "../models/order.js";
import Product from "../models/product.js";
import User from "../models/user.js";
import { isAdmin, isCustomer } from "./userController.js";

export async function createOrder(req, res) {
	//GBG0000001

	// if(req.user == null){
	//     res.status(401).json(
	//         {
	//             message: "Unauthorized user"
	//         }
	//     )
	//     return
	// }

	try {
		const user = req.user;
		if (user == null) {
			res.status(401).json({
				message: "Unauthorized user",
			});
			return;
		}

		const orderList = await Order.find().sort({ date: -1 }).limit(1);

		let newOrderID = "GBG0000001";

		if (orderList.length != 0) {
			let lastOrderIDInString = orderList[0].orderID; //"GBG0000123"
			let lastOrderNumberInString = lastOrderIDInString.replace("GBG", ""); //"0000123"
			let lastOrderNumber = parseInt(lastOrderNumberInString); //123
			let newOrderNumber = lastOrderNumber + 1; //124
			//padStart
			let newOrderNumberInString = newOrderNumber.toString().padStart(7, "0"); //"0000124"

			newOrderID = "GBG" + newOrderNumberInString; //"GBG0000124"
		}

		let customerName = req.body.customerName;
		if (customerName == null) {
			customerName = user.firstName + " " + user.lastName;
		}

		let phone = req.body.phone;
		if (phone == null) {
			phone = "Not provided";
		}

		const itemsInRequest = req.body.items;

		if (itemsInRequest == null) {
			res.status(400).json({
				message: "Items are required to place an order",
			});
			return;
		}

		if (!Array.isArray(itemsInRequest)) {
			res.status(400).json({
				message: "Items should be an array",
			});
			return;
		}

		const itemsToBeAdded = [];
		let subtotal = 0;

		for (let i = 0; i < itemsInRequest.length; i++) {
			const item = itemsInRequest[i];

			const product = await Product.findOne({ productID: item.productID });

			if (product == null) {
				res.status(400).json({
					code: "not-found",
					message: `Product with ID ${item.productID} not found`,
					productID: item.productID,
				});
				return;
			}

			if (product.stock < item.quantity) {
				res.status(400).json({
					code: "stock",
					message: `Insufficient stock for product with ID ${item.productID}`,
					productID: item.productID,
					availableStock: product.stock,
				});
				return;
			}

			itemsToBeAdded.push({
				productID: product.productID,
				quantity: item.quantity,
				name: product.name,
				price: product.price,
				image: product.images[0],
			});

			subtotal += product.price * item.quantity;
		}

		// Get user's current membership tier and calculate discount
		const currentUser = await User.findOne({ email: user.email });
		const membershipTier = currentUser.membershipTier || "Bronze";
		
		// Membership discount rates
		const discountRates = {
			Bronze: 0,
			Silver: 0.05,  // 5%
			Gold: 0.10,    // 10%
			Diamond: 0.15  // 15%
		};
		
		const discountRate = discountRates[membershipTier] || 0;
		const discount = Math.floor(subtotal * discountRate);
		const total = subtotal - discount

		const newOrder = new Order({
			orderID: newOrderID,
			items: itemsToBeAdded,
			customerName: customerName,
			email: user.email,
			phone: phone,
			address: req.body.address,
			subtotal: subtotal,
			discount: discount,
			membershipTier: membershipTier,
			total: total,
			paymentMethod: req.body.paymentMethod || "cash-on-delivery",
			paymentStatus: req.body.paymentMethod === "cash-on-delivery" ? "unpaid" : "pending",
			paymentDetails: {
				transactionId: req.body.paymentDetails?.transactionId || "",
				paidAmount: req.body.paymentDetails?.paidAmount || 0,
				paymentDate: req.body.paymentDetails?.paymentDate || null,
				paymentProof: req.body.paymentDetails?.paymentProof || "",
				bankName: req.body.paymentDetails?.bankName || "",
				accountNumber: req.body.paymentDetails?.accountNumber || ""
			}
		});

		const savedOrder = await newOrder.save();

		// Award points to user (1 point per 100 LKR spent)
		const pointsToAdd = Math.floor(total / 100);
		const newTotalPoints = currentUser.points + pointsToAdd;
		
		// Update membership tier based on total points
		let newMembershipTier = "Bronze";
		if (newTotalPoints >= 1000) {
			newMembershipTier = "Diamond";
		} else if (newTotalPoints >= 500) {
			newMembershipTier = "Gold";
		} else if (newTotalPoints >= 200) {
			newMembershipTier = "Silver";
		}
		
		await User.updateOne(
			{ email: user.email },
			{ 
				$inc: { points: pointsToAdd },
				membershipTier: newMembershipTier
			}
		);

		// Reduce stock for each purchased item
		for(let i=0; i<itemsToBeAdded.length; i++){
		    const item = itemsToBeAdded[i]

		    await Product.updateOne(
		        {productID: item.productID},
		        {$inc : {stock : -item.quantity}}
		    )
		}

		res.status(201).json({
			message: "Order created successfully",
			order: savedOrder,
			pointsEarned: pointsToAdd,
			discountApplied: discount,
			membershipTier: membershipTier,
			newMembershipTier: newMembershipTier,
		});
	} catch (err) {
		console.log(err);
		res.status(500).json({
			message: "Internal server error",
		});
	}
}

export async function getOrders(req, res) {
	if (isAdmin(req)) {
		const orders = await Order.find().sort({ date: -1 });
		res.json(orders);
	} else if (isCustomer(req)) {
		const user = req.user;
		const orders = await Order.find({ email: user.email }).sort({ date: -1 });
		res.json(orders);
	} else {
		res.status(403).json({
			message: "You are not authorized to view orders",
		});
	}
}

export async function updateOrderStatus(req, res) {
	if (!isAdmin(req)) {
		res.status(403).json({
			message: "You are not authorized to update order status",
		});
		return;
	}
	const orderID = req.params.orderID;
	const newStatus = req.body.status;
	try {
		await Order.updateOne({ orderID: orderID }, { status: newStatus });

		res.json({
			message: "Order status updated successfully",
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({
			message: "Failed to update order status",
		});
		return;
	}
}

// Request cancellation (customer)
export async function requestCancellation(req, res) {
	if (!isCustomer(req)) {
		res.status(403).json({
			message: "You are not authorized to cancel orders",
		});
		return;
	}

	const orderID = req.params.orderID;
	const reason = req.body.reason || "No reason provided";

	try {
		const order = await Order.findOne({ orderID: orderID, email: req.user.email });

		if (!order) {
			res.status(404).json({
				message: "Order not found",
			});
			return;
		}

		if (order.status === "delivered") {
			res.status(400).json({
				message: "Cannot cancel delivered orders",
			});
			return;
		}

		await Order.updateOne(
			{ orderID: orderID },
			{ 
				cancellationStatus: "requested",
				cancellationReason: reason
			}
		);

		res.json({
			message: "Cancellation requested successfully",
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({
			message: "Failed to request cancellation",
		});
	}
}

// Request return (customer)
export async function requestReturn(req, res) {
	if (!isCustomer(req)) {
		res.status(403).json({
			message: "You are not authorized to return orders",
		});
		return;
	}

	const orderID = req.params.orderID;
	const reason = req.body.reason || "No reason provided";

	try {
		const order = await Order.findOne({ orderID: orderID, email: req.user.email });

		if (!order) {
			res.status(404).json({
				message: "Order not found",
			});
			return;
		}

		if (order.status !== "delivered") {
			res.status(400).json({
				message: "Can only return delivered orders",
			});
			return;
		}

		await Order.updateOne(
			{ orderID: orderID },
			{ 
				returnStatus: "requested",
				returnReason: reason
			}
		);

		res.json({
			message: "Return requested successfully",
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({
			message: "Failed to request return",
		});
	}
}

// Confirm order received (customer)
export async function confirmReceived(req, res) {
	if (!isCustomer(req)) {
		res.status(403).json({
			message: "You are not authorized",
		});
		return;
	}

	const orderID = req.params.orderID;

	try {
		const order = await Order.findOne({ orderID: orderID, email: req.user.email });

		if (!order) {
			res.status(404).json({
				message: "Order not found",
			});
			return;
		}

		await Order.updateOne(
			{ orderID: orderID },
			{ 
				shippingStatus: "received",
				status: "delivered"
			}
		);

		res.json({
			message: "Order confirmed as received",
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({
			message: "Failed to confirm receipt",
		});
	}
}

// Add customer feedback to order
export async function addOrderFeedback(req, res) {
	if (!isCustomer(req)) {
		res.status(403).json({
			message: "You are not authorized",
		});
		return;
	}

	const orderID = req.params.orderID;
	const message = req.body.message;

	if (!message || message.trim() === "") {
		res.status(400).json({
			message: "Feedback message is required",
		});
		return;
	}

	try {
		const order = await Order.findOne({ orderID: orderID, email: req.user.email });

		if (!order) {
			res.status(404).json({
				message: "Order not found",
			});
			return;
		}

		await Order.updateOne(
			{ orderID: orderID },
			{
				$push: {
					customerFeedback: {
						message: message,
						date: new Date(),
						isAdmin: false
					}
				}
			}
		);

		res.json({
			message: "Feedback added successfully",
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({
			message: "Failed to add feedback",
		});
	}
}

// Admin reply to order feedback
export async function addAdminResponse(req, res) {
	if (!isAdmin(req)) {
		res.status(403).json({
			message: "You are not authorized",
		});
		return;
	}

	const orderID = req.params.orderID;
	const message = req.body.message;

	if (!message || message.trim() === "") {
		res.status(400).json({
			message: "Response message is required",
		});
		return;
	}

	try {
		const order = await Order.findOne({ orderID: orderID });

		if (!order) {
			res.status(404).json({
				message: "Order not found",
			});
			return;
		}

		await Order.updateOne(
			{ orderID: orderID },
			{
				$push: {
					customerFeedback: {
						message: message,
						date: new Date(),
						isAdmin: true
					}
				}
			}
		);

		res.json({
			message: "Response added successfully",
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({
			message: "Failed to add response",
		});
	}
}

// Update payment status (admin)
export async function updatePaymentStatus(req, res) {
	if (!isAdmin(req)) {
		res.status(403).json({
			message: "You are not authorized",
		});
		return;
	}

	const orderID = req.params.orderID;
	const paymentStatus = req.body.paymentStatus;

	if (!paymentStatus || !["unpaid", "paid", "pending"].includes(paymentStatus)) {
		res.status(400).json({
			message: "Valid payment status is required (unpaid, paid, pending)",
		});
		return;
	}

	try {
		const order = await Order.findOne({ orderID: orderID });

		if (!order) {
			res.status(404).json({
				message: "Order not found",
			});
			return;
		}

		await Order.updateOne(
			{ orderID: orderID },
			{ 
				paymentStatus: paymentStatus,
				...(paymentStatus === "paid" && { "paymentDetails.paymentDate": new Date() })
			}
		);

		res.json({
			message: "Payment status updated successfully",
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({
			message: "Failed to update payment status",
		});
	}
}

// Approve payment (admin)
export async function approvePayment(req, res) {
	if (!isAdmin(req)) {
		res.status(403).json({
			message: "You are not authorized",
		});
		return;
	}

	const orderID = req.params.orderID;

	try {
		const order = await Order.findOne({ orderID: orderID });

		if (!order) {
			res.status(404).json({
				message: "Order not found",
			});
			return;
		}

		if (order.paymentStatus !== "pending") {
			res.status(400).json({
				message: "Only pending payments can be approved",
			});
			return;
		}

		await Order.updateOne(
			{ orderID: orderID },
			{ 
				paymentStatus: "paid",
				"paymentDetails.paymentDate": new Date()
			}
		);

		res.json({
			message: "Payment approved successfully",
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({
			message: "Failed to approve payment",
		});
	}
}

// Reject payment (admin)
export async function rejectPayment(req, res) {
	if (!isAdmin(req)) {
		res.status(403).json({
			message: "You are not authorized",
		});
		return;
	}

	const orderID = req.params.orderID;
	const reason = req.body.reason || "Payment verification failed";

	try {
		const order = await Order.findOne({ orderID: orderID });

		if (!order) {
			res.status(404).json({
				message: "Order not found",
			});
			return;
		}

		if (order.paymentStatus !== "pending") {
			res.status(400).json({
				message: "Only pending payments can be rejected",
			});
			return;
		}

		await Order.updateOne(
			{ orderID: orderID },
			{ 
				paymentStatus: "unpaid",
				"paymentDetails.rejectionReason": reason
			}
		);

		res.json({
			message: "Payment rejected successfully",
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({
			message: "Failed to reject payment",
		});
	}
}

// Update tracking information (admin)
export async function updateTrackingInfo(req, res) {
	if (!isAdmin(req)) {
		res.status(403).json({
			message: "You are not authorized",
		});
		return;
	}

	const orderID = req.params.orderID;
	const { trackingNumber, courierService, estimatedDelivery, trackingUrl } = req.body;

	try {
		const order = await Order.findOne({ orderID: orderID });

		if (!order) {
			res.status(404).json({
				message: "Order not found",
			});
			return;
		}

		const updateData = {};
		if (trackingNumber) updateData["trackingInfo.trackingNumber"] = trackingNumber;
		if (courierService) updateData["trackingInfo.courierService"] = courierService;
		if (estimatedDelivery) updateData["trackingInfo.estimatedDelivery"] = estimatedDelivery;
		if (trackingUrl) updateData["trackingInfo.trackingUrl"] = trackingUrl;

		// Automatically update shipping status to 'shipped' when tracking info is added
		if (trackingNumber && order.shippingStatus === "to-ship") {
			updateData.shippingStatus = "shipped";
		}

		await Order.updateOne({ orderID: orderID }, updateData);

		res.json({
			message: "Tracking information updated successfully",
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({
			message: "Failed to update tracking information",
		});
	}
}

// Add tracking update (admin)
export async function addTrackingUpdate(req, res) {
	if (!isAdmin(req)) {
		res.status(403).json({
			message: "You are not authorized",
		});
		return;
	}

	const orderID = req.params.orderID;
	const { status, location, description } = req.body;

	if (!status || !description) {
		res.status(400).json({
			message: "Status and description are required",
		});
		return;
	}

	try {
		const order = await Order.findOne({ orderID: orderID });

		if (!order) {
			res.status(404).json({
				message: "Order not found",
			});
			return;
		}

		await Order.updateOne(
			{ orderID: orderID },
			{
				$push: {
					"trackingInfo.trackingUpdates": {
						status: status,
						location: location || "",
						description: description,
						timestamp: new Date()
					}
				}
			}
		);

		res.json({
			message: "Tracking update added successfully",
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({
			message: "Failed to add tracking update",
		});
	}
}

// Mark order-related notification as seen by admin
export async function markOrderNotificationSeen(req, res) {
	if (!isAdmin(req)) {
		res.status(403).json({ message: "Forbidden" });
		return;
	}

	const orderId = req.params.orderId;

	try {
		const order = await Order.findById(orderId);
		if (!order) {
			res.status(404).json({ message: "Order not found" });
			return;
		}

		order.notificationSeen = true;
		await order.save();

		res.json({ message: "Notification marked as seen" });
	} catch (err) {
		console.error(err);
		res.status(500).json({ message: "Failed to mark notification as seen" });
	}
}

