import JWT from 'jsonwebtoken';
import Bcrypt from 'bcryptjs';
import Database from './database/main.js'; 
import 'dotenv/config';

async function hash_password(password) {
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

async function verify_password(password, hashed_password) {
    return await Bcrypt.compare(password, hashed_password);
}

function generate_token(user) {
    try {
        if (!user || !user.email) {
            throw new Error('User object with an email is required');
        }
        const payload = { 
            email: user.email,
            id: user.id,
            newton: {
                chat: true,
                sdoc: {
                    assistance: true,
                },
                sdraw: {
                    assistance: false,
                },
                sstudy: {
                    assistance: false,
                }
            } 
        };
        const options = { expiresIn: process.env.AUTHENTICATION_TOKEN_EXPIRATION };
        return JWT.sign(payload, process.env.AUTHENTICATION_SECRET, options);
    } catch (error) {
        console.error('Error generating token:', error);
    }
}

function generate_refresh_token(user) {
    try {
        if (!user || !user.email) {
            throw new Error('User object with an email is required');
        }
        const payload = { email: user.email, id: user.id };
        const options = { expiresIn: process.env.AUTHENTICATION_REFRESH_TOKEN_EXPIRATION };
        return JWT.sign(payload, process.env.AUTHENTICATION_REFRESH_SECRET, options);
    } catch (error) {
        console.error('Error generating refresh token:', error);
    }
}

function verify_token(token) {
    try {
        if (!token) {
            return null;
        }
        return JWT.verify(token, process.env.AUTHENTICATION_SECRET);
    } catch (error) {
        console.error('Error verifying token:', error);
        return null;
    }
}

function verify_refresh_token(token) {
    try {
        if (!token) {
            return null;
        }
        return JWT.verify(token, process.env.AUTHENTICATION_REFRESH_SECRET);
    } catch (error) {
        console.error('Error verifying refresh token');
        return null;
    }
}

function validate_authorization(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const authorized = verify_token(token);
        if (!authorized) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        req.authorization = authorized;
        next();
    } catch (error) {
        console.error('Error validating token');
        return res.status(401).json({ error: 'Invalid token' });
    }
}

function validate_login_registration_input(req, res, next) {
    const { email, password } = req.body;
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string' || email.trim() === '' || password.trim() === '') {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    if (password.length < 4) {
        return res.status(400).json({ error: 'Password too short' });
    }
    next();
}

function sanatize_user_data(database_user_data) {
    if (!database_user_data) {
        return null;
    }
    return {
        id: database_user_data.id,
        email: database_user_data.email,
        displayName: database_user_data.display_name,
    };
}

async function authenticate_user(req, res, next) {
    const { email, password } = req.body;
    try {
        const user = await Database.users.find_by_email(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const is_password_valid = await verify_password(password, user.password);
        if (!is_password_valid) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        req.user = user;
        next();
    } catch (error) {
        console.error('Error authenticating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

async function is_email_in_use(req, res, next) {
    const { email } = req.body;
    try {
        const user = await Database.users.find_by_email(email);
        if (user) {
            return res.status(400).json({ error: 'Email already in use' });
        }
        next();
    } catch (error) {
        console.error('Error checking email:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}

// newton specific

async function validate_newton_chat_authorization(req, res, next) {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const authorized = verify_token(token);
        if (!authorized) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        if (authorized.newton.chat !== true) {
            return res.status(403).json({ error: 'Chat access denied' });
        }

        next();
    } catch (error) {
        console.error('Error validating chat token:', error);
        return res.status(401).json({ error: 'Invalid token' });
    }
}

export default {
    hash_password,
    verify_password,
    validate_authorization,
    sanatize_user_data,
    validate_login_registration_input,
    authenticate_user,
    is_email_in_use,
    newton: {
        validate_chat_authorization: validate_newton_chat_authorization,
    },
    JWT: {
        token: {
            verify: verify_token,
            generate: generate_token
        },
        refresh_token: {
            verify: verify_refresh_token,
            generate: generate_refresh_token,
        }
    }
}