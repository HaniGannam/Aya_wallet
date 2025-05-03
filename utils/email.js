// utils/email.js
const nodemailer = require('nodemailer');

// Create a transporter object using SMTP transport
const transporter = nodemailer.createTransport({
    service:'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
        user: 'stakesphere@gmail.com',
        pass: 'yggu wxpk uglr bgco',
    },
    // tls: {
    //     rejectUnauthorized: true,
    // }
});

// Function to send OTP via email
exports.sendOTPByEmail = (email, otp) => {
    // Email options
    const mailOptions = {
        from: 'stakesphere@gmail.com',
        to: email,
        subject: 'Email Verification OTP',
        text: `Your OTP for email verification is: ${otp}`,
    };

    // Send email
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Email sent:', info);
        }
    });
};
