const { createCanvas } = require("canvas")
const fs = require("fs")
const path = require("path")

const PRIMARY_BLUE = "#0064FA"
const WHITE = "#FFFFFF"

// Generate app icon (1024x1024)
function generateIcon() {
  const size = 1024
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext("2d")

  // Background
  ctx.fillStyle = PRIMARY_BLUE
  ctx.fillRect(0, 0, size, size)

  // Letters "JR" for Julien RONOT
  ctx.fillStyle = WHITE
  ctx.font = "bold 450px Arial"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText("JR", size / 2, size / 2 + 20)

  // Add subtle accent line
  ctx.strokeStyle = WHITE
  ctx.lineWidth = 20
  ctx.beginPath()
  ctx.moveTo(size * 0.25, size * 0.85)
  ctx.lineTo(size * 0.75, size * 0.85)
  ctx.stroke()

  const buffer = canvas.toBuffer("image/png")
  fs.writeFileSync(path.join(__dirname, "../resources/icon.png"), buffer)
  console.log("Generated: resources/icon.png (1024x1024)")
}

// Generate splash screen (2732x2732 for iPad Pro)
function generateSplash() {
  const size = 2732
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext("2d")

  // Gradient background
  const gradient = ctx.createLinearGradient(0, 0, size, size)
  gradient.addColorStop(0, PRIMARY_BLUE)
  gradient.addColorStop(1, "#5F00BA")
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)

  // Logo "Julien RONOT" text
  ctx.fillStyle = WHITE
  ctx.font = "bold 180px Arial"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText("Julien RONOT", size / 2, size / 2 - 50)

  // Subtitle "CRM"
  ctx.font = "100px Arial"
  ctx.fillStyle = "rgba(255, 255, 255, 0.8)"
  ctx.fillText("CRM", size / 2, size / 2 + 100)

  const buffer = canvas.toBuffer("image/png")
  fs.writeFileSync(path.join(__dirname, "../resources/splash.png"), buffer)
  console.log("Generated: resources/splash.png (2732x2732)")
}

// Generate both
generateIcon()
generateSplash()

console.log("\nCapacitor assets generated successfully!")
console.log("Next steps:")
console.log("1. Run: npm run cap:add:android")
console.log("2. Run: npm run cap:add:ios")
console.log("3. Run: npm run cap:sync")
