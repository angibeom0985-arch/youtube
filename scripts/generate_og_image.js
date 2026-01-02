const { createCanvas, registerFont } = require("canvas");
const fs = require("fs");
const path = require("path");

// ?œê? ?°íŠ¸ ?±ë¡
try {
  registerFont("C:\\Windows\\Fonts\\malgunbd.ttf", {
    family: "Malgun Gothic",
    weight: "bold",
  });
  registerFont("C:\\Windows\\Fonts\\malgun.ttf", {
    family: "Malgun Gothic",
    weight: "normal",
  });
  console.log("???°íŠ¸ ë¡œë“œ ?±ê³µ");
} catch (e) {
  console.error("???°íŠ¸ ë¡œë“œ ?¤íŒ¨:", e.message);
}

function createOgImage(outputPath, title, subtitle, colors, width, height) {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // ê·¸ë˜?”ì–¸??ë°°ê²½
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, colors.start);
  gradient.addColorStop(1, colors.end);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // ?¥ì‹ ?”ì†Œ - ë°˜íˆ¬ëª??ë“¤
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(width * 0.2, height * 0.3, width * 0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(width * 0.8, height * 0.7, width * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1.0;

  // ì¤‘ì•™ ì»¨í…Œ?´ë„ˆ ë°•ìŠ¤ (?½ê°„ ?¬ëª…) - ?¥ê·¼ ëª¨ì„œë¦?
  ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
  const containerRadius = 20;
  const containerX = width * 0.1;
  const containerY = height * 0.25;
  const containerWidth = width * 0.8;
  const containerHeight = height * 0.5;

  ctx.beginPath();
  ctx.moveTo(containerX + containerRadius, containerY);
  ctx.lineTo(containerX + containerWidth - containerRadius, containerY);
  ctx.quadraticCurveTo(
    containerX + containerWidth,
    containerY,
    containerX + containerWidth,
    containerY + containerRadius
  );
  ctx.lineTo(
    containerX + containerWidth,
    containerY + containerHeight - containerRadius
  );
  ctx.quadraticCurveTo(
    containerX + containerWidth,
    containerY + containerHeight,
    containerX + containerWidth - containerRadius,
    containerY + containerHeight
  );
  ctx.lineTo(containerX + containerRadius, containerY + containerHeight);
  ctx.quadraticCurveTo(
    containerX,
    containerY + containerHeight,
    containerX,
    containerY + containerHeight - containerRadius
  );
  ctx.lineTo(containerX, containerY + containerRadius);
  ctx.quadraticCurveTo(
    containerX,
    containerY,
    containerX + containerRadius,
    containerY
  );
  ctx.closePath();
  ctx.fill();

  // ?ë‹¨ ê°•ì¡° ?¼ì¸
  ctx.fillStyle = colors.accent;
  ctx.fillRect(width * 0.1, height * 0.25, width * 0.8, 8);

  // ?€?´í? ?ìŠ¤??
  const scale = Math.min(width, height) / 630;
  ctx.font = `bold ${Math.floor(85 * scale)}px "Malgun Gothic"`;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title, width / 2, height * 0.4);

  // ?œë¸Œ?€?´í? ?ìŠ¤??
  ctx.font = `${Math.floor(42 * scale)}px "Malgun Gothic"`;
  ctx.fillStyle = "#e0e0e0";
  ctx.fillText(subtitle, width / 2, height * 0.54);

  // ?„ë©”??ë°•ìŠ¤
  const domain = "youtube.money-hotissue.com";
  ctx.font = `${Math.floor(28 * scale)}px "Malgun Gothic"`;
  const domainWidth = ctx.measureText(domain).width;
  const boxPadding = 25 * scale;
  const boxX = (width - domainWidth) / 2 - boxPadding;
  const boxY = height * 0.68;
  const boxWidth = domainWidth + boxPadding * 2;
  const boxHeight = 55 * scale;

  // ?„ë©”??ë°°ê²½ ë°•ìŠ¤ (?¥ê·¼ ëª¨ì„œë¦?
  ctx.fillStyle = "#ffffff";
  const domainRadius = 10;
  ctx.beginPath();
  ctx.moveTo(boxX + domainRadius, boxY);
  ctx.lineTo(boxX + boxWidth - domainRadius, boxY);
  ctx.quadraticCurveTo(
    boxX + boxWidth,
    boxY,
    boxX + boxWidth,
    boxY + domainRadius
  );
  ctx.lineTo(boxX + boxWidth, boxY + boxHeight - domainRadius);
  ctx.quadraticCurveTo(
    boxX + boxWidth,
    boxY + boxHeight,
    boxX + boxWidth - domainRadius,
    boxY + boxHeight
  );
  ctx.lineTo(boxX + domainRadius, boxY + boxHeight);
  ctx.quadraticCurveTo(
    boxX,
    boxY + boxHeight,
    boxX,
    boxY + boxHeight - domainRadius
  );
  ctx.lineTo(boxX, boxY + domainRadius);
  ctx.quadraticCurveTo(boxX, boxY, boxX + domainRadius, boxY);
  ctx.closePath();
  ctx.fill();

  // ?„ë©”???ìŠ¤??
  ctx.fillStyle = colors.domainText;
  ctx.fillText(domain, width / 2, boxY + boxHeight / 2);

  // ?´ë?ì§€ ?€??
  const buffer = canvas.toBuffer("image/png");
  fs.writeFileSync(outputPath, buffer);
  console.log(`??OG ?´ë?ì§€ ?ì„± ?„ë£Œ: ${path.basename(outputPath)}`);
}

