import nodeHtmlToImage from 'node-html-to-image';
import fs from 'fs';

async function test() {
  try {
    const buffer = await nodeHtmlToImage({
      html: '<html><body>Hello World</body></html>',
      quality: 100,
      puppeteerArgs: {
        defaultViewport: { width: 500, height: 100, deviceScaleFactor: 2 }
      }
    });
    console.log('Success! Buffer size:', buffer.length);
  } catch (e) {
    console.error('Test error:', e);
  }
}
test();
