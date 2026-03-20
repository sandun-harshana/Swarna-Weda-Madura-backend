import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        email : {
            type : String,
            required : true,
            unique : true
        },
        firstName : {
            type : String,
            required : true
        },
        lastName : {
            type : String,
            required : true
        },
        password : {
            type : String,
            required : true
        },
        role : {
            type : String,
            required : true,
            default : "user"
        },
        isBlock: {
            type : Boolean,
            default : false
        },
        isEmailVerified:{
            type : Boolean,
            default : false
        },
        image : {
            type : String,
            default : "/user.png"
        },
        phone : {
            type : String,
            default : ""
        },
        address : {
            type : String,
            default : ""
        },
        points : {
            type : Number,
            default : 0
        },
        membershipTier : {
            type : String,
            enum: ["Bronze", "Silver", "Gold", "Diamond"],
            default : "Bronze"
        },
        wishlist : [
            {
                productId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "Product",
                    required: true
                },
                addedAt: {
                    type: Date,
                    default: Date.now
                }
            }
        ]
    }
)

const User = mongoose.model("User",userSchema)
export default User