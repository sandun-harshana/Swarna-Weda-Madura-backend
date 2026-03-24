import express from 'express';
import { blockOrUnblockUser, changePasswordViaOTP, createUser, getAllUsers, getMembershipInfo, getUser, googleLogin, loginUser, resendVerificationOTP, sendOTP, updatePassword, updateUserProfile, updateUserRole, verifyEmailOTP } from '../controllers/userController.js';
import { authenticate, isAdmin } from '../middleware/auth.js';


const userRouter = express.Router();

userRouter.post("/",createUser)
userRouter.post("/login",loginUser)
userRouter.get("/me",getUser)
userRouter.get("/membership", getMembershipInfo)
userRouter.put("/me", updateUserProfile)
userRouter.post("/google-login",googleLogin)
userRouter.get("/all-users", getAllUsers)
userRouter.put("/block/:email",blockOrUnblockUser)
userRouter.put("/role/:email", updateUserRole)
userRouter.get("/send-otp/:email",sendOTP)
userRouter.post("/change-password/",changePasswordViaOTP)
userRouter.post("/verify-email",verifyEmailOTP)
userRouter.post("/resend-verification-otp",resendVerificationOTP)
userRouter.put("/me/password", updatePassword)
userRouter.get("/admin/ping", authenticate, isAdmin, (req, res) => {
	res.json({
		message: "Admin access granted",
		email: req.user.email,
		role: req.user.role,
	});
})

export default userRouter;