# Improve Text Visibility in Gap SVG

## Context
User reported that the text (the gap numbers) in the new Gap SVG preview is hard to see.
Currently, the texts are:
- Red (`#ef4444`) on a dark background for `sheetEdgeGap`.
- Blue (`#3b82f6`) for `minGapPath`.

To make it clearer, we can:
1. Increase the font size from `10` to `12` or `14`.
2. Add a background pill or text shadow/stroke to the SVG `<text>` elements so they stand out against the background lines. For SVGs, using `paint-order="stroke"` with a `stroke` of dark color works wonders for text readability.
3. Lighten the colors slightly (e.g. use a brighter red/pink or bright cyan) or just use white text with colored borders.

## Plan
1. Edit `components/NestingAX/renderSettingsSVG.tsx`.
2. Find the `<text>` elements in `renderGapSVG`.
3. Increase `fontSize` to `"12"`.
4. Add `stroke="#1e293b" strokeWidth="3" paintOrder="stroke" fill="#ff7a7a"` for the first text.
5. Add `stroke="#1e293b" strokeWidth="3" paintOrder="stroke" fill="#60a5fa"` for the second text.
