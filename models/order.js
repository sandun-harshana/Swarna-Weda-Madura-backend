import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
    {
        orderID : {
            type : String,
            required : true,
            unique : true
        },
        items : {
            type : [
                {
                    productID : {
                        type : String,
                        required : true
                    },
                    quantity : {
                        type : Number,
                        required : true
                    },
                    name : {
                        type : String,
                        required : true
                    },
                    price : {
                        type : Number,
                        required : true
                    },
                    image : {
                        type : String,
                        required : true
                    }
                }
            ]
        },
        customerName : {
            type : String,
            required : true
        },
        email : {
            type : String,
            required : true
        },
        phone : {
            type : String,
            required : false,
            default : "Not provided"
        },
        address : {
            type : String,
            required : true
        },
        subtotal : {
            type : Number,
            required : false,
            default : 0
        },
        discount : {
            type : Number,
            required : false,
            default : 0
        },
        membershipTier : {
            type : String,
            enum: ["Bronze", "Silver", "Gold", "Diamond"],
            default : "Bronze"
        },
        total : {
            type : Number,
            required : true
        },
        status : {
            type : String,
            required : true,
            default : "pending"
        },
        paymentStatus: {
            type: String,
            enum: ["unpaid", "paid", "pending"],
            default: "unpaid"
        },
        paymentMethod: {
            type: String,
            enum: ["cash-on-delivery", "bank-transfer", "card", "mobile-payment"],
            default: "cash-on-delivery"
        },
        paymentDetails: {
            transactionId: {
                type: String,
                default: ""
            },
            paidAmount: {
                type: Number,
                default: 0
            },
            paymentDate: {
                type: Date,
                default: null
            },
            paymentProof: {
                type: String,
                default: ""
            },
            bankName: {
                type: String,
                default: ""
            },
            accountNumber: {
                type: String,
                default: ""
            },
            rejectionReason: {
                type: String,
                default: ""
            }
        },
        shippingStatus: {
            type: String,
            enum: ["to-ship", "shipped", "to-receive", "received"],
            default: "to-ship"
        },
        trackingInfo: {
            trackingNumber: {
                type: String,
                default: ""
            },
            courierService: {
                type: String,
                default: ""
            },
            estimatedDelivery: {
                type: Date,
                default: null
            },
            trackingUrl: {
                type: String,
                default: ""
            },
            trackingUpdates: {
                type: [
                    {
                        status: {
                            type: String,
                            required: true
                        },
                        location: {
                            type: String,
                            default: ""
                        },
                        description: {
                            type: String,
                            required: true
                        },
                        timestamp: {
                            type: Date,
                            default: Date.now
                        }
                    }
                ],
                default: []
            }
        },
        reviewStatus: {
            type: String,
            enum: ["not-reviewed", "reviewed"],
            default: "not-reviewed"
        },
        returnStatus: {
            type: String,
            enum: ["none", "requested", "approved", "rejected", "completed"],
            default: "none"
        },
        cancellationStatus: {
            type: String,
            enum: ["none", "requested", "approved", "rejected"],
            default: "none"
        },
        cancellationReason: {
            type: String,
            default: ""
        },
        returnReason: {
            type: String,
            default: ""
        },
        customerFeedback: {
            type: [
                {
                    message: {
                        type: String,
                        required: true
                    },
                    date: {
                        type: Date,
                        default: Date.now
                    },
                    isAdmin: {
                        type: Boolean,
                        default: false
                    }
                }
            ],
            default: []
        },
        date : {
            type : Date,
            default : Date.now
        }
        ,
        // Whether admin has seen notifications related to this order (e.g., delivered, return, cancellation)
        notificationSeen: {
            type: Boolean,
            default: false
        }
    }
)

const Order = mongoose.model("Order", orderSchema)
export default Order