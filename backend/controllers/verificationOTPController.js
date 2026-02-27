// backend/controllers/verificationOTPController.js - OTP Verification
// ============================================
// Auto-verify Email & Phone via OTP
// ============================================

const User = require("../models/User");
const emailService = require("../services/emailService");
const smsService = require("../services/smsService");

// ═════════════════════════════════════════════════════════════════════════════
// UTILS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Generate 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Get OTP expiration time (10 minutes from now)
 */
const getOTPExpiration = () => {
  return new Date(Date.now() + 10 * 60 * 1000);
};

/**
 * Check if OTP is expired
 */
const isOTPExpired = (expiresAt) => {
  return !expiresAt || new Date() > expiresAt;
};

// ═════════════════════════════════════════════════════════════════════════════
// EMAIL OTP VERIFICATION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Send OTP to user's email
 * POST /api/verify/email-send-otp
 */
exports.sendEmailOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = getOTPExpiration();

    // Save OTP to user
    user.emailOTP = { code: otp, expiresAt };
    await user.save();

    // Send email
    const emailResult = await emailService.sendEmail({
      to: email,
      subject: "LifeLoop Email Verification - Your OTP",
      html: `
        <div style="font-family: Arial; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification</h2>
          <p>Hi ${user.firstName},</p>
          <p>Your OTP for email verification is:</p>
          <h1 style="color: #4ade80; letter-spacing: 5px; font-size: 28px;">${otp}</h1>
          <p>This code expires in <strong>10 minutes</strong>.</p>
          <p>Do not share this code with anyone.</p>
          <hr />
          <p style="color: #999; font-size: 12px;">LifeLoop © 2026</p>
        </div>
      `,
    });

    if (!emailResult.success) {
      return res.status(500).json({ message: "Failed to send OTP email" });
    }

    res.json({
      success: true,
      message: "OTP sent to your email",
      expiresIn: 600, // 10 minutes in seconds
    });
  } catch (error) {
    console.error("Error sending email OTP:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Verify email OTP
 * POST /api/verify/email-verify-otp
 */
exports.verifyEmailOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP required" });
    }

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if already verified
    if (user.emailVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    // Check if OTP exists
    if (!user.emailOTP || !user.emailOTP.code) {
      return res
        .status(400)
        .json({ message: "No OTP found. Request a new one." });
    }

    // Check if expired
    if (isOTPExpired(user.emailOTP.expiresAt)) {
      return res
        .status(400)
        .json({ message: "OTP expired. Request a new one." });
    }

    // Check if OTP matches
    if (user.emailOTP.code !== otp.toString()) {
      return res.status(400).json({ message: "Incorrect OTP" });
    }

    // Mark email as verified
    user.emailVerified = true;
    user.emailOTP = { code: null, expiresAt: null };
    await user.save();

    res.json({
      success: true,
      message: "Email verified successfully",
      emailVerified: true,
    });
  } catch (error) {
    console.error("Error verifying email OTP:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// PHONE OTP VERIFICATION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Send OTP to user's phone
 * POST /api/verify/phone-send-otp
 */
exports.sendPhoneOTP = async (req, res) => {
  try {
    const { phone, userId } = req.body;

    if (!phone || !userId) {
      return res.status(400).json({ message: "Phone and userId required" });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if already verified
    if (user.phoneVerified) {
      return res.status(400).json({ message: "Phone already verified" });
    }

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = getOTPExpiration();

    // Save OTP to user
    user.phoneNumber = phone;
    user.phoneOTP = { code: otp, expiresAt };
    await user.save();

    // Send SMS
    const smsResult = await smsService.sendSMS(
      phone,
      `Your LifeLoop verification code is: ${otp}. Valid for 10 minutes. Do not share this code.`,
    );

    if (!smsResult.success && !smsResult.mock) {
      return res.status(500).json({ message: "Failed to send OTP SMS" });
    }

    res.json({
      success: true,
      message: "OTP sent to your phone",
      expiresIn: 600, // 10 minutes in seconds
    });
  } catch (error) {
    console.error("Error sending phone OTP:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

/**
 * Verify phone OTP
 * POST /api/verify/phone-verify-otp
 */
exports.verifyPhoneOTP = async (req, res) => {
  try {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({ message: "UserId and OTP required" });
    }

    // Find user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if already verified
    if (user.phoneVerified) {
      return res.status(400).json({ message: "Phone already verified" });
    }

    // Check if OTP exists
    if (!user.phoneOTP || !user.phoneOTP.code) {
      return res
        .status(400)
        .json({ message: "No OTP found. Request a new one." });
    }

    // Check if expired
    if (isOTPExpired(user.phoneOTP.expiresAt)) {
      return res
        .status(400)
        .json({ message: "OTP expired. Request a new one." });
    }

    // Check if OTP matches
    if (user.phoneOTP.code !== otp.toString()) {
      return res.status(400).json({ message: "Incorrect OTP" });
    }

    // Mark phone as verified
    user.phoneVerified = true;
    user.phoneOTP = { code: null, expiresAt: null };
    await user.save();

    res.json({
      success: true,
      message: "Phone verified successfully",
      phoneVerified: true,
    });
  } catch (error) {
    console.error("Error verifying phone OTP:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// GET VERIFICATION STATUS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Get user's verification status
 * GET /api/verify/status/:userId
 */
exports.getVerificationStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      verifications: {
        email: {
          verified: user.emailVerified,
          address: user.email,
        },
        phone: {
          verified: user.phoneVerified,
          address: user.phoneNumber || "Not provided",
        },
        identity: {
          verified: false, // Manual admin review
          note: "Requires admin approval",
        },
        address: {
          verified: false, // Manual admin review
          note: "Requires admin approval",
        },
      },
    });
  } catch (error) {
    console.error("Error getting verification status:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
