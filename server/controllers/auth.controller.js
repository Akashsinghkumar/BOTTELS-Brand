const db = require('../database/db_client');

// In-memory OTP store (Key: Email or Mobile, Value: { otp, expires })
const otps = new Map();

// NodeMailer dynamic import for real email sending
let nodemailer;
try {
    nodemailer = require('nodemailer');
} catch (e) {
    console.log('nodemailer not installed. Real email notifications will fall back to simulated console logs.');
}

const sendOTP = async (req, res) => {
    try {
        const { channel } = req.body; // email or phone
        if (!channel) {
            return res.status(400).json({ error: 'Email or Mobile Number is required.' });
        }

        const isEmail = /\S+@\S+\.\S+/.test(channel);
        const isPhone = /^\+?[0-9]{10,15}$/.test(channel.replace(/[\s-()]/g, ''));

        if (!isEmail && !isPhone) {
            return res.status(400).json({ error: 'Please enter a valid Gmail address or 10-digit Mobile Number.' });
        }

        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Expire in 5 minutes
        otps.set(channel, {
            otp,
            expires: Date.now() + 5 * 60 * 1000
        });

        // 1. Log to console
        console.log(`[OTP VERIFICATION] Generated OTP for ${channel}: ${otp}`);

        // 2. Write to notification logs in the system database
        // This makes it show up in the simulator's "Message Logs Stream" widget on the Admin UI
        await db.notificationLogs.create({
            userId: 'guest',
            type: isEmail ? 'Email' : 'SMS',
            recipient: channel,
            message: `Your AQUAVIORA login verification OTP is: ${otp}. It is valid for 5 minutes.`
        });

        // 3. Try to send real email if SMTP credentials exist in environment
        if (isEmail && nodemailer && process.env.SMTP_HOST && process.env.SMTP_USER) {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || '587'),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });

            await transporter.sendMail({
                from: process.env.SMTP_FROM || '"AQUAVIORA Support" <support@aquaviora.com>',
                to: channel,
                subject: 'AQUAVIORA Verification Code',
                text: `Your login verification code is ${otp}. It is valid for 5 minutes.`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #f9fbfd;">
                        <h2 style="color: #00bcd4; border-bottom: 2px solid #00bcd4; padding-bottom: 10px;">AQUAVIORA Verification</h2>
                        <p style="font-size: 1rem; color: #333;">Use the code below to complete your login or registration:</p>
                        <div style="font-size: 2rem; font-weight: bold; letter-spacing: 4px; text-align: center; color: #00bcd4; background: #e0f7fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
                            ${otp}
                        </div>
                        <p style="font-size: 0.85rem; color: #666;">This code is valid for 5 minutes. Please do not share this code with anyone.</p>
                        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                        <p style="font-size: 0.75rem; text-align: center; color: #999;">&copy; 2026 AQUAVIORA. All Rights Reserved.</p>
                    </div>
                `
            });
            console.log(`Real email OTP sent successfully to ${channel}`);
        }

        res.json({ success: true, message: `Verification OTP code sent to ${channel}.` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const verifyOTP = async (req, res) => {
    try {
        const { channel, otp } = req.body;
        if (!channel || !otp) {
            return res.status(400).json({ error: 'Channel and OTP code are required.' });
        }

        const entry = otps.get(channel);
        if (!entry) {
            return res.status(400).json({ error: 'No active verification request found for this number or email.' });
        }

        if (Date.now() > entry.expires) {
            otps.delete(channel);
            return res.status(400).json({ error: 'Verification code has expired. Please request a new one.' });
        }

        if (entry.otp !== otp) {
            return res.status(400).json({ error: 'Invalid verification code. Please try again.' });
        }

        // OTP matched, consume it
        otps.delete(channel);

        // Check if user already exists
        const isEmail = /\S+@\S+\.\S+/.test(channel);
        let user = null;
        if (isEmail) {
            user = await db.users.findOne({ email: channel });
        } else {
            user = await db.users.findOne({ phone: channel });
        }

        if (user) {
            // Log successful login audit
            await db.auditLogs.create({
                username: user.username,
                role: user.role,
                action: 'USER_LOGIN',
                details: `User logged in via OTP verification (${channel}).`,
                ipAddress: req.ip
            });
            return res.json({ success: true, verified: true, exists: true, user: { id: user._id, username: user.username, email: user.email, phone: user.phone, role: user.role } });
        } else {
            // User does not exist, redirect to complete profile fields
            return res.json({ success: true, verified: true, exists: false, message: 'OTP verified. Complete registration.' });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const completeRegistration = async (req, res) => {
    try {
        const { channel, username, password } = req.body;
        if (!channel || !username || !password) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        // Check if username already exists
        const userExists = await db.users.findOne({ username });
        if (userExists) {
            return res.status(400).json({ error: 'Username already taken. Please choose another.' });
        }

        const isEmail = /\S+@\S+\.\S+/.test(channel);
        const userData = {
            username,
            passwordHash: password,
            role: 'customer'
        };

        if (isEmail) {
            userData.email = channel;
        } else {
            userData.phone = channel;
            userData.email = `${username.toLowerCase()}@aquaviora.com`; // default placeholder email
        }

        const newUser = await db.users.create(userData);

        await db.auditLogs.create({
            username: newUser.username,
            role: newUser.role,
            action: 'USER_SIGNUP',
            details: `User registered via OTP flow (${channel}) with role customer.`,
            ipAddress: req.ip
        });

        res.status(201).json({
            success: true,
            user: { id: newUser._id, username: newUser.username, email: newUser.email, phone: newUser.phone, role: newUser.role }
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const signup = async (req, res) => {
    try {
        const { username, email, password, role, phone } = req.body;
        if (!username || !email || !password || !role) {
            return res.status(400).json({ error: 'All fields are required.' });
        }
        const existing = await db.users.findOne({ username });
        if (existing) {
            return res.status(400).json({ error: 'Username already exists.' });
        }
        const user = await db.users.create({
            username,
            email,
            phone,
            passwordHash: password,
            role
        });
        await db.auditLogs.create({
            username: user.username,
            role: user.role,
            action: 'USER_SIGNUP',
            details: `User registered with role ${role}.`,
            ipAddress: req.ip
        });
        res.status(201).json({ success: true, user: { id: user._id, username: user.username, email: user.email, phone: user.phone, role: user.role } });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

const login = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await db.users.findOne({ username });
        if (!user || user.passwordHash !== password) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }
        await db.auditLogs.create({
            username: user.username,
            role: user.role,
            action: 'USER_LOGIN',
            details: `User logged in successfully.`,
            ipAddress: req.ip
        });
        res.json({ success: true, user: { id: user._id, username: user.username, email: user.email, phone: user.phone, role: user.role } });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

module.exports = { signup, login, sendOTP, verifyOTP, completeRegistration };
