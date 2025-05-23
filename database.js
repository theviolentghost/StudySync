import Database from 'better-sqlite3';
const db = new Database('storage/users.sqlite', {});

import Authentication from "./authentication.js";

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        email        TEXT UNIQUE NOT NULL,
        password     TEXT NOT NULL,
        display_name TEXT,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);
db.exec(`
    CREATE TABLE IF NOT EXISTS files (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id      INTEGER NOT NULL,
        file_path    TEXT NOT NULL,
        file_type    TEXT NOT NULL,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_modified DATETIME DEFAULT CURRENT_TIMESTAMP,
        content      TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    );
`);
db.exec(`
    CREATE INDEX IF NOT EXISTS idx_files_user_id ON files (user_id);
`);

/*

CREATE TABLE IF NOT EXISTS identities (
        id               INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id          INTEGER NOT NULL,
        provider         TEXT    NOT NULL,
        provider_user_id TEXT    NOT NULL,
        created_at       DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id)
    );

*/



//
//
// users

async function registerUser(email, password, displayName) {
    const hashedPassword = await Authentication.hashPassword(password);

    const stmt = db.prepare(`
        INSERT INTO users (email, password, display_name)
        VALUES (?, ?, ?)
    `);
    return stmt.run(email, hashedPassword, displayName);
}
async function findUserByEmail(email) {
    const stmt = db.prepare(`
        SELECT * FROM users
        WHERE email = ?
    `);
    return stmt.get(email);
}
async function findUserById(id) {
    const stmt = db.prepare(`
        SELECT * FROM users
        WHERE id = ?
    `);
    return stmt.get(id);
}
async function deleteUserWithId(id) {
    const stmt = db.prepare(`
        DELETE FROM users
        WHERE id = ?
    `);
    return stmt.run(id);
}
async function deleteUserWithEmail(email) {
    const stmt = db.prepare(`
        DELETE FROM users
        WHERE email = ?
    `);
    return stmt.run(email);
}

//
//
// files

async function findAllUsersFiles(userId) {
    const stmt = db.prepare(`
        SELECT * FROM files
        WHERE user_id = ?
    `);
    return stmt.all(userId);
}




//

export default {
    users: {
        register: registerUser,
        findByEmail: findUserByEmail,
        findById: findUserById,
        deleteById: deleteUserWithId,
        deleteByEmail: deleteUserWithEmail,
    },
    files: {
        allUserFiles: findAllUsersFiles,
    }
}
