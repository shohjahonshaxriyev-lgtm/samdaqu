import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import fs from 'fs';

async function testPdf() {
  const doc = new jsPDF();
  
  doc.setFontSize(16);
  doc.text("Bot A'zolari Ro'yxati", 14, 15);

  const head = [['№', 'Rasm', 'Ism Familiya', 'Username', 'Telegram ID', 'Sana']];
  const body = [
    [1, '', 'Shohjahon Shahriyev', '@shohjahon', '123456789', '2026-06-14']
  ];

  autoTable(doc, {
    head,
    body,
    startY: 28,
    didDrawCell: (data) => {
      if (data.column.index === 1 && data.cell.section === 'body') {
        doc.setFillColor(226, 232, 240);
        doc.circle(data.cell.x + 7.5, data.cell.y + 7.5, 5.5, 'F');
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8);
        doc.text('S', data.cell.x + 7.5, data.cell.y + 10, { align: 'center' });
      }
    }
  });

  const buffer = Buffer.from(doc.output('arraybuffer'));
  fs.writeFileSync('test-out.pdf', buffer);
  console.log("PDF created");
}

testPdf().catch(console.error);
