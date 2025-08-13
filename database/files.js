import sqlite3 from 'sqlite3';
import { promisify } from 'util';

const file_database = new sqlite3.Database('storage/files.sqlite');

// Create promisified versions of database methods
const db_all = promisify(file_database.all.bind(file_database));
const db_get = promisify(file_database.get.bind(file_database));
const db_run = promisify(file_database.run.bind(file_database));
const db_exec = promisify(file_database.exec.bind(file_database));

// Initialize database tables
async function initializeDatabase() {
    try {
        // Disable foreign keys
        await db_exec('PRAGMA foreign_keys = OFF');        // Create folders table
        await db_exec(`
            CREATE TABLE IF NOT EXISTS folders (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id      INTEGER NOT NULL,
                parent_id    INTEGER,
                name         TEXT NOT NULL,
                type         TEXT DEFAULT 'FOLDER',
                created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create groups table
        await db_exec(`
            CREATE TABLE IF NOT EXISTS groups (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id      INTEGER NOT NULL,
                folder_id    INTEGER NOT NULL,
                name         TEXT NOT NULL,
                type         TEXT DEFAULT 'GROUP',
                created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Update projects table
        await db_exec(`
            CREATE TABLE IF NOT EXISTS projects (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id      INTEGER NOT NULL,
                group_id     INTEGER,
                name         TEXT NOT NULL,
                description  TEXT,
                type         TEXT DEFAULT 'project',
                created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_modified DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // Create files table
        await db_exec(`
            CREATE TABLE IF NOT EXISTS files (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id      INTEGER NOT NULL,
                project_id   INTEGER,
                file_name    TEXT NOT NULL,
                file_path    TEXT NOT NULL,
                file_type    TEXT NOT NULL,
                created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
                data      TEXT
            );
        `);

        // Create indexes
        await db_exec(`CREATE INDEX IF NOT EXISTS idx_files_user_id ON files (user_id);`);
        await db_exec(`CREATE INDEX IF NOT EXISTS idx_files_project_id ON files (project_id);`);
        await db_exec(`CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects (user_id);`);
        await db_exec(`CREATE INDEX IF NOT EXISTS idx_projects_group_id ON projects (group_id);`);
        await db_exec(`CREATE INDEX IF NOT EXISTS idx_groups_folder_id ON groups (folder_id);`);
        await db_exec(`CREATE INDEX IF NOT EXISTS idx_folders_user_id ON folders (user_id);`);
        await db_exec(`CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders (parent_id);`);
        
        console.log('Database initialized successfully');
    } catch (error) {
        console.error('Error initializing database:', error);
        throw error;
    }
}

// Call initialization
initializeDatabase();
// FOLDER FUNCTIONS

async function create_folder(user_id, name, parent_id = null) {
    if (parent_id !== null && parent_id !== -1) {
        const parent_exists = await db_get(
            `SELECT id FROM folders WHERE id = ? AND user_id = ?`,
            [parent_id, user_id]
        );
        if (!parent_exists) {
            throw new Error('Parent folder does not exist or does not belong to user');
        }
    }
    return await db_run(
        `INSERT INTO folders (user_id, parent_id, name) VALUES (?, ?, ?)`,
        [user_id, parent_id, name]
    );
}

async function find_user_folders(user_id) {
    return await db_all(
        `SELECT * FROM folders WHERE user_id = ? ORDER BY created_at ASC`,
        [user_id]
    );
}

async function find_root_folders(user_id) {
    return await db_all(
        `SELECT * FROM folders WHERE user_id = ? AND (parent_id IS NULL OR parent_id = -1) ORDER BY created_at ASC`,
        [user_id]
    );
}

async function find_subfolders(parent_id) {
    return await db_all(
        `SELECT * FROM folders WHERE parent_id = ? ORDER BY created_at ASC`,
        [parent_id]
    );
}

async function update_folder(folder_id, name, collapsed) {
    return await db_run(
        `UPDATE folders SET name = ?, collapsed = ? WHERE id = ?`,
        [name, collapsed, folder_id]
    );
}

// GROUP FUNCTIONS

async function create_group(user_id, folder_id, name) {
    return await db_run(
        `INSERT INTO groups (user_id, folder_id, name) VALUES (?, ?, ?)`,
        [user_id, folder_id, name]
    );
}

async function find_groups_by_folder(folder_id) {
    return await db_all(
        `SELECT * FROM groups WHERE folder_id = ? ORDER BY created_at ASC`,
        [folder_id]
    );
}

// PROJECT FUNCTIONS

async function find_all_user_projects(user_id) {
    return await db_all(
        `SELECT * FROM projects WHERE user_id = ? ORDER BY last_modified DESC`,
        [user_id]
    );
}

async function find_projects_by_group(group_id) {
    return await db_all(
        `SELECT * FROM projects WHERE group_id = ? ORDER BY last_modified DESC`,
        [group_id]
    );
}

async function find_project_by_id(project_id) {
    return await db_get(
        `SELECT * FROM projects WHERE id = ?`,
        [project_id]
    );
}

async function create_project(user_id, group_id, name, description = null, type = 'project') {
    return await db_run(
        `INSERT INTO projects (user_id, group_id, name, description, type) VALUES (?, ?, ?, ?, ?)`,
        [user_id, group_id, name, description, type]
    );
}

async function update_project(project_id, name, description) {
    return await db_run(
        `UPDATE projects SET name = ?, description = ?, last_modified = CURRENT_TIMESTAMP WHERE id = ?`,
        [name, description, project_id]
    );
}

async function delete_project(project_id) {
    await db_run(`DELETE FROM files WHERE project_id = ?`, [project_id]);
    return await db_run(`DELETE FROM projects WHERE id = ?`, [project_id]);
}

// FILE FUNCTIONS

async function find_all_user_files(user_id) {
    return await db_all(
        `SELECT * FROM files WHERE user_id = ?`,
        [user_id]
    );
}

async function find_files_by_project_id(project_id) {
    return await db_all(
        `SELECT * FROM files WHERE project_id = ?`,
        [project_id]
    );
}

async function find_file_metadatas_by_project_id(project_id) {
    return await db_all(
        `SELECT id, file_name, file_path, file_type, created_at, last_modified FROM files WHERE project_id = ?`,
        [project_id]
    );
}

async function find_file_by_id(file_id) {
    return await db_get(
        `SELECT * FROM files WHERE id = ?`,
        [file_id]
    );
}

async function create_file(user_id, project_id, file_name, file_path, file_type, data = null) {
    return await db_run(
        `INSERT INTO files (user_id, project_id, file_name, file_path, file_type, data) VALUES (?, ?, ?, ?, ?, ?)`,
        [user_id, project_id, file_name, file_path, file_type, JSON.stringify(data)]
    );
}

async function update_file_data(file_id, data) {
    const stringified_data = JSON.stringify(data);
    const result = await db_run(
        `UPDATE files SET data = ?, last_modified = CURRENT_TIMESTAMP WHERE id = ?`,
        [stringified_data, file_id]
    );
    return {
        ...result,
        data: stringified_data // return updated data for caching
    };
}

//
//
// HIERARCHICAL RETRIEVAL

// Recursive function to build nested folder structure
async function build_folder_hierarchy(folders, parent_id = null) {
    const children = folders.filter(folder => folder.parent_id === parent_id);
    
    return await Promise.all(children.map(async (folder) => {
        // Get subfolders
        const subfolders = await build_folder_hierarchy(folders, folder.id);
        
        // Get groups for this folder
        const groups = await find_groups_by_folder(folder.id);
        
        // Get projects for each group
        const groups_with_projects = await Promise.all(groups.map(async (group) => {
            const projects = await find_projects_by_group(group.id);
            
            return {
                id: `group_${group.id}`,
                name: group.name,
                type: 'GROUP',
                projects: projects.map(project => ({
                    id: `project_${project.id}`,
                    name: project.name,
                    type: project.type,
                    created_at: new Date(project.created_at),
                    updated_at: new Date(project.last_modified),
                    owner: project.user_id,
                    owner_name: 'User'
                }))
            };
        }));
        
        return {
            id: `folder_${folder.id}`,
            name: folder.name,
            type: 'FOLDER',
            collapsed: true,
            children: [...subfolders, ...groups_with_projects]
        };
    }));
}

async function get_user_project_hierarchy(user_id) {
    // Get all folders for the user
    const folders = await find_user_folders(user_id);
    
    // Build the hierarchy starting from root folders (parent_id = null)
    return await build_folder_hierarchy(folders, -1); // -1 is used for root folders
}

// Get project with all its files
async function get_project_with_files(project_id) {
    const project = await find_project_by_id(project_id);
    if (!project) return null;
    
    const files = await find_files_by_project_id(project_id);
    
    return {
        ...project,
        files
    };
}

export default {
    folder: {
        create: create_folder,
        find_by_user: find_user_folders,
        find_root: find_root_folders,
        find_subfolders: find_subfolders,
        update: update_folder,
    },
    group: {
        create: create_group,
        find_by_folder: find_groups_by_folder,
    },
    project: {
        find_all_user_projects: find_all_user_projects,
        find_by_id: find_project_by_id,
        find_by_group: find_projects_by_group,
        create: create_project,
        update: update_project,
        delete: delete_project,
        with_files: get_project_with_files,
    },
    file: {
        find_all_user_files: find_all_user_files,
        find_by_project_id: find_files_by_project_id,
        find_file_metadatas_by_project_id: find_file_metadatas_by_project_id,
        find_by_id: find_file_by_id,
        create: create_file,
        update_data: update_file_data,
    },
    hierarchy: {
        get_user_project_hierarchy,
    }
}