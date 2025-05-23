import JWT from 'jsonwebtoken';
import Bcrypt, { hash } from 'bcryptjs';
import Database from './database.js'; 

async function hashPassword(password) {
    try {
        if (!password || typeof password !== 'string' || password.trim() === '') {
            throw new Error('Password is required');
        }
        const salt = await Bcrypt.genSalt(parseInt(process.env.SALT_ROUNDS));
        return await Bcrypt.hash(password, salt);
    } catch (error) {
        console.error('Error hashing password:', error);
        throw new Error('Password hashing failed');
    }
}

async function verifyPassword(password, hashedPassword) {
    return await Bcrypt.compare(password, hashedPassword);
}

function generateToken(user) {
    try {
        if (!user || !user.email) {
            throw new Error('User object with an email is required');
        }
        const payload = { 
            email: user.email,
            newton: {
                chat: true,
                sdoc: {
                    assistance: true,
                },
                sdraw: {
                    assistance: false, // not implemented yet
                },
                sstudy: {
                    assistance: false, // not implemented yet
                }
            } 
        };
        const options = { expiresIn: process.env.AUTHENTICATION_TOKEN_EXPIRATION };
        return JWT.sign(payload, process.env.AUTHENTICATION_SECRET, options);
    } catch (error) {
        console.error('Error generating token:', error);
        throw new Error('Token generation failed');
    }
}

function generateRefreshToken(user) {
    try {
        if (!user || !user.email) {
            throw new Error('User object with an email is required');
        }
        const payload = { email: user.email };
        const options = { expiresIn: process.env.AUTHENTICATION_REFRESH_TOKEN_EXPIRATION };
        return JWT.sign(payload, process.env.AUTHENTICATION_REFRESH_SECRET, options);
    } catch (error) {
        console.error('Error generating refresh token:', error);
        throw new Error('Refresh token generation failed');
    }
}

function verifyToken(token) {
    try {
        if (!token) {
            throw new Error('Token is required');
        }
        return JWT.verify(token, process.env.AUTHENTICATION_SECRET);
    } catch (error) {
        console.error('Error verifying token:', error);
        throw new Error('Token verification failed');
    }
}

function verifyRefreshToken(token) {
    try {
        if (!token) {
            throw new Error('Token is required');
        }
        return JWT.verify(token, process.env.AUTHENTICATION_REFRESH_SECRET);
    } catch (error) {
        console.error('Error verifying refresh token:', error);
        throw new Error('Refresh token verification failed');
    }
}

function validateAuthorization(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const authorized = verifyToken(token);
        if (!authorized) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        next();
    } catch (error) {
        console.error('Error validating token:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
}

function validateLoginRegistrationInput(req, res, next) {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    if (typeof email !== 'string' || typeof password !== 'string') {
        return res.status(400).json({ error: 'Email and password must be strings' });
    }
    if (email.trim() === '' || password.trim() === '') {
        return res.status(400).json({ error: 'Email and password cannot be empty' });
    }

    // any specific validation logic can be added here
    next();
}

function sanatizeUserData(databaseUserData) {
    if (!databaseUserData) {
        return null;
    }
    return {
        id: databaseUserData.id,
        email: databaseUserData.email,
        displayName: databaseUserData.display_name,
    };
}

async function authenticateUser(req, res, next) {
    const { email, password } = req.body;
    try {
        // Simulate user retrieval from database
        const user = await Database.users.findByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isPasswordValid = await verifyPassword(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        req.user = user; // Attach user to request object
        next();
    } catch (error) {
        console.error('Error authenticating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function isEmailInUse(req, res, next) {
    const { email } = req.body;
    try {
        const user = await Database.users.findByEmail(email);
        if (user) {
            return res.status(400).json({ error: 'Email already in use' });
        }
        next();
    } catch (error) {
        console.error('Error checking email:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

//
//
// newton specific

async function validateNewtonChatAuthorization(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const authorized = verifyToken(token);
        if (!authorized) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        // Check if the user has chat access
        if (!authorized.newton.chat) {
            return res.status(403).json({ error: 'Chat access denied' });
        }

        next();
    } catch (error) {
        console.error('Error validating chat token:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
}

export default {
    hashPassword,
    verifyPassword,
    generateToken,
    generateRefreshToken,
    verifyToken,
    verifyRefreshToken,
    validateAuthorization,
    sanatizeUserData,
    validateLoginRegistrationInput,
    authenticateUser,
    isEmailInUse,
    newton: {
        validateChatAuthorization: validateNewtonChatAuthorization,
    }
}