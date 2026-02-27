// ============================================
// routes/auth.js - FIXED VALIDATION
// ============================================
const express = require("express");
const router = express.Router();
const { body } = require("express-validator");

const {
  register,
  login,
  getMe,
  updateProfile,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
} = require("../controllers/authController");

const { auth } = require("../middleware/auth");

router.post(
  "/register",
  [
    body("firstName")
      .trim()
      .notEmpty()
      .withMessage("First name is required")
      .isLength({ min: 2 })
      .withMessage("First name must be at least 2 characters"),
    body("lastName")
      .trim()
      .notEmpty()
      .withMessage("Last name is required")
      .isLength({ min: 2 })
      .withMessage("Last name must be at least 2 characters"),
    body("email")
      .trim()
      .isEmail()
      .withMessage("Please provide a valid email")
      .normalizeEmail(),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("phone")
      .trim()
      .notEmpty()
      .withMessage("Phone number is required")
      .isMobilePhone()
      .withMessage("Please provide a valid phone number"),
    body("userType")
      .isIn(["donor", "recipient", "both"])
      .withMessage("User type must be donor, recipient, or both"),
  ],
  register
);

router.post(
  "/login",
  [
    body("email")
      .trim()
      .isEmail()
      .withMessage("Please provide a valid email")
      .normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  login
);

router.get("/me", auth, getMe);

router.put(
  "/profile",
  auth,
  [
    body("firstName")
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage("First name must be at least 2 characters"),
    body("lastName")
      .optional()
      .trim()
      .isLength({ min: 2 })
      .withMessage("Last name must be at least 2 characters"),
    body("phone")
      .optional()
      .trim()
      .isMobilePhone()
      .withMessage("Please provide a valid phone number"),
    body("bio")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Bio must not exceed 500 characters"),
  ],
  updateProfile
);

// Password Reset
router.post(
  "/forgot-password",
  [body("email").trim().isEmail().withMessage("Please provide a valid email")],
  forgotPassword
);

router.post(
  "/reset-password/:token",
  [
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  resetPassword
);

// Email Verification
router.get("/verify-email/:token", verifyEmail);
router.post("/resend-verification", auth, resendVerification);

module.exports = router;
