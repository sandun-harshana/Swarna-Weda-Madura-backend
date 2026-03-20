import express from 'express';
import { blockOrUnblockUser, changePasswordViaOTP, createUser, getAllUsers, getMembershipInfo, getUser, googleLogin, loginUser, resendVerificationOTP, sendOTP, updatePassword, updateUserProfile, verifyEmailOTP } from '../controllers/userController.js';


const userRouter = express.Router();

userRouter.post("/",createUser)
userRouter.post("/login",loginUser)
userRouter.get("/me",getUser)
userRouter.get("/membership", getMembershipInfo)
userRouter.put("/me", updateUserProfile)
userRouter.post("/google-login",googleLogin)
userRouter.get("/all-users", getAllUsers)
userRouter.put("/block/:email",blockOrUnblockUser)
userRouter.get("/send-otp/:email",sendOTP)
userRouter.post("/change-password/",changePasswordViaOTP)
userRouter.post("/verify-email",verifyEmailOTP)
userRouter.post("/resend-verification-otp",resendVerificationOTP)
userRouter.put("/me/password", updatePassword)

export default userRouter;