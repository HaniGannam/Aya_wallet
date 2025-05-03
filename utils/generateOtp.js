// utils/generateOTP.js

// Function to generate a random OTP (6 digits)
const generateOTP = () => {
    const otpLength = 4;
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < otpLength; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
};

module.exports = generateOTP;
