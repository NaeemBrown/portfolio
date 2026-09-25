#!/usr/bin/env python3
"""Builds Stickline, the typeface drawn with the stick figure's pen.

Every glyph is a skeleton of centre lines in a box 100 units tall. The build
strokes each skeleton with a round pen of fixed width, so the weight stays
even across the whole set. Lowercase letters are small capitals: the same
skeletons drawn lower and a touch wider, with the same pen.

Its signature is the sketcher's overshoot: a bar runs on past the stem it
meets instead of stopping at it, as a quick pen stroke would.

    python fonts/build_stickline.py

writes stickline-regular.woff and stickline-bold.woff next to this file.
"""

import math
from pathlib import Path

from fontTools.fontBuilder import FontBuilder
from fontTools.pens.ttGlyphPen import TTGlyphPointPen
from fontTools.ttLib import TTFont
from fontTools.ttLib.tables._g_l_y_f import flagOverlapSimple

UPM = 1000
CAP = 700  # capital height, outline to outline
SMALL = 520  # small-capital height
SMALL_WIDEN = 1.08  # small caps read better slightly wider than scaled caps
O = 12  # how far a bar runs past the stem it meets, in skeleton units


def L(*points):
    return ("line", points)


def A(cx, cy, rx, ry, start, end):
    """Elliptical arc; angles in degrees, counterclockwise from +x."""
    return ("arc", (cx, cy, rx, ry, start, end))


def R(cx, cy, rx, ry):
    """Closed ring."""
    return ("ring", (cx, cy, rx, ry))


def D(x, y):
    """Dot, sitting on y."""
    return ("dot", (x, y))


S_SKELETON = [A(37, 75, 29, 25, 25, 270), A(37, 25, 31, 25, 90, -155)]

LETTERS = {
    "A": [L((0, 0), (38, 100), (76, 0)), L((13 - O, 34), (63 + O, 34))],
    "B": [
        L((0, 0), (0, 100)),
        L((-O, 100), (30, 100)),
        A(30, 76, 26, 24, 90, -90),
        L((30, 52), (0, 52)),
        L((0, 52), (33, 52)),
        A(33, 26, 28, 26, 90, -90),
        L((33, 0), (-O, 0)),
    ],
    "C": [A(51, 50, 51, 51.5, 42, 318)],
    "D": [
        L((0, 0), (0, 100)),
        L((-O, 100), (28, 100)),
        A(28, 50, 52, 50, 90, -90),
        L((28, 0), (-O, 0)),
    ],
    "E": [
        L((0, 0), (0, 100)),
        L((-O, 100), (62, 100)),
        L((0, 51), (52, 51)),
        L((-O, 0), (62, 0)),
    ],
    "F": [L((0, 0), (0, 100)), L((-O, 100), (60, 100)), L((0, 51), (50, 51))],
    "G": [A(51, 50, 51, 51.5, 42, 360), L((102, 50), (60, 50))],
    "H": [L((0, 0), (0, 100)), L((72, 0), (72, 100)), L((-O, 52), (72 + O, 52))],
    "I": [L((0, 0), (0, 100))],
    "J": [L((46, 100), (46, 30)), A(23, 30, 23, 30, 0, -180)],
    "K": [L((0, 0), (0, 100)), L((62, 100), (0, 38)), L((24, 62), (66, 0))],
    "L": [L((0, 100), (0, 0)), L((-O, 0), (58, 0))],
    "M": [L((0, 0), (0, 100), (45, 28), (90, 100), (90, 0))],
    "N": [L((0, 0), (0, 100), (72, 0), (72, 100))],
    "O": [R(51, 50, 51, 51.5)],
    "P": [
        L((0, 0), (0, 100)),
        L((-O, 100), (30, 100)),
        A(30, 74, 28, 26, 90, -90),
        L((30, 48), (0, 48)),
    ],
    "Q": [R(51, 50, 51, 51.5), L((64, 24), (100, -8))],
    "R": [
        L((0, 0), (0, 100)),
        L((-O, 100), (30, 100)),
        A(30, 74, 28, 26, 90, -90),
        L((30, 48), (0, 48)),
        L((28, 48), (62, 0)),
    ],
    "S": S_SKELETON,
    "T": [L((0, 100), (76, 100)), L((38, 100), (38, 0))],
    "U": [L((0, 100), (0, 36)), A(36, 36, 36, 36, 180, 360), L((72, 36), (72, 100))],
    "V": [L((0, 100), (38, 0), (76, 100))],
    "W": [L((0, 100), (24, 0), (52, 72), (80, 0), (104, 100))],
    "X": [L((0, 100), (70, 0)), L((0, 0), (70, 100))],
    "Y": [L((0, 100), (37, 50), (74, 100)), L((37, 50), (37, 0))],
    "Z": [L((0, 100), (68, 100), (0, 0), (70, 0))],
}

