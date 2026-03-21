#!/usr/bin/env python3
"""Bundle all JS source files into build/index.html for itch.io deployment."""
import os
from datetime import datetime, timezone

JS_ORDER = [
    'constants', 'utils', 'audio', 'music', 'input', 'effects',
    'entities', 'stone', 'bubble', 'projectile', 'player', 'enemy',
    'pause', 'game', 'main'
]

HEADER = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
<title>EleNin</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { width: 100%; height: 100%; background: #111; overflow: hidden; touch-action: none; }
body { display: flex; justify-content: center; align-items: center; }
canvas { image-rendering: pixelated; max-width: 100vw; max-height: 100vh; object-fit: contain; }
</style>
</head>
<body>
<canvas id="game"></canvas>
<script>
'''

FOOTER = '''</script>
</body>
</html>
'''

os.makedirs('build', exist_ok=True)
build_ts = datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')
with open('build/index.html', 'w', encoding='utf-8') as out:
    out.write(HEADER)
    out.write(f'// BUILD TIMESTAMP: {build_ts}\n')
    out.write(f'console.log("EleNin build: {build_ts}");\n')
    for name in JS_ORDER:
        path = os.path.join('js', name + '.js')
        out.write(f'// === js/{name}.js ===\n')
        with open(path, 'r', encoding='utf-8') as f:
            out.write(f.read())
        out.write('\n')
    out.write(FOOTER)

size = os.path.getsize('build/index.html')
print(f'build/index.html generated ({size:,} bytes)')
