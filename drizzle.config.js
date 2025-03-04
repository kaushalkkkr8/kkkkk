import dotenv from "dotenv";

dotenv.config();
import { defineConfig } from "drizzle-kit";

module.exports = defineConfig({
    dialect: "postgresql",
    out: "./migration",
    schema: "./schema.js",
    dbCredentials: {
        url: process.env.DATABASE_URL
    }
});
