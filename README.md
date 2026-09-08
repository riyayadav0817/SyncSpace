# SyncSpace

SyncSpace is a collaborative workspace application with secure user authentication, registration, login, and password reset functionality.

## 🚀 Current Features

* User registration
* User login
* JWT-based authentication
* Protected `/me` endpoint
* Forgot password functionality
* Email-based password reset
* Secure reset tokens using SHA-256 hashing
* Password hashing using `bcryptjs`
* SMTP email delivery using `Nodemailer`
* Reset links with expiration
* Frontend and backend deployed separately on Render

---

## 🏗️ Project Structure

The project is divided into a frontend and backend.

```text
SyncSpace/
│
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   └── ResetPassword.jsx
│   │   │
│   │   └── ...
│   │
│   └── ...
│
├── server/                 # Node.js / Express backend
│   ├── models/
│   │   └── User.js
│   │
│   ├── middleware/
│   │   └── auth.js
│   │
│   ├── routes/
│   │   └── auth.js
│   │
│   └── ...
│
└── README.md
```

---

# 🔐 Authentication System

SyncSpace uses the following authentication flow:

```text
Registration
     ↓
Password hashed with bcrypt
     ↓
User stored in MongoDB
     ↓
JWT generated
     ↓
JWT returned to frontend
     ↓
Token stored in localStorage
```

For login:

```text
Email + Password
       ↓
Find user
       ↓
Compare password with bcrypt
       ↓
Generate JWT
       ↓
Return user + token
```

---

# 🔑 Password Reset Flow

The password reset system works in the following way:

```text
User clicks "Forgot password?"
             ↓
Enters email
             ↓
POST /api/auth/forgot-password
             ↓
Backend finds user
             ↓
Random reset token generated
             ↓
Token is SHA-256 hashed
             ↓
Hash + expiry stored in MongoDB
             ↓
Reset URL generated
             ↓
Email sent through SMTP
             ↓
User clicks reset link
             ↓
ResetPassword page opens
             ↓
Token + email extracted from URL
             ↓
POST /api/auth/reset-password
             ↓
Token hashed again
             ↓
Hash + email + expiry checked
             ↓
New password hashed with bcrypt
             ↓
Password updated
             ↓
Reset token deleted
```

The reset token currently expires after:

```text
15 minutes
```

---

# 🌐 API Endpoints

The backend API is currently hosted at:

```text
https://syncspace-8lew.onrender.com
```

## Register

```http
POST /api/auth/register
```

Request:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

Successful response:

```json
{
  "success": true,
  "message": "Registration successful.",
  "token": "JWT_TOKEN",
  "user": {
    "id": "USER_ID",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

---

## Login

```http
POST /api/auth/login
```

Request:

```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

Successful response:

```json
{
  "success": true,
  "message": "Login successful.",
  "token": "JWT_TOKEN",
  "user": {
    "id": "USER_ID",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

---

## Current User

```http
GET /api/auth/me
```

Requires:

```http
Authorization: Bearer JWT_TOKEN
```

Example:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

---

## Forgot Password

```http
POST /api/auth/forgot-password
```

Request:

```json
{
  "email": "john@example.com"
}
```

Expected response:

```json
{
  "success": true,
  "message": "If an account exists for this email, a password reset link has been sent."
}
```

The API intentionally returns a generic response so that users cannot determine whether an email address is registered.

---

## Reset Password

```http
POST /api/auth/reset-password
```

Request:

```json
{
  "email": "john@example.com",
  "token": "RESET_TOKEN",
  "password": "newpassword123"
}
```

Successful response:

```json
{
  "success": true,
  "message": "Password reset successful. You can now log in."
}
```

---

# 📧 SMTP Configuration

The backend uses Nodemailer for password reset emails.

Required environment variables:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false

SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password

SMTP_FROM=SyncSpace <your-email@gmail.com>
```

### Important

For Gmail SMTP, use a **Google App Password**, not your normal Gmail account password.

Never commit SMTP credentials to GitHub.

---

# ⚙️ Environment Variables

Backend:

```env
JWT_SECRET=your-secure-jwt-secret

FRONTEND_URL=https://your-frontend-url.onrender.com

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-gmail-app-password
SMTP_FROM=SyncSpace <your-email@gmail.com>
```

Frontend can use:

```env
VITE_API_URL=https://syncspace-8lew.onrender.com
```

The frontend currently falls back to the deployed backend URL if `VITE_API_URL` is not provided.

---

# 🔒 Security

Current security mechanisms include:

### Password hashing

Passwords are never stored as plain text.

```javascript
bcrypt.hash(password, 12)
```

### Password verification

```javascript
bcrypt.compare(password, user.password)
```

### JWT authentication

JWTs are used for authenticated API requests.

