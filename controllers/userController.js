import axios from "axios";
import User from "../models/user.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import OTP from "../models/otpModel.js";
import getDesignedEmail from "../lib/emailDesigner.js";

dotenv.config();

const transporter = nodemailer.createTransport({
	service: "gmail",
	host: "smtp.gmail.com",
	port: 587,
	secure: false,
	auth: {
		user: process.env.EMAIL_USER,
		pass: process.env.APP_PASSWORD,
	},
});

async function sendEmailVerificationOTP(email, firstName) {
	const otp = Math.floor(100000 + Math.random() * 900000).toString();

	await OTP.deleteMany({ email });

	const newOTP = new OTP({
		email,
		otp,
	});
	await newOTP.save();

	await transporter.sendMail({
		from: process.env.EMAIL_USER,
		to: email,
		subject: "Verify your email address",
		text: `Hi ${firstName}, your verification code is ${otp}. It is valid for 10 minutes.`,
		html: getDesignedEmail({
			otp,
			firstName,
			brandName: "Swarna Weda Madura",
			supportEmail: process.env.EMAIL_USER,
			colors: { accent: "#2f7d4d", primary: "#f4f8ef", secondary: "#1f2937" },
			preheader: `Your email verification code is ${otp}.`,
		}),
	});
}

export function createUser(req, res) {
	const email = req.body.email?.trim().toLowerCase();
	const firstName = req.body.firstName?.trim();
	const lastName = req.body.lastName?.trim();
	const password = req.body.password;

	if (!email || !firstName || !lastName || !password) {
		res.status(400).json({
			message: "All fields are required",
		});
		return;
	}

	if (password.length < 6) {
		res.status(400).json({
			message: "Password must be at least 6 characters long",
		});
		return;
	}

	const hashedPassword = bcrypt.hashSync(password, 10);

	const user = new User({
		email,
		firstName,
		lastName,
		password: hashedPassword,
	});

	user
		.save()
		.then(async () => {
			try {
				await sendEmailVerificationOTP(email, firstName);
			} catch (mailErr) {
				console.log("Failed to send verification OTP:", mailErr);
				res.status(500).json({
					message: "User created but failed to send verification OTP",
				});
				return;
			}

			res.status(201).json({
				message: "User created successfully. OTP sent to your email.",
			});
		})
		.catch((e) => {
			if (e?.code === 11000) {
				res.status(409).json({
					message: "User already exists with this email",
				});
				return;
			}

			console.log(e);
			res.status(500).json({
				message: "Failed to create user",
			});
		});
}

export function loginUser(req, res) {
	User.findOne({
		email: req.body.email,
	}).then((user) => {
		if (user == null) {
			res.status(404).json({
				message: "User not found",
			});
		} else {
			if (user.isBlock) {
				res.status(403).json({
					message: "Your account has been blocked. Please contact admin.",
				});
				return;
			}

			if (!user.isEmailVerified) {
				res.status(403).json({
					message: "Please verify your email before logging in.",
				});
				return;
			}

			const isPasswordMatching = bcrypt.compareSync(
				req.body.password,
				user.password
			);
			if (isPasswordMatching) {
				const token = jwt.sign(
					{
						email: user.email,
						firstName: user.firstName,
						lastName: user.lastName,
						role: user.role,
						isEmailVerified: user.isEmailVerified,
						image: user.image,
					},
					process.env.JWT_SECRET
				);

				res.json({
					message: "Login successful",
					token: token,
					user: {
						email: user.email,
						firstName: user.firstName,
						lastName: user.lastName,
						role: user.role,
						isEmailVerified: user.isEmailVerified,
					},
				});
			} else {
				res.status(401).json({
					message: "Invalid password",
				});
			}
		}
	}).catch((err) => {
		console.error("Login error:", err);
		res.status(500).json({
			message: "Internal server error during login",
		});
	});
}

export function isAdmin(req) {
	if (req.user == null) {
		return false;
	}
	if (req.user.role != "admin") {
		return false;
	}

	return true;
}

export function isCustomer(req) {
	if (req.user == null) {
		return false;
	}
	if (req.user.role != "user") {
		return false;
	}

	return true;
}

