const { existsSync, readdirSync } = require('fs');
const { join } = require('path');

console.log('Current working directory:', process.cwd());
console.log('__dirname:', __dirname);

const pagesDir = join(process.cwd(), 'pages');
const appDir = join(process.cwd(), 'app');

console.log('Pages directory exists:', existsSync(pagesDir));
console.log('App directory exists:', existsSync(appDir));

if (existsSync(pagesDir)) {
  console.log('Pages directory content (first 10 items):', readdirSync(pagesDir).slice(0, 10));
}

if (existsSync(appDir)) {
  console.log('App directory content (first 10 items):', readdirSync(appDir).slice(0, 10));
}