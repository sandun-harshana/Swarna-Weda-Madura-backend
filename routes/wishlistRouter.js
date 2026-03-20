import express from "express";
import { 
    addToWishlist, 
    removeFromWishlist, 
    getWishlist, 
    clearWishlist,
    getAllWishlists,
    getWishlistStats
} from "../controllers/wishlistController.js";
import { authenticate, isAdmin } from "../middleware/auth.js";

const wishlistRouter = express.Router();

// User routes (require authentication)
wishlistRouter.post("/", authenticate, addToWishlist);
wishlistRouter.get("/", authenticate, getWishlist);
wishlistRouter.delete("/:productId", authenticate, removeFromWishlist);
wishlistRouter.delete("/", authenticate, clearWishlist);

// Admin routes (require authentication + admin role)
wishlistRouter.get("/admin/all", authenticate, isAdmin, getAllWishlists);
wishlistRouter.get("/admin/stats", authenticate, isAdmin, getWishlistStats);

export default wishlistRouter;
