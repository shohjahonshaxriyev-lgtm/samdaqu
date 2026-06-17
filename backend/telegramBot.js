import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import { loadData } from './server.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { getDbUsers, saveDbUser, getDbSettings, saveDbSettings, initDB } from './utils/db.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import https from 'https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedUsers = {};
let cachedSettings = {};

function loadUsers() {
  return cachedUsers;
}

function saveUser(msg) {
  try {
    if (!msg.from || msg.from.is_bot) return;
    const id = msg.from.id.toString();
    if (!cachedUsers[id]) {
      const u = {
        id,
        firstName: msg.from.first_name || '',
        lastName: msg.from.last_name || '',
        username: msg.from.username || '',
        joinedAt: new Date().toISOString()
      };
      cachedUsers[id] = u;
      // Bazaga fonda yozish (bot javobini kechiktirmaslik uchun)
      saveDbUser(u).catch(err => console.error("Foydalanuvchini saqlashda xatolik:", err.message));
    }
  } catch (err) {
    console.error("Foydalanuvchini saqlashda xatolik:", err.message);
  }
}

function loadSettings() {
  return cachedSettings;
}

function saveSettings(data) {
  cachedSettings = data;
  // Bazaga fonda yozish
  saveDbSettings(data).catch(err => console.error("Sozlamalarni saqlashda xatolik:", err.message));
}

async function refreshBotCache() {
  try {
    cachedUsers = await getDbUsers();
    cachedSettings = await getDbSettings();
    console.log(`✅ Bot xotirasi yangilandi. ${Object.keys(cachedUsers).length} ta foydalanuvchi yuklandi.`);
  } catch(e) {
    console.error("Bot xotirasini yangilashda xatolik:", e);
  }
}

// Shriftni yuklash (Linux/Windows da matn buzilmasligi uchun)
GlobalFonts.registerFromPath(path.join(__dirname, 'fonts/Roboto-Regular.ttf'), 'Roboto');



// Load environment from root .env
dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.warn('⚠️  TELEGRAM_BOT_TOKEN topilmadi — bot ishlamaydi, server davom etadi.');
} else {
  startBot(token);
}

/**
 * Bir xona+sana+vaqt uchun barcha talabalarni topib, tartib raqamini qaytaradi
 */
function getRoomStats(allData, currentRow, queryId) {
  const sameRoom = allData.filter(r => 
    r.auditorya && currentRow.auditorya &&
    r.auditorya.toString().trim().toLowerCase() === currentRow.auditorya.toString().trim().toLowerCase() && 
    r.sana && currentRow.sana &&
    r.sana.toString().trim() === currentRow.sana.toString().trim() && 
    r.start_time && currentRow.start_time &&
    r.start_time.toString().trim() === currentRow.start_time.toString().trim()
  );

  const orderInRoom = sameRoom.findIndex(
    r => r.id && r.id.toString().trim().toLowerCase() === queryId.toString().trim().toLowerCase()
  ) + 1;
  return { totalInRoom: sameRoom.length, orderInRoom };
}

/**
 * Natijalarni chiroyli rasm (PNG) sifatida yaratadi (@napi-rs/canvas orqali) - saytdagi PDF bilan bir xil dizayn
 */
