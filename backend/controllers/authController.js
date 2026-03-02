// controllers/authController.js - FIXED

const User = require("../models/User");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const emailService = require("../services/emailService");

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// @desc    Register new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      userType,
      address,
    } = req.body;

    // Validation
    if (
      !firstName ||
      !lastName ||
      !email ||
      !password ||
      !phoneNumber ||
      !userType
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Create user
    const user = new User({
      firstName,
      lastName,
      email,
      password,
      phoneNumber,
      userType,
      address: address || "",
      avatar: `https://ui-avatars.com/api/?name=${firstName}+${lastName}&background=random`,
      location: {
        type: "Point",
        coordinates: [81.5212, 16.5449], // Bhimavaram, AP (corrected coordinates)
      },
    });

    await user.save();
    console.log("✅ User registered:", email);

    // Send welcome email (non-blocking)
    emailService.sendWelcomeEmail(user).catch((err) => {
      console.error("Failed to send welcome email:", err);
    });

    // ✅ FIXED: Return 'user' instead of 'data'
    res.status(201).json({
      success: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        userType: user.userType,
        role: user.userType, // Add role alias for frontend dashboard routing
        address: user.address,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error("❌ Register error:", error);
    next(error);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    // Check for user
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    console.log("🔐 Login attempt:", email);

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log("❌ Password mismatch for:", email);
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    console.log("✅ Login successful:", email);

    // ✅ FIXED: Return 'user' instead of 'data'
    res.json({
      success: true,
      token: generateToken(user._id),
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        userType: user.userType,
        role: user.userType, // Add role alias for frontend dashboard routing
        address: user.address,
        avatar: user.avatar,
        bio: user.bio,
        rating: user.rating,
        ratingsCount: user.ratingsCount,
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    next(error);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    // ✅ FIXED: Use req.user._id instead of req.user.id
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    console.log("✅ Get me:", user.email);

    // ✅ FIXED: Return 'user' instead of 'data'
    res.json({
      success: true,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        userType: user.userType,
        role: user.userType, // Add role alias for frontend dashboard routing
        address: user.address,
        avatar: user.avatar,
        bio: user.bio,
        rating: user.rating,
        ratingsCount: user.ratingsCount,
        listingsCount: user.listingsCount,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Get me error:", error);
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, phoneNumber, address, bio } = req.body;

    // ✅ FIXED: Use req.user._id instead of req.user.id
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update fields
    user.firstName = firstName || user.firstName;
    user.lastName = lastName || user.lastName;
    user.phoneNumber = phoneNumber || user.phoneNumber;
    user.address = address || user.address;
    user.bio = bio || user.bio;

    await user.save();

    console.log("✅ Profile updated:", user.email);

    // ✅ FIXED: Return 'user' instead of 'data'
    res.json({
      success: true,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phoneNumber: user.phoneNumber,
        userType: user.userType,
        address: user.address,
        avatar: user.avatar,
        bio: user.bio,
        rating: user.rating,
        ratingsCount: user.ratingsCount,
      },
    });
  } catch (error) {
    console.error("❌ Update profile error:", error);
    next(error);
  }
};

// @desc    Forgot password - send reset email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide an email address",
      });
    }

    const user = await User.findOne({ email });

    if (!user) {
      // Don't reveal if email exists for security
      return res.json({
        success: true,
        message: "If that email exists, a password reset link has been sent",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Save hashed token to user
    user.passwordResetToken = resetTokenHash;
    user.passwordResetExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send password reset email
    await emailService.sendPasswordResetEmail(user, resetToken);

    console.log("✅ Password reset email sent to:", email);

    res.json({
      success: true,
      message: "If that email exists, a password reset link has been sent",
    });
  } catch (error) {
    console.error("❌ Forgot password error:", error);
    next(error);
  }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password/:token
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Hash the token from URL to compare with stored hash
    const resetTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    // Find user with valid token
    const user = await User.findOne({
      passwordResetToken: resetTokenHash,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token",
      });
    }

    // Update password
    user.password = password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    console.log("✅ Password reset successful for:", user.email);

    res.json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    next(error);
  }
};

// @desc    Verify email with token
// @route   GET /api/auth/verify-email/:token
// @access  Public
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    const emailVerifyHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      emailVerifyToken: emailVerifyHash,
      emailVerifyExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired verification token",
      });
    }

    // Mark email as verified
    user.verificationStatus.email = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyExpires = undefined;

    // Boost trust score for email verification
    user.trustScore = Math.min(100, user.trustScore + 10);

    await user.save();

    console.log("✅ Email verified for:", user.email);

    res.json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("❌ Verify email error:", error);
    next(error);
  }
};

// @desc    Resend email verification
// @route   POST /api/auth/resend-verification
// @access  Private
const resendVerification = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.verificationStatus.email) {
      return res.status(400).json({
        success: false,
        message: "Email is already verified",
      });
    }

    // Generate verification token
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyTokenHash = crypto
      .createHash("sha256")
      .update(verifyToken)
      .digest("hex");

    user.emailVerifyToken = verifyTokenHash;
    user.emailVerifyExpires = Date.now() + 86400000; // 24 hours
    await user.save();

    // Send verification email
    await emailService.sendEmailVerificationEmail(user, verifyToken);

    console.log("✅ Verification email resent to:", user.email);

    res.json({
      success: true,
      message: "Verification email sent",
    });
  } catch (error) {
    console.error("❌ Resend verification error:", error);
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
};
