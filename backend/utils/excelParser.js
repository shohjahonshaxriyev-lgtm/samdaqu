import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';

// Normalizes header text for mapping
function normalizeHeader(str) {
  if (!str) return '';
  return str.toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, ''); // strip spaces and punctuation
}

// Fuzzy mapping rules
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
  student_surname: ['studentsurname', 'surname', 'familya', 'familiya', 'talabafamiliyasi', 'lastname', 'talaba_familiyasi']
};

/**
 * Maps Excel row objects using headers and returns sanitized JSON with fuzzy mapping.
 * Also appends any extra unmapped columns as is.
 */
export function mapExcelData(sheetJson) {
  if (!sheetJson || sheetJson.length === 0) return [];

  // Get all header keys from the first row object
  const firstRow = sheetJson[0];
  const headers = Object.keys(firstRow);
  
  // Find which sheet header corresponds to which schema field
  const headerMap = {}; // schemaField -> actualSheetHeader
  const mappedHeaders = new Set();

  // Phase 1: Exact matching (case-insensitive, non-alphanumeric stripped)
  Object.entries(MAPPING_RULES).forEach(([schemaKey, aliases]) => {
    const matchedHeader = headers.find(h => {
      const normalized = normalizeHeader(h);
      return aliases.includes(normalized);
    });

    if (matchedHeader) {
      headerMap[schemaKey] = matchedHeader;
      mappedHeaders.add(matchedHeader);
    }
  });

  // Strict exclusions for fuzzy phase to prevent collisions
  const EXCLUSIONS = {
    exam_name: ['date', 'sana', 'kod', 'code', 'vaqt', 'time'],
    student_name: ['surname', 'familya', 'familiya', 'last', 'sharif', 'fam'],
    sana: ['time', 'soat', 'boshlanish', 'tugash', 'start', 'end']
  };

  // Phase 2: Strict fuzzy matching for remaining unmapped keys
  Object.entries(MAPPING_RULES).forEach(([schemaKey, aliases]) => {
    if (headerMap[schemaKey]) return; // Skip if already mapped in Phase 1

    const matchedHeader = headers.find(h => {
      if (mappedHeaders.has(h)) return false; // Skip if this header was already mapped

      const normalized = normalizeHeader(h);

      // Check exclusions first
      const exclusions = EXCLUSIONS[schemaKey] || [];
      const hasExclusion = exclusions.some(exc => normalized.includes(exc));
      if (hasExclusion) return false;

      // Check if it matches any alias as a substring
      return aliases.some(alias => normalized.includes(alias));
    });

    if (matchedHeader) {
      headerMap[schemaKey] = matchedHeader;
      mappedHeaders.add(matchedHeader);
    }
  });

  // Map each row to normalized object
  return sheetJson.map(row => {
    const normalizedRow = {};
    
    // 1. Set known mapped properties
    Object.keys(MAPPING_RULES).forEach(schemaKey => {
      const sheetHeader = headerMap[schemaKey];
      if (sheetHeader !== undefined) {
        normalizedRow[schemaKey] = row[sheetHeader] !== undefined ? row[sheetHeader].toString().trim() : '';
      } else {
        normalizedRow[schemaKey] = ''; // default empty if not found
      }
    });

    // 2. Set extra properties that were not matched (to support absolute custom columns)
    const extra = {};
    headers.forEach(h => {
      if (!mappedHeaders.has(h)) {
        extra[h] = row[h] !== undefined ? row[h].toString().trim() : '';
      }
    });

    // Clean up IDs - sometimes parsed as float (e.g. 643129.0)
    if (normalizedRow.id) {
      normalizedRow.id = normalizedRow.id.replace(/\.0$/, '');
    }

    return {
      ...normalizedRow,
      extra
    };
  });
}

/**
 * Reads the active Excel file from uploads folder and returns mapped rows.
 */
export function readExcelFile(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error('Fayl topilmadi: ' + filePath);
    }

    const workbook = xlsx.readFile(filePath, { codepage: 65001 }); // UTF-8 Uzbek support
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    // Parse as JSON. raw: false preserves formatting, defval: '' returns empty string for blank cells
    const rawData = xlsx.utils.sheet_to_json(worksheet, { raw: false, defval: '' });
    
    return mapExcelData(rawData);
  } catch (error) {
    console.error('Excel file parsing error:', error);
    throw error;
  }
}

/**
 * Scans uploads folder for the latest spreadsheet.
 */
export function getActiveExcelPath(uploadsDir) {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const files = fs.readdirSync(uploadsDir)
    .filter(f => f.endsWith('.xlsx') || f.endsWith('.xls'))
    .map(f => ({
      name: f,
      time: fs.statSync(path.join(uploadsDir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time); // newest first

  if (files.length === 0) return null;
  return path.join(uploadsDir, files[0].name);
}
