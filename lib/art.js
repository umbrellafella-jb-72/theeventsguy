// Generated from the design system's art generator (same drawings as the TheEventsGuy components).
/* The Events Guy art — Celtic symbols and Dublin-port scenes, drawn from one palette.
   EGArt(P) returns generators; each returns {x, y, w, h, body} (SVG markup without the <svg> wrapper).
   P: { ink, ground, glen, torc, poolbeg, quay, block, white } — CSS colours or var(--token) strings. */
function EGArt(P) {
  var f = function (n) { return Math.round(n * 100) / 100; };
  function st(o) {
    var s = [];
    s.push('fill:' + (o.fill === undefined ? 'none' : o.fill));
    if (o.stroke) s.push('stroke:' + o.stroke);
    if (o.sw) s.push('stroke-width:' + o.sw + 'px');
    if (o.cap) s.push('stroke-linecap:' + o.cap);
    if (o.join) s.push('stroke-linejoin:' + o.join);
    if (o.op != null) s.push('opacity:' + o.op);
    return ' style="' + s.join(';') + '"';
  }
  function line(pts) { return pts.map(function (p, i) { return (i ? 'L' : 'M') + f(p[0]) + ' ' + f(p[1]); }).join(''); }
  function path(d, o) { return '<path d="' + d + '"' + st(o) + '/>'; }
  function rect(x, y, w, h, o) { return '<rect x="' + f(x) + '" y="' + f(y) + '" width="' + f(w) + '" height="' + f(h) + '"' + st(o) + '/>'; }
  function seg(x1, y1, x2, y2, o) { return path('M' + f(x1) + ' ' + f(y1) + 'L' + f(x2) + ' ' + f(y2), o); }
  function g(tx, ty, s, body) { return '<g transform="translate(' + f(tx) + ' ' + f(ty) + ')' + (s && s !== 1 ? ' scale(' + s + ')' : '') + '">' + body + '</g>'; }

  /* Knot renderer: draws a closed curve, then re-draws a short patch of the "over" strand at every
     self-crossing, alternating over/under along the traversal — a true Celtic weave. */
  function weave(pts, ink, ground, sw, gapW, fill) {
    var n = pts.length, cross = [];
    function inter(a, b, c, d) {
      var r = [b[0] - a[0], b[1] - a[1]], s = [d[0] - c[0], d[1] - c[1]], den = r[0] * s[1] - r[1] * s[0];
      if (Math.abs(den) < 1e-9) return null;
      var t = ((c[0] - a[0]) * s[1] - (c[1] - a[1]) * s[0]) / den, u = ((c[0] - a[0]) * r[1] - (c[1] - a[1]) * r[0]) / den;
      return t >= 0 && t < 1 && u >= 0 && u < 1 ? [t, u] : null;
    }
    for (var i = 0; i < n; i++) for (var j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue;
      var hit = inter(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n]);
      if (hit) { cross.push(i + hit[0]); cross.push(j + hit[1]); }
    }
    cross.sort(function (a, b) { return a - b; });
    var inner = sw * 0.42;
    function strand(d, cap, halo) {
      var o = (halo ? path(halo, { stroke: ground, sw: gapW, cap: 'butt', join: 'round' }) : '') + path(d, { stroke: ink, sw: sw, cap: cap, join: 'round' });
      if (fill) o += path(d, { stroke: fill, sw: inner, cap: cap, join: 'round' });
      return o;
    }
    var closed = line(pts) + 'Z', out = path(closed, { stroke: ground, sw: gapW, join: 'round' }) + strand(closed, 'butt');
    var span = Math.max(6, Math.round(n / 26));
    cross.forEach(function (pos, k) {
      if (k % 2) return; // alternate along the strand: over, under, over…
      var c = Math.round(pos), sub = [];
      for (var q = -span; q <= span; q++) sub.push(pts[((c + q) % n + n) % n]);
      out += strand(line(sub), 'butt', line(sub.slice(1, -1)));
    });
    return out;
  }

  /* ---------- Celtic symbols ---------- */
  function triskele(o) {
    o = o || {}; var sw = o.stroke || 7, ink = o.ink || P.ink, d = 21, out = '';
    for (var k = 0; k < 3; k++) {
      var th = (-90 + 120 * k) * Math.PI / 180, cx = d * Math.cos(th), cy = d * Math.sin(th), phi0 = th + Math.PI, pts = [];
      for (var i = 0; i <= 96; i++) { var t = i / 96, r = d - (d - 2.5) * t, a = phi0 - t * 1.6 * 2 * Math.PI; pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
      out += path(line(pts), { stroke: ink, sw: sw, cap: 'round', join: 'round' });
    }
    if (o.ring !== false) out += '<circle cx="0" cy="0" r="45"' + st({ stroke: ink, sw: f(sw * 0.62) }) + '/>';
    return { x: -50, y: -50, w: 100, h: 100, body: out };
  }

  function triquetra(o) {
    o = o || {}; var ink = o.ink || P.ink, ground = o.ground || P.ground, sw = o.stroke || 10, pts = [], N = 480;
    for (var i = 0; i < N; i++) {
      var t = i / N * 2 * Math.PI, x = Math.sin(t) + 2 * Math.sin(2 * t), y = Math.cos(t) - 2 * Math.cos(2 * t);
      pts.push([x * 12.5, y * 12.5 + 6]);
    }
    return { x: -50, y: -50, w: 100, h: 100, body: weave(pts, ink, ground, sw, sw * 1.6, o.fill === undefined ? P.torc : o.fill) };
  }

  /* Hawser: a two-strand rope plait that is also Celtic interlace. Tiles every `period` px. */
  function hawser(o) {
    o = o || {}; var w = o.width || 480, h = o.height || 24, p = o.period || 40, sw = o.stroke || 3, ink = o.ink || P.ink, ground = o.ground || P.ground;
    var mid = h / 2, amp = h / 2 - sw - 1, out = '';
    function strand(phase, x0, x1) { var pts = []; for (var x = x0; x <= x1 + 0.01; x += 1) pts.push([x, mid + amp * Math.sin(2 * Math.PI * x / p + phase)]); return line(pts); }
    for (var c = -1; c * (p / 2) <= w + p; c++) {
      var x0 = c * p / 2 - p / 4, x1 = c * p / 2 + p / 4;
      var a = strand(0, x0, x1), b = strand(Math.PI, x0, x1), aOver = c % 2 === 0;
      var first = aOver ? b : a, second = aOver ? a : b;
      out += path(first, { stroke: ground, sw: sw * 2.6, cap: 'butt' }) + path(first, { stroke: ink, sw: sw, cap: 'butt' });
      out += path(second, { stroke: ground, sw: sw * 2.6, cap: 'butt' }) + path(second, { stroke: ink, sw: sw, cap: 'butt' });
    }
    return { x: 0, y: 0, w: w, h: h, body: out };
  }

  /* Ogham — the early Irish notch script, carved along a stemline. Horizontal, read left to right. */
  var OGHAM = { B: 'b1', P: 'b1', L: 'b2', F: 'b3', V: 'b3', W: 'b3', S: 'b4', N: 'b5', H: 'h1', D: 'h2', T: 'h3', C: 'h4', K: 'h4', Q: 'h5',
    M: 'm1', G: 'm2', Z: 'm4', R: 'm5', A: 'a1', O: 'a2', U: 'a3', E: 'a4', I: 'a5', J: 'a5', Y: 'a5', X: 'h4' };
  function ogham(o) {
    o = o || {}; var text = String(o.text || 'THE EVENTS GUY').toUpperCase(), sw = o.stroke || 2, ink = o.ink || P.ink;
    var gap = o.gap || 5, L = o.reach || 11, mid = L + 2, x = 10, out = '';
    var seq = [];
    for (var i = 0; i < text.length; i++) {
      if (text.substr(i, 2) === 'NG') { seq.push('m3'); i++; continue; }
      if (text[i] === ' ') { seq.push(' '); continue; }
      if (OGHAM[text[i]]) seq.push(OGHAM[text[i]]);
    }
    out += path('M2 ' + f(mid - 5) + 'L8 ' + f(mid) + 'L2 ' + f(mid + 5), { stroke: ink, sw: sw, cap: 'round', join: 'round' }); // feather ᚛
    seq.forEach(function (s) {
      if (s === ' ') { x += gap * 2; return; }
      var aic = s[0], cnt = +s[1];
      for (var k = 0; k < cnt; k++) {
        var sx = x + k * gap;
        if (aic === 'b') out += seg(sx, mid, sx, mid + L, { stroke: ink, sw: sw, cap: 'square' });
        else if (aic === 'h') out += seg(sx, mid - L, sx, mid, { stroke: ink, sw: sw, cap: 'square' });
        else if (aic === 'm') out += seg(sx - 3, mid + L, sx + 3, mid - L, { stroke: ink, sw: sw, cap: 'square' });
        else out += seg(sx, mid - 3.5, sx, mid + 3.5, { stroke: ink, sw: sw * 1.4, cap: 'square' });
      }
      x += (cnt - 1) * gap + gap * 2.2;
    });
    out += path('M' + f(x) + ' ' + f(mid - 5) + 'L' + f(x - 6) + ' ' + f(mid) + 'L' + f(x) + ' ' + f(mid + 5), { stroke: ink, sw: sw, cap: 'round', join: 'round' }); // feather ᚜
    out = seg(5, mid, x - 3, mid, { stroke: ink, sw: sw }) + out;
    return { x: 0, y: 0, w: f(x + 3), h: mid * 2, body: out };
  }

  /* Water: short ogham-like ticks in groups of 1–5, the port's waterline. */
  function water(x0, x1, y, rows, ink) {
    var out = '', seq = [3, 1, 4, 2, 5, 1, 2, 3], gap = 5;
    for (var r = 0; r < rows; r++) {
      var x = x0 + (r % 2) * 18, k = r;
      while (x < x1 - 10) {
        var n = seq[k++ % seq.length];
        for (var i = 0; i < n && x + i * gap < x1; i++) out += seg(x + i * gap, y + r * 12, x + i * gap, y + r * 12 + 5, { stroke: ink, sw: 1.5, op: 0.55 - r * 0.12 });
        x += n * gap + 22;
      }
    }
    return out;
  }

  /* ---------- Dublin-port scenes ---------- */
  function chimneys(o) {
    o = o || {}; var ink = o.ink || P.ink, W = 170, H = 250, base = 238, out = '';
    function tower(cx, top, bh, th) {
      var bands = 8, s = '';
      for (var i = 0; i < bands; i++) {
        var y0 = top + (base - 32 - top) * i / bands, y1 = top + (base - 32 - top) * (i + 1) / bands;
        var w0 = th + (bh - th) * (y0 - top) / (base - 32 - top), w1 = th + (bh - th) * (y1 - top) / (base - 32 - top);
        s += path('M' + f(cx - w0) + ' ' + f(y0) + 'L' + f(cx + w0) + ' ' + f(y0) + 'L' + f(cx + w1) + ' ' + f(y1) + 'L' + f(cx - w1) + ' ' + f(y1) + 'Z',
          { fill: i % 2 ? P.white : P.poolbeg });
      }
      s += path('M' + f(cx - th) + ' ' + top + 'L' + f(cx + th) + ' ' + top + 'L' + f(cx + bh) + ' ' + (base - 32) + 'L' + f(cx - bh) + ' ' + (base - 32) + 'Z', { stroke: ink, sw: 2, join: 'round' });
      s += rect(cx - th - 3, top - 6, th * 2 + 6, 6, { fill: ink });
      s += seg(cx + th * 0.35, top + 4, cx + bh * 0.35, base - 34, { stroke: ink, sw: 1, op: 0.5 });
      return s;
    }
    out += tower(56, 18, 19, 11) + tower(118, 38, 18, 10);
    out += rect(14, base - 32, 148, 32, { fill: P.block, stroke: ink, sw: 2 });
    for (var i = 0; i < 9; i++) out += rect(24 + i * 15, base - 22, 7, 10, { fill: P.ground, op: 0.75 });
    out += seg(0, base, W, base, { stroke: ink, sw: 2.5 });
    return { x: 0, y: 0, w: W, h: H, body: out };
  }

  function containerBox(x, y, w, h, fill, ink) {
    var s = rect(x, y, w, h, { fill: fill, stroke: ink, sw: 1.5, join: 'round' });
    for (var cx = x + 5; cx < x + w - 8; cx += 4.5) s += seg(cx, y + 3, cx, y + h - 3, { stroke: ink, sw: 0.8, op: 0.28 });
    s += seg(x + w - 6, y + 2, x + w - 6, y + h - 2, { stroke: ink, sw: 1.4 }) + seg(x + w - 3, y + 2, x + w - 3, y + h - 2, { stroke: ink, sw: 1.4 });
    return s;
  }

  function containers(o) {
    o = o || {}; var ink = o.ink || P.ink, bw = 58, bh = 24, W = 5 * (bw + 3) + 6, H = 3 * (bh + 3) + 10, out = '';
    var fills = [P.glen, P.torc, P.block, P.poolbeg, P.quay];
    var tiers = [[0, 1, 2, 3, 4], [0, 1, 2, 3], [1, 2]], k = 0;
    tiers.forEach(function (cols, t) {
      cols.forEach(function (c) {
        var x = 3 + c * (bw + 3) + (t === 1 ? 14 : t === 2 ? 22 : 0), y = H - 6 - (t + 1) * (bh + 3);
        out += containerBox(x, y, bw, bh, fills[(k * 3 + t) % fills.length], ink); k++;
      });
    });
    out += seg(0, H - 4, W, H - 4, { stroke: ink, sw: 2.5 });
    return { x: 0, y: 0, w: W, h: H, body: out };
  }

  function crane(o) {
    o = o || {}; var ink = o.ink || P.ink, W = 330, H = 240, q = 226, out = '';
    var S = { stroke: ink, sw: 4, cap: 'square', join: 'miter' }, T = { stroke: ink, sw: 2 };
    out += seg(72, q, 72, 120, S) + seg(150, q, 150, 120, S);
    out += seg(72, q - 8, 150, 128, T) + seg(150, q - 8, 72, 128, T);
    out += rect(60, 112, 104, 10, { fill: ink });
    out += seg(78, 112, 112, 30, S) + seg(146, 112, 112, 30, S);
    out += seg(8, 74, 324, 74, { stroke: ink, sw: 7, cap: 'square' });
    out += seg(112, 30, 324, 70, T) + seg(112, 30, 8, 70, T) + seg(112, 30, 228, 70, T);
    out += rect(30, 50, 62, 20, { fill: P.block, stroke: ink, sw: 2 });
    out += rect(236, 78, 28, 11, { fill: P.torc, stroke: ink, sw: 1.5 });
    out += seg(242, 89, 238, 148, { stroke: ink, sw: 1.4 }) + seg(258, 89, 262, 148, { stroke: ink, sw: 1.4 });
    out += rect(228, 148, 44, 5, { fill: ink });
    out += containerBox(226, 154, 48, 22, P.poolbeg, ink);
    out += seg(0, q, 186, q, { stroke: ink, sw: 2.5 }) + rect(174, q, 12, H - q, { fill: P.block });
    out += water(196, W, q + 4, 1, ink);
    return { x: 0, y: 0, w: W, h: H, body: out };
  }

  /* A cable-stayed bridge whose curved spar and stays read as a harp lying on its side. */
  function bridge(o) {
    o = o || {}; var ink = o.ink || P.ink, W = 330, H = 200, deck = 150, out = '';
    function spar(t) { var a = [70, deck], c = [80, 38], b = [214, 20], u = 1 - t; return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]; }
    for (var i = 0; i < 11; i++) { var p = spar(0.22 + i * 0.075), dx = 112 + i * 19; out += seg(p[0], p[1], dx, deck, { stroke: ink, sw: 1.5 }); }
    for (var j = 0; j < 4; j++) { var p2 = spar(0.72 + j * 0.08); out += seg(p2[0], p2[1], 12 + j * 9, deck, { stroke: ink, sw: 1.5 }); }
    var sp = []; for (var t = 0; t <= 1.0001; t += 0.05) sp.push(spar(t));
    out += path(line(sp), { stroke: ink, sw: 8, cap: 'round', join: 'round' });
    out += rect(0, deck, W, 9, { fill: P.block, stroke: ink, sw: 2 });
    out += rect(62, deck + 9, 16, 22, { fill: P.block, stroke: ink, sw: 2 });
    out += water(4, W, deck + 22, 2, ink);
    return { x: 0, y: 0, w: W, h: H, body: out };
  }

  /* Chimney smoke made of the Celtic marks: each puff rises, drifts on the wind, grows and fades. */
  var SMOKE = [
    // [x, y, scale, rotation, mark, opacity, gold] — tall tower first, then the short one
    [846.3, 73.0, 0.126, 0, 't', 0.95], [837.0, 59.8, 0.161, 30, 'q', 0.85], [818.4, 46.6, 0.196, 60, 't', 0.75], [792.1, 35.8, 0.231, 15, 'q', 0.65], [759.5, 28.6, 0.266, 80, 't', 0.55], [719.2, 26.2, 0.308, 25, 'q', 0.95, 1],
    [900.7, 91.2, 0.112, 0, 'q', 0.9], [894.5, 79.2, 0.147, 40, 't', 0.8], [880.6, 67.2, 0.182, 10, 'q', 0.68], [858.9, 57.6, 0.217, 70, 't', 0.55], [831.0, 51.6, 0.252, 30, 'q', 0.42]
  ];
  function smoke(ink, ground) {
    var out = '';
    SMOKE.forEach(function (s) {
      var mark = s[4] === 't' ? triskele({ ink: s[6] ? P.torc : ink, ring: false, stroke: 8 }) : triquetra({ ink: ink, ground: ground, fill: s[6] ? P.torc : ink, stroke: 10 });
      out += '<g transform="translate(' + s[0] + ' ' + s[1] + ') rotate(' + s[3] + ') scale(' + s[2] + ')" style="opacity:' + s[5] + '">' + mark.body + '</g>';
    });
    return out;
  }

  function skyline(o) {
    o = o || {}; var ink = o.ink || P.ink, W = 960, H = 330, q = 274, out = '';
    if (o.ground) out += rect(0, 0, W, H, { fill: o.ground });
    var b = bridge({ ink: ink }); out += g(10, q - 150 * 0.95, 0.95, b.body);
    var c = crane({ ink: ink }); out += g(372, q - 226, 1, c.body.replace(/<path d="M196[^>]*\/>/g, ''));
    var k = containers({ ink: ink }); out += g(560, q - k.h + 4, 0.92, k.body);
    var ch = chimneys({ ink: ink }); out += g(800, q - 238 * 0.86, 0.86, ch.body);
    if (o.smoke !== false) out += smoke(ink, o.ground || P.ground);
    out += seg(0, q, W, q, { stroke: ink, sw: 2.5 });
    out += water(6, W, q + 12, 3, ink);
    return { x: 0, y: 0, w: W, h: H, body: out };
  }

  function svg(art, attrs) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + art.x + ' ' + art.y + ' ' + art.w + ' ' + art.h + '"' + (attrs || '') + '>' + art.body + '</svg>';
  }

  return { triskele: triskele, triquetra: triquetra, hawser: hawser, ogham: ogham, chimneys: chimneys, containers: containers, crane: crane, bridge: bridge, skyline: skyline, svg: svg };
}

export { EGArt };
