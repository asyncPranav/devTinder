import { body } from "express-validator";

// PATCH /api/profile/edit
// Every field is optional — a user may update just one field at a time.
const profileValidator = [
  body("age")
    .optional()
    .isInt({ min: 13, max: 100 })
    .withMessage("Age must be an integer between 13 and 100"),

  body("about")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("About must be at most 500 characters"),

  body("skills")
    .optional()
    .isArray({ max: 10 })
    .withMessage("Skills must be an array with at most 10 items"),

  body("skills.*")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Each skill must be a non-empty string"),

  body("photoUrl")
    .optional()
    .trim()
    .isURL()
    .withMessage("Photo URL must be a valid URL"),
];

// PATCH /api/profile/change-password
const changePasswordValidator = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),

  body("newPassword")
    .isStrongPassword({
      minLength: 8,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    })
    .withMessage(
      "New password must be at least 8 characters and include uppercase, lowercase, a number, and a symbol",
    )
    // .custom() receives two arguments automatically:
    // 1. value → the value of the field currently being validated (newPassword).
    // 2. meta → a metadata object provided by express-validator containing information
    //    about the current validation, including req, location, path, and more.
    // We use { req } to destructure the req property directly from the meta object.
    // req is the Express request object, so req.body lets us access other fields
    // sent in the same request.
    // Example: while validating newPassword, req.body.currentPassword gives us
    // the current password so we can compare both passwords.
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error(
          "New password must be different from the current password",
        );
      }
      return true;
    }),

  body("confirmPassword")
    .notEmpty()
    .withMessage("Confirm password is required")
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error("Confirm password does not match new password");
      }
      return true;
    }),
];

export { profileValidator, changePasswordValidator };
