import User from "../models/user.js";
import Product from "../models/product.js";

// Add product to wishlist
export const addToWishlist = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.user.id;

        // Check if product exists
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Check if product is already in wishlist
        const user = await User.findById(userId);
        const isAlreadyInWishlist = user.wishlist.some(
            (item) => item.productId.toString() === productId
        );

        if (isAlreadyInWishlist) {
            return res.status(400).json({ message: "Product already in wishlist" });
        }

        // Add to wishlist
        user.wishlist.push({ productId, addedAt: new Date() });
        await user.save();

        res.status(200).json({
            message: "Product added to wishlist",
            wishlist: user.wishlist
        });
    } catch (error) {
        console.error("Error adding to wishlist:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Remove product from wishlist
export const removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user.id;

        const user = await User.findById(userId);
        user.wishlist = user.wishlist.filter(
            (item) => item.productId.toString() !== productId
        );
        await user.save();

        res.status(200).json({
            message: "Product removed from wishlist",
            wishlist: user.wishlist
        });
    } catch (error) {
        console.error("Error removing from wishlist:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Get user's wishlist
export const getWishlist = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId).populate({
            path: "wishlist.productId",
            select: "name description price images stock category"
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Filter out any null products (in case product was deleted)
        const validWishlist = user.wishlist.filter(item => item.productId !== null);

        res.status(200).json({
            wishlist: validWishlist
        });
    } catch (error) {
        console.error("Error getting wishlist:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Clear entire wishlist
export const clearWishlist = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId);
        user.wishlist = [];
        await user.save();

        res.status(200).json({
            message: "Wishlist cleared"
        });
    } catch (error) {
        console.error("Error clearing wishlist:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Admin: Get all users' wishlists
export const getAllWishlists = async (req, res) => {
    try {
        const users = await User.find({ wishlist: { $exists: true, $ne: [] } })
            .select("firstName lastName email wishlist")
            .populate({
                path: "wishlist.productId",
                select: "name price images stock"
            });

        // Filter out users with empty wishlists and format the data
        const wishlistData = users
            .filter(user => user.wishlist.length > 0)
            .map(user => ({
                userId: user._id,
                userName: `${user.firstName} ${user.lastName}`,
                email: user.email,
                wishlist: user.wishlist.filter(item => item.productId !== null),
                itemCount: user.wishlist.filter(item => item.productId !== null).length
            }));

        res.status(200).json({
            count: wishlistData.length,
            wishlists: wishlistData
        });
    } catch (error) {
        console.error("Error getting all wishlists:", error);
        res.status(500).json({ message: "Server error" });
    }
};

// Admin: Get wishlist statistics
export const getWishlistStats = async (req, res) => {
    try {
        const users = await User.find().select("wishlist").populate("wishlist.productId");

        const totalUsersWithWishlist = users.filter(u => u.wishlist.length > 0).length;
        const totalWishlistItems = users.reduce((sum, u) => sum + u.wishlist.length, 0);

        // Count most wishlisted products
        const productCount = {};
        users.forEach(user => {
            user.wishlist.forEach(item => {
                if (item.productId) {
                    const productId = item.productId._id.toString();
                    productCount[productId] = (productCount[productId] || 0) + 1;
                }
            });
        });

        // Get top 10 most wishlisted products
        const topProducts = await Promise.all(
            Object.entries(productCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(async ([productId, count]) => {
                    const product = await Product.findById(productId).select("name price images");
                    return {
                        product,
                        wishlistCount: count
                    };
                })
        );

        res.status(200).json({
            totalUsersWithWishlist,
            totalWishlistItems,
            averageItemsPerUser: totalUsersWithWishlist > 0 
                ? (totalWishlistItems / totalUsersWithWishlist).toFixed(2) 
                : 0,
            topProducts
        });
    } catch (error) {
        console.error("Error getting wishlist stats:", error);
        res.status(500).json({ message: "Server error" });
    }
};