function generateImageBuffer(idInput, results, allData) {
  const cols = [
    { label: 'Tartib\nraqam',     key: '_order',      w: 50 },
    { label: 'Sana',              key: 'sana',        w: 90 },
    { label: 'Kun',               key: 'day_name',    w: 110 },
    { label: 'Boshlanish',        key: 'start_time',  w: 80 },
    { label: 'Tugash',            key: 'end_time',    w: 80 },
    { label: 'Fan nomi',          key: 'exam_name',   w: 190 },
    { label: 'Auditoriya',        key: 'auditorya',   w: 120 },
    { label: 'Stul\nraqami',      key: 'stul_raqami', w: 60 },
    { label: 'Xonadagi\no\'rin',  key: '_roomOrder',  w: 70 },
    { label: 'Xonadagi\ntalabalar',key: '_total',     w: 75 },
    { label: 'Ism Familiya',      key: '_fullname',   w: 160 },
  ];

  const ROW_H = 36;
  const HEADER_H = 50;
  const TOP_BANNER = 80;
  const PAD = 20;
  const totalW = cols.reduce((s, c) => s + c.w, 0) + PAD * 2;
  const totalH = TOP_BANNER + HEADER_H + ROW_H * results.length + PAD + 28;

  const SCALE = 3;
  const canvas = createCanvas(totalW * SCALE, totalH * SCALE);
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, totalW, totalH);

  // Blue header banner (like PDF)
  ctx.fillStyle = '#2563eb';
  ctx.beginPath();
  ctx.roundRect(PAD, 15, totalW - PAD * 2, 50, 6);
  ctx.fill();

  // Banner title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Roboto';
  ctx.fillText('IMTIHON JADVALI', PAD + 20, 40);
  const student = `${results[0]?.student_surname || ''} ${results[0]?.student_name || ''}`.trim();
  ctx.font = '12px Roboto';
  ctx.fillText(`Talaba: ${student}   |   ID: ${idInput}   |   ${new Date().toLocaleDateString('uz-UZ')}`, PAD + 20, 56);

  // Table header
  ctx.fillStyle = '#1e40af';
  ctx.fillRect(PAD, TOP_BANNER, totalW - PAD * 2, HEADER_H);

  // Header labels
  let xCur = PAD;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px Roboto';
  ctx.textAlign = 'center';
  for (const col of cols) {
    const lines = col.label.split('\n');
    if (lines.length === 1) {
      ctx.fillText(lines[0], xCur + col.w / 2, TOP_BANNER + HEADER_H / 2 + 4);
    } else {
      ctx.fillText(lines[0], xCur + col.w / 2, TOP_BANNER + HEADER_H / 2 - 4);
      ctx.fillText(lines[1], xCur + col.w / 2, TOP_BANNER + HEADER_H / 2 + 10);
    }
    xCur += col.w;
  }
  ctx.textAlign = 'left';

  // Data rows
  results.forEach((row, i) => {
    const ry = TOP_BANNER + HEADER_H + i * ROW_H;
    ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#eff6ff';
    ctx.fillRect(PAD, ry, totalW - PAD * 2, ROW_H);

    const stats = getRoomStats(allData, row, idInput);
    let cx = PAD;
    for (let ci = 0; ci < cols.length; ci++) {
      const col = cols[ci];
      
      let val = '';
      if (col.key === '_order') val = String(i + 1);
      else if (col.key === '_roomOrder') val = `${stats.orderInRoom}-chi`;
      else if (col.key === '_total') val = `${stats.totalInRoom} ta`;
      else if (col.key === '_fullname') val = `${row.student_surname || ''} ${row.student_name || ''}`;
      else val = (row[col.key] || '').toString();

      if (col.key === '_roomOrder') {
        ctx.fillStyle = '#dbeafe'; // blue-100
        ctx.fillRect(cx, ry, col.w, ROW_H);
        ctx.fillStyle = '#1e40af'; // blue-800
        ctx.font = 'bold 12px Roboto';
      } else if (col.key === '_total') {
        ctx.fillStyle = '#d1fae5';
        ctx.fillRect(cx, ry, col.w, ROW_H);
        ctx.fillStyle = '#065f46';
        ctx.font = 'bold 12px Roboto';
      } else {
        ctx.fillStyle = '#1e293b';
        ctx.font = '12px Roboto';
      }

      ctx.textAlign = (col.key === '_order' || col.key === 'stul_raqami' || col.key === '_roomOrder' || col.key === '_total') ? 'center' : 'left';
      
      let text = val;
      const maxWidth = col.w - 12;
      ctx.textAlign === 'center' ? ctx.measureText(text) : null; // just context
      if (ctx.measureText(text).width > maxWidth && ctx.textAlign === 'left') {
        while (text.length > 0 && ctx.measureText(text + '…').width > maxWidth) {
          text = text.slice(0, -1);
        }
        text += '…';
      }

      const textX = ctx.textAlign === 'center' ? cx + col.w / 2 : cx + 6;
      ctx.fillText(text, textX, ry + ROW_H / 2 + 4);
      cx += col.w;
    }

    // Row border
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(PAD, ry + ROW_H);
    ctx.lineTo(totalW - PAD, ry + ROW_H);
    ctx.stroke();
  });

  // Vertical lines
  let vx = PAD;
  for (const col of cols) {
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(vx, TOP_BANNER);
    ctx.lineTo(vx, totalH - 28);
    ctx.stroke();
    vx += col.w;
  }
  // Last line
  ctx.beginPath();
  ctx.moveTo(vx, TOP_BANNER);
  ctx.lineTo(vx, totalH - 28);
  ctx.stroke();

  // Footer
  ctx.fillStyle = '#9ca3af';
  ctx.font = '11px Roboto';
  ctx.textAlign = 'left';
  ctx.fillText('@samdaqu_jadvalbot | SDTU', PAD, totalH - 9);

  return canvas.toBuffer('image/png');
}

