import xlsx from 'xlsx';
import fs from 'fs';
import path from 'path';

export function generateMockExcel(outputPath) {
  try {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Sample Uzbek student exam schedules
    const data = [
      {
        "ID": "643129",
        "Sana": "29.05.2026",
        "day_name": "Juma",
        "start_time": "13:10",
        "end_time": "14:10",
        "exam_code": "KRM3020",
        "exam_name": "Poydevor muhandislik",
        "building": "Bosh bino",
        "Auditorya": "Boshbino-805",
        "student_name": "SHAHRIYEV",
        "student_surname": "SHOHJAHON"
      },
      {
        "ID": "643129",
        "Sana": "30.05.2026",
        "day_name": "Shanba",
        "start_time": "09:00",
        "end_time": "10:30",
        "exam_code": "MAT1010",
        "exam_name": "Oliy matematika",
        "building": "Kichik bino",
        "Auditorya": "Kichikbino-204",
        "student_name": "SHAHRIYEV",
        "student_surname": "SHOHJAHON"
      },
      {
        "ID": "123456",
        "Sana": "29.05.2026",
        "day_name": "Juma",
        "start_time": "10:00",
        "end_time": "11:30",
        "exam_code": "PHY2010",
        "exam_name": "Mexanika va molekulyar fizika",
        "building": "Fizika korpusi",
        "Auditorya": "Fizika-302",
        "student_name": "ABDUVALIYEV",
        "student_surname": "O'LMASBEK"
      },
      {
        "ID": "789012",
        "Sana": "01.06.2026",
        "day_name": "Dushanba",
        "start_time": "14:30",
        "end_time": "16:00",
        "exam_code": "HIS4010",
        "exam_name": "O'zbekiston tarixi",
        "building": "Bosh bino",
        "Auditorya": "Boshbino-102",
        "student_name": "KARIMOVA",
        "student_surname": "LAYLO"
      },
      {
        "ID": "112233",
        "Sana": "02.06.2026",
        "day_name": "Seshanba",
        "start_time": "08:30",
        "end_time": "10:00",
        "exam_code": "CSE5020",
        "exam_name": "Sun'iy intellekt asoslari",
        "building": "AT korpusi",
        "Auditorya": "AT-505",
        "student_name": "ALIMOV",
        "student_surname": "RUSTAM"
      }
    ];

    const worksheet = xlsx.utils.json_to_sheet(data);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, "Imtihonlar");

    // Write to file
    xlsx.writeFile(workbook, outputPath);
    console.log('Sample mock Excel file generated successfully at:', outputPath);
  } catch (error) {
    console.error('Error generating mock Excel file:', error);
  }
}
