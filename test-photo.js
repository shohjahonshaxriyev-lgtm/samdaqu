import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import https from 'https';
import fs from 'fs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

dotenv.config({ path: '.env' });
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
const userId = '422057508'; // User's ID

async function test() {
  try {
    console.log("Fetching photos...");
    const photos = await bot.getUserProfilePhotos(userId, 0, 1);
    console.log("Photos:", JSON.stringify(photos, null, 2));
    
    if (photos.total_count > 0) {
      const fileId = photos.photos[0][0].file_id;
      const file = await bot.getFile(fileId);
      console.log("File info:", file);
      
      const url = `https://api.telegram.org/file/bot${process.env.TELEGRAM_BOT_TOKEN}/${file.file_path}`;
      const buffer = await new Promise((resolve, reject) => {
        https.get(url, (res) => {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => resolve(Buffer.concat(chunks)));
        }).on('error', reject);
      });
      
      const base64 = `data:image/jpeg;base64,${buffer.toString('base64')}`;
      console.log("Downloaded image, base64 length:", base64.length);
      
      const doc = new jsPDF();
      doc.text("Test Image", 10, 10);
      doc.addImage(base64, 'JPEG', 10, 20, 50, 50);
      fs.writeFileSync("test.pdf", Buffer.from(doc.output('arraybuffer')));
      console.log("Created test.pdf successfully!");
    } else {
      console.log("User has no profile photos or privacy settings hide them.");
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