export function getUser(req, res) {
	if (req.user == null) {
		res.status(401).json({
			message: "Unauthorized",
		});
		return;
	} else {
		res.json(req.user);
	}
}

export async function verifyEmailOTP(req, res) {
	const email = req.body.email?.trim().toLowerCase();
	const otp = req.body.otp?.trim();

	if (!email || !otp) {
		res.status(400).json({
			message: "Email and OTP are required",
		});
		return;
	}

	try {
		const user = await User.findOne({ email });
		if (!user) {
			res.status(404).json({
				message: "User not found",
			});
			return;
		}

		const otpRecord = await OTP.findOne({ email, otp });
		if (!otpRecord) {
			res.status(400).json({
				message: "Invalid OTP",
			});
			return;
		}

		await User.updateOne({ email }, { isEmailVerified: true });
		await OTP.deleteMany({ email });

		res.json({
			message: "Email verified successfully",
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({
			message: "Failed to verify email",
		});
	}
}

export async function resendVerificationOTP(req, res) {
	const email = req.body.email?.trim().toLowerCase();

	if (!email) {
		res.status(400).json({
			message: "Email is required",
		});
		return;
	}

	try {
		const user = await User.findOne({ email });
		if (!user) {
			res.status(404).json({
				message: "User not found",
			});
			return;
		}

		if (user.isEmailVerified) {
			res.status(400).json({
				message: "Email already verified",
			});
			return;
		}

		await sendEmailVerificationOTP(email, user.firstName || "there");

		res.json({
			message: "Verification OTP sent successfully",
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({
			message: "Failed to resend verification OTP",
		});
	}
}

export async function googleLogin(req, res) {
	const token = req.body.token;

	if (token == null) {
		console.error("Google login: Token is missing");
		res.status(400).json({
			message: "Token is required",
		});
		return;
	}
	try {
		console.log("Google login: Fetching user info from Google...");
		const googleResponse = await axios.get(
			"https://www.googleapis.com/oauth2/v3/userinfo",
			{
				headers: {
					Authorization: `Bearer ${token}`,
				},
			}
		);

		const googleUser = googleResponse.data;
		console.log("Google login: User info received:", googleUser.email);

		const user = await User.findOne({
			email: googleUser.email,
		});

		if (user == null) {
			console.log("Google login: Creating new user");
			const fullName = typeof googleUser.name === "string" ? googleUser.name.trim() : "";
			const fullNameParts = fullName ? fullName.split(/\s+/) : [];
			const safeFirstName =
				googleUser.given_name ||
				fullNameParts[0] ||
				"Google";
			const safeLastName =
				googleUser.family_name ||
				(fullNameParts.length > 1 ? fullNameParts.slice(1).join(" ") : "User");

			const newUser = new User({
				email: googleUser.email,
				firstName: safeFirstName,
				lastName: safeLastName,
				password: bcrypt.hashSync(Math.random().toString(36).slice(-8), 10),
				isEmailVerified: googleUser.email_verified ?? true,
				image: googleUser.picture || "",
			});

			let savedUser = await newUser.save();
			console.log("Google login: New user created successfully");

			const jwtToken = jwt.sign(
				{
					email: savedUser.email,
					firstName: savedUser.firstName,
					lastName: savedUser.lastName,
					role: savedUser.role,
					isEmailVerified: savedUser.isEmailVerified,
					image: savedUser.image,
				},
				process.env.JWT_SECRET
			);
			res.json({
				message: "Login successful",
				token: jwtToken,
				user: {
					email: savedUser.email,
					firstName: savedUser.firstName,
					lastName: savedUser.lastName,
					role: savedUser.role,
					isEmailVerified: savedUser.isEmailVerified,
					image: savedUser.image,
				},
			});
			return;
		} else {
			//login the user
			console.log("Google login: Existing user found");
			if (user.isBlock) {
				console.log("Google login: User is blocked");
				res.status(403).json({
					message: "Your account has been blocked. Please contact admin.",
				});
				return;
			}
			
			// Update user image if changed
			if (googleUser.picture && user.image !== googleUser.picture) {
				user.image = googleUser.picture;
				await user.save();
			}
			
			const jwtToken = jwt.sign(
				{
					email: user.email,
					firstName: user.firstName,
					lastName: user.lastName,
					role: user.role,
					isEmailVerified: user.isEmailVerified,
					image: user.image,
				},
				process.env.JWT_SECRET
			);
			console.log("Google login: Login successful");
			res.json({
				message: "Login successful",
				token: jwtToken,
				user: {
					email: user.email,
					firstName: user.firstName,
					lastName: user.lastName,
					role: user.role,
					isEmailVerified: user.isEmailVerified,
					image: user.image,
				},
			});
			return;
		}
	} catch (err) {
		console.error("Google login error:", err);
		console.error("Error details:", err.response?.data || err.message);
		const statusCode = err.response?.status || 500;
		res.status(statusCode).json({
			message: err.response?.data?.error_description || err.response?.data?.message || "Failed to login with google",
			error: err.message,
		});
		return;
	}
}

export async function getAllUsers(req, res) {
	if (!isAdmin(req)) {
		res.status(403).json({
			message: "Forbidden",
		});
		return;
	}
	try {
		const users = await User.find();
		res.json(users);
	} catch (err) {
		res.status(500).json({
			message: "Failed to get users",
		});
	}
}

export async function blockOrUnblockUser(req, res) {
	console.log(req.user);
	if (!isAdmin(req)) {
		res.status(403).json({
			message: "Forbidden",
		});
		return;
	}

	if (req.user.email === req.params.email) {
		res.status(400).json({
			message: "You cannot block yourself",
		});
		return;
	}

	try {
		await User.updateOne(
			{
				email: req.params.email,
			},
			{
				isBlock: req.body.isBlock,
			}
		);

		res.json({
			message: "User block status updated successfully",
		});
	} catch (err) {
		res.status(500).json({
			message: "Failed to block/unblock user",
		});
	}
}

export async function sendOTP(req, res) {
	const email = req.params.email;
	if (email == null) {
		res.status(400).json({
			message: "Email is required",
		});
		return;
	}

	// 100000 - 999999
	const otp = Math.floor(100000 + Math.random() * 900000);

	try {
		const user = await User.findOne({ email: email });

		const firstName = user ? user.firstName : "there";

		if (user == null) {
			res.status(404).json({
				message: "User not found",
			});
			return;
		}

		await OTP.deleteMany({
			email: email,
		});

		const newOTP = new OTP({
			email: email,
			otp: otp,
		});
		await newOTP.save();

		

		await transporter.sendMail({
			from: process.env.EMAIL_USER,
			to: email,
			subject: "Your OTP for Password Reset",
			text: `Hi! Your one-time passcode is ${otp}. It’s valid for 10 minutes. If you didn’t request this, ignore this email. — ${
				"Glimora Beauty Glow"
			}`,
			html: getDesignedEmail({
				otp,
				firstName,
				brandName: "Glimora Beauty Glow",
				supportEmail: "support@gbg.com",
				colors: { accent: "#fa812f", primary: "#fef3e2", secondary: "#393e46" },
			}),
		});

		res.json({
			message: "OTP sent to your email",
		});
	} catch (err) {
		console.error(err);
		res.status(500).json({
			message: "Failed to send OTP",
		});
	}
}

export async function changePasswordViaOTP(req, res) {
	const email = req.body.email;
	const otp = req.body.otp;
	const newPassword = req.body.newPassword;
	try {
		const otpRecord = await OTP.findOne({
			email: email,
			otp: otp,
		});

		if (otpRecord == null) {
			res.status(400).json({
				message: "Invalid OTP",
			});
			return;
		}

		await OTP.deleteMany({
			email: email,
		});

		const hashedPassword = bcrypt.hashSync(newPassword, 10);

		await User.updateOne(
			{
				email: email,
			},
			{
				password: hashedPassword,
			}
		);
		res.json({
			message: "Password changed successfully",
		});
	} catch (err) {
		res.status(500).json({
			message: "Failed to change password",
		});
	}
}

export async function updatePassword(req, res) {
	if (!req.user) {
		res.status(401).json({
			message: "Unauthorized",
		});
		return;
	}

	const { currentPassword, password } = req.body;

	if (!password || password.trim().length < 6) {
		res.status(400).json({
			message: "Password must be at least 6 characters long",
		});
		return;
	}

	try {
		// Get user with password field
		const user = await User.findOne({ email: req.user.email });

		// If currentPassword is provided, verify it
		if (currentPassword) {
			const isPasswordMatching = bcrypt.compareSync(
				currentPassword,
				user.password
			);
			if (!isPasswordMatching) {
				res.status(400).json({
					message: "Current password is incorrect",
				});
				return;
			}
		}

		const hashedPassword = bcrypt.hashSync(password, 10);

		await User.updateOne(
			{
				email: req.user.email,
			},
			{
				password: hashedPassword,
			}
		);

		res.json({
			message: "Password updated successfully",
		});
	} catch (err) {
		res.status(500).json({
			message: "Failed to update password",
		});
	}
}

export async function updateUserProfile(req, res) {
	if (!req.user) {
		res.status(401).json({
			message: "Unauthorized",
		});
		return;
	}

	const { firstName, lastName, image, phone, address } = req.body;

	try {
		const updateData = {};
		if (firstName) updateData.firstName = firstName;
		if (lastName) updateData.lastName = lastName;
		if (image) updateData.image = image;
		if (phone !== undefined) updateData.phone = phone;
		if (address !== undefined) updateData.address = address;

		const updatedUser = await User.findOneAndUpdate(
			{
				email: req.user.email,
			},
			updateData,
			{ new: true }
		);

		// Generate new token with updated info
		const newToken = jwt.sign(
			{
				email: updatedUser.email,
				firstName: updatedUser.firstName,
				lastName: updatedUser.lastName,
				role: updatedUser.role,
				isEmailVerified: updatedUser.isEmailVerified,
				image: updatedUser.image,
			},
			process.env.JWT_SECRET
		);

		res.json({
			message: "Profile updated successfully",
			token: newToken,
			user: {
				email: updatedUser.email,
				firstName: updatedUser.firstName,
				lastName: updatedUser.lastName,
				role: updatedUser.role,
				isEmailVerified: updatedUser.isEmailVerified,
				image: updatedUser.image,
				phone: updatedUser.phone,
				address: updatedUser.address,
			}
		});
	} catch (err) {
		res.status(500).json({
			message: "Failed to update profile",
		});
	}
}

export async function getMembershipInfo(req, res) {
	try {
		if (req.user == null) {
			return res.status(401).json({
				message: "Unauthorized",
			});
		}

		const user = await User.findOne({ email: req.user.email });
		
		if (!user) {
			return res.status(404).json({
				message: "User not found",
			});
		}

		// Calculate membership tier based on points
		let membershipTier = "Bronze";
		if (user.points >= 1000) {
			membershipTier = "Diamond";
		} else if (user.points >= 500) {
			membershipTier = "Gold";
		} else if (user.points >= 200) {
			membershipTier = "Silver";
		}

		// Update tier if changed
		if (user.membershipTier !== membershipTier) {
			await User.updateOne(
				{ email: user.email },
				{ membershipTier: membershipTier }
			);
		}

		// Calculate discount rate
		const discountRates = {
			Bronze: 0,
			Silver: 5,
			Gold: 10,
			Diamond: 15
		};

		res.json({
			points: user.points,
			membershipTier: membershipTier,
			discountRate: discountRates[membershipTier],
			nextTier: membershipTier === "Diamond" ? null : 
					  membershipTier === "Gold" ? "Diamond" :
					  membershipTier === "Silver" ? "Gold" : "Silver",
			pointsToNextTier: membershipTier === "Diamond" ? 0 :
							  membershipTier === "Gold" ? 1000 - user.points :
							  membershipTier === "Silver" ? 500 - user.points : 200 - user.points
		});
	} catch (err) {
		console.error("Error getting membership info:", err);
		res.status(500).json({
			message: "Failed to get membership info",
		});
	}
}
