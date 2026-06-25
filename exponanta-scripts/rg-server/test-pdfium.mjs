// test-pdfium.mjs
import { PDFiumLibrary } from '@hyzyla/pdfium';
import { readFile } from 'fs/promises';

const buf = await readFile('irs_f1040_2021_form.pdf');
const library = await PDFiumLibrary.init();

const t0 = performance.now();
const doc = await library.loadDocument(buf);
let text = '';
for (const page of doc.pages()) {
  text += page.getText();
}
console.log(`${(performance.now() - t0).toFixed(1)}ms`);
console.log(text.slice(0, 200));
doc.destroy();
library.destroy();