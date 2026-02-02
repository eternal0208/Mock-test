const { db } = require('../config/firebaseAdmin');
const { sendEmail } = require('../services/emailService');

// @desc    Generate and Send OTP
// @route   POST /api/otp/send
// @access  Public
exports.sendGenericOtp = async (req, res) => {
    const { email, type = 'verification' } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    if (!db) {
        console.error("Firestore DB not initialized");
        return res.status(500).json({ message: 'Database Connection Error (Backend Configuration)' });
    }

    try {
        // 1. Generate 4-digit numeric OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes from now

        // 2. Store in Firestore (Overwrite existing if any)
        await db.collection('otp_codes').doc(email).set({
            otp,
            email,
            type,
            createdAt: new Date().toISOString(),
            expiresAt
        });

        // 3. Construct Email Content
        const subject = `Your ${type} Verification Code`;
        const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f9fafb;">
                <div style="max-width: 480px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
                    <h2 style="color: #4338ca; text-align: center; margin-bottom: 20px;">Apex Mock Verification</h2>
                    <p style="font-size: 16px; color: #374151; text-align: center;">Use the code below to verify your email address. This code expires in 5 minutes.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <span style="font-size: 36px; font-weight: 800; color: #4338ca; letter-spacing: 8px; background: #e0e7ff; padding: 15px 30px; border-radius: 8px;">${otp}</span>
                    </div>

                    <p style="font-size: 14px; color: #6b7280; text-align: center;">If you didn't request this code, you can safely ignore this email.</p>
                </div>
            </div>
        `;

        // 4. Send Email
        const sent = await sendEmail(email, subject, html);

        if (sent) {
            console.log(`✅ OTP sent to ${email}`);
            res.status(200).json({ success: true, message: 'OTP sent successfully' });
        } else {
            console.error(`❌ Failed to send OTP email to ${email}`);
            res.status(500).json({ success: false, message: 'Failed to send OTP email' });
        }

    } catch (error) {
        console.error("OTP Generation Error:", error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

// @desc    Verify OTP
// @route   POST /api/otp/verify
// @access  Public
exports.verifyGenericOtp = async (req, res) => {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ success: false, message: 'Email and OTP are required' });

    try {
        const docRef = db.collection('otp_codes').doc(email);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(400).json({ success: false, message: 'No OTP found for this email' });
        }

        const data = doc.data();

        // 1. Check if OTP matches
        if (data.otp !== otp.toString()) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        // 2. Check Expiry
        if (Date.now() > data.expiresAt) {
            return res.status(400).json({ success: false, message: 'OTP has expired' });
        }

        // 3. Valid OTP - Delete it to prevent reuse
        await docRef.delete();

        res.status(200).json({ success: true, message: 'OTP verified successfully' });

    } catch (error) {
        console.error("OTP Verification Error:", error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};
