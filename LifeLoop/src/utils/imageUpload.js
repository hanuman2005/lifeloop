// src/utils/imageUpload.js - Cloudinary Image Upload Utility

import Constants from "expo-constants";

const CLOUDINARY_CLOUD_NAME =
  Constants.expoConfig?.extra?.CLOUDINARY_CLOUD_NAME ||
  process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;

const CLOUDINARY_UPLOAD_PRESET =
  Constants.expoConfig?.extra?.CLOUDINARY_UPLOAD_PRESET ||
  process.env.EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const CLOUDINARY_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

/**
 * Upload image to Cloudinary
 * @param {string} imageUri - Local image URI from expo-image-picker
 * @param {string} tags - Optional tags for the image (e.g., "waste_analysis,plastic")
 * @returns {Promise<string>} - Returns image URL from Cloudinary
 */
export const uploadImageToCloudinary = async (
  imageUri,
  tags = "waste_analysis",
) => {
  try {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_UPLOAD_PRESET) {
      console.warn("⚠️ Cloudinary credentials not configured");
      return null;
    }

    const filename = imageUri.split("/").pop();
    const ext = filename.substring(filename.lastIndexOf("."));
    const name = filename.replace(ext, "");

    const formData = new FormData();
    formData.append("file", {
      uri: imageUri,
      name: name,
      type: "image/jpeg",
    });
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
    formData.append(
      "public_id",
      `lifeloop/${Date.now()}-${Math.random().toString(36).substring(7)}`,
    );
    formData.append("tags", tags);
    formData.append("context", "alt=waste_analysis");

    console.log("📤 Uploading image to Cloudinary...");
    const response = await fetch(CLOUDINARY_URL, {
      method: "POST",
      body: formData,
      timeout: 30000,
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }

    const data = await response.json();

    if (data.secure_url) {
      console.log("✅ Image uploaded successfully:", data.secure_url);
      return data.secure_url;
    } else {
      console.warn("⚠️ No URL in response:", data);
      return null;
    }
  } catch (error) {
    console.error("❌ Image upload error:", error);
    return null;
  }
};

/**
 * Upload multiple images to Cloudinary
 * @param {Array} imageUris - Array of local image URIs
 * @param {string} tags - Optional tags for images
 * @returns {Promise<Array>} - Array of uploaded image URLs (or null for failed uploads)
 */
export const uploadMultipleImages = async (
  imageUris,
  tags = "waste_analysis",
) => {
  try {
    const uploadPromises = imageUris.map((uri) =>
      uploadImageToCloudinary(uri, tags),
    );
    const results = await Promise.all(uploadPromises);
    return results.filter((url) => url !== null); // Filter out failed uploads
  } catch (error) {
    console.error("❌ Multiple upload error:", error);
    return [];
  }
};

/**
 * Upload and get primary image
 * (used for analysis - only uploads the first/main image)
 * @param {string} imageUri - Local image URI
 * @returns {Promise<string|null>} - Image URL or null
 */
export const uploadPrimaryImage = async (imageUri) => {
  return uploadImageToCloudinary(imageUri, "waste_analysis_primary");
};
