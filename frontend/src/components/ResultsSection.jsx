import React from 'react';
import { FileText, Download, MapPin, Calendar, Clock, User, Award, Users, Hash } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useToast } from '../context/ToastContext';

export default function ResultsSection({ results, searchedId }) {
  const toast = useToast();

  if (!results || results.length === 0) return null;

  const dayOrder = {
    'dushanba': 1,
    'seshanba': 2,
    'chorshanba': 3,
    'payshanba': 4,
    'juma': 5,
    'shanba': 6,
    'yakshanba': 7
  };

  const sortedResults = [...results].sort((a, b) => {
    const dayA = (a.day_name || '').toLowerCase().trim();
    const dayB = (b.day_name || '').toLowerCase().trim();
    return (dayOrder[dayA] || 99) - (dayOrder[dayB] || 99);
  });

  // Header styles color palette mappings
  const headerColors = [
    'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',     // ID
    'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20', // Sana
    'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20', // day_name
    'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',     // start_time
    'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',   // end_time
    'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20',     // exam_code
    'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20', // exam_name
    'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20', // building
    'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',     // Auditorya
    'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20',   // student_name
    'bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20'      // student_surname
  ];

  const headers = [
    { label: '№', key: '_order' },
    { label: 'Sana', key: 'sana' },
    { label: 'Kun', key: 'day_name' },
    { label: 'Boshlanish', key: 'start_time' },
    { label: 'Tugash', key: 'end_time' },
    { label: 'Fan nomi', key: 'exam_name' },
    { label: 'Auditoriya', key: 'auditorya' },
    { label: 'Stul raqami', key: 'stul_raqami' },
    { label: 'Xonadagi o\'rin', key: '_roomOrder' },
    { label: 'Xonadagi talabalar', key: '_roomTotal' },
    { label: 'Ism Familiya', key: '_fullname' },
  ];

  const exportPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const studentName = `${sortedResults[0].student_surname || ''} ${sortedResults[0].student_name || ''}`;

      // Blue header banner
      doc.setFillColor(37, 99, 235);
      doc.roundedRect(14, 10, 270, 22, 3, 3, 'F');
      doc.setFontSize(13);
      doc.setTextColor(255, 255, 255);
      doc.text('IMTIHON JADVALI', 18, 22);
      doc.setFontSize(8);
      doc.text(`Talaba: ${studentName}  |  ID: ${searchedId}  |  ${new Date().toLocaleDateString('uz-UZ')}`, 18, 29);

      // PDF table columns
      const pdfHeaders = [
        'Tartib\nraqam',
        'Sana',
        'Kun',
        'Boshlanish',
        'Tugash',
        'Fan nomi',
        'Auditoriya',
        'Stul\nraqami',
        'Xonadagi\no\'rin',
        'Xonadagi\ntalabalar',
        'Ism Familiya',
      ];

      const pdfRows = sortedResults.map((row, idx) => [
        idx + 1,
        row.sana || '',
        row.day_name || '',
        row.start_time || '',
        row.end_time || '',
        row.exam_name || '',
        row.auditorya || '',
        row.stul_raqami || '',
        row.roomStats ? `${row.roomStats.orderInRoom}-chi` : '-',
        row.roomStats ? `${row.roomStats.totalInRoom} ta` : '-',
        `${row.student_surname || ''} ${row.student_name || ''}`,
      ]);

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
          0: { cellWidth: 14, halign: 'center' },   // Tartib raqam
          5: { cellWidth: 45, halign: 'left' },       // Fan nomi
          7: { cellWidth: 14, halign: 'center' },       // Stul
          8: { cellWidth: 18, fillColor: [219, 234, 254] }, // Xonadagi o'rin (highlight)
          9: { cellWidth: 18, fillColor: [209, 250, 229] }, // Xonadagi talabalar (highlight)
          10: { cellWidth: 35, halign: 'left' },       // Ism
        },
        styles: { overflow: 'linebreak', cellPadding: 2.5 },
        // Footer
        didDrawPage: (data) => {
          doc.setFontSize(7);
          doc.setTextColor(156, 163, 175);
          doc.text(
            `SDTU | Sahifa ${data.pageNumber}`,
            14,
            doc.internal.pageSize.height - 5
          );
        },
      });

      doc.save(`imtihon_jadvali_${searchedId}.pdf`);
      toast.showSuccess('PDF muvaffaqiyatli yuklab olindi!');
    } catch (error) {
      console.error(error);
      toast.showError('PDF yuklab olishda xatolik yuz berdi');
    }
  };

  return (
    <div className="w-full mt-6">
      
      {/* Action Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
          Qidiruv natijalari: {results.length} ta imtihon
        </h3>
        <button
          onClick={exportPDF}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-gradient-royal text-white text-xs font-semibold hover:opacity-95 transition-all active:scale-95 soft-shadow"
        >
          <Download size={14} />
          PDF Yuklash
        </button>
      </div>




      {/* Desktop view: Colorful Table */}
      <div className="hidden md:block w-full overflow-x-auto rounded-3xl glass-effect soft-shadow border border-slate-200/20">
        <table className="w-full text-left border-collapse min-w-[1000px]">
          <thead>
            <tr className="border-b border-slate-200/40 dark:border-slate-800/40">
              {headers.map((header, idx) => (
                <th 
                  key={idx} 
                  className={`p-4 text-xs font-bold text-center border-r border-slate-200/10 last:border-r-0`}
                >
                  <span className={`px-3 py-1.5 rounded-full text-xxs font-semibold border ${headerColors[idx % headerColors.length]}`}>
                    {header.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
            {sortedResults.map((row, rowIdx) => (
              <tr 
                key={rowIdx} 
                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
              >
                {headers.map((h, colIdx) => {
                  let val;
                  if (h.key === '_order') val = rowIdx + 1;
                  else if (h.key === '_roomOrder') val = row.roomStats ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 font-bold text-xxxxs">
                      <Hash size={10} />{row.roomStats.orderInRoom}-o'rin
                    </span>
                  ) : '-';
                  else if (h.key === '_roomTotal') val = row.roomStats ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-bold text-xxxxs">
                      <Users size={10} />{row.roomStats.totalInRoom} ta
                    </span>
                  ) : '-';
                  else if (h.key === '_fullname') val = `${row.student_surname || ''} ${row.student_name || ''}`;
                  else val = row[h.key] || '-';
                  return (
                    <td key={colIdx} className="p-4 text-xs text-center text-slate-700 dark:text-slate-300 font-medium">
                      {val}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile view: Stacked Cards */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {sortedResults.map((row, idx) => (
          <div 
            key={idx}
            className="glass-effect rounded-3xl p-5 soft-shadow border border-slate-200/20 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full pointer-events-none" />
            
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <span className="px-2 py-0.5 text-xxxxs font-bold uppercase tracking-wider rounded bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
                  #{idx + 1} — Sizning faningiz
                </span>
                <h4 className="text-sm font-bold text-slate-850 dark:text-slate-150 mt-1 leading-tight">
                  {row.exam_name || 'Fan nomi kiritilmagan'}
                </h4>
              </div>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/20 px-2.5 py-1 rounded-xl shrink-0">
                {row.start_time || '--:--'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-y-3.5 gap-x-2 text-xxs text-slate-500 dark:text-slate-400 border-t border-slate-100/50 dark:border-slate-800/50 pt-4">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-400" />
                <div>
                  <p className="text-xxxxs uppercase tracking-wider text-slate-400 font-semibold">Sana / Kun</p>
                  <p className="font-bold text-slate-700 dark:text-slate-300">{row.sana || '-'} ({row.day_name || '-'})</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-slate-400" />
                <div>
                  <p className="text-xxxxs uppercase tracking-wider text-slate-400 font-semibold">Vaqti</p>
                  <p className="font-bold text-slate-700 dark:text-slate-300">{row.start_time || '-'} - {row.end_time || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-slate-400" />
                <div>
                  <p className="text-xxxxs uppercase tracking-wider text-slate-400 font-semibold">Auditoriya</p>
                  <p className="font-bold text-slate-700 dark:text-slate-300">{row.auditorya || '-'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User size={14} className="text-slate-400" />
                <div>
                  <p className="text-xxxxs uppercase tracking-wider text-slate-400 font-semibold">Talaba ID</p>
                  <p className="font-bold text-slate-700 dark:text-slate-300">{row.id || '-'}</p>
                </div>
              </div>
              {row.stul_raqami && (
                <div className="flex items-center gap-2">
                  <Hash size={14} className="text-slate-400" />
                  <div>
                    <p className="text-xxxxs uppercase tracking-wider text-slate-400 font-semibold">Stul raqami</p>
                    <p className="font-bold text-slate-700 dark:text-slate-300">{row.stul_raqami}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Room Stats */}
            {row.roomStats && (
              <div className="mt-2 flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-500/15">
                  <Hash size={11} className="text-blue-500 shrink-0" />
                  <div>
                    <p className="text-xxxxs text-blue-400 font-semibold leading-none mb-0.5">Xonadagi o'rin</p>
                    <p className="text-xs font-bold text-blue-600 dark:text-blue-400 leading-none">{row.roomStats.orderInRoom}-chi</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-500/15">
                  <Users size={11} className="text-emerald-500 shrink-0" />
                  <div>
                    <p className="text-xxxxs text-emerald-400 font-semibold leading-none mb-0.5">Jami talabalar</p>
                    <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 leading-none">{row.roomStats.totalInRoom} ta</p>
                  </div>
                </div>
              </div>
            )}

            {/* Student Name */}
            <div className="mt-3 p-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl flex items-center justify-between border border-slate-100/50 dark:border-slate-800/50">
              <div className="flex items-center gap-2 text-xxs">
                <Award size={14} className="text-blue-500" />
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {row.student_surname || ''} {row.student_name || ''}
                </span>
              </div>
              <span className="text-xxxxs text-slate-400 dark:text-slate-500 uppercase tracking-widest font-semibold">Talaba</span>
            </div>
          </div>
        ))}
      </div>
      
    </div>
  );
}
