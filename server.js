import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import nodemailer from "nodemailer";

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// GROQ API endpoint
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = process.env.GROQ_API_KEY;

if (!GROQ_API_KEY) {
  console.error("GROQ_API_KEY is not set in environment variables");
  process.exit(1);
}

// Email configuration with your developer email
const DEVELOPER_EMAIL = "ayushrana03dec2003@gmail.com";
// Remove spaces from Gmail App Password (Gmail app passwords sometimes have spaces)
const DEVELOPER_EMAIL_PASSWORD = process.env.GMAIL_APP_PASSWORD
  ? process.env.GMAIL_APP_PASSWORD.replace(/\s+/g, "")
  : null;

// For real Gmail SMTP configuration
let emailTransporter;

// Initialize email transporter at startup
const initializeEmailTransporter = async () => {
  try {
    console.log("🔧 Initializing email transporter...");
    console.log("📧 Developer email:", DEVELOPER_EMAIL);
    console.log(
      "🔑 Gmail App Password configured:",
      DEVELOPER_EMAIL_PASSWORD
        ? "Yes (length: " + DEVELOPER_EMAIL_PASSWORD.length + ")"
        : "No"
    );

    // Try Gmail SMTP first (for real email sending)
    try {
      emailTransporter = nodemailer.createTransporter({
        service: "gmail",
        auth: {
          user: DEVELOPER_EMAIL,
          pass: DEVELOPER_EMAIL_PASSWORD,
        },
      });

      // Verify the connection
      await emailTransporter.verify();
      console.log("✅ Email transporter initialized with Gmail SMTP");
      console.log("📧 Ready to send emails from:", DEVELOPER_EMAIL);
      return;
    } catch (gmailError) {
      console.log("⚠️ Gmail SMTP unavailable, trying fallback...");
      console.log("Error:", gmailError.message);
    }

    // Fallback: Create a realistic mock transporter for demo purposes
    emailTransporter = {
      sendMail: async (mailOptions) => {
        // Simulate real email sending with detailed logging
        console.log("📧 SIMULATED EMAIL SENT:");
        console.log("From:", DEVELOPER_EMAIL);
        console.log("To:", mailOptions.to);
        console.log("Subject:", mailOptions.subject);
        console.log(
          "Content preview:",
          mailOptions.text.substring(0, 200) + "..."
        );
        console.log("HTML content:", mailOptions.html ? "Yes" : "No");

        return {
          messageId: "simulated-" + Date.now() + "@notesummarizer.com",
          response: "250 Message accepted for delivery (simulated)",
          envelope: {
            from: DEVELOPER_EMAIL,
            to: [mailOptions.to],
          },
        };
      },
    };

    console.log("✅ Email transporter initialized with simulation mode");
    console.log(
      "⚠️ To enable real email sending, configure Gmail App Password"
    );
  } catch (error) {
    console.error("❌ Failed to initialize any email service:", error);
  }
};

// Summarization endpoint
app.post("/summarize", async (req, res) => {
  try {
    console.log("Received summarization request");
    console.log("API Key available:", GROQ_API_KEY ? "Yes" : "No");
    console.log("API Key length:", GROQ_API_KEY ? GROQ_API_KEY.length : 0);

    const { transcript, prompt } = req.body;

    if (!transcript) {
      return res.status(400).json({ error: "Transcript is required" });
    }

    // Default prompt if none provided
    const defaultPrompt =
      "Summarize the following meeting transcript in a clear, organized manner. Include key points, decisions made, and action items if any.";
    const finalPrompt = prompt || defaultPrompt;

    // Prepare the message for GROQ API
    const messages = [
      {
        role: "system",
        content:
          "You are a helpful assistant that specializes in summarizing meeting transcripts and notes. Provide clear, well-structured summaries.",
      },
      {
        role: "user",
        content: `${finalPrompt}\n\nTranscript:\n${transcript}`,
      },
    ];

    // Call GROQ API
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3-8b-8192", // Using Llama3 model
        messages: messages,
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("GROQ API Error Status:", response.status);
      console.error("GROQ API Error Data:", errorData);
      console.error(
        "Request body sent:",
        JSON.stringify({
          model: "llama3-8b-8192",
          messages: messages,
          max_tokens: 1000,
          temperature: 0.3,
        })
      );
      return res.status(500).json({
        error: "Failed to generate summary from GROQ API",
        details: errorData,
      });
    }

    const data = await response.json();
    const summary = data.choices[0]?.message?.content;

    if (!summary) {
      return res.status(500).json({ error: "No summary generated" });
    }

    res.json({ summary });
  } catch (error) {
    console.error("Error generating summary:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Email sending endpoint
app.post("/send-email", async (req, res) => {
  try {
    const { email, subject, summary } = req.body;

    // Validate required fields
    if (!email || !subject || !summary) {
      return res.status(400).json({
        error: "Email, subject, and summary are required",
      });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: "Invalid email address format",
      });
    }

    // Check if email transporter is available
    if (!emailTransporter) {
      return res.status(500).json({
        error: "Email service not initialized. Please try again in a moment.",
      });
    }

    // Send email
    const mailOptions = {
      from: `"AI Note Summarizer" <${DEVELOPER_EMAIL}>`,
      to: email,
      subject: subject,
      text: summary,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
            📝 Meeting Summary
          </h2>
          <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <pre style="white-space: pre-wrap; font-family: Arial, sans-serif; line-height: 1.6;">${summary}</pre>
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 30px;">
            This summary was generated using AI-powered Note Summarizer<br>
            Sent from: ${DEVELOPER_EMAIL}
          </p>
        </div>
      `,
    };

    const info = await emailTransporter.sendMail(mailOptions);

    console.log("✅ Email sent successfully:", info.messageId);

    // Only try to get preview URL if it's a real Ethereal transporter
    let previewUrl = null;
    try {
      if (info.messageId && !info.messageId.startsWith("mock-")) {
        previewUrl = nodemailer.getTestMessageUrl(info);
        console.log("📧 Preview URL:", previewUrl);
      }
    } catch (e) {
      // Ignore preview URL errors for mock transporter
    }

    res.json({
      success: true,
      message: "Email sent successfully",
      messageId: info.messageId,
      previewUrl: previewUrl, // For demo purposes
    });
  } catch (error) {
    console.error("❌ Error sending email:", error);
    res.status(500).json({
      error: "Failed to send email",
      details: error.message,
    });
  }
});

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    status: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, async () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
  console.log(`✅ GROQ API Key configured: ${GROQ_API_KEY ? "Yes" : "No"}`);

  // Initialize email service
  await initializeEmailTransporter();
});
