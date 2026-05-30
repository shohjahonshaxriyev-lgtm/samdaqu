import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import { loadData } from './server.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
function getRoomStats(allData, row, queryId) {
  const sameRoom = allData.filter(r =>
    r.auditorya && row.auditorya &&
    r.auditorya.toString().trim().toLowerCase() === row.auditorya.toString().trim().toLowerCase() &&
    r.sana && row.sana &&
    r.sana.toString().trim() === row.sana.toString().trim() &&
    r.start_time && row.start_time &&
    r.start_time.toString().trim() === row.start_time.toString().trim()
  );
  sameRoom.sort((a, b) =>
    a.id.toString().localeCompare(b.id.toString(), undefined, { numeric: true })
  );
  const orderInRoom = sameRoom.findIndex(
    r => r.id.toString().toLowerCase() === queryId.toLowerCase()
  ) + 1;
  return { totalInRoom: sameRoom.length, orderInRoom };
}

/**
 * Natijalarni chiroyli rasm (PNG) sifatida yaratadi (@napi-rs/canvas orqali)
 */
function generateImageBuffer(idInput, results, allData) {
  const cols = [
    { label: '№',           key: '_order',      w: 40 },
    { label: 'Sana',        key: 'sana',        w: 90 },
    { label: 'Kun',         key: 'day_name',    w: 80 },
    { label: 'Vaqt',        key: '_time',       w: 110 },
    { label: 'Fan nomi',    key: 'exam_name',   w: 220 },
    { label: 'Auditoriya',  key: 'auditorya',   w: 130 },
    { label: "O'rin",       key: '_order_room', w: 60 },
    { label: 'Jami',        key: '_total',      w: 60 },
    { label: 'Ism Familiya',key: '_fullname',   w: 160 },
  ];

  const ROW_H = 36;
  const HEADER_H = 50;
  const TOP_BANNER = 70;
  const PAD = 20;
  const totalW = cols.reduce((s, c) => s + c.w, 0) + PAD * 2;
  const totalH = TOP_BANNER + HEADER_H + ROW_H * results.length + PAD + 28;

  const SCALE = 3; // 3x resolution for high quality
  const canvas = createCanvas(totalW * SCALE, totalH * SCALE);
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);

  // Background
  ctx.fillStyle = '#f0f4ff';
  ctx.fillRect(0, 0, totalW, totalH);

  // Top banner gradient
  const grad = ctx.createLinearGradient(0, 0, totalW, 0);
  grad.addColorStop(0, '#1e3a8a');
  grad.addColorStop(1, '#2563eb');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, totalW, TOP_BANNER);

  // Banner title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px Roboto';
  ctx.fillText('IMTIHON JADVALI', PAD, 30);
  const student = `${results[0]?.student_surname || ''} ${results[0]?.student_name || ''}`.trim();
  ctx.font = '12px Roboto';
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  ctx.fillText(`ID: ${idInput}   |   ${student}   |   ${new Date().toLocaleDateString('uz-UZ')}`, PAD, 52);

  // Table header
  ctx.fillStyle = '#1e40af';
  ctx.fillRect(PAD, TOP_BANNER, totalW - PAD * 2, HEADER_H);

  // Header labels
  let xCur = PAD;
  ctx.font = 'bold 11px Roboto';
  ctx.fillStyle = '#ffffff';
  for (const col of cols) {
    ctx.fillText(col.label, xCur + 6, TOP_BANNER + HEADER_H / 2 + 5);
    xCur += col.w;
  }

  // Data rows
  results.forEach((row, i) => {
    const ry = TOP_BANNER + HEADER_H + i * ROW_H;
    ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#eff6ff';
    ctx.fillRect(PAD, ry, totalW - PAD * 2, ROW_H);

    const stats = getRoomStats(allData, row, idInput);
    const cells = cols.map(col => {
      if (col.key === '_order') return String(i + 1);
      if (col.key === '_time') return `${row.start_time || ''} - ${row.end_time || ''}`;
      if (col.key === '_order_room') return `${stats.orderInRoom}-chi`;
      if (col.key === '_total') return `${stats.totalInRoom} ta`;
      if (col.key === '_fullname') return `${row.student_surname || ''} ${row.student_name || ''}`;
      const val = (row[col.key] || '').toString();
      const maxChars = Math.floor(col.w / 7);
      return val.length > maxChars ? val.slice(0, maxChars - 1) + '…' : val;
    });

    let cx = PAD;
    for (let ci = 0; ci < cols.length; ci++) {
      const col = cols[ci];
      if (col.key === '_order_room') {
        ctx.fillStyle = '#dbeafe';
        ctx.fillRect(cx, ry, col.w, ROW_H);
        ctx.fillStyle = '#1d4ed8';
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
      ctx.fillText(cells[ci], cx + 6, ry + ROW_H / 2 + 5);
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

  // Footer
  ctx.fillStyle = '#94a3b8';
  ctx.font = '11px Roboto';
  ctx.fillText('Creator: Shohjahon Shahriyev  |  SAMDAQU', PAD, totalH - 9);

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
    "Xonadagi\no'rin",
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
      5: { cellWidth: 55, halign: 'left' },
      7: { cellWidth: 18, fillColor: [219, 234, 254] }, // ko'k — o'rin
      8: { cellWidth: 18, fillColor: [209, 250, 229] }, // yashil — jami
      9: { cellWidth: 35, halign: 'left' },
    },
    styles: { overflow: 'linebreak', cellPadding: 2.5 },
    didDrawPage: (data) => {
      doc.setFontSize(7);
      doc.setTextColor(156, 163, 175);
      doc.text(
        `Creator: Shohjahon Shahriyev | SAMDAQU | Sahifa ${data.pageNumber}`,
        14,
        doc.internal.pageSize.height - 5
      );
    },
  });

  // jsPDF output as Buffer
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}