function generateRoommatesImageBuffer(targetExam, roommates) {
  const cols = [
    { label: 'T/R',               key: '_order',       w: 50 },
    { label: 'Talaba ID',         key: 'id',           w: 90 },
    { label: 'F.I.SH',            key: '_fullname',    w: 260 },
    { label: 'Stul raqami',       key: 'stul_raqami',  w: 100 },
  ];

  const ROW_H = 34;
  const HEADER_H = 46;
  const TOP_BANNER = 100;
  const PAD = 20;
  const totalW = cols.reduce((s, c) => s + c.w, 0) + PAD * 2;
  const totalH = TOP_BANNER + HEADER_H + ROW_H * roommates.length + PAD + 28;

  const SCALE = 3;
  const canvas = createCanvas(totalW * SCALE, totalH * SCALE);
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, totalW, totalH);

  // Blue header banner
  ctx.fillStyle = '#1e3a8a';
  ctx.beginPath();
  ctx.roundRect(PAD, 15, totalW - PAD * 2, 70, 6);
  ctx.fill();

  // Banner title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 16px Roboto';
  ctx.fillText('XONADAGI TALABALAR RO\'YXATI', PAD + 15, 38);
  ctx.font = '11px Roboto';
  ctx.fillText(`Xona: ${targetExam.auditorya || 'Noma\'lum'}  |  Fan: ${targetExam.exam_name || 'Noma\'lum'}`, PAD + 15, 54);
  ctx.fillText(`Vaqt: ${targetExam.sana || ''}, soat ${targetExam.start_time || ''}  |  Jami talabalar: ${roommates.length} ta`, PAD + 15, 70);

  // Table header
  ctx.fillStyle = '#2563eb';
  ctx.fillRect(PAD, TOP_BANNER, totalW - PAD * 2, HEADER_H);

  // Header labels
  let xCur = PAD;
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px Roboto';
  ctx.textAlign = 'center';
  for (const col of cols) {
    ctx.fillText(col.label, xCur + col.w / 2, TOP_BANNER + HEADER_H / 2 + 4);
    xCur += col.w;
  }
  ctx.textAlign = 'left';

  // Data rows
  roommates.forEach((row, i) => {
    const ry = TOP_BANNER + HEADER_H + i * ROW_H;
    ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#f8fafc';
    ctx.fillRect(PAD, ry, totalW - PAD * 2, ROW_H);

    let cx = PAD;
    for (let ci = 0; ci < cols.length; ci++) {
      const col = cols[ci];
      let val = '';
      if (col.key === '_order') val = String(i + 1);
      else if (col.key === '_fullname') val = `${row.student_surname || ''} ${row.student_name || ''}`.trim();
      else val = (row[col.key] || '').toString();

      ctx.fillStyle = '#1e293b';
      ctx.font = '12px Roboto';
      ctx.textAlign = (col.key === '_order' || col.key === 'stul_raqami' || col.key === 'id') ? 'center' : 'left';

      let text = val;
      const maxWidth = col.w - 12;
      if (ctx.measureText(text).width > maxWidth && ctx.textAlign === 'left') {
        while (text.length > 0 && ctx.measureText(text + '…').width > maxWidth) {
          text = text.slice(0, -1);
        }
        text += '…';
      }

      const textX = ctx.textAlign === 'center' ? cx + col.w / 2 : cx + 6;
      ctx.fillText(text, textX, ry + ROW_H / 2 + 4);
      cx += col.w;
    }

    // Row border
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(PAD, ry + ROW_H);
    ctx.lineTo(totalW - PAD, ry + ROW_H);
    ctx.stroke();
  });

  // Vertical lines
  let vx = PAD;
  for (const col of cols) {
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(vx, TOP_BANNER);
    ctx.lineTo(vx, totalH - 28);
    ctx.stroke();
    vx += col.w;
  }
  // Last line
  ctx.beginPath();
  ctx.moveTo(vx, TOP_BANNER);
  ctx.lineTo(vx, totalH - 28);
  ctx.stroke();

  // Footer
  ctx.fillStyle = '#9ca3af';
  ctx.font = '10px Roboto';
  ctx.textAlign = 'left';
  ctx.fillText('@samdaqu_jadvalbot | SDTU', PAD, totalH - 9);

  return canvas.toBuffer('image/png');
}

