#!/usr/bin/env node

/**
 * Script to generate PWA icons for Julien RONOT CRM
 * Uses pure Node.js with canvas to generate icons with blue background
 *
 * Usage: node scripts/generate-icons.js
 *
 * Prerequisites: npm install canvas
 */

const fs = require('fs');
const path = require('path');

// Try to use canvas, fall back to creating placeholder PNGs
let createCanvas;
try {
  createCanvas = require('canvas').createCanvas;
} catch (e) {
  console.log('Canvas not installed. Creating placeholder icons...');
  createCanvas = null;
}

const PRIMARY_BLUE = '#0064FA';
const WHITE = '#FFFFFF';
const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Ensure icons directory exists
if (!fs.existsSync(ICONS_DIR)) {
  fs.mkdirSync(ICONS_DIR, { recursive: true });
}

if (createCanvas) {
  // Generate real icons with canvas
  SIZES.forEach(size => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = PRIMARY_BLUE;
    ctx.fillRect(0, 0, size, size);

    // Letters "JR" centered
    ctx.fillStyle = WHITE;
    ctx.font = `bold ${Math.floor(size * 0.45)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('JR', size / 2, size / 2 + size * 0.03);

    // Save PNG
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(ICONS_DIR, `icon-${size}x${size}.png`), buffer);
    console.log(`Created icon-${size}x${size}.png`);
  });

  // Create maskable icons (with padding)
  [192, 512].forEach(size => {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = PRIMARY_BLUE;
    ctx.fillRect(0, 0, size, size);

    // Letters "JR" centered (smaller for maskable safe zone)
    ctx.fillStyle = WHITE;
    ctx.font = `bold ${Math.floor(size * 0.35)}px Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('JR', size / 2, size / 2 + size * 0.02);

    // Save PNG
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(ICONS_DIR, `icon-maskable-${size}x${size}.png`), buffer);
    console.log(`Created icon-maskable-${size}x${size}.png`);
  });

  console.log('\nAll icons generated successfully!');
} else {
  // Create minimal valid PNG files as placeholders
  // This is a 1x1 blue PNG that browsers can read
  const createMinimalPNG = (size) => {
    // Minimal PNG header for a blue pixel
    // This is a hack - creates a valid but tiny PNG
    const png = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // bit depth, color type, etc
      0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41, // IDAT chunk
      0x54, 0x08, 0xD7, 0x63, 0x60, 0x60, 0xF8, 0x0F, // compressed data (blue-ish)
      0x00, 0x00, 0x01, 0x01, 0x01, 0x00, 0x05, 0xFE,
      0xD4, 0xEF, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
      0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // IEND chunk
    ]);
    return png;
  };

  SIZES.forEach(size => {
    const png = createMinimalPNG(size);
    fs.writeFileSync(path.join(ICONS_DIR, `icon-${size}x${size}.png`), png);
    console.log(`Created placeholder icon-${size}x${size}.png`);
  });

  [192, 512].forEach(size => {
    const png = createMinimalPNG(size);
    fs.writeFileSync(path.join(ICONS_DIR, `icon-maskable-${size}x${size}.png`), png);
    console.log(`Created placeholder icon-maskable-${size}x${size}.png`);
  });

  console.log('\nPlaceholder icons created. For proper icons, install canvas:');
  console.log('npm install canvas');
  console.log('Then run this script again.');
}
