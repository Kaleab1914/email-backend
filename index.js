const express = require("express");
const nodemailer = require("nodemailer");
const cors = require("cors");
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config(); // Load environment variables from .env

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure uploads folder exists
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// Multer setup
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 5 * 1024 * 1024, fields: 10 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    if (allowedTypes.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files (JPEG, PNG, GIF) or PDFs are allowed'));
  }
});

// Nodemailer setup
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Email endpoint
app.post("/send-email", upload.single('image'), async (req, res) => {
  try {
    console.log("Received files:", req.file);
    console.log("Received body:", req.body);

    const { name, employeeId, department, email, phone, requestType, priorityLevel, subject, description } = req.body;

    if (!name || !email || !subject || !description) {
      if (req.file) fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      subject: `IT Request: ${subject}`,
      html: `
        <h2>New IT Service Request</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Employee ID:</b> ${employeeId || 'N/A'}</p>
        <p><b>Department:</b> ${department || 'N/A'}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Phone:</b> ${phone || 'N/A'}</p>
        <p><b>Request Type:</b> ${requestType || 'Not specified'}</p>
        <p><b>Priority:</b> ${priorityLevel || 'Not specified'}</p>
        <p><b>Subject:</b> ${subject}</p>
        <p><b>Description:</b><br>${description.replace(/\n/g, '<br>')}</p>
        ${req.file ? `<p><i>File attached: ${req.file.originalname}</i></p>` : ''}
      `,
      attachments: req.file ? [{ filename: req.file.originalname, path: req.file.path }] : []
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.messageId);

    if (req.file) fs.unlinkSync(req.file.path);

    res.status(200).json({ success: true, message: "Request submitted successfully" });
  } catch (error) {
    console.error("Email error:", error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ success: false, message: "Failed to process request", error: error.message });
  }
});

// Health check
app.get("/health", (req, res) => res.status(200).json({ status: "OK" }));

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

process.on('SIGINT', () => {
  console.log('Shutting down server...');
  process.exit();
});