/**
 * Saytdagi PDF bilan bir xil format: ko'k header, tartib raqam, xonadagi o'rin va jami ustunlari
 */
function generatePdfBuffer(idInput, results, allData) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const studentName = `${results[0]?.student_surname || ''} ${results[0]?.student_name || ''}`.trim();

  // Ko'k header banner
  doc.setFillColor(37, 99, 235);
  doc.roundedRect(14, 10, 270, 22, 3, 3, 'F');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('IMTIHON JADVALI', 18, 22);
  doc.setFontSize(8);
  doc.text(
    `Talaba: ${studentName}  |  ID: ${idInput}  |  ${new Date().toLocaleDateString('uz-UZ')}`,
    18, 29
  );

  // Ustunlar (saytdagi PDF bilan bir xil)
  const pdfHeaders = [
    'Tartib\nraqam',
    'Sana',
    'Kun',
    'Boshlanish',
    'Tugash',
    'Fan nomi',
    'Auditoriya',
    "Stul\nraqami",
    'Xonadagi\no\'rin',
    'Xonadagi\ntalabalar',
    'Ism Familiya',
  ];

  const pdfRows = results.map((row, idx) => {
    const stats = getRoomStats(allData, row, idInput);
    return [
      idx + 1,
      row.sana || '',
      row.day_name || '',
      row.start_time || '',
      row.end_time || '',
      row.exam_name || '',
      row.auditorya || '',
      row.stul_raqami || '',
      `${stats.orderInRoom}-chi`,
      `${stats.totalInRoom} ta`,
      `${row.student_surname || ''} ${row.student_name || ''}`,
    ];
  });

  autoTable(doc, {
    head: [pdfHeaders],
    body: pdfRows,
    startY: 38,
    theme: 'striped',
    headStyles: {
      fillColor: [30, 64, 175],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      valign: 'middle',
      minCellHeight: 12,
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      halign: 'center',
      valign: 'middle',
    },
    alternateRowStyles: { fillColor: [239, 246, 255] },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      5: { cellWidth: 45, halign: 'left' },
      7: { cellWidth: 14, halign: 'center' }, // Stul
      8: { cellWidth: 18, fillColor: [219, 234, 254], halign: 'center' }, // Xonadagi o'rin (blue-100)
      9: { cellWidth: 18, fillColor: [209, 250, 229], halign: 'center' }, // yashil — jami
      10: { cellWidth: 35, halign: 'left' },
    },
    styles: { overflow: 'linebreak', cellPadding: 2.5 },
    didDrawPage: (data) => {
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.text(
        `@samdaqu_jadvalbot | SDTU | Sahifa ${data.pageNumber}`,
        14,
        doc.internal.pageSize.height - 5
      );
    },
  });

  // jsPDF output as Buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

/**
 * Admin uchun barcha a'zolarni PDF qilib yaratish
 */
