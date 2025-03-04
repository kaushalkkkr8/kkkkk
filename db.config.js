import { drizzle } from 'drizzle-orm/node-postgres';
import pkg from 'pg';
const { Pool } = pkg
import dotenv from 'dotenv';

dotenv.config(); // Load .env variables

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Use your local PostgreSQL connection
});

export const db = drizzle(pool);