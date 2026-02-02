const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // App Password, not main password
    }
});

exports.sendEmail = async (to, subject, html) => {
    const mailOptions = {
        from: `"Apex Mock Platform" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`📧 Email sent to ${to}`);
        return true;
    } catch (error) {
        console.error("Email Service Error:", error);
        return false;
    }
};