```text
JWT expiry: 7 days
```

### Password reset tokens

Reset tokens are generated using:

```javascript
crypto.randomBytes(32)
```

Only the SHA-256 hash of the reset token is stored in the database.

### Reset token expiry

Reset tokens expire after:

```text
15 minutes
```

After successful password reset, the reset token is removed from the user document.

---

# 🖥️ Frontend Authentication Pages

## Login

The login page provides:

* Email input
* Password input
* Login button
* Forgot password option
* Registration navigation

## Register

The registration page provides:

* Full name
* Email
* Password
* Account creation
* Navigation back to login

## Forgot Password

The forgot-password interface provides:

* Email input
* Send reset link button
* Error handling
* Success message
* Back to login

## Reset Password

The reset page provides:

* New password
* Confirm password
* Reset password button
* Token validation
* Expiration handling
* Success/error messages

---

# 🗄️ User Authentication Data

The `User` model needs to support authentication fields similar to:

```javascript
{
  name: String,
  email: String,
  password: String,

  resetPasswordTokenHash: String,
  resetPasswordExpiresAt: Date
}
```

The email should be unique.

---

# ☁️ Deployment

Current deployment architecture:

```text
                 ┌─────────────────────┐
                 │   SyncSpace React    │
                 │      Frontend        │
                 └──────────┬──────────┘
                            │
                            │ HTTPS
                            ↓
                 ┌─────────────────────┐
                 │  SyncSpace Express  │
                 │      Backend        │
                 └──────────┬──────────┘
                            │
                  ┌─────────┴─────────┐
                  ↓                   ↓
             MongoDB              Gmail SMTP
             Database             Email Service
```

Frontend:

```text
https://syncspace-1-ckob.onrender.com
```

Backend:

```text
https://syncspace-8lew.onrender.com
```

---

# 🧪 Testing Checklist

Before considering authentication complete, test:

### Registration

* [ ] Create a new account
* [ ] Try an existing email
* [ ] Try an empty name
* [ ] Try a password shorter than 6 characters

### Login

* [ ] Correct email + password
* [ ] Incorrect password
* [ ] Non-existing email
* [ ] Empty fields

### Forgot Password

* [ ] Registered email
* [ ] Non-existing email
* [ ] Invalid email
* [ ] SMTP email delivery
* [ ] Check Render backend logs

### Reset Password

* [ ] Valid reset link
* [ ] Expired reset link
* [ ] Invalid token
* [ ] Wrong email + token
* [ ] Password shorter than 6 characters
* [ ] Password mismatch
* [ ] Successful password reset
* [ ] Try using the same reset link twice

### After Reset

* [ ] Old password should fail
* [ ] New password should work
* [ ] Reset token should no longer work

---

# 🐛 Current Troubleshooting Area

If the UI displays:

```text
Unable to process password reset request.
```

the error is coming from the backend's `catch` block:

```javascript
return res.status(500).json({
  success: false,
  message: "Unable to process password reset request."
});
```

The most important places to investigate are:

1. SMTP environment variables on Render
2. Gmail App Password
3. SMTP authentication
4. `FRONTEND_URL`
5. MongoDB connection
6. `User` model reset-token fields
7. Backend route registration
8. CORS configuration
9. Render backend logs
10. Network request in browser DevTools

The exact backend error should be visible in the Render logs because the route contains:

```javascript
console.error("❌ Forgot password error:", error);
```

---

# 🚧 Future Improvements

Potential improvements for the authentication system:

* Password visibility toggle
* Stronger password requirements
* Rate limiting for login/reset requests
* Reset-request rate limiting
* Account lockout protection
* Email verification
* Refresh tokens
* HTTP-only cookies instead of localStorage
* Better frontend route handling
* Password reset success redirect
* Dedicated authentication service
* Production-grade logging
* Security headers
* CORS restrictions
* Automated authentication tests

---

# 📌 Important Security Note

Do **not** commit real secrets to GitHub.

If SMTP credentials or other secrets have ever been exposed publicly, rotate them immediately.

Use environment variables on Render and keep `.env` files out of version control.

Example `.gitignore`:

```gitignore
.env
.env.*
!.env.example
node_modules/
```

---

# 📝 Current Status

### Authentication

```text
Registration       ✅
Login              ✅
JWT                ✅
Protected /me      ✅
Forgot Password    Needs debugging
Reset Password     Needs end-to-end testing
SMTP Email         Needs verification
```

The next debugging step should be to identify **exactly where the forgot-password request is failing** rather than changing the frontend blindly.

Useful evidence will be:

* Browser Network tab response for `/api/auth/forgot-password`
* Render backend logs immediately after clicking **Send reset link**
* `User.js` model
* Main Express server file (`server.js` / `app.js`)
* Render environment-variable configuration
