import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import { loadData } from './server.js';

// Load environment from root .env
dotenv.config({ path: new URL('../.env', import.meta.url).pathname });

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.warn('⚠️  TELEGRAM_BOT_TOKEN topilmadi — bot ishlamaydi, server davom etadi.');
} else {
  startBot(token);
}

function buildPdfHtmlText(idInput, results) {
  const fields = [
    { key: 'id',             label: 'ID' },
    { key: 'student_name',   label: 'Ism' },
    { key: 'student_surname',label: 'Familiya' },
    { key: 'sana',           label: 'Sana' },
    { key: 'day_name',       label: 'Kun' },
    { key: 'start_time',     label: 'Boshlanish' },
    { key: 'end_time',       label: 'Tugash' },
    { key: 'exam_code',      label: 'Fan kodi' },
    { key: 'exam_name',      label: 'Fan nomi' },
    { key: 'auditorya',      label: 'Auditoriya' },
  ];

  const rows = results.map((r, i) => {
    const cells = fields.map(f => {
      const val = r[f.key] || '';
      return `<td>${val}</td>`;
    }).join('');
    const bg = i % 2 === 0 ? '#ffffff' : '#f0f4ff';
    return `<tr style="background:${bg}">${cells}</tr>`;
  }).join('\n');

  const headers = fields.map(f => `<th>${f.label}</th>`).join('');

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 10pt; color: #1a1a2e; padding: 20px; }
  .header { background: linear-gradient(135deg, #1e3a8a, #2563eb); color: white; padding: 16px 20px; border-radius: 8px; margin-bottom: 20px; }
  .header h1 { font-size: 16pt; font-weight: bold; margin-bottom: 4px; }
  .header p { font-size: 10pt; opacity: 0.85; }
  .badge { display: inline-block; background: rgba(255,255,255,0.2); border-radius: 20px; padding: 3px 12px; font-size: 9pt; margin-top: 6px; }
  table { width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }
  thead tr { background: #1e3a8a; color: white; }
  th { padding: 8px 10px; text-align: left; font-size: 9pt; font-weight: bold; }
  td { padding: 7px 10px; font-size: 9pt; border-bottom: 1px solid #e5e7eb; }
  tr:last-child td { border-bottom: none; }
  .footer { margin-top: 16px; font-size: 8pt; color: #6b7280; text-align: center; }
</style>
</head>
<body>
  <div class="header">
    <h1>📋 Imtihon Jadvali</h1>
    <p>SAMDAQU — Talabalar uchun imtihon ma'lumotlari</p>
    <span class="badge">ID: ${idInput} &nbsp;|&nbsp; ${results.length} ta imtihon</span>
  </div>
  <table>
    <thead><tr>${headers}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Creator: Shohjahon Shahriyev &nbsp;|&nbsp; SAMDAQU &nbsp;|&nbsp; ${new Date().toLocaleDateString('uz-UZ')}</div>
</body>
</html>`;
}

async function generatePdfBuffer(idInput, results) {
  // Use puppeteer if available, otherwise fall back to simple text-based PDF
  try {
    const puppeteer = await import('puppeteer').catch(() => null);
    if (puppeteer) {
      const browser = await puppeteer.default.launch({ 
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      const html = buildPdfHtmlText(idInput, results);
      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        landscape: true,
        printBackground: true,
        margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
      });
      await browser.close();
      return pdf;
    }
  } catch (e) {
    // puppeteer not available
  }

  // Fallback: generate a clean PDF using PDFKit-style manual layout
  return buildManualPdf(idInput, results);
}

function buildManualPdf(idInput, results) {
  // Create a clean, readable plain text PDF manually
  // We'll produce a nicely formatted text file as PDF using a simple approach
  const lines = [];
  lines.push(`IMTIHON JADVALI`);
  lines.push(`SAMDAQU - Talabalar uchun imtihon ma'lumotlari`);
  lines.push(`ID: ${idInput}   |   ${results.length} ta imtihon`);
  lines.push('='.repeat(80));
  lines.push('');
  
  results.forEach((r, i) => {
    lines.push(`  ${i + 1}. Imtihon`);
    lines.push(`     Fan:        ${r.exam_name || '-'} (${r.exam_code || '-'})`);
    lines.push(`     Talaba:     ${r.student_name || ''} ${r.student_surname || ''}`);
    lines.push(`     Sana:       ${r.sana || '-'}  ${r.day_name || ''}`);
    lines.push(`     Vaqt:       ${r.start_time || '-'} - ${r.end_time || '-'}`);
    lines.push(`     Auditoriya: ${r.auditorya || '-'}`);
    lines.push('     ' + '-'.repeat(60));
  });
  
  lines.push('');
  lines.push(`Creator: Shohjahon Shahriyev | SAMDAQU`);

  // Build a proper PDF using raw PDF syntax for clean output
  return buildRawPdf(lines.join('\n'), idInput, results);
}

function buildRawPdf(textContent, idInput, results) {
  // Build a clean PDF using raw PDF structure with proper encoding
  const pageWidth = 842;  // A4 landscape width in pts
  const pageHeight = 595; // A4 landscape height in pts
  const margin = 40;
  
  const fields = [
    { key: 'student_name',    label: 'Ism',        width: 80 },
    { key: 'student_surname', label: 'Familiya',   width: 80 },
    { key: 'sana',            label: 'Sana',        width: 70 },
    { key: 'day_name',        label: 'Kun',         width: 55 },
    { key: 'start_time',      label: 'Boshlanish',  width: 60 },
    { key: 'end_time',        label: 'Tugash',      width: 55 },
    { key: 'exam_code',       label: 'Fan kodi',    width: 65 },
    { key: 'exam_name',       label: 'Fan nomi',    width: 200 },
    { key: 'auditorya',       label: 'Auditoriya',  width: 100 },
  ];

  const totalTableWidth = fields.reduce((s, f) => s + f.width, 0);
  const tableStartX = (pageWidth - totalTableWidth) / 2;
  const rowHeight = 22;
  const headerHeight = 28;
  const colTextPad = 5;

  // Split results into pages
  const rowsPerPage = Math.floor((pageHeight - margin * 2 - 80 - headerHeight) / rowHeight);
  const pages = [];
  for (let i = 0; i < results.length; i += rowsPerPage) {
    pages.push(results.slice(i, i + rowsPerPage));
  }
  if (pages.length === 0) pages.push([]);

  let xobjs = [];
  let xrefPositions = [];
  let output = '';
  
  const enc = (s) => {
    if (!s) return '';
    return s.toString()
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/[^\x20-\x7E]/g, (c) => {
        const code = c.charCodeAt(0);
        if (code < 256) return `\\${code.toString(8).padStart(3, '0')}`;
        return '?';
      });
  };

  // PDF objects
  const objects = [];
  
  // Object 1: Catalog
  objects.push({ id: 1, content: `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj` });
  
  // Object 2: Pages (placeholder)
  const pageObjIds = pages.map((_, i) => 4 + i);
  objects.push({ id: 2, content: `2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj` });
  
  // Object 3: Font
  objects.push({ id: 3, content: `3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj` });

  // Page objects
  pages.forEach((pageRows, pageIdx) => {
    const pageId = 4 + pageIdx;
    const streamLines = [];

    // Background header
    streamLines.push(`q`);
    streamLines.push(`0.118 0.231 0.545 rg`); // dark blue
    streamLines.push(`${margin} ${pageHeight - margin - 50} ${pageWidth - margin * 2} 50 re f`);
    streamLines.push(`Q`);

    // Title
    streamLines.push(`BT`);
    streamLines.push(`/F1 14 Tf`);
    streamLines.push(`1 1 1 rg`); // white text
    streamLines.push(`${margin + 10} ${pageHeight - margin - 35} Td`);
    streamLines.push(`(${enc('Imtihon Jadvali  |  ID: ' + idInput + '  |  ' + results.length + ' ta imtihon')}) Tj`);
    streamLines.push(`ET`);

    // Subtitle
    streamLines.push(`BT`);
    streamLines.push(`/F1 9 Tf`);
    streamLines.push(`0.8 0.8 0.9 rg`);
    streamLines.push(`${margin + 10} ${pageHeight - margin - 48} Td`);
    streamLines.push(`(${enc('SAMDAQU  |  Creator: Shohjahon Shahriyev  |  Sahifa ' + (pageIdx + 1) + '/' + pages.length)}) Tj`);
    streamLines.push(`ET`);

    // Table header background
    let tableY = pageHeight - margin - 50 - 10 - headerHeight;
    streamLines.push(`q`);
    streamLines.push(`0.149 0.267 0.694 rg`); // medium blue
    streamLines.push(`${tableStartX} ${tableY} ${totalTableWidth} ${headerHeight} re f`);
    streamLines.push(`Q`);

    // Table header text
    let xCursor = tableStartX;
    fields.forEach(f => {
      streamLines.push(`BT /F1 8 Tf 1 1 1 rg ${xCursor + colTextPad} ${tableY + 9} Td (${enc(f.label)}) Tj ET`);
      xCursor += f.width;
    });

    // Table rows
    pageRows.forEach((row, rowIdx) => {
      const ry = tableY - (rowIdx + 1) * rowHeight;
      // Alternating row background
      streamLines.push(`q`);
      if (rowIdx % 2 === 0) {
        streamLines.push(`0.97 0.97 1 rg`);
      } else {
        streamLines.push(`1 1 1 rg`);
      }
      streamLines.push(`${tableStartX} ${ry} ${totalTableWidth} ${rowHeight} re f`);
      streamLines.push(`Q`);

      // Row text
      let rx = tableStartX;
      fields.forEach(f => {
        const val = (row[f.key] || '').toString();
        // Truncate if too long
        const maxChars = Math.floor(f.width / 5);
        const displayVal = val.length > maxChars ? val.substring(0, maxChars - 2) + '..' : val;
        streamLines.push(`BT /F1 8 Tf 0.1 0.1 0.2 rg ${rx + colTextPad} ${ry + 7} Td (${enc(displayVal)}) Tj ET`);
        rx += f.width;
      });

      // Row border line
      streamLines.push(`q 0.85 0.85 0.9 RG 0.5 w ${tableStartX} ${ry} m ${tableStartX + totalTableWidth} ${ry} l S Q`);
    });

    // Column separator lines
    let cx = tableStartX;
    fields.forEach(f => {
      const tableBottom = tableY - pageRows.length * rowHeight;
      streamLines.push(`q 0.85 0.85 0.9 RG 0.3 w ${cx} ${tableBottom} m ${cx} ${tableY + headerHeight} l S Q`);
      cx += f.width;
    });
    streamLines.push(`q 0.85 0.85 0.9 RG 0.3 w ${cx} ${tableY - pageRows.length * rowHeight} m ${cx} ${tableY + headerHeight} l S Q`);

    const stream = streamLines.join('\n');
    const pageObj = `${pageId} 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}]
   /Resources << /Font << /F1 3 0 R >> >> /Contents ${pageId + pages.length} 0 R >>
endobj`;
    objects.push({ id: pageId, content: pageObj });
    
    // Stream object
    const streamId = pageId + pages.length;
    objects.push({ id: streamId, content: `${streamId} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj` });
  });

  // Sort objects by id
  objects.sort((a, b) => a.id - b.id);

  // Build PDF
  let pdfStr = '%PDF-1.4\n';
  const offsets = {};
  objects.forEach(obj => {
    offsets[obj.id] = pdfStr.length;
    pdfStr += obj.content + '\n';
  });

  // xref
  const xrefOffset = pdfStr.length;
  const maxId = Math.max(...objects.map(o => o.id));
  pdfStr += `xref\n0 ${maxId + 1}\n`;
  pdfStr += '0000000000 65535 f \n';
  for (let i = 1; i <= maxId; i++) {
    if (offsets[i] !== undefined) {
      pdfStr += offsets[i].toString().padStart(10, '0') + ' 00000 n \n';
    } else {
      pdfStr += '0000000000 65535 f \n';
    }
  }
  pdfStr += `trailer\n<< /Size ${maxId + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return Buffer.from(pdfStr, 'latin1');
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

    if (awaitingId.get(chatId)) {
      const idInput = msg.text?.trim();
      awaitingId.set(chatId, false);

      if (!idInput) {
        bot.sendMessage(chatId, "❌ ID kiritilmadi. Qaytadan /start bosing.");
        return;
      }

      const searchMsg = await bot.sendMessage(chatId, '🔍 Qidirilmoqda...');

      let data;
      try {
        data = loadData();
      } catch (e) {
        bot.editMessageText("❌ Ma'lumotlar bazasiga ulanishda xatolik.", { chat_id: chatId, message_id: searchMsg.message_id });
        return;
      }

      const results = data?.filter(row =>
        row.id && row.id.toString().toLowerCase() === idInput.toLowerCase()
      ) || [];

      if (results.length === 0) {
        bot.editMessageText(
          `❌ *ID "${idInput}"* bo'yicha natija topilmadi.\n\nIltimos, ID ni to'g'ri kiriting yoki /start bosib qayta urinib ko'ring.`,
          { chat_id: chatId, message_id: searchMsg.message_id, parse_mode: 'Markdown' }
        );
        return;
      }

      await bot.editMessageText('📄 PDF tayyorlanmoqda...', { chat_id: chatId, message_id: searchMsg.message_id });

      try {
        const pdfBuffer = await generatePdfBuffer(idInput, results);
        const fileName = `imtihon_${idInput}.pdf`;

        await bot.sendDocument(chatId, pdfBuffer, {
          caption: `✅ *${results.length} ta imtihon* ma'lumoti tayyor!\n\n📌 ID: ${idInput}`,
          parse_mode: 'Markdown'
        }, {
          filename: fileName,
          contentType: 'application/pdf'
        });

        bot.deleteMessage(chatId, searchMsg.message_id).catch(() => {});
      } catch (e) {
        console.error('PDF yaratishda xatolik:', e);
        bot.editMessageText('❌ PDF yaratishda xatolik yuz berdi. Qayta urinib ko\'ring.', {
          chat_id: chatId, message_id: searchMsg.message_id
        });
      }
    }
  });

  console.log('✅ Telegram bot ishga tushdi.');
}
