const fs = require('fs');
let code = fs.readFileSync('src/components/ui.tsx', 'utf8');

// Fix z-index
code = code.replace(/className={cx\('relative', className\)} ref={ref}/g, "className={cx('relative', open && 'z-50', className)} ref={ref}");

// Fix background opacity (bg-onyx/95 -> bg-onyx-soft/95 or bg-black/90)
code = code.replace(/bg-onyx\/95/g, "bg-black/95");

fs.writeFileSync('src/components/ui.tsx', code);
console.log("Dropdowns fixed.");
