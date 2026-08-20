const fs = require('fs');
let code = fs.readFileSync('src/components/ui.tsx', 'utf8');

// Use bg-black/60 for a better glassmorphism effect
code = code.replace(/bg-black\/95/g, "bg-black/60");

fs.writeFileSync('src/components/ui.tsx', code);
console.log("Glassmorphism fixed.");
