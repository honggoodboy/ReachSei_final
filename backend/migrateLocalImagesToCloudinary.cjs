require("dotenv").config();
const { Pool } = require("pg");
const cloudinary = require("cloudinary").v2;
const path = require("path");
const fs = require("fs");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function migrateImages() {
  try {
    const result = await pool.query(`
      SELECT id, name, image
      FROM products
      WHERE image LIKE '%localhost%'
    `);

    const products = result.rows;

    console.log(`Found ${products.length} products with localhost images.`);

    for (const product of products) {
      try {
        const oldImageUrl = product.image;
        const filename = oldImageUrl.split("/").pop();

        const localImagePath = path.join(
          __dirname,
          "uploads",
          "products",
          filename
        );

        if (!fs.existsSync(localImagePath)) {
          console.log(`Missing file for product ID ${product.id}: ${filename}`);
          continue;
        }

        const uploadResult = await cloudinary.uploader.upload(localImagePath, {
          folder: "reachsei/products",
        });

        const newImageUrl = uploadResult.secure_url;

        await pool.query(
          `
          UPDATE products
          SET image = $1
          WHERE id = $2
          `,
          [newImageUrl, product.id]
        );

        console.log(`Updated product ID ${product.id}: ${product.name}`);
        console.log(newImageUrl);
      } catch (error) {
        console.log(`Failed product ID ${product.id}`);
        console.error(error.message);
      }
    }

    console.log("Migration finished.");
  } catch (error) {
    console.error("Migration error:", error);
  } finally {
    await pool.end();
  }
}

migrateImages();