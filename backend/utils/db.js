import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  ssl: connectionString ? { rejectUnauthorized: false } : false
});

export const query = (text, params) => pool.query(text, params);

export async function initDB() {
  if (!connectionString) {
    console.warn("⚠️ DATABASE_URL topilmadi. Ma'lumotlar bazasiga ulanib bo'lmadi.");
    return;
  }

  try {
    // 1. Users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(50) PRIMARY KEY,
        first_name VARCHAR(255) DEFAULT '',
        last_name VARCHAR(255) DEFAULT '',
        username VARCHAR(255) DEFAULT '',
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Settings table
    await query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(50) PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    // 3. Exams table
    await query(`
      CREATE TABLE IF NOT EXISTS exams (
        id VARCHAR(50),
        sana VARCHAR(50),
        day_name VARCHAR(50),
        start_time VARCHAR(50),
        end_time VARCHAR(50),
        exam_code VARCHAR(50),
        exam_name VARCHAR(255),
        building VARCHAR(100),
        auditorya VARCHAR(100),
        student_name VARCHAR(255),
        student_surname VARCHAR(255),
        student_fullname VARCHAR(255),
        stul_raqami VARCHAR(50),
        extra TEXT DEFAULT ''
      )
    `);
    
    // Index for fast search
    await query(`CREATE INDEX IF NOT EXISTS idx_exams_student_id ON exams (id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_exams_auditorya ON exams (auditorya)`);

    console.log("✅ PostgreSQL jadvallari tekshirildi va tayyor holatga keltirildi.");
  } catch (err) {
    console.error("❌ Ma'lumotlar bazasini initsializatsiya qilishda xatolik:", err.message);
  }
}

export async function getDbSettings() {
  if (!connectionString) return {};
  try {
    const res = await query("SELECT value FROM settings WHERE key = 'global_settings'");
    if (res.rows.length > 0) {
      return JSON.parse(res.rows[0].value);
    }
  } catch (e) {
    console.error("Sozlamalarni o'qishda xatolik:", e);
  }
  return {};
}

export async function saveDbSettings(settings) {
  if (!connectionString) return;
  try {
    await query(
      "INSERT INTO settings (key, value) VALUES ('global_settings', $1) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value",
      [JSON.stringify(settings)]
    );
  } catch (e) {
    console.error("Sozlamalarni saqlashda xatolik:", e);
  }
}

export async function getDbUsers() {
  if (!connectionString) return {};
  try {
    const res = await query("SELECT * FROM users");
    const users = {};
    res.rows.forEach(u => {
      users[u.id] = {
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        username: u.username,
        joinedAt: u.joined_at
      };
    });
    return users;
  } catch (e) {
    console.error("Foydalanuvchilarni yuklashda xatolik:", e);
    return {};
  }
}

export async function saveDbUser(u) {
  if (!connectionString) return;
  try {
    await query(
      "INSERT INTO users (id, first_name, last_name, username) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET first_name = EXCLUDED.first_name, last_name = EXCLUDED.last_name, username = EXCLUDED.username",
      [u.id, u.firstName || '', u.lastName || '', u.username || '']
    );
  } catch (e) {
    console.error("Foydalanuvchini saqlashda xatolik:", e);
  }
}

export async function saveDbExams(examsList) {
  if (!connectionString) return;
  try {
    // Eski ma'lumotlarni o'chirish
    await query("DELETE FROM exams");
    
    // 500 tadan qilib guruhlab bazaga yozamiz (so'rov hajmi cheklanmasligi uchun)
    const BATCH_SIZE = 500;
    for (let i = 0; i < examsList.length; i += BATCH_SIZE) {
      const batch = examsList.slice(i, i + BATCH_SIZE);
      const valueStrings = [];
      const values = [];
      let paramCount = 1;
      
      batch.forEach(row => {
        valueStrings.push(`($${paramCount}, $${paramCount+1}, $${paramCount+2}, $${paramCount+3}, $${paramCount+4}, $${paramCount+5}, $${paramCount+6}, $${paramCount+7}, $${paramCount+8}, $${paramCount+9}, $${paramCount+10}, $${paramCount+11}, $${paramCount+12}, $${paramCount+13})`);
        values.push(
          row.id || '',
          row.sana || '',
          row.day_name || '',
          row.start_time || '',
          row.end_time || '',
          row.exam_code || '',
          row.exam_name || '',
          row.building || '',
          row.auditorya || '',
          row.student_name || '',
          row.student_surname || '',
          row.student_fullname || '',
          row.stul_raqami || '',
          JSON.stringify(row.extra || {})
        );
        paramCount += 14;
      });
      
      const sql = `INSERT INTO exams (id, sana, day_name, start_time, end_time, exam_code, exam_name, building, auditorya, student_name, student_surname, student_fullname, stul_raqami, extra) VALUES ${valueStrings.join(', ')}`;
      await query(sql, values);
    }
    console.log(`✅ ${examsList.length} ta imtihon jadvallari bazaga saqlandi.`);
  } catch (e) {
    console.error("Imtihon jadvallarini saqlashda xatolik:", e);
    throw e;
  }
}
