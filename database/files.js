import Database from 'better-sqlite3';
const file_database = new Database('storage/files.sqlite', {});

// Create projects table
file_database.exec(`
    CREATE TABLE IF NOT EXISTS projects (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id      INTEGER NOT NULL,
        name         TEXT NOT NULL,
        description  TEXT,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    );
`);

// Create files table with project_id reference
file_database.exec(`
    CREATE TABLE IF NOT EXISTS files (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id      INTEGER NOT NULL,
        project_id   INTEGER,
        file_path    TEXT NOT NULL,
        file_type    TEXT NOT NULL,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
        content      TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id),
        FOREIGN KEY(project_id) REFERENCES projects(id)
    );
`);

// Create indexes
file_database.exec(`
    CREATE INDEX IF NOT EXISTS idx_files_user_id ON files (user_id);
`);
file_database.exec(`
    CREATE INDEX IF NOT EXISTS idx_files_project_id ON files (project_id);
`);
file_database.exec(`
    CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects (user_id);
`);

//
//
// FILES

async function findAllUserFiles(userId) {
    const stmt = file_database.prepare(`
        SELECT * FROM files
        WHERE user_id = ?
    `);
    return stmt.all(userId);
}

async function findFilesByProjectId(projectId) {
    const stmt = file_database.prepare(`
        SELECT * FROM files
        WHERE project_id = ?
    `);
    return stmt.all(projectId);
}

async function createFile(userId, projectId, filePath, fileType, content = null) {
    const stmt = file_database.prepare(`
        INSERT INTO files (user_id, project_id, file_path, file_type, content)
        VALUES (?, ?, ?, ?, ?)
    `);
    return stmt.run(userId, projectId, filePath, fileType, content);
}

//
//
// PROJECTS

async function findAllUserProjects(userId) {
    const stmt = file_database.prepare(`
        SELECT * FROM projects
        WHERE user_id = ?
        ORDER BY last_modified DESC
    `);
    return stmt.all(userId);
}

async function findProjectById(projectId) {
    const stmt = file_database.prepare(`
        SELECT * FROM projects
        WHERE id = ?
    `);
    return stmt.get(projectId);
}

async function createProject(userId, name, description = null) {
    const stmt = file_database.prepare(`
        INSERT INTO projects (user_id, name, description)
        VALUES (?, ?, ?)
    `);
    return stmt.run(userId, name, description);
}

async function updateProject(projectId, name, description) {
    const stmt = file_database.prepare(`
        UPDATE projects 
        SET name = ?, description = ?, last_modified = CURRENT_TIMESTAMP
        WHERE id = ?
    `);
    return stmt.run(name, description, projectId);
}

async function deleteProject(projectId) {
    // First delete all files associated with the project
    const deleteFiles = file_database.prepare(`
        DELETE FROM files WHERE project_id = ?
    `);
    deleteFiles.run(projectId);
    
    // Then delete the project
    const deleteProject = file_database.prepare(`
        DELETE FROM projects WHERE id = ?
    `);
    return deleteProject.run(projectId);
}

// Get project with all its files
async function getProjectWithFiles(projectId) {
    const project = await findProjectById(projectId);
    if (!project) return null;
    
    const files = await findFilesByProjectId(projectId);
    
    return {
        ...project,
        files
    };
}

export default {
    file: {
        findAllUserFiles: findAllUserFiles,
        findByProjectId: findFilesByProjectId,
        createFile,
    },
    project: {
        findAllUserProjects: findAllUserProjects,
        findById: findProjectById,
        create: createProject,
        update: updateProject,
        delete: deleteProject,
        withFiles: getProjectWithFiles,
    },
}