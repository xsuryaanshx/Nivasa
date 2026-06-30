const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src/components');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Fix button container flex rows to stack on mobile (flex-col-reverse)
  content = content.replace(/className="flex gap-([234]) pt-([12])"/g, 'className="flex flex-col-reverse sm:flex-row gap-$1 pt-$2"');
  
  // Fix grid-cols-2 to grid-cols-1 sm:grid-cols-2 for input grids
  content = content.replace(/className="grid grid-cols-2 gap-([0-9.]+)(.*)"/g, 'className="grid grid-cols-1 sm:grid-cols-2 gap-$1$2"');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed', path.basename(filePath));
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('Modal.tsx') || fullPath.endsWith('Panel.tsx') || fullPath.endsWith('Sheet.tsx')) {
      processFile(fullPath);
    }
  }
}

walk(dir);
