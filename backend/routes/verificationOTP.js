// backend/routes/verificationOTP.js - OTP Verification Routes
// ============================================
// Auto-verify Email & Phone via OTP
// ============================================

const express = require("express");
const router = express.Router();
const verificationOTPController = require("../controllers/verificationOTPController");

/**
 * EMAIL OTP ENDPOINTS
 */
// Send OTP to email
router.post("/email-send-otp", verificationOTPController.sendEmailOTP);

// Verify email with OTP
router.post("/email-verify-otp", verificationOTPController.verifyEmailOTP);

/**
 * PHONE OTP ENDPOINTS
 */
// Send OTP to phone
router.post("/phone-send-otp", verificationOTPController.sendPhoneOTP);

// Verify phone with OTP
router.post("/phone-verify-otp", verificationOTPController.verifyPhoneOTP);

/**
 * STATUS ENDPOINTS
 */
// Get verification status
router.get("/status/:userId", verificationOTPController.getVerificationStatus);

module.exports = router;