async function generateUsersPdf(bot) {
  const users = Object.values(loadUsers());
  // Eng yangi qo'shilganlar birinchi turishi uchun saralash
  users.sort((a, b) => {
    const d1 = b.joinedAt ? new Date(b.joinedAt).getTime() : 0;
    const d2 = a.joinedAt ? new Date(a.joinedAt).getTime() : 0;
    return (isNaN(d1) ? 0 : d1) - (isNaN(d2) ? 0 : d2);
  });

  const doc = new jsPDF();
  
  function cleanText(str) {
    if (!str) return '';
    // Emojilarni va tushunarsiz belgilarni olib tashlash (faqat harf, son va asosiy belgilar qoladi)
    return str.replace(/[^\p{L}\p{N}\s\-_.!?,()[\]{}]/gu, '').trim();
  }
  
  doc.setFontSize(16);
  doc.text("Bot A'zolari Ro'yxati", 14, 15);
  doc.setFontSize(10);
  doc.text(`Jami: ${users.length} ta a'zo`, 14, 22);

  const head = [['№', 'Ism Familiya', 'Username', 'Telegram ID', 'Sana']];
  const body = [];

  for (let i = 0; i < users.length; i++) {
    const u = users[i];
    let joined = '-';
    if (u.joinedAt) {
      const d = new Date(u.joinedAt);
      if (!isNaN(d.getTime())) {
        joined = d.toLocaleDateString('uz-UZ') + ' ' + d.toLocaleTimeString('uz-UZ', { hour: '2-digit', minute:'2-digit' });
      }
    }
    
    let fullName = cleanText(`${u.firstName} ${u.lastName}`);
    if (!fullName) fullName = "Noma'lum talaba";
    
    body.push([
      i + 1,
      fullName,
      u.username ? cleanText(`@${u.username}`) : '-',
      u.id,
      joined
    ]);
  }

  autoTable(doc, {
    head,
    body,
    startY: 28,
    styles: { valign: 'middle', fontSize: 9 }
  });

  return Buffer.from(doc.output('arraybuffer'));
}

