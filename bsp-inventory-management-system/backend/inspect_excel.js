const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'FINAL_BSP Employees & Offices Email Addresses.xlsx');
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const sheet = workbook.Sheets[sheetName];

const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
console.log('First 5 rows:');
console.log(JSON.stringify(data.slice(0, 5), null, 2));
