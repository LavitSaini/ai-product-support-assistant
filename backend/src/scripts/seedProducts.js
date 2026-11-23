import dotenv from "dotenv";
import mongoose from "mongoose";
import connectDB from "../config/db.js";
import Product from "../models/Product.model.js";

dotenv.config();

const products = [
  {
    name: "LG 7 Kg Front Load Washing Machine",
    brand: "LG",
    modelNumber: "FHM1207SDL",
    category: "washing_machine",
    description:
      "LG 7 Kg front load washing machine featuring Inverter Direct Drive technology. This product is supported by the AI Product Support Assistant using its official product documentation.",
    features: ["Inverter Direct Drive", "Front Load", "7 Kg Capacity"],
    specifications: {
      capacity: "7 kg",
      loadType: "Front Load",
      motorType: "Inverter Direct Drive",
    },
    imageUrl: "",
    isActive: true,
  },
  {
    name: "Samsung 7 Kg Front Load Washing Machine",
    brand: "Samsung",
    modelNumber: "WW70T4020CX/TL",
    category: "washing_machine",
    description:
      "Samsung 7 Kg front load washing machine featuring Hygiene Steam. This product is supported by the AI Product Support Assistant using its official product documentation.",
    features: ["Hygiene Steam", "Front Load", "7 Kg Capacity"],
    specifications: {
      capacity: "7 kg",
      loadType: "Front Load",
      feature: "Hygiene Steam",
    },
    images: "",
    isActive: true,
  },
];

const seedProducts = async () => {
  try {
    await connectDB(process.env.MONGODB_URI);

    for (const product of products) {
      await Product.updateOne(
        { modelNumber: product.modelNumber },
        { $set: product },
        { upsert: true },
      );

      console.log(`Seeded: ${product.modelNumber}`);
    }

    console.log("Product seeding completed successfully.");
  } catch (error) {
    console.error("Product seeding failed:", error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
};

seedProducts();
