import db from '../database/db_client.js';

const otps = new Map();

export const sendOTP = async (req, res) => {
    try {
        const body = req.body || (req.json ? await req.json() : {});
        const { channel } = body;
        if (!channel) {
            const errObj = { error: 'Email or Mobile Number is required.' };
            return res.status ? res.status(400).json(errObj) : Response.json(errObj, { status: 400 });
        }

        const isEmail = /\S+@\S+\.\S+/.test(channel);
        const isPhone = /^\+?[0-9]{10,15}$/.test(channel.replace(/[\s-()]/g, ''));

        if (!isEmail && !isPhone) {
            const errObj = { error: 'Please enter a valid Gmail address or 10-digit Mobile Number.' };
            return res.status ? res.status(400).json(errObj) : Response.json(errObj, { status: 400 });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otps.set(channel, {
            otp,
            expires: Date.now() + 5 * 60 * 1000
        });

        console.log(`[OTP VERIFICATION] Generated OTP for ${channel}: ${otp}`);

        await db.notificationLogs.create({
            recipient: channel,
            channel: isEmail ? 'EMAIL' : 'SMS',
            message: `Your AQUAVIORA Verification Code is ${otp}. Valid for 5 minutes.`,
            status: 'SENT'
        });

        const data = {
            success: true,
            message: `OTP sent successfully to ${channel}`,
            channel: isEmail ? 'email' : 'phone',
            simulatedOTP: otp
        };
        return res.json ? res.json(data) : Response.json(data);
    } catch (e) {
        const errObj = { error: e.message };
        return res.status ? res.status(500).json(errObj) : Response.json(errObj, { status: 500 });
    }
};

export const verifyOTP = async (req, res) => {
    try {
        const body = req.body || (req.json ? await req.json() : {});
        const { channel, otp } = body;
        if (!channel || !otp) {
            const errObj = { error: 'Channel and OTP are required.' };
            return res.status ? res.status(400).json(errObj) : Response.json(errObj, { status: 400 });
        }

        const record = otps.get(channel);

        if (!record) {
            const errObj = { error: 'No OTP requested for this number/email. Please request a new OTP.' };
            return res.status ? res.status(400).json(errObj) : Response.json(errObj, { status: 400 });
        }

        if (Date.now() > record.expires) {
            otps.delete(channel);
            const errObj = { error: 'OTP has expired. Please request a new one.' };
            return res.status ? res.status(400).json(errObj) : Response.json(errObj, { status: 400 });
        }

        if (record.otp !== otp.toString().trim()) {
            const errObj = { error: 'Invalid OTP code entered. Please check and try again.' };
            return res.status ? res.status(400).json(errObj) : Response.json(errObj, { status: 400 });
        }

        otps.delete(channel);

        let user = await db.users.findOne({ $or: [{ email: channel }, { phone: channel }] });
        let isExistingUser = !!user;

        const data = {
            success: true,
            message: 'OTP verified successfully!',
            isExistingUser,
            user: user ? { id: user._id || user.id, username: user.username, email: user.email, phone: user.phone, role: user.role } : null
        };
        return res.json ? res.json(data) : Response.json(data);
    } catch (e) {
        const errObj = { error: e.message };
        return res.status ? res.status(500).json(errObj) : Response.json(errObj, { status: 500 });
    }
};

export const completeRegistration = async (req, res) => {
    try {
        const body = req.body || (req.json ? await req.json() : {});
        const { name, channel, addresses, businessType, role = 'customer' } = body;
        if (!name || !channel) {
            const errObj = { error: 'Name and Channel are required.' };
            return res.status ? res.status(400).json(errObj) : Response.json(errObj, { status: 400 });
        }

        const isEmail = /\S+@\S+\.\S+/.test(channel);
        const email = isEmail ? channel : `${name.toLowerCase().replace(/\s+/g, '')}@aquaviora-customer.com`;
        const phone = isEmail ? '' : channel;

        let user = await db.users.findOne({ $or: [{ email }, { phone }] });
        if (!user) {
            user = await db.users.create({
                username: name,
                email,
                phone,
                passwordHash: 'otp_verified',
                role,
                businessType: businessType || 'Restaurant/Cafe',
                savedAddresses: addresses || []
            });
        }

        await db.auditLogs.create({
            username: user.username,
            role: user.role,
            action: 'USER_REGISTRATION',
            details: `Completed OTP registration for ${channel}`
        });

        const data = {
            success: true,
            message: 'Registration completed successfully!',
            user: { id: user._id || user.id, username: user.username, email: user.email, phone: user.phone, role: user.role }
        };
        return res.json ? res.json(data) : Response.json(data);
    } catch (e) {
        const errObj = { error: e.message };
        return res.status ? res.status(500).json(errObj) : Response.json(errObj, { status: 500 });
    }
};

export const signup = async (req, res) => {
    try {
        const body = req.body || (req.json ? await req.json() : {});
        const { username, email, password, role = 'customer' } = body;
        if (!username || !email || !password) {
            const errObj = { error: 'Username, email and password are required.' };
            return res.status ? res.status(400).json(errObj) : Response.json(errObj, { status: 400 });
        }

        const existing = await db.users.findOne({ $or: [{ username }, { email }] });
        if (existing) {
            const errObj = { error: 'Username or email already exists.' };
            return res.status ? res.status(400).json(errObj) : Response.json(errObj, { status: 400 });
        }

        const newUser = await db.users.create({
            username,
            email,
            passwordHash: password,
            role
        });

        await db.auditLogs.create({
            username: newUser.username,
            role: newUser.role,
            action: 'USER_SIGNUP',
            details: `User created with role ${role}`
        });

        const data = {
            success: true,
            user: { id: newUser._id || newUser.id, username: newUser.username, email: newUser.email, role: newUser.role }
        };
        return res.status ? res.status(201).json(data) : Response.json(data, { status: 201 });
    } catch (e) {
        const errObj = { error: e.message };
        return res.status ? res.status(500).json(errObj) : Response.json(errObj, { status: 500 });
    }
};

export const login = async (req, res) => {
    try {
        const body = req.body || (req.json ? await req.json() : {});
        const { username, password } = body;
        const user = await db.users.findOne({ $or: [{ username }, { email: username }] });

        if (!user || user.passwordHash !== password) {
            const errObj = { error: 'Invalid username or password.' };
            return res.status ? res.status(401).json(errObj) : Response.json(errObj, { status: 401 });
        }

        await db.auditLogs.create({
            username: user.username,
            role: user.role,
            action: 'USER_LOGIN',
            details: `User logged in successfully.`
        });

        const data = { success: true, user: { id: user._id || user.id, username: user.username, email: user.email, phone: user.phone, role: user.role } };
        return res.json ? res.json(data) : Response.json(data);
    } catch (e) {
        const errObj = { error: e.message };
        return res.status ? res.status(500).json(errObj) : Response.json(errObj, { status: 500 });
    }
};

export default { signup, login, sendOTP, verifyOTP, completeRegistration };
