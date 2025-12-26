import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = '7d';

export async function hashPassword(password) {
    return bcrypt.hash(password, 12);
}

export async function verifyPassword(password, hashedPassword) {
    return bcrypt.compare(password, hashedPassword);
}

export function signToken(payload) {
    return jwt.sign(payload, JWT_SECRET, {
        expiresIn: JWT_EXPIRES_IN
    });
}

export function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET)
    } catch {
        return null;
    }
}