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

function get_token_expiration(token) {
    const decoded = jwt.decode(token);
    if (decoded && decoded.exp) {
        // exp is in seconds since epoch
        return moment(new Date()).format('YYYY-MM-DD HH:mm:ss');
    }
    return null;
}

async function store_refresh_token(user_id, token) {
    const stmt = user_database.prepare(`
        INSERT INTO refresh_tokens (user_id, token, expires_at)
        VALUES (?, ?, ?)
    `);
    return stmt.run(user_id, token, get_token_expiration(token));
}

async function find_refresh_token(token) {
    const stmt = user_database.prepare(`
        SELECT * FROM refresh_tokens WHERE token = ?
    `);
    return stmt.get(token);
}

async function delete_refresh_token(token) {
    const stmt = user_database.prepare(`
        DELETE FROM refresh_tokens WHERE token = ?
    `);
    return stmt.run(token);
}

async function delete_all_refresh_tokens_for_user(user_id) {
    const stmt = user_database.prepare(`
        DELETE FROM refresh_tokens WHERE user_id = ?
    `);
    return stmt.run(user_id);
}

async function delete_expired_refresh_tokens() {
    const now = new Date().toISOString();
    const stmt = user_database.prepare(`DELETE FROM refresh_tokens WHERE expires_at < ?`);
    stmt.run(now);
}
setInterval(delete_expired_refresh_tokens, 24 * 60 * 60 * 1000); // every 24 hours
delete_expired_refresh_tokens(); // cold start - clean up

//
//
// users

async function register_user(email, password, display_name) {
    const hashed_password = await Authentication.hash_password(password);

    const stmt = user_database.prepare(`
        INSERT INTO users (email, password, display_name)
        VALUES (?, ?, ?)
    `);
    return stmt.run(email, hashed_password, display_name);
}

async function find_user_by_email(email) {
    const stmt = user_database.prepare(`
        SELECT * FROM users
        WHERE email = ?
    `);
    return stmt.get(email);
}

async function find_user_by_id(id) {
    const stmt = user_database.prepare(`
        SELECT * FROM users
        WHERE id = ?
    `);
    return stmt.get(id);
}

async function delete_user_with_id(id) {
    const stmt = user_database.prepare(`
        DELETE FROM users
        WHERE id = ?
    `);
    return stmt.run(id);
}

async function delete_user_with_email(email) {
    const stmt = user_database.prepare(`
        DELETE FROM users
        WHERE email = ?
    `);
    return stmt.run(email);
}




//

export default {
    register: register_user,
    find_by_email: find_user_by_email,
    find_by_id: find_user_by_id,
    delete_by_id: delete_user_with_id,
    delete_by_email: delete_user_with_email,
    refresh_tokens: {
        store: store_refresh_token,
        find: find_refresh_token,
        delete: delete_refresh_token,
        delete_all_for_user: delete_all_refresh_tokens_for_user,
    }
}