// public ?”ë ‰? ë¦¬ ê²½ë¡œ
const publicDir = path.join(__dirname, "../public");

console.log("?¨ OG ?´ë?ì§€ ?ì„± ?œì‘...\n");

// ë©”ì¸ ?˜ì´ì§€ (?¤í¬ ?ˆë“œ ê·¸ë˜?”ì–¸??
createOgImage(
  path.join(publicDir, "og-image.png"),
  "? íŠœë¸??ìƒ ë¶„ì„ AI",
  "AIê°€ ë¶„ì„???¡ìƒ ?ìƒ??ê³µì‹! 1ë¶?ë§Œì—",
  {
    start: "#8B0000",
    end: "#DC143C",
    accent: "#FF6B6B",
    domainText: "#8B0000",
  },
  1200,
  630
);

createOgImage(
  path.join(publicDir, "og-image-square.png"),
  "? íŠœë¸??ìƒ ë¶„ì„ AI",
  "AIê°€ ë¶„ì„???¡ìƒ ?ìƒ??ê³µì‹! 1ë¶?ë§Œì—",
  {
    start: "#8B0000",
    end: "#DC143C",
    accent: "#FF6B6B",
    domainText: "#8B0000",
  },
  1200,
  1200
);

// ê°€?´ë“œ ?˜ì´ì§€ (ë¸”ë£¨ ê·¸ë˜?”ì–¸??
createOgImage(
  path.join(publicDir, "og-image-guide.png"),
  "?¬ìš©ë²?ê°€?´ë“œ",
  "AI ?ìƒ ë¶„ì„ ?„êµ¬ ?„ë²½ ?¬ìš©ë²?,
  {
    start: "#003366",
    end: "#0066CC",
    accent: "#4A9EFF",
    domainText: "#003366",
  },
  1200,
  630
);

createOgImage(
  path.join(publicDir, "og-image-guide-square.png"),
  "?¬ìš©ë²?ê°€?´ë“œ",
  "AI ?ìƒ ë¶„ì„ ?„êµ¬ ?„ë²½ ?¬ìš©ë²?,
  {
    start: "#003366",
    end: "#0066CC",
    accent: "#4A9EFF",
    domainText: "#003366",
  },
  1200,
  1200
);

// API ê°€?´ë“œ ?˜ì´ì§€ (?¼í”Œ ê·¸ë˜?”ì–¸??
createOgImage(
  path.join(publicDir, "og-image-api-guide.png"),
  "API ??ë°œê¸‰ ê°€?´ë“œ",
  "Google AI Studio API ??ë°œê¸‰ ë°©ë²•",
  {
    start: "#4B0082",
    end: "#8A2BE2",
    accent: "#BA55D3",
    domainText: "#4B0082",
  },
  1200,
  630
);

createOgImage(
  path.join(publicDir, "og-image-api-guide-square.png"),
  "API ??ë°œê¸‰ ê°€?´ë“œ",
  "Google AI Studio API ??ë°œê¸‰ ë°©ë²•",
  {
    start: "#4B0082",
    end: "#8A2BE2",
    accent: "#BA55D3",
    domainText: "#4B0082",
  },
  1200,
  1200
);

console.log("\n?‰ ëª¨ë“  OG ?´ë?ì§€ ?ì„± ?„ë£Œ! (ì§ì‚¬ê°í˜• + ?•ì‚¬ê°í˜•)");
