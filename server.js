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

app.post('/register',
    Authentication.validateLoginRegistrationInput,
    Authentication.isEmailInUse,
    async (req, res) => {
        const { email, password, displayName } = req.body;

        try {
            const result = await Database.users.register(email, password, displayName);
            if (!result) {
                return res.status(500).json({ error: 'Registration failed' });
            }

            const token = Authentication.generateToken({ email });
            const refreshToken = Authentication.generateRefreshToken({ email });
            if (!token || !refreshToken) {
                // delete user from database if token generation fails
                Database.users.deleteByEmail(email);
                return res.status(500).json({ error: 'Registration failed' });
            }

            const newUserData = await Database.users.findByEmail(email);

            res.status(201).json({
                message: 'User registered successfully',
                token,
                user: Authentication.sanatizeUserData(newUserData),
            });
        } catch (error) {
            console.error('Error during registration:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);
app.post('/login',
    Authentication.validateLoginRegistrationInput,
    Authentication.authenticateUser,
    (req, res) => {
        const user = req.user;
        try {

            const token = Authentication.generateToken(user);
            const refreshToken = Authentication.generateRefreshToken(user);
            if (!token || !refreshToken) {
                return res.status(401).json({ error: 'Token generation failed' });
            }

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
app.delete('/logout',
    Authentication.validateAuthorization,
    (req, res) => {
        const { email } = req.user;
       
    }
);
app.get('/projects', 
    Authentication.validateAuthorization,
    (req, res) => {
        
    }
);
app.get('/projects/:id',
    Authentication.validateAuthorization,
    (req, res) => {
        
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
