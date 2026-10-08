"""Extract Mali Regular shapes; never use outline order as stroke order.

Usage: python build-stroke-glyphs.py assets/fonts/Mali-Regular.ttf
Requires fontTools. License: assets/fonts/OFL-Mali.txt.
"""
import json
import sys
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

font = TTFont(sys.argv[1])
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
chars = 'กขฃคฅฆงจฉชซฌญฎฏฐฑฒณดตถทธนบปผฝพฟภมยรลวศษสหฬอฮะาิีึืุูเแโใไํ่้๊๋์ั'
result = {}
for char in chars:
    glyph = glyphs[cmap[ord(char)]]
    bounds = BoundsPen(glyphs)
    glyph.draw(bounds)
    x0, y0, x1, y1 = bounds.bounds
    pen = SVGPathPen(glyphs, ntos=lambda v: str(round(v, 3)))
    glyph.draw(TransformPen(pen, (100/(x1-x0), 0, 0, -100/(y1-y0), -x0*100/(x1-x0), y1*100/(y1-y0))))
    result[char] = {'d': pen.getCommands(), 'bounds': bounds.bounds, 'advance': font['hmtx'][cmap[ord(char)]][0]}
target = Path(__file__).resolve().parents[1] / 'data/stroke-glyphs.js'
target.write_text('// Mali Regular outlines. Copyright 2018 The Mali Project Authors.\n// SIL OFL 1.1: ../assets/fonts/OFL-Mali.txt\nexport const GLYPHS = ' + json.dumps(result, ensure_ascii=False, separators=(',', ':')) + ';\n')
