import env from 'dotenv';
env.config();
import Express from 'express';
import CORS from 'cors';
import Authentication from './authentication.js';
import Database from './database.js';

const app = Express();

const port = process.env.PORT || 8080;

app.use(CORS());
app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));

app.post('/auth/register',
    Authentication.validateLoginRegistrationInput,
    Authentication.isEmailInUse,
    async (req, res) => {
        const { email, password, displayName } = req.body;

        try {
            const result = await Database.users.register(email, password, displayName);
            if (!result) {
                return res.status(500).json({ error: 'Registration failed' });
            }

            const newUserData = await Database.users.findByEmail(email);

            const token = Authentication.JWT.token.generate(newUserData);
            const refreshToken = Authentication.JWT.refreshToken.generate(newUserData);
            if (!token || !refreshToken) {
                // delete user from database if token generation fails
                Database.users.deleteByEmail(email);
                return res.status(500).json({ error: 'Registration failed' });
            }

            Database.refreshTokens.store(newUserData.id, refreshToken);

            res.status(201).json({
                message: 'User registered successfully',
                token,
                refreshToken,
                user: Authentication.sanatizeUserData(newUserData),
            });
        } catch (error) {
            console.error('Error during registration:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);
app.post('/auth/login',
    Authentication.validateLoginRegistrationInput,
    Authentication.authenticateUser,
    async (req, res) => {
        const user = req.user;
        try {

            const token = Authentication.JWT.token.generate(user);
            const refreshToken = Authentication.JWT.refreshToken.generate(user);
            if (!token || !refreshToken) {
                return res.status(401).json({ error: 'Token generation failed' });
            }
            Database.refreshTokens.store(user.id, refreshToken);

            res.status(200).json({
                message: 'Login successful',
                token,
                refreshToken,
                user: Authentication.sanatizeUserData(user),
            });
        } catch (error) {
            console.error('Error during login:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);
app.delete('/auth/logout',
    Authentication.validateAuthorization,
    async (req, res) => {
        const { email, id } = req.user;
        try {
            const user = await Database.users.findById(id);
            if (!user) {
                // try email as fallback
                const userByEmail = await Database.users.findByEmail(email);
                if (!userByEmail) {
                    return res.status(404).json({ error: 'User not found' });
                }
            }

            const result = await Database.refreshTokens.delete(user.id);
            if (!result) {
                return res.status(500).json({ error: 'Logout failed' });
            }

            res.status(200).json({ message: 'Logout successful' });
        } catch (error) {
            console.error('Error during logout:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);
app.get('/auth/authorized',
    Authentication.validateAuthorization,
    async (req, res) => {
        try {
            const user = req.authorization;
            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            res.json({
                authorized: true,
                message: 'User is authorized',
            });
        } catch (error) {
            console.error('Error checking authorization:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
)
app.post('/auth/refresh',
    async (req, res) => {
        try {
            const refreshToken = req.body.refreshToken;
            if(!refreshToken) return res.status(401).json({error: "No refresh token provided"});
            
            const tokenRecord = await Database.refreshTokens.find(refreshToken);
            if (!tokenRecord) return res.status(403).json({ error: 'Invalid refresh token' });

            const verification = Authentication.JWT.refreshToken.verify(refreshToken);
            if(!verification) return res.status(403).json({ error: 'Invalid refresh token' });

            const accessToken = Authentication.JWT.token.generate(verification);
            if(!accessToken) return res.status(500).json({ error: "Error generating token" });

            res.json({ token: accessToken });
        } catch (error) {
            console.error('Error generating refresh token:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);
app.get('/auth/userinfo',
    Authentication.validateAuthorization,
    async (req, res) => {
        try {
            const user = req.authorization;
            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const userData = await Database.users.findById(user.id);
            if (!userData) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json(Authentication.sanatizeUserData(userData));
        } catch (error) {
            console.error('Error fetching user info:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

app.get('/user/:userId/projects', 
    Authentication.validateAuthorization,
    async (req, res) => {
        
    }
);
app.get('/user/:userId/projects/:id',
    Authentication.validateAuthorization,
    async (req, res) => {
        
    }
);



app.post('/newton/chat',
    Authentication.newton.validateChatAuthorization,
    (req, res) => {
        // Handle chat request
    }
)

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
