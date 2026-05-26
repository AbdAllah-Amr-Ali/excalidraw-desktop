import pngToIco from 'png-to-ico';
import fs from 'fs';
import path from 'path';

const src = path.resolve('E:/excalidraw/public/android-chrome-512x512.png');
const dest = path.resolve('E:/excalidraw-desktop/assets/icon.ico');

const buf = await pngToIco(src);
fs.writeFileSync(dest, buf);
console.log('ICO created at', dest);
