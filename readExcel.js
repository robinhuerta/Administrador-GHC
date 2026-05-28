const xlsx = require('xlsx');

const workbook = xlsx.readFile('Libro General Diana 2024 ,2025 Y 2026.xlsx');
console.log('Sheet Names:', workbook.SheetNames);

// For each sheet, print the first few rows so I can see the structure.
workbook.SheetNames.forEach(sheetName => {
  console.log(`\n--- Sheet: ${sheetName} ---`);
  const sheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  console.log(data.slice(0, 5));
});
