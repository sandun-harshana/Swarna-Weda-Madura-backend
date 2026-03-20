import express from 'express';
import { createOrder, getOrders, updateOrderStatus, requestCancellation, requestReturn, confirmReceived, addOrderFeedback, addAdminResponse, updatePaymentStatus, updateTrackingInfo, addTrackingUpdate, markOrderNotificationSeen, approvePayment, rejectPayment } from '../controllers/orderController.js';

const orderRouter = express.Router();

orderRouter.post("/", createOrder)
orderRouter.get("/",getOrders)
orderRouter.put("/status/:orderID",updateOrderStatus)
orderRouter.put("/payment-status/:orderID", updatePaymentStatus)
orderRouter.post("/:orderID/approve-payment", approvePayment)
orderRouter.post("/:orderID/reject-payment", rejectPayment)
orderRouter.put("/tracking/:orderID", updateTrackingInfo)
orderRouter.post("/tracking/:orderID/update", addTrackingUpdate)
orderRouter.put("/:orderID/cancel", requestCancellation)
orderRouter.put("/:orderID/return", requestReturn)
orderRouter.put("/:orderID/received", confirmReceived)
orderRouter.post("/:orderID/feedback", addOrderFeedback)
orderRouter.post("/:orderID/admin-response", addAdminResponse)
orderRouter.post("/notification/:orderId/mark-seen", markOrderNotificationSeen);

export default orderRouter;