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
            if (!token) {
                // delete user from database if token generation fails
                Database.users.deleteByEmail(email);
                return res.status(401).json({ error: 'Token generation failed' });
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

        const token = Authentication.generateToken(user);
        if (!token) {
            return res.status(401).json({ error: 'Token generation failed' });
        }

        res.status(200).json({
            message: 'Login successful',
            token,
            user: Authentication.sanatizeUserData(user),
        });
    }
);
app.get('/projects', 
    Authentication.validateAuthorization,
    (req, res) => {
        
    }
);

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
