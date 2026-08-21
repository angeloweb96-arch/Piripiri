// Script para gerar ícones PWA
// npm install sharp

const sharp = require('sharp');
const fs = require('fs');

// Criar um SVG base para o ícone
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="80" fill="#ff6b4a"/>
  <text x="256" y="360" font-size="280" text-anchor="middle" fill="white" font-family="sans-serif">🗣</text>
</svg>
`;

// Tamanhos necessários
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

// Criar pasta icons se não existir
if (!fs.existsSync('icons')) {
  fs.mkdirSync('icons');
}

// Salvar SVG base
fs.writeFileSync('icons/icon-base.svg', svgIcon);

// Gerar PNGs
async function generateIcons() {
  console.log('🎨 Gerando ícones PWA...');
  
  for (const size of sizes) {
    const filename = `icons/icon-${size}x${size}.png`;
    await sharp(Buffer.from(svgIcon))
      .resize(size, size)
      .png()
      .toFile(filename);
    console.log(`✅ ${filename}`);
  }
  
  // Ícones para shortcuts
  const shortcutSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <rect width="512" height="512" rx="80" fill="#ff6b4a"/>
    <text x="256" y="380" font-size="300" text-anchor="middle" fill="white" font-family="sans-serif">➕</text>
  </svg>
  `;
  
  await sharp(Buffer.from(shortcutSvg))
    .resize(96, 96)
    .png()
    .toFile('icons/shortcut-post.png');
    
  const secretSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
    <rect width="512" height="512" rx="80" fill="#ff6b4a"/>
    <text x="256" y="380" font-size="300" text-anchor="middle" fill="white" font-family="sans-serif">🤫</text>
  </svg>
  `;
  
  await sharp(Buffer.from(secretSvg))
    .resize(96, 96)
    .png()
    .toFile('icons/shortcut-secrets.png');
  
  // Badge
  const badgeSvg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 72">
    <circle cx="36" cy="36" r="30" fill="#ff6b4a"/>
    <text x="36" y="45" font-size="40" text-anchor="middle" fill="white" font-family="sans-serif" font-weight="bold">🗣</text>
  </svg>
  `;
  
  await sharp(Buffer.from(badgeSvg))
    .resize(72, 72)
    .png()
    .toFile('icons/badge-72x72.png');
  
  console.log('✅ Todos os ícones gerados com sucesso!');
}

generateIcons().catch(console.error);
