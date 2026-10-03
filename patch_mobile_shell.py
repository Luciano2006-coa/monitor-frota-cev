from pathlib import Path
import re

p = Path('index.html')
s = p.read_text(encoding='utf-8')

# Remove the old iframe bridge if it ever exists in a cached/older branch copy.
s = re.sub(r'\n?<style id="cevSameUrlMobileBridgeStyle">.*?<script id="cevSameUrlMobileBridge">.*?</script>\n?', '\n', s, flags=re.S)

link = '<link id="cevMobileResponsiveStyles" rel="stylesheet" href="./mobile-responsive.css?v=20261003-2" media="(max-width:820px)">'
if 'id="cevMobileResponsiveStyles"' not in s:
    if '</head>' not in s:
        raise SystemExit('index.html sem </head>')
    s = s.replace('</head>', link + '\n</head>', 1)

p.write_text(s, encoding='utf-8')
