// index.js
const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - extended CORS configuration for Flutter
app.use(cors({
  origin: '*', // Allow all origins (or replace with your Flutter app URL)
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());

// Nodemailer transporter
let transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true, // SSL
  auth: {
    user: process.env.EMAIL_USER,   // from .env or Railway variable
    pass: process.env.EMAIL_PASS,   // from .env or Railway variable
  },
});

// Email endpoint
app.post("/send-email", async (req, res) => {
  try {
    if (!req.body) {
      return res.status(400).json({ success: false, message: "Request body is missing" });
    }

    const {
      name,
      employeeId,
      department,
      email,
      phone,
      requestType,
      priorityLevel,
      subject,
      description,
    } = req.body;

    if (!name || !email || !subject || !description) {
      return res.status(400).json({ 
        success: false, 
        message: "Missing required fields: name, email, subject, or description" 
      });
    }

    let mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.RECEIVER_EMAIL, // recipient
      subject: `IT Service Request - ${subject}`,
      html: `
        <h2>New IT Service Request 🚀</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Employee ID:</b> ${employeeId || 'Not provided'}</p>
        <p><b>Department:</b> ${department || 'Not provided'}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Phone:</b> ${phone || 'Not provided'}</p>
        <p><b>Request Type:</b> ${requestType || 'Not specified'}</p>
        <p><b>Priority Level:</b> ${priorityLevel || 'Not specified'}</p>
        <p><b>Subject:</b> ${subject}</p>
        <p><b>Description:</b><br/> ${description}</p>
      `,
    };

    let info = await transporter.sendMail(mailOptions);
    console.log("Email sent ✅:", info.messageId);
    res.status(200).json({ success: true, message: "Email sent successfully!" });
  } catch (error) {
    console.error("Error sending email ❌:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to send email",
      error: error.message 
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({ status: "healthy" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
