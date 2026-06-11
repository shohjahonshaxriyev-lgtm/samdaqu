import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import xlsx from 'xlsx';

// Load environment variables from root .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Load Telegram bot after environment variables are set
import('./telegramBot.js').catch(err => console.error('Failed to load Telegram bot:', err));
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const PORT = process.env.PORT || 5000;

// ==========================================
// UTILS: statsLogger.js
// ==========================================
const STATS_FILE = path.join(__dirname, 'data', 'stats.json');
const SETTINGS_FILE = path.join(__dirname, 'settings.json');
const COLUMN_MAPPING_FILE = path.join(__dirname, 'data', 'column-mapping.json');

function loadSettings() {
  if (!fs.existsSync(SETTINGS_FILE)) return {};
  return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8'));
}

function saveSettings(data) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
}

function loadColumnMapping() {
  try {
    const dir = path.dirname(COLUMN_MAPPING_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (!fs.existsSync(COLUMN_MAPPING_FILE)) return {};
    return JSON.parse(fs.readFileSync(COLUMN_MAPPING_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveColumnMapping(data) {
  const dir = path.dirname(COLUMN_MAPPING_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(COLUMN_MAPPING_FILE, JSON.stringify(data, null, 2));
}

const defaultStats = {
  totalSearches: 0,
  successfulSearches: 0,
  failedSearches: 0,
  lastSearches: [],
  popularSearches: {}
};

function initStats() {
  const dir = path.dirname(STATS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(STATS_FILE)) {
    fs.writeFileSync(STATS_FILE, JSON.stringify(defaultStats, null, 2), 'utf-8');
  }
}

function getStats() {
  try {
    initStats();
    const data = fs.readFileSync(STATS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    return defaultStats;
  }
}

function saveStats(stats) {
  try {
    initStats();
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf-8');
  } catch (error) {}
}

function logSearch(query, foundCount) {
  try {
    const stats = getStats();
    stats.totalSearches += 1;
    if (foundCount > 0) stats.successfulSearches += 1;
    else stats.failedSearches += 1;

    stats.lastSearches.unshift({ query, timestamp: new Date().toISOString(), foundCount });
    if (stats.lastSearches.length > 10) stats.lastSearches.pop();

    if (foundCount > 0) {
      stats.popularSearches[query] = (stats.popularSearches[query] || 0) + 1;
    }
    saveStats(stats);
  } catch (error) {}
}

// ==========================================
// UTILS: mockGenerator.js
// ==========================================
function generateMockExcel(outputPath) {
  try {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const data = [
      { "ID": "643129", "Sana": "29.05.2026", "day_name": "Juma", "start_time": "13:10", "end_time": "14:10", "exam_code": "KRM3020", "exam_name": "Poydevor muhandislik", "building": "Bosh bino", "Auditorya": "Boshbino-805", "student_name": "SHAHRIYEV", "student_surname": "SHOHJAHON" },
      { "ID": "643129", "Sana": "30.05.2026", "day_name": "Shanba", "start_time": "09:00", "end_time": "10:30", "exam_code": "MAT1010", "exam_name": "Oliy matematika", "building": "Kichik bino", "Auditorya": "Kichikbino-204", "student_name": "SHAHRIYEV", "student_surname": "SHOHJAHON" }
    ];

    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Imtihonlar");
    xlsx.writeFile(workbook, outputPath);
  } catch (error) {}
}

// ==========================================
// UTILS: excelParser.js
// ==========================================
function normalizeHeader(str) {
  if (!str) return '';
  return str.toString().toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

const MAPPING_RULES = {
  id: ['id', 'kod', 'identifikator', 'number', '№', 'no', 'tr', 'talabaid', 'studentid', 'studentnumber'],
  sana: ['sana', 'date', 'kun', 'time', 'sanaday'],
  day_name: ['dayname', 'day', 'haftakuni', 'hafta_kuni', 'kunnomi', 'hafta'],
  start_time: ['starttime', 'start', 'boshlanish', 'boshlanishvaqti', 'darsboshlanishi', 'soat', 'boshlanishi'],
  end_time: ['endtime', 'end', 'tugash', 'tugashvaqti', 'darstugashi', 'tugashi'],
  exam_code: ['examcode', 'examid', 'fankodi', 'predmetkodi', 'fankod'],
  exam_name: ['examname', 'exam', 'fan', 'fannomi', 'predmet', 'dars', 'fannom'],
  auditorya: ['auditorya', 'auditoriya', 'auditory', 'xona', 'xonanomi', 'auditorium', 'auditoriyalar', 'room'],
  student_name: ['studentname', 'name', 'ism', 'student', 'talabaismi', 'firstname', 'talaba_ismi'],
  student_surname: ['studentsurname', 'surname', 'familya', 'familiya', 'talabafamiliyasi', 'lastname', 'talaba_familiyasi'],
  student_fullname: ['talabafi', 'fio', 'fish', 'fullname', 'talabafio', 'talabafish', 'f_i_o'],
  stul_raqami: ['stulraqami', 'stul', 'seat', 'seatnumber', 'orin', 'orinraqami', 'chair', 'joy', 'joyraqami']
};

function mapExcelData(sheetJson) {
  if (!sheetJson || sheetJson.length === 0) return [];
  const firstRow = sheetJson[0];
  const headers = Object.keys(firstRow);
  const headerMap = {};
  const mappedHeaders = new Set();

  // 1-qadam: Custom mapping'ni yuklash (admin tomonidan belgilangan)
  const customMapping = loadColumnMapping();
  Object.entries(customMapping).forEach(([schemaKey, excelHeader]) => {
    if (excelHeader && headers.includes(excelHeader)) {
      headerMap[schemaKey] = excelHeader;
      mappedHeaders.add(excelHeader);
    }
  });

  // 2-qadam: Qolgan maydonlar uchun MAPPING_RULES bo'yicha avtomatik mapping
  Object.entries(MAPPING_RULES).forEach(([schemaKey, aliases]) => {
    if (headerMap[schemaKey]) return; // custom mapping allaqachon bor
    const matchedHeader = headers.find(h => !mappedHeaders.has(h) && aliases.includes(normalizeHeader(h)));
    if (matchedHeader) { headerMap[schemaKey] = matchedHeader; mappedHeaders.add(matchedHeader); }
  });

  const EXCLUSIONS = {
    exam_name: ['date', 'sana', 'kod', 'code', 'vaqt', 'time'],
    student_name: ['surname', 'familya', 'familiya', 'last', 'sharif', 'fam'],
    sana: ['time', 'soat', 'boshlanish', 'tugash', 'start', 'end']
  };

  Object.entries(MAPPING_RULES).forEach(([schemaKey, aliases]) => {
    if (headerMap[schemaKey]) return;
    const matchedHeader = headers.find(h => {
      if (mappedHeaders.has(h)) return false;
      const normalized = normalizeHeader(h);
      if ((EXCLUSIONS[schemaKey] || []).some(exc => normalized.includes(exc))) return false;
      return aliases.some(alias => normalized.includes(alias));
    });
    if (matchedHeader) { headerMap[schemaKey] = matchedHeader; mappedHeaders.add(matchedHeader); }
  });

  return sheetJson.map(row => {
    const normalizedRow = {};
    Object.keys(MAPPING_RULES).forEach(schemaKey => {
      const sheetHeader = headerMap[schemaKey];
      normalizedRow[schemaKey] = (sheetHeader !== undefined && row[sheetHeader] !== undefined) ? row[sheetHeader].toString().trim() : '';
    });
    const extra = {};
    headers.forEach(h => {
      if (!mappedHeaders.has(h)) extra[h] = row[h] !== undefined ? row[h].toString().trim() : '';
    });
    if (normalizedRow.id) normalizedRow.id = normalizedRow.id.replace(/\.0$/, '');
    return { ...normalizedRow, extra };
  });
}

function readExcelFile(filePath) {
  if (!fs.existsSync(filePath)) throw new Error('Fayl topilmadi');
  const workbook = xlsx.readFile(filePath, { codepage: 65001 });
  const rawData = xlsx.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false, defval: '' });
  return mapExcelData(rawData);
}

function getActiveExcelPath(uploadsDir) {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  const files = fs.readdirSync(uploadsDir).filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'))
    .map(f => ({ name: f, time: fs.statSync(path.join(uploadsDir, f)).mtime.getTime() }))
    .sort((a, b) => b.time - a.time);
  return files.length > 0 ? path.join(uploadsDir, files[0].name) : null;
}

// ==========================================
// EXPRESS SERVER SETUP
// ==========================================
const app = express();
app.use(cors());
app.use(express.json());

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
const activePath = getActiveExcelPath(UPLOADS_DIR);
// if (!activePath) generateMockExcel(path.join(UPLOADS_DIR, 'imtihonlar_shabloni.xlsx'));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => cb(null, `imtihon_jadvali_${Date.now()}${path.extname(file.originalname)}`)
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.xlsx' || ext === '.xls') cb(null, true);
    else cb(new Error('Faqat Excel yuklash mumkin!'));
  }
});

// ==========================================
// IN-MEMORY CACHE - Excel faylni faqat 1 marta o'qiydi
// ==========================================
let cachedData = null;
let cachedFileName = null;

function loadData() {
  const activeFile = getActiveExcelPath(UPLOADS_DIR);
  if (!activeFile) { cachedData = null; cachedFileName = null; return null; }
  const currentName = path.basename(activeFile);
  if (cachedData && cachedFileName === currentName) return cachedData;
  cachedData = readExcelFile(activeFile);
  cachedFileName = currentName;
  console.log(`Excel yuklandi va xotiraga saqlandi: ${currentName} (${cachedData.length} qator)`);
  return cachedData;
}

// Server ishga tushganda darhol yuklash
loadData();

app.listen(PORT, '0.0.0.0', () => console.log(`Server listening on http://0.0.0.0:${PORT}`));
export { loadData, getActiveExcelPath, readExcelFile };

app.get('/api/stats', (req, res) => {
  try {
    const data = loadData();
    if (!data) return res.json({ activeFile: null, totalRows: 0, columns: [], stats: getStats() });
    let columns = data.length > 0 ? Object.keys(data[0]).filter(k => k !== 'extra') : [];
    if (data.length > 0 && data[0].extra) columns = [...columns, ...Object.keys(data[0].extra)];
    res.json({ activeFile: cachedFileName, totalRows: data.length, columns, stats: getStats() });
  } catch (error) {
    res.status(500).json({ error: 'Xatolik' });
  }
});

app.get('/api/settings', (req, res) => {
  try {
    res.json(loadSettings());
  } catch (error) {
    res.status(500).json({ error: 'Xatolik' });
  }
});

app.get('/api/excel-headers', (req, res) => {
  try {
    const activeFile = getActiveExcelPath(UPLOADS_DIR);
    if (!activeFile) return res.json({ headers: [] });
    const workbook = xlsx.readFile(activeFile, { codepage: 65001 });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawData = xlsx.utils.sheet_to_json(sheet, { raw: false, defval: '' });
    if (rawData.length === 0) return res.json({ headers: [] });
    res.json({ headers: Object.keys(rawData[0]) });
  } catch (error) {
    res.status(500).json({ error: 'Excel ustunlarini olishda xatolik' });
  }
});

app.get('/api/column-mapping', (req, res) => {
  try {
    res.json(loadColumnMapping());
  } catch (error) {
    res.status(500).json({ error: 'Xatolik' });
  }
});

app.post('/api/column-mapping', (req, res) => {
  try {
    const mapping = req.body;
    // Faqat bo'sh bo'lmagan qiymatlarni saqlash
    const cleaned = {};
    Object.entries(mapping).forEach(([key, value]) => {
      if (value && value.trim()) cleaned[key] = value.trim();
    });
    saveColumnMapping(cleaned);
    // Mapping o'zgarganda cache'ni tozalash — keyingi qidiruvda qayta yuklanadi
    cachedData = null;
    cachedFileName = null;
    loadData();
    res.json({ message: 'Ustun sozlamalari saqlandi', mapping: cleaned });
  } catch (error) {
    res.status(500).json({ error: 'Saqlashda xatolik' });
  }
});

app.post('/api/settings', (req, res) => {
  try {
    const newSettings = { ...loadSettings(), ...req.body };
    saveSettings(newSettings);
    res.json({ message: 'Saqlandi', settings: newSettings });
  } catch (error) {
    res.status(500).json({ error: 'Saqlashda xatolik' });
  }
});

app.post('/api/search', (req, res) => {
  try {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: "ID kiritilmagan" });
    const data = loadData();
    if (!data) { logSearch(id.toString(), 0); return res.status(404).json({ error: "Hozircha serverga imtihon jadvallari yuklanmagan. Kuting!" }); }
    const queryStr = id.toString().trim().toLowerCase();
    const results = data.filter(row => row.id && row.id.toString().trim().toLowerCase() === queryStr);
    logSearch(id.toString(), results.length);

    // For each result, compute room stats: how many students share same auditorya+sana, and student's order
    const enriched = results.map(row => {
      const sameRoom = data.filter(r =>
        r.auditorya && row.auditorya &&
        r.auditorya.toString().trim().toLowerCase() === row.auditorya.toString().trim().toLowerCase() &&
        r.sana && row.sana &&
        r.sana.toString().trim() === row.sana.toString().trim() &&
        r.start_time && row.start_time &&
        r.start_time.toString().trim() === row.start_time.toString().trim()
      );
      // Sort by id to get consistent order number
      sameRoom.sort((a, b) => a.id.toString().localeCompare(b.id.toString(), undefined, { numeric: true }));
      const orderInRoom = sameRoom.findIndex(r => r.id.toString().trim().toLowerCase() === queryStr) + 1;
      return {
        ...row,
        roomStats: {
          totalInRoom: sameRoom.length,
          orderInRoom,
        }
      };
    });

    res.json(enriched);
  } catch (error) {
    res.status(500).json({ error: 'Qidiruv xatosi' });
  }
});

app.post('/api/upload', upload.single('excelFile'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Fayl yuklanmadi' });
    const filePath = req.file.path;
    try {
      const data = readExcelFile(filePath);
      // Yangi fayl yuklanganda cache yangilanadi
      cachedData = data;
      cachedFileName = req.file.filename;
      res.json({ message: 'Yuklandi', fileName: req.file.filename, totalRows: data.length });
    } catch (e) {
      fs.unlinkSync(filePath);
      res.status(400).json({ error: 'Excel oqilmadi' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Yuklash xatosi' });
  }
});

app.delete('/api/upload', (req, res) => {
  try {
    const activeFile = getActiveExcelPath(UPLOADS_DIR);
    if (!activeFile) {
      return res.status(404).json({ error: 'O`chirish uchun fayl topilmadi' });
    }
    
    // Hamma fayllarni o'chirish (agar eski fayllar ham bo'lsa tozalab yuboramiz)
    const files = fs.readdirSync(UPLOADS_DIR);
    files.forEach(file => {
      if (file.endsWith('.xlsx') || file.endsWith('.xls')) {
        fs.unlinkSync(path.join(UPLOADS_DIR, file));
      }
    });

    // Cache'ni tozalash
    cachedData = null;
    cachedFileName = null;

    res.json({ message: 'Excel ma`lumotlari muvaffaqiyatli o`chirildi' });
  } catch (error) {
    res.status(500).json({ error: 'Faylni o`chirishda xatolik yuz berdi' });
  }
});

app.use((err, req, res, next) => {
  res.status(400).json({ error: err.message });
});

// Serve frontend static files
const FRONTEND_BUILD_DIR = path.join(__dirname, '../frontend/dist');
app.use(express.static(FRONTEND_BUILD_DIR));

app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(FRONTEND_BUILD_DIR, 'index.html'));
  }
});

// Duplicate export removed – kept earlier export at line 218
