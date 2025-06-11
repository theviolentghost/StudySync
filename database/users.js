import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';
import moment from 'moment';
const user_database = new Database('storage/users.sqlite', {});

import Authentication from "../authentication.js";

user_database.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        email        TEXT UNIQUE NOT NULL,
        password     TEXT NOT NULL,
        display_name TEXT,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    );
`);

user_database.exec(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id      INTEGER NOT NULL,
        token        TEXT NOT NULL,
        created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
        expires_at   DATETIME,
        FOREIGN KEY(user_id) REFERENCES users(id)
    );
`);

//
//
// tokens

function getTokenExpiration(token) {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
        // exp is in seconds since epoch
        return moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
    }
    return null;
}
async function storeRefreshToken(userId, token) {
    const stmt = user_database.prepare(`
        INSERT INTO refresh_tokens (user_id, token, expires_at)
        VALUES (?, ?, ?)
    `);
    return stmt.run(userId, token, getTokenExpiration(token));
}
async function findRefreshToken(token) {
    const stmt = user_database.prepare(`
        SELECT * FROM refresh_tokens WHERE token = ?
    `);
    return stmt.get(token);
}
async function deleteRefreshToken(token) {
    const stmt = user_database.prepare(`
        DELETE FROM refresh_tokens WHERE token = ?
    `);
    return stmt.run(token);
}
async function deleteAllRefreshTokensForUser(userId) {
    const stmt = user_database.prepare(`
        DELETE FROM refresh_tokens WHERE user_id = ?
    `);
    return stmt.run(userId);
}
async function deleteExpiredRefreshTokens() {
    const now = new Date().toISOString();
    const stmt = user_database.prepare(`DELETE FROM refresh_tokens WHERE expires_at < ?`);
    stmt.run(now);
}
setInterval(deleteExpiredRefreshTokens, 24 * 60 * 60 * 1000); // every 24 hours
deleteExpiredRefreshTokens(); // cold start - clean up

//
//
// users

async function registerUser(email, password, displayName) {
    const hashedPassword = await Authentication.hashPassword(password);

    const stmt = user_database.prepare(`
        INSERT INTO users (email, password, display_name)
        VALUES (?, ?, ?)
    `);
    return stmt.run(email, hashedPassword, displayName);
}
async function findUserByEmail(email) {
    const stmt = user_database.prepare(`
        SELECT * FROM users
        WHERE email = ?
    `);
    return stmt.get(email);
}
async function findUserById(id) {
    const stmt = user_database.prepare(`
        SELECT * FROM users
        WHERE id = ?
    `);
    return stmt.get(id);
}
async function deleteUserWithId(id) {
    const stmt = user_database.prepare(`
        DELETE FROM users
        WHERE id = ?
    `);
    return stmt.run(id);
}
async function deleteUserWithEmail(email) {
    const stmt = user_database.prepare(`
        DELETE FROM users
        WHERE email = ?
    `);
    return stmt.run(email);
}




//

export default {
    register: registerUser,
    finuser_databaseyEmail: findUserByEmail,
    finuser_databaseyId: findUserById,
    deleteById: deleteUserWithId,
    deleteByEmail: deleteUserWithEmail,
    refreshTokens: {
        store: storeRefreshToken,
        find: findRefreshToken,
        delete: deleteRefreshToken,
        deleteAllForUser: deleteAllRefreshTokensForUser,
    }
}
