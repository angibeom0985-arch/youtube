from pathlib import Path
lines = Path('src/pages/VideoPage.tsx').read_text(encoding='utf-8').splitlines()
for i in range(760, 830):
    print(f'{i+1}: {lines[i]}')
