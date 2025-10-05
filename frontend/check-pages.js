const fs = require('fs');
const path = require('path');

console.log('Current working directory:', process.cwd());
console.log('Pages directory exists:', fs.existsSync('./pages'));
console.log('Pages directory exists (absolute):', fs.existsSync(path.join(process.cwd(), 'pages')));

if (fs.existsSync('./pages')) {
  const pagesContent = fs.readdirSync('./pages');
  console.log('Pages directory content (first 10 items):', pagesContent.slice(0, 10));
}

console.log('Project root detection:');
console.log('- __dirname:', __dirname);
console.log('- process.cwd():', process.cwd());