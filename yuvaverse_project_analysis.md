# Yuvaverse - Comprehensive Project Analysis

This document provides a detailed breakdown of the Yuvaverse web application, detailing the project structure, the purpose of each file, the middleware used, API routes, database queries, and the complete end-to-end workflow. This is intended to be used as a reference guide for presentations.

---

## 1. Project Structure & Architecture

Yuvaverse is a full-stack application built with **Node.js, Express, and TypeScript** on the backend, and **Vanilla HTML/CSS/TypeScript** on the frontend. It utilizes **PostgreSQL** (managed via Prisma ORM) for data storage.

### Directory Breakdown
- **`src/`**: The core source code directory.
  - **`config/`**: Third-party service initializations (Database, Email, Payments, Storage).
  - **`controllers/`**: Business logic handling incoming requests and returning responses.
  - **`mailers/`**: Email templates and dispatch logic using Nodemailer.
  - **`middlewares/`**: Functions that intercept requests (Authentication, Validation, File Uploads).
  - **`routes/`**: API endpoint definitions routing URLs to their respective controllers.
  - **`utils/`**: Helper functions (e.g., standardized API responses).
  - **`validators/`**: Input validation schemas (using `express-validator`).
  - **`public/`**: Frontend assets (HTML, CSS, JS, TS) served statically to the client.
  - **`server.ts`**: The main entry point that bootstraps the Express application.
- **`prisma/`**: Contains the `schema.prisma` file defining database models and relations, plus migrations.
- **`gallery/`**: Static directory for holding gallery images.
- **`package.json`**: Project dependencies and npm scripts.

---

## 2. File-by-File Breakdown

### Core & Config
*   **`src/server.ts`**: The heartbeat of the application. It initializes Express, sets up security headers (Helmet), configures CORS, serves static files, mounts all API routes, handles global errors, and connects to the database before starting the server.
*   **`src/config/prisma.ts`**: Initializes and exports a singleton instance of the Prisma Client to interact with the PostgreSQL database.
*   **`src/config/razorpay.ts`**: Configures the Razorpay SDK with the API Key and Secret for payment processing.
*   **`src/config/cloudinary.ts`**: Sets up the Cloudinary SDK for cloud-based image storage.
*   **`src/config/mailer.ts`**: Configures the Nodemailer transport (usually SMTP via Gmail or SendGrid) to send outgoing emails.

### Middlewares
*   **`src/middlewares/auth.middleware.ts`**: Protects secure routes. It extracts the JWT from the `Authorization: Bearer <token>` header, verifies it using `jsonwebtoken`, and attaches the decoded user payload to the request object. If invalid, it blocks the request with a 401 Unauthorized status.
*   **`src/middlewares/upload.middleware.ts`**: Configures `multer` and `multer-storage-cloudinary`. It intercepts requests containing files (like event banners or resumes), uploads them directly to Cloudinary, and attaches the resulting secure URL to the request.
*   **`src/middlewares/validate.middleware.ts`**: Checks the request against defined validation schemas. If errors exist (e.g., missing email), it intercepts the request and returns a 400 Bad Request with the error details.

### Routes (`src/routes/`)
*   **`auth.routes.ts`**: Handles `/api/auth/login` (admin login) and `/api/auth/me` (verifying token).
*   **`events.routes.ts`**: Handles `/api/events`. Public GET routes to fetch events, and protected POST/PUT/DELETE routes for admins to manage events.
*   **`registrations.routes.ts`**: Handles `/api/registrations`. Public POST to register for an event, POST `/verify` to confirm Razorpay payments.
*   **`teams.routes.ts`**: Handles `/api/teams`. Similar to registrations, but specifically for group/team event registrations.
*   **`applications.routes.ts`**: Handles `/api/applications`. Public POST for users submitting "Join Us" forms.
*   **`contact.routes.ts`**: Handles `/api/contact`. Public POST for "Contact Us" messages.
*   **`admin.routes.ts`**: Handles `/api/admin/...`. Protected routes for admins to fetch dashboard statistics, review applications, and view contact messages.

### Controllers (`src/controllers/`)
*   **`auth.controller.ts`**: Validates credentials, checks passwords using `bcryptjs`, generates a JWT, and sends it to the client.
*   **`event.controller.ts`**: Queries the database to fetch, create, update, or delete events.
*   **`registration.controller.ts`**: Creates registration records. If the event is paid, it generates a Razorpay order ID. It also handles the payment verification webhook/callback.
*   **`team.controller.ts`**: Similar to registration, but handles array of team members.
*   **`admin.controller.ts`**: Aggregates data for the admin dashboard (total revenue, registration counts, recent activities).

