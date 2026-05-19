import admin from "firebase-admin";
import dotenv from "dotenv";
import path from "path";
import { readFileSync } from "fs";

dotenv.config();

// Load service account JSON
const serviceAccountPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT);
const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, "utf-8"));

// Initialize Firebase Admin
const firebaseApp = admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DB_URL,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
});

// Services
const firestore = admin.firestore();
const realtimeDB = admin.database();

// ✅ Export properly (ESM only)
export { admin, firebaseApp, firestore, realtimeDB };
export default admin;