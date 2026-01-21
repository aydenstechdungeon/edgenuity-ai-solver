#!/bin/bash
# Build script for Edgenuity AI Solver Chrome Extension

set -e

echo "🔨 Building Edgenuity AI Solver..."

# Build the popup with Vite
npm run build

# Rename CSS if needed
if [ -f "dist/edgenuity-ai-solver.css" ]; then
  mv dist/edgenuity-ai-solver.css dist/popup.css
fi

# Create popup.html that references the built JS
cat > dist/popup.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Edgenuity AI Solver</title>
  <link rel="stylesheet" href="popup.css">
</head>
<body>
  <div id="app"></div>
  <script src="popup.js"></script>
</body>
</html>
EOF

# Copy extension files to dist
echo "📋 Copying extension files..."
cp manifest.json dist/
cp background.js dist/
cp config.js dist/
cp api.js dist/
cp content.js dist/
cp content.css dist/
cp pageContext.js dist/
cp -r icons dist/

echo "✅ Build complete! Load 'dist' folder in Chrome extensions."
