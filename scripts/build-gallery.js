// Scans gallery/*/ and writes gallery/manifest.json (static hosts can't list directories).
// Run after adding or removing gallery folders or images: npm run gallery
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..', 'gallery');
const imageExt = /\.(jpe?g|png|webp|avif|gif|svg)$/i;
const collator = new Intl.Collator('en', { numeric: true });

const { execFileSync } = require('child_process');

// Thumbnails (gallery/<id>/thumbs/<name>.webp) keep the grid light; originals stay untouched.
// Needs ImageMagick (magick). Existing thumbs are reused unless the source is newer.
function build(id, file) {
  const src = path.join(root, id, file);
  const name = path.parse(file).name + '.webp';
  const thumb = path.join(root, id, 'thumbs', name);
  fs.mkdirSync(path.dirname(thumb), { recursive: true });
  if (!fs.existsSync(thumb) || fs.statSync(thumb).mtimeMs < fs.statSync(src).mtimeMs) {
    execFileSync('magick', [src + '[0]', '-auto-orient', '-resize', '1000x1000>', '-strip', '-quality', '80', thumb]);
  }
  // dimensions of the thumb (post-orientation) so the page can reserve space before load
  const [w, h] = execFileSync('magick', ['identify', '-format', '%w %h', thumb]).toString().split(' ').map(Number);
  return { src: file, thumb: `thumbs/${name}`, w, h };
}

const entries = fs.readdirSync(root, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => d.name)
  .sort(collator.compare)
  .map((id) => ({
    id,
    images: fs.readdirSync(path.join(root, id)).filter((f) => imageExt.test(f)).sort(collator.compare).map((f) => build(id, f)),
  }))
  .filter((e) => e.images.length);

fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(entries, null, 2) + '\n');
console.log(`gallery/manifest.json: ${entries.length} entries`);
