import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { loadData } from './server.js';

/**
 * Generate a PDF buffer for a given student ID.
 * @param {string|number} id - Student ID to look up.
 * @returns {Promise<Buffer>} - PDF as a Node Buffer.
 */
export async function generatePdfBuffer(id) {
  const data = loadData();
  const results = data?.filter(row => row.id && row.id.toString().toLowerCase() === id.toString().toLowerCase()) || [];
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  doc.text(`Imtihon natijalari – ID: ${id}`, 40, 50);
  if (results.length) {
    const columns = Object.keys(results[0]).filter(k => k !== 'extra');
    const rows = results.map(r => columns.map(col => r[col] ?? ''));
    autoTable(doc, { head: [columns], body: rows, startY: 70 });
  } else {
    doc.text('Natija topilmadi', 40, 80);
  }
  const arrayBuffer = doc.output('arraybuffer');
  return Buffer.from(arrayBuffer);
}
