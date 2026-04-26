# Yuvaverse

### University Event Organization & Recruitment Platform

Yuvaverse is a full-stack platform designed to simplify **campus event management and student recruitment workflows**.

It enables students to **discover, register, and participate in events**, while providing administrators with tools to **manage events, applications, and analytics in a unified system**.

---

## Highlights

* Event discovery and registration (individual and team-based)
* Structured recruitment workflow for student organizations
* Centralized admin dashboard for managing events and applications
* Real-time analytics using Chart.js
* Secure authentication using JWT
* Media management with Cloudinary integration
* Payment integration using Razorpay

---

## Tech Stack

| Layer      | Technology             |
| ---------- | ---------------------- |
| Backend    | Node.js, Express.js    |
| Language   | TypeScript             |
| Database   | PostgreSQL, Prisma ORM |
| Frontend   | HTML, CSS, JavaScript  |
| Analytics  | Chart.js               |
| Security   | Helmet, bcryptjs, CORS |
| Storage    | Cloudinary, Multer     |
| Deployment | Render                 |

---

## Getting Started

### Prerequisites

* Node.js (v20 or higher)
* PostgreSQL database
* Prisma CLI

---

### Installation

```bash
git clone <repository-url>
cd Yuvaverse
npm install
```

---

### Environment Setup

Create a `.env` file in the root directory:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/yuvaverse"
JWT_SECRET="your_jwt_secret"

CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."

RAZORPAY_KEY_ID="..."
RAZORPAY_KEY_SECRET="..."
```

---

### Database Setup

```bash
npm run prisma:generate
npm run prisma:migrate
```

---

## Running the Application

### Development Mode

```bash
npm run dev
```

Runs the server with hot-reloading.

---

### Production Mode

```bash
npm run build:prod
npm start
```

Builds and runs the production version.

---

## Project Structure

```
Yuvaverse/
│
├── src/        # Backend source code (controllers, routes, services)
├── public/     # Frontend assets
├── prisma/     # Database schema and migrations
├── scripts/    # Utility scripts
├── dist/       # Compiled output
```

---

## Live Demo & Repository

* Live App: <add deployment link>
* GitHub: <add repository link>

---

## Why Yuvaverse

Yuvaverse consolidates **event management, recruitment, and analytics** into a single platform, reducing fragmentation and improving efficiency for both students and administrators.

---

## Future Improvements

* Role-based access control (RBAC)
* Notification system (email and in-app)
* Improved mobile responsiveness
* AI-based event recommendations

---

## Contributing

Contributions are welcome. Fork the repository and submit a pull request.

---

## License

This project is licensed under the MIT License.
