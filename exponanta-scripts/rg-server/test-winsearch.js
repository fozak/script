// test-winsearch.js
const ADODB = require('node-adodb');

const conn = ADODB.open(
  "Provider=Search.CollatorDSO;Extended Properties='Application=Windows'"
);

const t0 = Date.now();
conn.query(
  `SELECT System.ItemPathDisplay, System.Search.AutoSummary 
   FROM SystemIndex 
   WHERE System.ItemPathDisplay = 'C:\\python\\script\\exponanta-scripts\\rg-server\\irs_f1040_2021_form.pdf'`
)
.then(data => {
  console.log(`${Date.now() - t0}ms`);
  console.log(data);
})
.catch(err => console.error(err));