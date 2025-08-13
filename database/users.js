import jwt from 'jsonwebtoken';
import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import moment from 'moment';

const user_database = new sqlite3.Database('storage/users.sqlite');

// Create promisified versions of database methods
const db_all = promisify(user_database.all.bind(user_database));
const db_get = promisify(user_database.get.bind(user_database));
const db_run = promisify(user_database.run.bind(user_database));
const db_exec = promisify(user_database.exec.bind(user_database));

import Authentication from "../authentication.js";

// Initialize database tables
async function initializeUserDatabase() {
    try {
        await db_exec(`
            CREATE TABLE IF NOT EXISTS users (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                email        TEXT UNIQUE NOT NULL,
                password     TEXT NOT NULL,
                display_name TEXT,
                created_at   DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        await db_exec(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id           INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id      INTEGER NOT NULL,
                token        TEXT NOT NULL,
                created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
                expires_at   DATETIME,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );
        `);
        
        console.log('User database initialized successfully');
    } catch (error) {
        console.error('Error initializing user database:', error);
        throw error;
    }
}

// Call initialization
initializeUserDatabase();

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
    return await db_run(
        `INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)`,
        [user_id, token, get_token_expiration(token)]
    );
}

async function find_refresh_token(token) {
    return await db_get(
        `SELECT * FROM refresh_tokens WHERE token = ?`,
        [token]
    );
}

async function delete_refresh_token(token) {
    return await db_run(
        `DELETE FROM refresh_tokens WHERE token = ?`,
        [token]
    );
}

async function delete_all_refresh_tokens_for_user(user_id) {
    return await db_run(
        `DELETE FROM refresh_tokens WHERE user_id = ?`,
        [user_id]
    );
}

async function delete_expired_refresh_tokens() {
    const now = new Date().toISOString();
    return await db_run(`DELETE FROM refresh_tokens WHERE expires_at < ?`, [now]);
}
setInterval(delete_expired_refresh_tokens, 24 * 60 * 60 * 1000); // every 24 hours
delete_expired_refresh_tokens(); // cold start - clean up

// users

async function register_user(email, password, display_name) {
    const hashed_password = await Authentication.hash_password(password);
    return await db_run(
        `INSERT INTO users (email, password, display_name) VALUES (?, ?, ?)`,
        [email, hashed_password, display_name]
    );
}

async function find_user_by_email(email) {
    return await db_get(
        `SELECT * FROM users WHERE email = ?`,
        [email]
    );
}

async function find_user_by_id(id) {
    return await db_get(
        `SELECT * FROM users WHERE id = ?`,
        [id]
    );
}

async function delete_user_with_id(id) {
    return await db_run(
        `DELETE FROM users WHERE id = ?`,
        [id]
    );
}

async function delete_user_with_email(email) {
    return await db_run(
        `DELETE FROM users WHERE email = ?`,
        [email]
    );
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
