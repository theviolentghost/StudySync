import env from 'dotenv';
env.config();
import Express from 'express';
import CORS from 'cors';
import Authentication from './authentication.js';
import Database from './database/users.js';
import youtubeSearch from './youtube-search.js'; 
import youtubeChannelSearch from './youtube-channel-search.js';
import youtubePlaylist from './youtube-playlist.js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = Express();

const port = process.env.PORT || 8080;

app.use(CORS());
app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));

//
//
// Auth

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

//
//
// Projects

app.get('/user/:userId/projects', 
    Authentication.validateAuthorization,
    async (req, res) => {
        try {
            // use userId so other users can access public projects
            const userId = req.params.userId;
            
            const projects = await Database.project.findAllUserProjects(userId);
            if(!projects || projects.length === 0) {
                return res.status(404).json({ error: 'No projects found for this user' });
            }

            res.json(projects);
        } catch (error) {
            console.error('Error fetching projects:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);
app.get('/user/projects/:projectId',
    Authentication.validateAuthorization,
    async (req, res) => {
        try {
            const projectId = req.params.projectId;

            const project = await Database.project.findById(projectId);
            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            const files = await Database.file.findFilesByProjectId(projectId);
            if (!files) {
                return res.status(404).json({ error: 'No files found for this project' });
            }

            res.json({ ...project, files });
        } catch(error) {
            console.error('Error fetching project:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);
app.get('/user/projects/:projectId/files',
    Authentication.validateAuthorization,
    async (req, res) => {
        try {
            const projectId = req.params.projectId;

            const files = await Database.file.findFilesByProjectId(projectId);
            if (!files || files.length === 0) {
                return res.status(404).json({ error: 'No files found for this project' });
            }

            res.json(files);
        } catch (error) {
            console.error('Error deleting project:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);
app.get('/user/files/:fileId',
    Authentication.validateAuthorization,
    async (req, res) => {
        try {
            const fileId = req.params.fileId;
            if (!fileId) {
                return res.status(400).json({ error: 'File ID is required' });
            }
            const file = await Database.files.findById(fileId);
            if (!file) {
                return res.status(404).json({ error: 'File not found' });
            }

            res.json(file);
        } catch (error) {
            console.error('Error fetching file:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

//
//
// Newton

app.post('/newton/chat',
    Authentication.newton.validateChatAuthorization,
    (req, res) => {
        // Handle chat request
    }
)

app.get('/youtube_search', async (req, res) => {
    const query = req.query.q;
    const maxResults = req.query.maxResults || 5;
    const nextPageToken = req.query.nextPageToken || '';

    if (!query) {
        return res.status(400).json({ error: 'Search query is required' });
    }
    try {
        const results = await youtubeSearch.search(query,  maxResults, nextPageToken);

        res.json(results);
    } catch (error) {
        console.error('Error searching videos:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/youtube_full_channel', async (req, res) => {
    const id = req.query.id;

    if (!id) {
        return res.status(400).json({ error: 'id is required' });
    }
    try {
        const results = await youtubeChannelSearch.getFullChannel(id);;

        res.json(results);
    } catch (error) {
        console.error('Error searching videos:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/youtube_get_channel_playlists', async (req, res) => {
    const id = req.query.id;

    if (!id) {
        return res.status(400).json({ error: 'id is required' });
    }
    try {
        const results = await youtubePlaylist.getChannelPlaylists(id);

        res.json(results);
    } catch (error) {
        console.error('Error searching videos:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/youtube_get_playlist_videos', async (req, res) => {
    const id = req.query.id;
    const nextPageToken = req.query.nextPageToken;


    if (!id) {
        return res.status(400).json({ error: 'id is required' });
    }
    try {
        const results = await youtubePlaylist.getPlaylistVideos(id, nextPageToken);

        res.json(results);
    } catch (error) {
        console.error('Error searching videos:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.use('/', Express.static(
    path.join(__dirname, 'frontend/dist/my-angular-app/browser'),
    {
        setHeaders: (res, filePath) => {
            // console.log(filePath);
            if (filePath.endsWith('index.html')) {
                res.setHeader('Cache-Control', 'no-store');
            }
        }
    }
));

app.get('/.well-known/appspecific/:path', (req, res) => {
    res.status(404).end(); // Just return 404 for DevTools requests
});

// Serve the Angular study app (this should be LAST)
app.get(/.*/, (req, res) => {
    
    res.sendFile(
        path.join(__dirname, 'frontend/dist/my-angular-app/browser/index.html')
    );
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
