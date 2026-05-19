import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const productImageStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "reachsei/products",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

export const paymentProofStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "reachsei/payment-proofs",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
  },
});

export default cloudinary;