### Mailers (`src/mailers/`)
*   Files like **`registration.mailer.ts`**, **`team.mailer.ts`**, and **`application.mailer.ts`**. These files contain HTML templates. They take data (like student name, event name) and use the `mailer.config` to send beautifully formatted confirmation emails to users.

### Database Schema (`prisma/schema.prisma`)
*   **`User`**: Stores admin credentials (email, hashed password, role).
*   **`Event`**: Stores event details (title, date, price, image URLs, max team size).
*   **`Registration`**: Links a student to an individual event. Stores payment status and Razorpay IDs.
*   **`Team` & `TeamMember`**: Handles group registrations. `Team` holds the payment status, while `TeamMember` holds individual member details.
*   **`Application`**: Stores data from the "Join Us" form (name, role, resume link, status).
*   **`ContactMessage`**: Stores general inquiries from the website.

---

## 3. Complete Application Workflow

### Scenario 1: Admin Authentication (How JWT Works)
1. **Login**: The Admin navigates to `/admin-login.html` and submits their email/password.
2. **Backend Validation**: The frontend sends a `POST /api/auth/login`. `auth.controller.ts` finds the user in the database and compares the hashed password using `bcryptjs`.
3. **Token Generation**: If successful, a JSON Web Token (JWT) is signed using a secret key. This token contains the admin's User ID.
4. **Client Storage**: The frontend receives the JWT and stores it in `localStorage`.
5. **Protected Access**: When the admin navigates to the dashboard, the frontend attaches this token to the `Authorization` header. `auth.middleware.ts` intercepts the request, verifies the token's cryptographic signature, and allows the request to proceed to the controller.

### Scenario 2: Creating an Event (File Uploads & DB)
1. **Submission**: Admin fills out the "Create Event" form, attaching an image.
2. **Middleware Intercept**: The request hits `POST /api/events`. The `upload.middleware.ts` intercepts the image, streams it to **Cloudinary**, and replaces the file in the request with a Cloudinary URL.
3. **Database Insertion**: `event.controller.ts` receives the text data and the image URL, using Prisma (`prisma.event.create`) to save the event to the PostgreSQL database.

### Scenario 3: Student Registration & Payment Flow (Razorpay)
1. **Form Submission**: A student fills out the registration form for a paid event.
2. **Order Creation**: The frontend sends data to `POST /api/registrations`. The backend creates a pending `Registration` in the database.
3. **Razorpay Intialization**: Because the event has a price > 0, the backend calls the Razorpay API to create an Order and returns the `order_id` to the frontend.
4. **Payment Modal**: The frontend opens the Razorpay checkout modal using the `order_id`. The user completes the payment.
5. **Verification**: Razorpay gives the frontend a `payment_id` and `signature`. The frontend sends these to `POST /api/registrations/verify`.
6. **Backend Validation**: The backend uses its Secret Key to mathematically verify the Razorpay signature to ensure the payment wasn't spoofed.
7. **Confirmation**: If valid, the backend updates the database (`status: SUCCESS`), increments the event's registration count, and triggers `registration.mailer.ts` to send a confirmation email.

### Scenario 4: "Join Us" Application
1. **Form Fill**: User fills out the career application, uploading a PDF resume.
2. **Upload**: `upload.middleware.ts` sends the PDF to Cloudinary.
3. **Database**: The application data and resume URL are saved to the `Application` table.
4. **Email**: `application.mailer.ts` sends an automated "Application Received" email to the user.

---

## 4. Key Technologies Summary
*   **Database Queries**: Handled exclusively by Prisma ORM. Instead of raw SQL, we use methods like `prisma.event.findMany()` or `prisma.registration.update()`. This ensures type-safety.
*   **JWT (JSON Web Tokens)**: Used for stateless authentication. The server doesn't need to remember who is logged in; the token itself cryptographically proves the user's identity.
*   **Nodemailer**: The standard Node.js library for sending emails. We connect it to an SMTP server, construct HTML strings dynamically, and fire them off asynchronously.
*   **Cloudinary**: Acts as our CDN (Content Delivery Network). Instead of saving images to our local server (which breaks on platforms like Render or Heroku), we offload files to Cloudinary and just save the URL string in our database.
