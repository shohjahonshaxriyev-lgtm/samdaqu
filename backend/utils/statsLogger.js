import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATS_FILE = path.join(__dirname, '..', 'data', 'stats.json');

const defaultStats = {
  totalSearches: 0,
  successfulSearches: 0,
  failedSearches: 0,
  lastSearches: [], // array of { query, timestamp, foundCount }
  popularSearches: {} // id -> count
};

// Ensures data directory and file exist
function initStats() {
  const dir = path.dirname(STATS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(STATS_FILE)) {
    fs.writeFileSync(STATS_FILE, JSON.stringify(defaultStats, null, 2), 'utf-8');
  }
}

export function getStats() {
  try {
    initStats();
    const data = fs.readFileSync(STATS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading stats:', error);
    return defaultStats;
  }
}

export function saveStats(stats) {
  try {
    initStats();
    fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving stats:', error);
  }
}

export function logSearch(query, foundCount) {
  try {
    const stats = getStats();
    
    stats.totalSearches += 1;
    if (foundCount > 0) {
      stats.successfulSearches += 1;
    } else {
      stats.failedSearches += 1;
    }

    // Xotirani to'ldirmaslik uchun tarix saqlanmaydi
    stats.lastSearches = [];
    stats.popularSearches = {};

    saveStats(stats);
  } catch (error) {
    console.error('Error logging search:', error);
  }
}
