import Product from "../models/product.js";
import { isAdmin } from "./userController.js";

export async function createProduct(req, res) {
    
    if(!isAdmin(req)){
        res.status(403).json({
            message: "You are not authorized to create a product"
        });
        return;
    }

	try {
        const {
            productID,
            name,
            altNames,
            description,
            images,
            price,
            labelledPrice,
            category,
            stock,
        } = req.body;

        if (
            !productID ||
            !name ||
            !description ||
            !category ||
            !Array.isArray(images) ||
            images.length === 0
        ) {
            res.status(400).json({
                message: "Missing required product fields",
            });
            return;
        }

        const existing = await Product.findOne({ productID: productID.trim() });
        if (existing) {
            res.status(409).json({
                message: "Product ID already exists",
            });
            return;
        }

        const parsedPrice = Number(price);
        const parsedLabelledPrice = Number(labelledPrice);
        const parsedStock = Number(stock);

        if (
            Number.isNaN(parsedPrice) ||
            Number.isNaN(parsedLabelledPrice) ||
            Number.isNaN(parsedStock)
        ) {
            res.status(400).json({
                message: "Price, labelledPrice, and stock must be valid numbers",
            });
            return;
        }

        const normalizedAltNames = Array.isArray(altNames)
            ? altNames.map((value) => String(value).trim()).filter(Boolean)
            : [];

        const productData = {
            productID: productID.trim(),
            name: name.trim(),
            altNames: normalizedAltNames,
            description: description.trim(),
            images,
            price: parsedPrice,
            labelledPrice: parsedLabelledPrice,
            category: category.trim(),
            stock: parsedStock,
        };

		const product = new Product(productData);

		await product.save();

		res.json({
			message: "Product created successfully",
			product: product,
		});
        
	} catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Failed to create product",
        });
	}
}

export async function getProducts(req,res){
    console.log("Fetching all products");
    try {        
        const products = await Product.find()
        res.json(products);
    } catch (err) {
        console.error(err);
        res.status(500).json({
            message: "Failed to retrieve products",
        });
    }
}

export async function deleteProduct(req,res){
    if(!isAdmin(req)){
        res.status(403).json({
            message: "You are not authorized to delete a product"
        });
        return;
    }
    try{

        const productID = req.params.productID
        

        await Product.deleteOne({
            productID : productID
        })

        res.json({
            message: "Product deleted successfully"
        });
    }catch(err){
        console.error(err);
        res.status(500).json({
            message: "Failed to delete product",
        });
    }
}

export async function updateProduct(req,res){
    if(!isAdmin(req)){
        res.status(403).json({
            message: "You are not authorized to update a product"
        });
        return;
    }

    try{
        const productID = req.params.productID;

        const updatedData = req.body;

        await Product.updateOne(
            {productID : productID},
            updatedData
        );

        res.json({
            message: "Product updated successfully"
        });
    }catch(err){
        console.error(err);
        res.status(500).json({
            message: "Failed to update product",
        });
    }
}

export async function getProductId(req,res){
    try{
        const productID = req.params.productID;

        const product = await Product.findOne(
            {
                productID : productID
            }
        )
        if(product == null){
            res.status(404).json({
                message: "Product not found"
            });
        }else{
            res.json(product);
        }
    }catch(err){
        console.error(err);
        res.status(500).json({
            message: "Failed to retrieve product by ID",
        });
    }
}
