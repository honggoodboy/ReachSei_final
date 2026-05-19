import nodemailer from "nodemailer";

export async function sendResetCodeEmail(to, resetCode) {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error("EMAIL_USER or EMAIL_PASS is missing in .env");
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Reachsei Store" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Reachsei Password Reset Code",
      html: `
        <h2>Password Reset Code</h2>
        <p>You requested to reset your Reachsei Store password.</p>
        <p>Your reset code is:</p>
        <h1 style="letter-spacing: 4px;">${resetCode}</h1>
        <p>This code will expire in 15 minutes.</p>
        <p>If you did not request this, you can ignore this email.</p>
      `,
    });

    console.log("Reset code email sent to:", to);
  } catch (error) {
    console.error("EMAIL ERROR:", error);
    throw error;
  }
}