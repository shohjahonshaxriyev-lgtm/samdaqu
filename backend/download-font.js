import fs from 'fs';
import https from 'https';

const file = fs.createWriteStream("fonts/Roboto-Regular.ttf");
https.get("https://raw.githubusercontent.com/google/fonts/main/apache/roboto/Roboto-Regular.ttf", function(response) {
  response.pipe(file);
  file.on('finish', () => {
    file.close();
    console.log('Font downloaded');
  });
});