function startBot(token) {
  const bot = new TelegramBot(token, { polling: true });
  const awaitingId = new Map();

  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId,
      '👋 Assalomu alaykum!\n\n' +
      '📋 *SAMDAQU Imtihon Jadvali Boti*\n\n' +
      'Imtihon natijangizni PDF formatida olish uchun *ID raqamingizni* kiriting:',
      { parse_mode: 'Markdown' }
    );
    awaitingId.set(chatId, true);
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    if (msg.text && msg.text.startsWith('/start')) return;

    const idInput = msg.text?.trim();

    if (!idInput) {
      bot.sendMessage(chatId, '❌ Iltimos, ID raqamingizni kiriting.');
      return;
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

      const results = allData?.filter(row =>
        row.id && row.id.toString().toLowerCase() === idInput.toLowerCase()
      ) || [];

      if (results.length === 0) {
        bot.editMessageText(
          `❌ *ID "${idInput}"* bo'yicha natija topilmadi.\n\nIltimos, ID ni to'g'ri kiriting yoki /start bosib qayta urinib ko'ring.`,
          { chat_id: chatId, message_id: searchMsg.message_id, parse_mode: 'Markdown' }
        );
        return;
      }

      await bot.editMessageText('📄 PDF tayyorlanmoqda...', {
        chat_id: chatId, message_id: searchMsg.message_id
      });

      try {
        await bot.editMessageText('🖼️ Rasm va PDF tayyorlanmoqda...', {
          chat_id: chatId, message_id: searchMsg.message_id
        });

        // 1. PDF yuborish uchun PDF buffer yasaymiz
        const pdfBuffer = generatePdfBuffer(idInput, results, allData);

        // 2. Rasm (PNG) yaratamiz
        const imageBuffer = generateImageBuffer(idInput, results, allData);

        // 3. Rasmni yuborish
        await bot.sendPhoto(chatId, imageBuffer, {
          caption:
            `📋 *Imtihon jadvali* — ID: \`${idInput}\`\n` +
            `👤 ${results[0]?.student_surname || ''} ${results[0]?.student_name || ''}\n` +
            `📚 ${results.length} ta imtihon topildi`,
          parse_mode: 'Markdown'
        }, {
          filename: `imtihon_${idInput}.png`,
          contentType: 'image/png'
        });

        // 4. PDF ni ham fayl sifatida yuborish
        await bot.sendDocument(chatId, pdfBuffer, {
          caption: `📎 PDF fayl (yuklab olish uchun)`,
        }, {
          filename: `imtihon_${idInput}.pdf`,
          contentType: 'application/pdf'
        });

        bot.deleteMessage(chatId, searchMsg.message_id).catch(() => {});
      } catch (e) {
        console.error('Xatolik:', e);
        bot.editMessageText("❌ Natijani yuborishda xatolik yuz berdi. Qayta urinib ko'ring.", {
          chat_id: chatId, message_id: searchMsg.message_id
        });
      }
  });

  console.log('✅ Telegram bot ishga tushdi.');
}
