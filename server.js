import Express from 'express';
import CORS from 'cors';
import Authentication from './authentication.js';
import Database from './database/main.js';
import Music from './music.js'; 
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import 'dotenv/config';

const app = Express();

//
//
// Get local network IPv4 address
function get_local_external_IP() {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return '127.0.0.1';
}

const port = process.env.PORT || 3000;
const host = get_local_external_IP() || '0.0.0.0';

app.use(CORS());
app.use(Express.json());
app.use(Express.urlencoded({ extended: true }));

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Serve static files for music app
app.use('/', Express.static(path.join(__dirname, 'frontend/dist/my-angular-app/browser')));
app.use('/music', Express.static(path.join(__dirname, 'frontend/dist/music/browser')));

//
//
// Auth

app.post('/auth/register',
    Authentication.validate_login_registration_input,
    Authentication.is_email_in_use,
    async (req, res) => {
        const { email, password, displayName } = req.body;

        try {
            const result = await Database.users.register(email, password, displayName);
            if (!result) {
                return res.status(500).json({ error: 'Registration failed' });
            }

            const newUserData = await Database.users.find_by_email(email);

            const token = Authentication.JWT.token.generate(newUserData);
            const refreshToken = Authentication.JWT.refresh_token.generate(newUserData);
            if (!token || !refreshToken) {
                Database.users.delete_by_email(email);
                return res.status(500).json({ error: 'Registration failed' });
            }

            Database.users.refresh_tokens.store(newUserData.id, refreshToken);

            res.status(201).json({
                message: 'User registered successfully',
                token,
                refreshToken,
                user: Authentication.sanatize_user_data(newUserData),
            });
        } catch (error) {
            console.error('Error during registration:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

app.post('/auth/login',
    Authentication.validate_login_registration_input,
    Authentication.authenticate_user,
    async (req, res) => {
        const user = req.user;
        try {
            const token = Authentication.JWT.token.generate(user);
            const refreshToken = Authentication.JWT.refresh_token.generate(user);
            if (!token || !refreshToken) {
                return res.status(401).json({ error: 'Token generation failed' });
            }
            Database.users.refresh_tokens.store(user.id, refreshToken);

            res.status(200).json({
                message: 'Login successful',
                token,
                refreshToken,
                user: Authentication.sanatize_user_data(user),
            });
        } catch (error) {
            console.error('Error during login:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

app.delete('/auth/logout',
    Authentication.validate_authorization,
    async (req, res) => {
        const { email, id } = req.user;
        try {
            const user = await Database.users.find_by_id(id);
            if (!user) {
                const userByEmail = await Database.users.find_by_email(email);
                if (!userByEmail) {
                    return res.status(404).json({ error: 'User not found' });
                }
            }

            const result = await Database.users.refresh_tokens.delete(user.id);
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
    Authentication.validate_authorization,
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
);

app.post('/auth/refresh',
    async (req, res) => {
        try {
            const refreshToken = req.body.refreshToken;
            if(!refreshToken) return res.status(401).json({error: "No refresh token provided"});
            
            const tokenRecord = await Database.users.refresh_tokens.find(refreshToken);
            if (!tokenRecord) return res.status(403).json({ error: 'Invalid refresh token' });

            const verification = Authentication.JWT.refresh_token.verify(refreshToken);
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
    Authentication.validate_authorization,
    async (req, res) => {
        try {
            const user = req.authorization;
            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const userData = await Database.users.find_by_id(user.id);
            if (!userData) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json(Authentication.sanatize_user_data(userData));
        } catch (error) {
            console.error('Error fetching user info:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

//
//
// Projects

app.get('/user/projects/all', 
    Authentication.validate_authorization,
    async (req, res) => {
        try {
            const user = req.authorization;
            if (!user || !user.id) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            
            const projects = await Database.storage.project.find_all_user_projects(user.id);
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
app.get('/user/projects/hierarchy',
    Authentication.validate_authorization,
    async (req, res) => {
        try {
            const user = req.authorization;
            if (!user || !user.id) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            const hierarchy = await Database.storage.hierarchy.get_user_project_hierarchy(user.id);
            if (!hierarchy || hierarchy.length === 0) {
                return res.status(404).json({ error: 'No projects found for this user' });
            }

            res.json(hierarchy);
        } catch (error) {
            console.error('Error fetching hierarchy:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
)
app.get('/user/project/:projectId',
    Authentication.validate_authorization,
    async (req, res) => {
        try {
            const projectId = req.params.projectId;
            if (!projectId) {
                return res.status(400).json({ error: 'Project ID is required' });
            }

            const project = await Database.storage.project.findById(projectId);
            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }

            const files = await Database.storage.file.find_by_project_id(projectId);
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
app.post('/user/folder/create',
    Authentication.validate_authorization,
    async (req, res) => {
        const { name, parentId } = req.body;
        const user = req.authorization;

        if (!name || !user || !user.id) {
            return res.status(400).json({ error: 'Name and user ID are required' });
        }

        try {
            const folder = await Database.storage.folder.create(user.id, name, parentId);
            if (!folder) {
                return res.status(500).json({ error: 'Failed to create folder' });
            }

            res.status(201).json(folder);
        } catch (error) {
            console.error('Error creating folder:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);
app.post('/user/group/create',
    Authentication.validate_authorization,
    async (req, res) => {
        const { name, parentId } = req.body;
        const user = req.authorization;

        if (!name || !user || !user.id) {
            return res.status(400).json({ error: 'Name and user ID are required' });
        }

        try {
            const group = await Database.storage.group.create(user.id, parentId, name);
            if (!group) {
                return res.status(500).json({ error: 'Failed to create group' });
            }

            res.status(201).json(group);
        } catch (error) {
            console.error('Error creating group:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);
app.post('/user/project/create',
    Authentication.validate_authorization,
    async (req, res) => {
        const { name, description, type, groupId } = req.body;
        const user = req.authorization;

        if (!name || !type || !user || !user.id) {
            return res.status(400).json({ error: 'Name, type and user ID are required' });
        }

        try {
            const project = await Database.storage.project.create(user.id, groupId, name, description, type);
            if (!project) {
                return res.status(500).json({ error: 'Failed to create project' });
            }

            res.status(201).json(project);
        } catch (error) {
            console.error('Error creating project:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);
app.post('/user/file/create',
    Authentication.validate_authorization,
    async (req, res) => {
        const {fileName, filePath, fileType, projectId, data } = req.body;
        const user = req.authorization;

        if (!filePath || !fileType || !projectId || !user || !user.id) {
            return res.status(400).json({ error: 'Project ID, File Name, File Path, File Type and User ID are required' });
        }

        try {
            const file = await Database.storage.file.create(user.id, projectId, fileName, filePath, fileType, data);
            if (!file) {
                return res.status(500).json({ error: 'Failed to create file' });
            }

            res.status(201).json(file);
        } catch (error) {
            console.error('Error creating file:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

// gets all files, including data. not recommended for large projects
app.get('/user/project/:projectId/files',
    Authentication.validate_authorization,
    async (req, res) => {
        try {
            const projectId = req.params.projectId;
            if (!projectId) {
                return res.status(400).json({ error: 'Project ID is required' });
            }

            const files = await Database.storage.file.find_by_project_id(projectId);
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
// get all file meta data project
app.get('/user/project/:projectId/files/meta',
    Authentication.validate_authorization,
    async (req, res) => {
        try {
            const projectId = req.params.projectId;
            if (!projectId) {
                return res.status(400).json({ error: 'Project ID is required' });
            }

            const files = await Database.storage.file.find_file_metadatas_by_project_id(projectId);
            if (!files || files.length === 0) {
                return res.status(404).json({ error: 'No files found for this project' });
            }

            res.json(files);
        } catch (error) {
            console.error('Error fetching file metadata:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);
app.get('/user/file/:fileId',
    Authentication.validate_authorization,
    async (req, res) => {
        try {
            const fileId = req.params.fileId;
            if (!fileId) {
                return res.status(400).json({ error: 'File ID is required' });
            }
            const file = await Database.storage.file.find_by_id(fileId);
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
app.put('/user/file/:fileId',
    Authentication.validate_authorization,
    async (req, res) => {
        try {
            const fileId = req.params.fileId;
            const { data } = req.body;
            // fileName, filePath, fileType are not used in update_data
            if (!fileId) {
                return res.status(400).json({ error: 'File ID is required' });
            }

            const updatedFile = await Database.storage.file.update_data(fileId, data);
            if (!updatedFile) {
                return res.status(500).json({ error: 'Failed to update file' });
            }

            res.json(updatedFile);
        } catch (error) {
            console.error('Error updating file:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
);

//
//
// Newton

// app.post('/newton/chat',
//     Authentication.newton.validateChatAuthorization,
//     (req, res) => {
//         // Handle chat request
//     }
// )

//
//
// Music

app.get("/audio/:audio_path", async (req, res) => {
    const audio_path = req.params.audio_path;
    console.log('Fetching audio file:', audio_path);
    if (!audio_path) {
        return res.status(400).json({ error: 'Audio path is required' });
    }
    try {
        const audioData = await Music.get(audio_path);
        if (!audioData) {
            return res.status(404).json({ error: 'Audio file not found' });
        }
        res.setHeader('Content-Type', 'audio/mp3');
        res.send(audioData);
    } catch (error) {
        console.error('Error fetching audio file:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get(/.*/, (req, res) => {
    console.log('Wildcard route hit, serving index.html');
    console.log(req.url);
    res.sendFile(path.join(__dirname, 'frontend/dist/my-angular-app/browser/index.html'));
});

app.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});
