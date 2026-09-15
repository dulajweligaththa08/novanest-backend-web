const nodemailer = require('nodemailer');

/**
 * Create reusable transporter
 */
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

/**
 * Send inquiry notification to company email
 */
const sendInquiryEmail = async ({ customerName, email, phone, projectName, apartmentUnit, message }) => {
  const transporter = createTransporter();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0A1628; color: #C9A84C; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">NovaNest</h1>
        <p style="margin: 4px 0 0; color: #fff; font-size: 14px;">New Apartment Inquiry</p>
      </div>
      <div style="padding: 32px; background: #f9f9f9; border: 1px solid #e0e0e0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0; color: #666; width: 140px;"><strong>Name</strong></td>
            <td style="padding: 8px 0;">${customerName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Email</strong></td>
            <td style="padding: 8px 0;"><a href="mailto:${email}">${email}</a></td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #666;"><strong>Phone</strong></td>
            <td style="padding: 8px 0;">${phone || 'Not provided'}</td>
          </tr>
          ${projectName ? `<tr>
            <td style="padding: 8px 0; color: #666;"><strong>Project</strong></td>
            <td style="padding: 8px 0;">${projectName}</td>
          </tr>` : ''}
          ${apartmentUnit ? `<tr>
            <td style="padding: 8px 0; color: #666;"><strong>Unit</strong></td>
            <td style="padding: 8px 0;">${apartmentUnit}</td>
          </tr>` : ''}
        </table>
        <hr style="margin: 24px 0; border: none; border-top: 1px solid #e0e0e0;" />
        <p style="color: #666; margin: 0 0 8px;"><strong>Message:</strong></p>
        <p style="color: #333; line-height: 1.6; margin: 0;">${message}</p>
      </div>
      <div style="padding: 16px; text-align: center; color: #999; font-size: 12px;">
        © ${new Date().getFullYear()} NovaNest Properties. All rights reserved.
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: process.env.COMPANY_EMAIL,
    replyTo: email,
    subject: `New Inquiry from ${customerName}${projectName ? ` — ${projectName}` : ''}`,
    html,
  });
};

/**
 * Send welcome email to a new customer with their login credentials
 */
const sendCustomerWelcomeEmail = async ({ fullName, email, temporaryPassword }) => {
  const transporter = createTransporter();

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0A1628; color: #C9A84C; padding: 24px; text-align: center;">
        <h1 style="margin: 0; font-size: 24px;">NovaNest</h1>
        <p style="margin: 4px 0 0; color: #fff; font-size: 14px;">Your Account is Ready</p>
      </div>
      <div style="padding: 32px; background: #f9f9f9; border: 1px solid #e0e0e0;">
        <p style="color: #333;">Dear <strong>${fullName}</strong>,</p>
        <p style="color: #333; line-height: 1.6;">
          Your NovaNest customer account has been created. You can now log in to view
          your apartment details, updates, and documents.
        </p>
        <div style="background: #fff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 24px; margin: 24px 0;">
          <p style="margin: 0 0 8px; color: #666; font-size: 14px;"><strong>Your login credentials:</strong></p>
          <p style="margin: 0 0 4px; color: #333;">Email: <strong>${email}</strong></p>
          <p style="margin: 0; color: #333;">Password: <strong>${temporaryPassword}</strong></p>
        </div>
        <p style="color: #e53e3e; font-size: 14px;">
          ⚠️ Please change your password after your first login.
        </p>
        <a href="${process.env.WEBSITE_URL || 'http://localhost:3000'}/login"
           style="display: inline-block; background: #C9A84C; color: #fff; padding: 12px 32px;
                  border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 16px;">
          Log In to Your Account
        </a>
      </div>
      <div style="padding: 16px; text-align: center; color: #999; font-size: 12px;">
        © ${new Date().getFullYear()} NovaNest Properties. All rights reserved.
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_FROM,
    to: email,
    subject: 'Welcome to NovaNest — Your Account is Ready',
    html,
  });
};

module.exports = { sendInquiryEmail, sendCustomerWelcomeEmail };