FIGURES = {
    "zero": ("0", [R(36, 50, 36, 51)]),
    "one": ("1", [L((4, 80), (28, 100), (28, 0))]),
    "two": ("2", [A(34, 68, 32, 32, 160, -35), L((60.2, 49.6), (0, 0), (70, 0))]),
    "three": ("3", [A(34, 75, 26, 25, 155, -90), A(34, 25, 30, 25, 90, -150)]),
    "four": ("4", [L((52, 0), (52, 100), (0, 30), (72, 30))]),
    "five": ("5", [L((64, 100), (12, 100), (14.3, 52.6)), A(38, 32, 31, 32, 140, -145)]),
    "six": ("6", [R(36, 32, 33, 32), L((60, 100), (7, 45))]),
    "seven": ("7", [L((0, 100), (70, 100), (22, 0))]),
    "eight": ("8", [R(36, 76, 25, 24), R(36, 26, 29, 26)]),
    "nine": ("9", [R(36, 68, 33, 32), L((65, 55), (12, 0))]),
}

PUNCTUATION = {
    "period": (".", [D(0, 0)]),
    "comma": (",", [L((3, 4), (-4, -16))]),
    "colon": (":", [D(0, 0), D(0, 48)]),
    "semicolon": (";", [L((3, 4), (-4, -16)), D(3, 48)]),
    "exclam": ("!", [L((0, 100), (0, 30)), D(0, 0)]),
    "question": ("?", [A(30, 72, 28, 28, 165, -70), L((39.6, 45.7), (31, 30)), D(31, 0)]),
    "quotesingle": ("'", [L((0, 100), (0, 72))]),
    "quotedbl": ('"', [L((0, 100), (0, 72)), L((18, 100), (18, 72))]),
    "quoteleft": ("‘", [L((-3, 76), (3, 100))]),
    "quoteright": ("’", [L((3, 100), (-3, 76))]),
    "quotedblleft": ("“", [L((-3, 76), (3, 100)), L((15, 76), (21, 100))]),
    "quotedblright": ("”", [L((3, 100), (-3, 76)), L((21, 100), (15, 76))]),
    "hyphen": ("-", [L((0, 44), (40, 44))]),
    "endash": ("–", [L((0, 44), (66, 44))]),
    "emdash": ("—", [L((0, 44), (110, 44))]),
    "parenleft": ("(", [A(44, 50, 44, 64, 128, 232)]),
    "parenright": (")", [A(0, 50, 44, 64, 52, -52)]),
    "bracketleft": ("[", [L((22, 108), (0, 108), (0, -8), (22, -8))]),
    "bracketright": ("]", [L((0, 108), (22, 108), (22, -8), (0, -8))]),
    "slash": ("/", [L((0, -6), (46, 106))]),
    "backslash": ("\\", [L((0, 106), (46, -6))]),
    "plus": ("+", [L((0, 44), (60, 44)), L((30, 14), (30, 74))]),
    "equal": ("=", [L((0, 58), (58, 58)), L((0, 30), (58, 30))]),
    "asterisk": ("*", [L((22, 98), (22, 58)), L((3, 88), (41, 68)), L((3, 68), (41, 88))]),
    "numbersign": (
        "#",
        [L((16, 0), (26, 100)), L((46, 0), (56, 100)), L((0, 66), (72, 66)), L((-2, 32), (70, 32))],
    ),
    "percent": ("%", [R(12, 84, 12, 14), R(60, 16, 12, 14), L((0, 0), (72, 100))]),
    "underscore": ("_", [L((0, -12), (72, -12))]),
    "less": ("<", [L((54, 82), (0, 48), (54, 14))]),
    "greater": (">", [L((0, 82), (54, 48), (0, 14))]),
    "dollar": ("$", S_SKELETON + [L((37, -10), (37, 110))]),
    "ampersand": (
        "&",
        [
            L((72, 0), (17.6, 65.9)),
            A(31, 80, 19, 20, 225, -45),
            L((44.4, 65.9), (11.2, 36)),
            A(32, 24, 24, 24, 150, 360),
            L((56, 24), (70, 42)),
        ],
    ),
    "periodcentered": ("·", [D(0, 46)]),
    "ellipsis": ("…", [D(0, 0), D(30, 0), D(60, 0)]),
    "arrowright": ("→", [L((0, 44), (84, 44)), L((60, 68), (84, 44), (60, 20))]),
    "arrowleft": ("←", [L((84, 44), (0, 44)), L((24, 68), (0, 44), (24, 20))]),
    "multiply": ("×", [L((0, 70), (48, 20)), L((0, 20), (48, 70))]),
}