async function startBot(token) {
  // Jadvallar yaratilganini ta'minlash (server.js dan oldin ishga tushishi mumkin)
  await initDB();
  await refreshBotCache();
  const bot = new TelegramBot(token, { polling: true });
  const adminState = new Map();

  bot.onText(/\/start/, async (msg) => {
    saveUser(msg);
    const chatId = msg.chat.id;

    // Obuna tekshiruvi
    const settings = loadSettings();
    if (settings.sponsorChannel && settings.sponsorChannel !== '0') {
      try {
        const member = await bot.getChatMember(settings.sponsorChannel, msg.from.id);
        const status = member.status;
        if (!['creator', 'administrator', 'member'].includes(status)) {
          const channelLink = settings.sponsorChannel.startsWith('@') 
            ? `https://t.me/${settings.sponsorChannel.replace('@', '')}` 
            : settings.sponsorChannel;
          bot.sendMessage(chatId, "⚠️ *Botdan foydalanish uchun quyidagi kanalga obuna bo'lishingiz shart!*", {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: "📢 Kanalga o'tish", url: channelLink }],
                [{ text: "✅ Tekshirish", callback_data: "check_sub" }]
              ]
            }
          });
          return;
        }
      } catch (e) {
        console.error("Obunani tekshirishda xatolik (Start):", e.message);
      }
    }

    bot.sendMessage(chatId,
      '👋 Assalomu alaykum!\n\n' +
      '📋 *SDTU Imtihon Jadvali Boti*\n\n' +
      ' *ID raqamingizni* kiriting:',
      { parse_mode: 'Markdown' }
    );
  });

  bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data === 'admin_broadcast') {
      adminState.set(chatId, 'awaiting_broadcast');
      bot.sendMessage(chatId, '📝 *Barchaga yuboriladigan xabarni kiriting:*\n(Matn, rasm yoki video yuborishingiz mumkin. Xabar qanday bo\'lsa shundayligicha hammaga boradi)', { parse_mode: 'Markdown' });
    } else if (data === 'admin_users_pdf') {
      bot.sendMessage(chatId, '⏳ A\'zolar ro\'yxati PDF qilinmoqda (rasmlar yuklanishi biroz vaqt olishi mumkin)...');
      try {
        const pdfBuffer = await generateUsersPdf(bot);
        bot.sendDocument(chatId, pdfBuffer, {
          caption: '👥 Bot a\'zolari ro\'yxati',
        }, {
          filename: 'azolar_royxati.pdf',
          contentType: 'application/pdf'
        });
      } catch (e) {
        console.error(e);
        bot.sendMessage(chatId, '❌ PDF yaratishda xatolik yuz berdi.');
      }
    } else if (data === 'admin_sponsor_channel') {
      adminState.set(chatId, 'awaiting_sponsor_channel');
      const current = loadSettings().sponsorChannel || "Sozlanmagan";
      bot.sendMessage(chatId, `📢 *Homiy kanalni sozlash*\n\nHozirgi kanal: ${current}\n\nYangi kanalni kiritish uchun uning username'ini (masalan: \`@sdtu_kanal\`) yoki to'liq havolasini yuboring.\n\nMajburiy obunani o'chirish uchun \`0\` deb yuboring. \n\n⚠️ *Diqqat:* Bot foydalanuvchilarni tekshira olishi uchun siz ko'rsatgan kanalda *Admin* bo'lishi shart!`, { parse_mode: 'Markdown' });
    } else if (data === 'check_sub') {
      const settings = loadSettings();
      if (settings.sponsorChannel && settings.sponsorChannel !== '0') {
        try {
          const member = await bot.getChatMember(settings.sponsorChannel, query.from.id);
          if (['creator', 'administrator', 'member'].includes(member.status)) {
            bot.deleteMessage(chatId, query.message.message_id).catch(()=>{});
            bot.sendMessage(chatId, "✅ Obuna tasdiqlandi! Endi ID raqamingizni yuborib, imtihon jadvallarini ko'rishingiz mumkin.");
          } else {
            bot.answerCallbackQuery(query.id, { text: "❌ Siz hali kanalga obuna bo'lmagansiz!", show_alert: true });
            return;
          }
        } catch (e) {
          bot.answerCallbackQuery(query.id, { text: "❌ Xatolik yuz berdi. Bot kanalda admin ekanligiga ishonch hosil qiling.", show_alert: true });
          return;
        }
      } else {
        bot.deleteMessage(chatId, query.message.message_id).catch(()=>{});
        bot.sendMessage(chatId, "✅ Majburiy obuna o'chirilgan. ID raqamingizni yuborishingiz mumkin.");
      }
    } else if (data.startsWith('showrooms_')) {
      const idInput = data.split('_')[1];
      const allData = loadData();
      if (!allData) {
        bot.sendMessage(chatId, "⚠️ Xatolik: Imtihon ma'lumotlari topilmadi.");
        return;
      }
      const queryStr = idInput.trim().toLowerCase();
      const results = allData.filter(row => row.id && row.id.toString().trim().toLowerCase() === queryStr);

      if (results.length === 0) {
        bot.sendMessage(chatId, "⚠️ Siz uchun imtihonlar topilmadi.");
        return;
      }

      // Har bir imtihon uchun bittadan inline tugma yaratamiz
      const buttons = results.map((exam, index) => {
        const text = `🏫 ${exam.auditorya || 'Noma\'lum'} - ${exam.exam_name || 'Noma\'lum'} (${exam.start_time || ''})`;
        return [{ text: text, callback_data: `viewroom_${idInput}_${index}` }];
      });

      bot.sendMessage(chatId, "🏢 Xonadoshlarni ko'rmoqchi bo'lgan xonani tanlang:", {
        reply_markup: {
          inline_keyboard: buttons
        }
      });
    } else if (data.startsWith('viewroom_')) {
      const parts = data.split('_');
      const idInput = parts[1];
      const examIndex = parseInt(parts[2], 10);
      
      const allData = loadData();
      if (!allData) {
        bot.sendMessage(chatId, "⚠️ Xatolik: Imtihon ma'lumotlari topilmadi.");
        return;
      }
      const queryStr = idInput.trim().toLowerCase();
      const studentExams = allData.filter(row => row.id && row.id.toString().trim().toLowerCase() === queryStr);
      
      if (studentExams.length === 0 || !studentExams[examIndex]) {
        bot.sendMessage(chatId, "⚠️ Imtihon ma'lumotlari topilmadi.");
        return;
      }
      
      const targetExam = studentExams[examIndex];
      
      // Xonadagi barcha talabalarni topish
      const roommates = allData.filter(r =>
        r.auditorya && targetExam.auditorya &&
        r.auditorya.toString().trim().toLowerCase() === targetExam.auditorya.toString().trim().toLowerCase() &&
        r.sana && targetExam.sana &&
        r.sana.toString().trim() === targetExam.sana.toString().trim() &&
        r.start_time && targetExam.start_time &&
        r.start_time.toString().trim() === targetExam.start_time.toString().trim()
      );
      
      bot.sendMessage(chatId, `⏳ *${targetExam.auditorya}* xonadagi talabalar ro'yxati chizilmoqda...`, { parse_mode: 'Markdown' })
        .then(async (waitMsg) => {
          try {
            const imageBuffer = generateRoommatesImageBuffer(targetExam, roommates);
            await bot.sendPhoto(chatId, imageBuffer, {
              caption: `🏫 *Xona:* ${targetExam.auditorya}\n📚 *Fan:* ${targetExam.exam_name}\n🕒 *Vaqt:* ${targetExam.sana}, soat ${targetExam.start_time}\n👥 *Jami talabalar:* ${roommates.length} ta`
            }, {
              filename: `roommates_${targetExam.auditorya}.png`,
              contentType: 'image/png'
            });
            bot.deleteMessage(chatId, waitMsg.message_id).catch(() => {});
          } catch (err) {
            console.error(err);
            bot.editMessageText("⚠️ Rasm chizishda xatolik yuz berdi.", {
              chat_id: chatId,
              message_id: waitMsg.message_id
            });
          }
        });
    }
    
    if (data !== 'check_sub') {
      bot.answerCallbackQuery(query.id);
    }
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    saveUser(msg);

    if (msg.text && msg.text.trim() === '/admin') {
      const adminId = process.env.ADMIN_ID ? process.env.ADMIN_ID.toString().trim() : null;
      console.log(`[Admin check] User ID: ${chatId}, Env ADMIN_ID: ${adminId}`);

      if (chatId.toString() === adminId) {
        bot.sendMessage(chatId, '👨‍💻 *Admin Panelga xush kelibsiz!*', {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '📝 Barchaga xabar yuborish', callback_data: 'admin_broadcast' }],
              [{ text: "👥 A'zolar ro'yxati (PDF)", callback_data: 'admin_users_pdf' }],
              [{ text: "📢 Homiy kanalni sozlash", callback_data: 'admin_sponsor_channel' }]
            ]
          }
        });
      } else {
        bot.sendMessage(chatId, `⛔ Kechirasiz, siz admin emassiz. (Sizning ID raqamingiz: ${chatId})`);
      }
      return;
    }

    if (adminState.get(chatId) === 'awaiting_broadcast') {
      adminState.set(chatId, null);
      const users = Object.values(loadUsers());
      const statusMsg = await bot.sendMessage(chatId, `⏳ Xabar ${users.length} ta foydalanuvchiga yuborilmoqda...`);
      
      let success = 0;
      let fail = 0;
      for (const u of users) {
        try {
         await bot.forwardMessage(u.id, chatId, msg.message_id);
          success++;
        } catch (e) {
          fail++;
        }
      }
      bot.sendMessage(chatId, `✅ *Xabar yuborish yakunlandi!*\n\n🟢 Yetib bordi: ${success} ta\n🔴 Bloklagan/Xato: ${fail} ta`, { parse_mode: 'Markdown' });
      return;
    }

    if (adminState.get(chatId) === 'awaiting_sponsor_channel') {
      adminState.set(chatId, null);
      const text = msg.text?.trim();
      if (!text) {
         bot.sendMessage(chatId, "❌ Noto'g'ri qiymat.");
         return;
      }
      const settings = loadSettings();
      if (text === '0') {
          settings.sponsorChannel = '0';
          await saveSettings(settings);
          bot.sendMessage(chatId, "✅ Majburiy obuna o'chirildi.");
      } else {
          settings.sponsorChannel = text;
          await saveSettings(settings);
          bot.sendMessage(chatId, `✅ Homiy kanal muvaffaqiyatli o'rnatildi: ${text}\n\nEslatma: Bot shu kanalda admin ekanligini unutmang!`);
      }
      return;
    }

    if (msg.text && msg.text.startsWith('/')) return;

    const idInput = msg.text?.trim();

    if (!idInput) {
      bot.sendMessage(chatId, '❌ Iltimos, ID raqamingizni kiriting.');
      return;
    }

    // Obuna tekshiruvi
    const settings = loadSettings();
    if (settings.sponsorChannel && settings.sponsorChannel !== '0') {
      try {
        const member = await bot.getChatMember(settings.sponsorChannel, msg.from.id);
        const status = member.status;
        if (!['creator', 'administrator', 'member'].includes(status)) {
          const channelLink = settings.sponsorChannel.startsWith('@') 
            ? `https://t.me/${settings.sponsorChannel.replace('@', '')}` 
            : settings.sponsorChannel;
          bot.sendMessage(chatId, "⚠️ *Iltimos, avval kanalga obuna bo'ling!*", {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: "📢 Kanalga o'tish", url: channelLink }],
                [{ text: "✅ Tekshirish", callback_data: "check_sub" }]
              ]
            }
          });
          return;
        }
      } catch (e) {
        console.error("Obunani tekshirishda xatolik (Message):", e.message);
      }
    }

      const searchMsg = await bot.sendMessage(chatId, '🔍 Qidirilmoqda...');

      let allData;
      try {
        allData = loadData();
      } catch (e) {
        bot.editMessageText("❌ Ma'lumotlar bazasiga ulanishda xatolik.", {
          chat_id: chatId, message_id: searchMsg.message_id
        });
        return;
      }

      if (!allData) {
        bot.editMessageText(
          "⚠️ *Jadval yuklanmagan!*\n\nHozircha serverga imtihon jadvallari yuklanmagan. Iltimos, keyinroq qayta urinib ko'ring.",
          { chat_id: chatId, message_id: searchMsg.message_id, parse_mode: 'Markdown' }
        );
        return;
      }

      const results = allData.filter(row =>
        row.id && row.id.toString().trim().toLowerCase() === idInput.toLowerCase()
      ) || [];

      if (results.length === 0) {
        bot.editMessageText(
          `❌ *ID "${idInput}"* bo'yicha natija topilmadi.\n\nIltimos, ID ni to'g'ri kiriting yoki /start bosib qayta urinib ko'ring.`,
          { chat_id: chatId, message_id: searchMsg.message_id, parse_mode: 'Markdown' }
        );
        return;
      }

      await bot.editMessageText('📄 Jadval tayyorlanmoqda...', {
        chat_id: chatId, message_id: searchMsg.message_id
      });

      try {
        const imageBuffer = generateImageBuffer(idInput, results, allData);

        await bot.sendPhoto(chatId, imageBuffer, {
          caption:
            `👤 ${results[0]?.student_surname || ''} ${results[0]?.student_name || ''}\n` +
            `📚 ${results.length} ta imtihon topildi`,
          reply_markup: {
            inline_keyboard: [
              [{ text: "👥 Xonadoshlarni ko'rish", callback_data: `showrooms_${idInput}` }]
            ]
          }
        }, {
          filename: `imtihon_${idInput}.png`,
          contentType: 'image/png'
        });

        bot.deleteMessage(chatId, searchMsg.message_id).catch(() => {});
      } catch (e) {
        console.error('Xatolik:', e);
        bot.editMessageText(
          "⚠️ *Jadvalingiz topildi!* Lekin xatolik sababli faylni bu yerda yubora olmadik.\n\nIltimos, natijani ko'rish uchun veb-saytimizdan foydalaning:",
          {
            chat_id: chatId,
            message_id: searchMsg.message_id,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: "🌐 Saytdan ko'rish", url: "https://samdaqu.onrender.com/" }]
              ]
            }
          }
        );
      }
  });

  // Eslatma tizimi foydalanuvchi talabi bilan o'chirildi

  console.log('✅ Telegram bot ishga tushdi.');
}
