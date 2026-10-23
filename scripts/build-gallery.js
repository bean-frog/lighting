// Scans gallery/*/ and writes gallery/manifest.json (static hosts can't list directories).
// Run after adding or removing gallery folders or images: npm run gallery
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'gallery');
const imageExt = /\.(jpe?g|png|webp|avif|gif|svg)$/i;
const collator = new Intl.Collator('en', { numeric: true });

const entries = fs.readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort(collator.compare)
  .map((id) => ({
    id,
    images: fs.readdirSync(path.join(root, id)).filter((f) => imageExt.test(f)).sort(collator.compare),
  }))
  .filter((e) => e.images.length);

fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(entries, null, 2) + '\n');
console.log(`gallery/manifest.json: ${entries.length} entries`);