ROUND = set("CGOQS") | {"zero", "six", "eight", "nine"}

WEIGHTS = {
    "Regular": {"stroke": 80, "class": 400},
    "Bold": {"stroke": 124, "class": 700},
}


# ------------------------------------------------------------------ geometry


def arc_points(cx, cy, rx, ry, start, end, max_step=30):
    """On- and off-curve points of quadratic segments tracing an arc."""
    span = end - start
    count = max(1, math.ceil(abs(span) / max_step))
    step = span / count
    bulge = 1 / math.cos(math.radians(step) / 2)
    points = []
    for i in range(count):
        a = math.radians(start + step * i)
        mid = math.radians(start + step * (i + 0.5))
        b = math.radians(start + step * (i + 1))
        if i == 0:
            points.append((cx + rx * math.cos(a), cy + ry * math.sin(a), True))
        points.append((cx + rx * bulge * math.cos(mid), cy + ry * bulge * math.sin(mid), False))
        points.append((cx + rx * math.cos(b), cy + ry * math.sin(b), True))
    return points


def disc(cx, cy, r):
    return arc_points(cx, cy, r, r, 0, 360)[:-1]


def capsule(p0, p1, w):
    dx, dy = p1[0] - p0[0], p1[1] - p0[1]
    if math.hypot(dx, dy) < 1e-6:
        return disc(p0[0], p0[1], w)
    ang = math.degrees(math.atan2(dy, dx))
    return arc_points(p1[0], p1[1], w, w, ang + 90, ang - 90) + arc_points(
        p0[0], p0[1], w, w, ang - 90, ang - 270
    )


def area(contour):
    return sum(
        x0 * y1 - x1 * y0
        for (x0, y0, _), (x1, y1, _) in zip(contour, contour[1:] + contour[:1])
    ) / 2


def oriented(contour, hole=False):
    """TrueType fills run clockwise; holes counterclockwise."""
    clockwise = area(contour) < 0
    return contour if clockwise != hole else contour[::-1]


def outline(strokes, sx, sy, w):
    """Stroke a skeleton into contours. Overlaps union under nonzero fill."""
    to = lambda x, y: (x * sx, w + y * sy)
    contours = []
    for kind, data in strokes:
        if kind == "line":
            pts = [to(*p) for p in data]
            for a, b in zip(pts, pts[1:]):
                contours.append(oriented(capsule(a, b, w)))
        elif kind == "dot":
            x, y = data
            contours.append(oriented(disc(x * sx, 1.2 * w + y * sy, 1.2 * w)))
        elif kind in ("arc", "ring"):
            cx, cy = to(*data[:2])
            rx, ry = data[2] * sx, data[3] * sy
            inner = (max(rx - w, 0), max(ry - w, 0))
            if kind == "ring":
                contours.append(oriented(disc_ellipse(cx, cy, rx + w, ry + w)))
                if min(inner) > 1:
                    contours.append(oriented(disc_ellipse(cx, cy, *inner), hole=True))
                continue
            start, end = data[4], data[5]
            shape = arc_points(cx, cy, rx + w, ry + w, start, end)
            if min(inner) > 1:
                shape += arc_points(cx, cy, inner[0], inner[1], end, start)
            else:
                shape.append((cx, cy, True))
            contours.append(oriented(shape))
            for t in (start, end):  # round caps
                t = math.radians(t)
                contours.append(oriented(disc(cx + rx * math.cos(t), cy + ry * math.sin(t), w)))
    return contours


def disc_ellipse(cx, cy, rx, ry):
    return arc_points(cx, cy, rx, ry, 0, 360)[:-1]


