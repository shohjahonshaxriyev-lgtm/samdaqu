import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import { loadData } from './server.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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

    if (awaitingId.get(chatId)) {
      const idInput = msg.text?.trim();
      awaitingId.set(chatId, false);

      if (!idInput) {
        bot.sendMessage(chatId, '❌ ID kiritilmadi. Qaytadan /start bosing.');
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
        const pdfBuffer = generatePdfBuffer(idInput, results, allData);
        const fileName = `imtihon_${idInput}.pdf`;

        await bot.sendDocument(chatId, pdfBuffer, {
          caption:
            `✅ *${results.length} ta imtihon* ma'lumoti tayyor!\n\n` +
            `📌 ID: \`${idInput}\`\n` +
            `📊 PDF da: Tartib raqam, Xonadagi o'rin, Jami talabalar`,
          parse_mode: 'Markdown'
        }, {
          filename: fileName,
          contentType: 'application/pdf'
        });

        bot.deleteMessage(chatId, searchMsg.message_id).catch(() => {});
      } catch (e) {
        console.error('PDF yaratishda xatolik:', e);
        bot.editMessageText("❌ PDF yaratishda xatolik yuz berdi. Qayta urinib ko'ring.", {
          chat_id: chatId, message_id: searchMsg.message_id
        });
      }
    }
  });

  console.log('✅ Telegram bot ishga tushdi.');
}
