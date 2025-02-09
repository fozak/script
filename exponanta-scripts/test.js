var c;
c = 1 + 3;
const fs = require('fs');
fs.writeFileSync('test2.txt', c.toString()); // Convert number to string
console.log(process.cwd());