def draw(contours, shift):
    pen = TTGlyphPointPen(None)
    for contour in contours:
        pts = []
        for x, y, on in contour:
            p = (round(x + shift), round(y), on)
            if not pts or p != pts[-1]:
                pts.append(p)
        if len(pts) > 1 and pts[0] == pts[-1]:
            pts.pop()
        if len(pts) < 3:
            continue
        while not pts[0][2]:
            pts.append(pts.pop(0))
        pen.beginPath()
        for i, (x, y, on) in enumerate(pts):
            kind = None
            if on:
                kind = "qcurve" if not pts[i - 1][2] else "line"
            pen.addPoint((x, y), segmentType=kind)
        pen.endPath()
    glyph = pen.glyph()
    if glyph.numberOfContours > 0:
        glyph.flags[0] |= flagOverlapSimple
    return glyph


def empty_glyph():
    return TTGlyphPointPen(None).glyph()


def notdef(w):
    box = [(0, 0, True), (0, CAP, True), (440, CAP, True), (440, 0, True)]
    hole = [(w, w, True), (440 - w, w, True), (440 - w, CAP - w, True), (w, CAP - w, True)]
    return draw([box, hole], 60)


# --------------------------------------------------------------------- build


def build(style, spec):
    w = spec["stroke"] / 2
    cap = (CAP - 2 * w) / 100
    small = (SMALL - 2 * w) / 100
    sets = []  # (glyph name, codepoint or None, skeleton, sx, sy)
    for ch, skel in LETTERS.items():
        sets.append((ch, ord(ch), skel, cap, cap))
        sets.append((ch.lower(), ord(ch.lower()), skel, small * SMALL_WIDEN, small))
    for name, (ch, skel) in FIGURES.items():
        sets.append((name, ord(ch), skel, cap, cap))
    for name, (ch, skel) in PUNCTUATION.items():
        sets.append((name, ord(ch), skel, cap, cap))

    glyphs = {".notdef": notdef(spec["stroke"]), "space": empty_glyph()}
    metrics = {".notdef": (560, 60), "space": (round(0.26 * UPM + w / 2), 0)}
    cmap = {0x20: "space", 0xA0: "space"}

    for name, code, skel, sx, sy in sets:
        contours = outline(skel, sx, sy, w)
        xs = [p[0] for c in contours for p in c]
        base = name.upper() if len(name) == 1 else name
        bearing = 50 if base in ROUND else 60
        if name in PUNCTUATION:
            bearing = 45
        shift = bearing - min(xs)
        glyphs[name] = draw(contours, shift)
        metrics[name] = (round(max(xs) - min(xs) + 2 * bearing), bearing)
        cmap[code] = name

    order = [".notdef", "space"] + [s[0] for s in sets]
    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyphs)
    # hmtx left side bearings must match the glyphs' real xMin.
    glyf = fb.font["glyf"]
    for name in order:
        glyph = glyf[name]
        glyph.recalcBounds(glyf)
        lsb = getattr(glyph, "xMin", 0) if glyph.numberOfContours else 0
        metrics[name] = (metrics[name][0], lsb)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=880, descent=-220)
    fb.setupNameTable(
        {
            "familyName": "Stickline",
            "styleName": style,
            "uniqueFontIdentifier": f"Stickline-{style};1.000",
            "fullName": f"Stickline {style}",
            "psName": f"Stickline-{style}",
            "version": "Version 1.000",
        }
    )
    bold = style == "Bold"
    fb.setupOS2(
        version=4,
        usWeightClass=spec["class"],
        fsSelection=(0x20 if bold else 0x40) | 0x80,  # bold/regular + use typo metrics
        sTypoAscender=880,
        sTypoDescender=-220,
        sTypoLineGap=0,
        usWinAscent=920,
        usWinDescent=260,
        sxHeight=SMALL,
        sCapHeight=CAP,
        achVendID="NONE",
        fsType=0,
    )
    fb.font["head"].macStyle = 1 if bold else 0
    fb.setupPost(keepGlyphNames=False)

    out = Path(__file__).with_name(f"stickline-{style.lower()}.woff")
    font = fb.font
    font.flavor = "woff"
    font.save(out)
    return out


if __name__ == "__main__":
    for style, spec in WEIGHTS.items():
        path = build(style, spec)
        check = TTFont(path)
        print(f"{path.name}: {len(check.getGlyphOrder())} glyphs, {path.stat().st_size / 1024:.1f} KB")
