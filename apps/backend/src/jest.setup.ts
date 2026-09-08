import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env dari apps/backend/.env jika ada
dotenv.config({ path: path.resolve(__dirname, '../.env') });

process.env.TZ = 'Asia/Jakarta';
