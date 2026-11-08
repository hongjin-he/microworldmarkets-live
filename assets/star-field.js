/* S05: real snapshot positions and original precomputed liquidation minutes.
 * Lines, herd brightness and decision halos are illustrative interactions.
 * No new price/position data and no inferred liquidation events are generated.
 */
(function () {
  'use strict';
  var canvas = document.querySelector('.homepage-v4 .hero .field');
  if (!canvas || !canvas.getContext) return;
  var hero = canvas.closest('.hero');
  var scriptURL = document.currentScript.src;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;
  var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var controller = new AbortController();
  var timeout = window.setTimeout(function () { controller.abort(); }, 8000);

  function fallback() {
    hero.dataset.starField = 'fallback';
    var script = document.createElement('script');
    script.src = new URL('hero-field.js', scriptURL).href;
    script.defer = true;
    document.head.appendChild(script);
  }

  function valid(data) {
    if (!data || !Array.isArray(data.positions) || !data.positions.length ||
        !Array.isArray(data.assets) || !data.totals ||
        data.totals.positions !== data.positions.length) return false;
    var prices = data.pricePaths && data.pricePaths.BTC && data.pricePaths.BTC.normalizedClose;
    var cum = data.sourceCumulativeLiquidatedUsd;
    if (!Array.isArray(prices) || prices.length !== 180 || !Array.isArray(cum) || cum.length !== prices.length) return false;
    if (!prices.every(function (p) { return Number.isFinite(p) && p > 0; }) ||
        !cum.every(function (n, i) { return Number.isFinite(n) && n >= 0 && (!i || n >= cum[i - 1]); })) return false;
    var sum = 0;
    var rowsOK = data.positions.every(function (s) {
      if (!Array.isArray(s) || s.length !== 6 || !Number.isInteger(s[0]) || s[0] < 0 || s[0] >= data.assets.length ||
          (s[1] !== 1 && s[1] !== -1) || !Number.isFinite(s[2]) || s[2] <= 0 ||
          !Number.isFinite(s[3]) || Math.abs(s[3]) > 0.95 || s[1] * s[3] >= 0 ||
          !Number.isInteger(s[4]) || s[4] < -1 || s[4] >= cum.length ||
          s[5] !== (s[1] === 1 ? s[0] % 6 : null)) return false;
      if (s[4] >= 0) sum += s[2];
      return true;
    });
    return rowsOK && sum === cum[cum.length - 1];
  }

  fetch(new URL('data/star-field.json', scriptURL), {signal: controller.signal})
    .then(function (response) {
      if (!response.ok) throw new Error('Star data unavailable');
      return response.json();
    })
    .then(function (data) {
      if (!valid(data)) throw new Error('Invalid star data');
      clearTimeout(timeout);
      start(data);
    })
    .catch(function () { clearTimeout(timeout); fallback(); });

  function start(data) {
    var W = 0, H = 0, mobile = false, dpr = 1;
    var elapsed = 0, last = null, raf = 0, visible = false;
    var stars = [], drawn = [], links = [], sourceLinks = [];
    var projected = new Float32Array(data.positions.length * 3);
    var opacity = new Float32Array(data.positions.length);
    var seed = 20251010;
    var rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    var gauss = function () {
      var u = 0, v = 0;
      while (!u) u = rnd();
      while (!v) v = rnd();
      return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    };
    var maxN = Math.max.apply(null, data.positions.map(function (s) { return s[2]; }));
    var whales = new Set(data.positions.map(function (s, i) { return i; }).sort(function (a, b) {
      return data.positions[b][2] - data.positions[a][2];
    }).slice(0, Math.ceil(data.positions.length * 0.02)));
    var origins = new Array(6).fill(null);
    data.positions.forEach(function (s, i) {
      var asset = s[0], side = s[1], n = s[2], ad = Math.abs(s[3]), tl = s[4];
      var r, theta, z, color;
      // Same seeded layout, random-call order, arm assignment and five colors as the demo.
      if (side === 1) {
        r = 0.06 + 0.94 * Math.sqrt(ad / 0.95);
        theta = (asset % 6) * (Math.PI / 3) + 2.4 * r + gauss() * 0.24 * (0.4 + r);
        z = gauss() * 0.05 * (1.1 - r);
      } else {
        r = 1.12 + 0.35 * Math.sqrt(ad / 0.95) + Math.abs(gauss()) * 0.05;
        theta = rnd() * Math.PI * 2;
        z = gauss() * 0.08;
      }
      if (side === -1) color = '120,160,255';
      else if (ad < 0.05) color = '255,110,80';
      else if (ad < 0.15) color = '245,180,70';
      else if (ad < 0.35) color = '124,245,214';
      else color = '190,215,255';
      var appear = rnd() * 3.5; // Retain original PRNG order; stars are visible immediately here.
      var star = {x: r * Math.cos(theta), y: r * Math.sin(theta), z: z, r: r,
        arm: s[5], side: side, tl: tl, color: color, phase: appear * 2,
        size: 0.65 + 8 * Math.sqrt(n / maxN), whale: whales.has(i)};
      stars.push(star);
      if (side === 1 && tl >= 0 && (!origins[s[5]] || tl < origins[s[5]].tl)) origins[s[5]] = star;
    });
    for (var arm = 0; arm < 6; arm++) {
      var members = stars.map(function (s, i) { return i; }).filter(function (i) {
        return stars[i].arm === arm;
      }).sort(function (a, b) { return stars[a].r - stars[b].r; });
      for (var k = 1; k < members.length; k++) {
        if (rnd() < 0.55) sourceLinks.push([members[k - 1], members[k]]);
      }
    }

    var hud = document.createElement('div');
    hud.className = 'star-field-hud';
    var zh = /^zh/i.test(document.documentElement.lang || '');
    hud.lang = zh ? 'zh-Hans' : 'en';
    hud.setAttribute('aria-live', 'off');
    var counter = document.createElement('strong');
    counter.textContent = (zh ? '已强平  $' : 'LIQUIDATED  $') + '0M';
    var positionNote = document.createElement('span');
    positionNote.textContent = zh ? '3,710 个真实仓位 · 每一个都将成为一个 AI 智能体' : '3,710 real positions · each becomes an AI agent';
    var replayNote = document.createElement('span');
    replayNote.textContent = zh ? '回放 · 2025 年 10 月 10 日价格 · 交互仅为示意' : 'replay · Oct 10, 2025 prices · interactions illustrative';
    hud.append(counter, positionNote, replayNote);
    hero.appendChild(hud);
    hero.dataset.starField = 'ready';
    canvas.className = 'field world-field';
    document.body.insertBefore(canvas, document.body.firstChild);
    var numberFormat = new Intl.NumberFormat('en-US', {maximumFractionDigits: 0});
    var previousAmount = -1;
    var cum = data.sourceCumulativeLiquidatedUsd;
    var prices = data.pricePaths.BTC.normalizedClose;
    var endMinute = cum.length - 1;
    var smooth = function (u) { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };

    function resize() {
      var rect = canvas.getBoundingClientRect();
      W = Math.max(1, rect.width); H = Math.max(1, rect.height);
      mobile = W < 700;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawn = stars.map(function (s, i) { return i; }).filter(function (i) { return !mobile || i % 3 === 0; });
      if (mobile) {
        links = [];
        for (var a = 0; a < 6; a++) {
          var local = drawn.filter(function (i) { return stars[i].arm === a; }).sort(function (i, j) { return stars[i].r - stars[j].r; });
          for (var j = 1; j < local.length; j++) links.push([local[j - 1], local[j]]);
        }
      } else links = sourceLinks;
      draw(motion.matches ? 0 : elapsed);
    }

    // ---- v4 "persistent world": one fixed canvas whose pose follows the section in view ----
    var POSES = {top: [0.72, 0.50, 0.50, 1, 0], problem: [0.74, 0.50, 0.50, 1, 0.1], built: [0.50, 0.50, 0.85, 0.45, 0.2], idea: [0.80, 0.52, 0.70, 0.7, 1], team: [0.5, 0.5, 0.8, 0.16, 0.3], contact: [0.5, 0.5, 0.8, 0.16, 0.3]};
    var ws = {cx: 0.7, cy: 0.5, sc: 0.62, dim: 1, agents: 0, init: false};
    var worldHud = document.createElement('div');
    worldHud.className = 'world-hud'; worldHud.setAttribute('aria-hidden', 'true');
    document.body.appendChild(worldHud);
    var secs = {};
    ['top', 'problem', 'built', 'idea', 'team', 'contact'].forEach(function (id) { secs[id] = document.getElementById(id); });
    function clamp01(u) { return Math.max(0, Math.min(1, u)); }
    function worldPose() {
      var mid = innerHeight * 0.5, mode = 'top';
      for (var id in secs) { var el = secs[id]; if (!el) continue; var r = el.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) mode = id; }
      var pr = secs.problem ? secs.problem.getBoundingClientRect() : null;
      var probP = pr ? clamp01((innerHeight * 0.9 - pr.top) / (pr.height + innerHeight * 0.3)) : 0;
      var inProblem = pr && probP > 0 && probP < 1;
      var tgt = POSES[mode];
      var k = ws.init ? 0.07 : 1; ws.init = true;
      ws.cx += (tgt[0] - ws.cx) * k; ws.cy += (tgt[1] - ws.cy) * k; ws.sc += (tgt[2] - ws.sc) * k; ws.dim += (tgt[3] - ws.dim) * k; ws.agents += (tgt[4] - ws.agents) * k;
      return {mode: mode, probP: probP, inProblem: inProblem};
    }
    var mouse = {x: 0.5, y: 0.5, sx: 0.5, sy: 0.5};
    window.addEventListener('mousemove', function (e) { mouse.x = e.clientX / innerWidth; mouse.y = e.clientY / innerHeight; }, {passive: true});
    function draw(t) {
      var reduced = motion.matches;
      if (reduced) t = 0;
      var world = worldPose();
      var cycle = t % 14;
      if (!reduced && world.inProblem) cycle = 4 + world.probP * 7.6;
      else if (!reduced && world.mode !== 'top' && world.mode !== 'problem') cycle = 0.3;
      canvas.style.opacity = ws.dim.toFixed(3);
      worldHud.style.opacity = world.inProblem && world.probP > 0.12 && world.probP < 0.97 ? 1 : 0;
      var shock = cycle >= 4 && cycle < 12;
      var restoring = cycle >= 12;
      var minute = cycle < 4 ? 0 : Math.min(endMinute, (cycle - 4) / 8 * endMinute);
      var lo = Math.floor(minute), hi = Math.min(endMinute, lo + 1), frac = minute - lo;
      var amount = cycle < 4 ? 0 : cum[lo] + (cum[hi] - cum[lo]) * frac;
      var millions = Math.round(amount / 1e6);
      if (millions !== previousAmount) {
        counter.textContent = (zh ? '已强平  $' : 'LIQUIDATED  $') + numberFormat.format(millions) + 'M';
        worldHud.textContent = '$' + numberFormat.format(millions) + 'M';
        previousAmount = millions;
      }
      mouse.sx += (mouse.x - mouse.sx) * 0.05; mouse.sy += (mouse.y - mouse.sy) * 0.05;
      var cx = W * (mobile ? 0.5 : ws.cx) + (mouse.sx - 0.5) * 46, cy = H * ws.cy + (mouse.sy - 0.5) * 28;
      var scale = Math.min(W * ws.sc, H * ws.sc * 1.05) * (world.inProblem ? 1 - 0.22 * world.probP : 1);
      var angle = t * Math.PI * 2 / 120 + 0.4;
      var cosY = Math.cos(angle), sinY = Math.sin(angle), cosT = Math.cos(0.65), sinT = Math.sin(0.65);
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, W, H);
      var core = ctx.createRadialGradient(cx, cy, 0, cx, cy, scale * 0.8);
      core.addColorStop(0, 'rgba(124,245,214,0.035)'); core.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = core; ctx.fillRect(0, 0, W, H);
      var herd = !reduced && cycle >= 2.5 && cycle < 4 ? (cycle - 2.5) / 1.5 : -1;
      drawn.forEach(function (i) {
        var s = stars[i];
        var x1 = s.x * cosY - s.y * sinY, y1 = s.x * sinY + s.y * cosY;
        var y2 = y1 * cosT - s.z * sinT, z2 = y1 * sinT + s.z * cosT;
        var perspective = 3.2 / (3.2 + z2);
        projected[i * 3] = cx + x1 * perspective * scale;
        projected[i * 3 + 1] = cy + y2 * perspective * scale;
        projected[i * 3 + 2] = perspective;
        var alpha = s.side === 1 ? 1 : 0.7;
        if (!reduced && !mobile) alpha *= 0.91 + 0.09 * Math.sin(t * 1.8 + s.phase);
        if (!reduced && s.tl >= 0) {
          var since = cycle - (4 + s.tl / endMinute * 8);
          if (restoring) alpha *= smooth((cycle - 12) / 2);
          else if (since >= 0) alpha *= 1 - smooth((since - 0.18) / 0.55);
        }
        opacity[i] = alpha;
      });

      // Keep about 12 (mobile 4) short-lived trades, replacing each every 0.6 s.
      // Neighbors come only from the same original spiral arm. No real trades are asserted.
      if (!reduced && links.length) {
        ctx.lineWidth = 0.65;
        var slots = mobile ? 4 : Math.round(12 + 30 * ws.agents);
        for (var slot = 0; slot < slots; slot++) {
          var tradeClock = t + slot * 0.6 / slots;
          var epoch = Math.floor(tradeClock / 0.6), u = (tradeClock % 0.6) / 0.6;
          var hash = Math.imul(epoch + 1, 73856093) ^ Math.imul(slot + 1, 19349663);
          var pair = links[(hash >>> 0) % links.length];
          var intensity = Math.sin(Math.PI * u) * Math.min(opacity[pair[0]], opacity[pair[1]]);
          if (intensity <= 0.01) continue;
          ctx.strokeStyle = 'rgba(124,245,214,' + (intensity * 0.48) + ')';
          ctx.beginPath(); ctx.moveTo(projected[pair[0] * 3], projected[pair[0] * 3 + 1]);
          ctx.lineTo(projected[pair[1] * 3], projected[pair[1] * 3 + 1]); ctx.stroke();
        }
      }
      ctx.globalCompositeOperation = 'lighter';
      drawn.forEach(function (i) {
        var s = stars[i], alpha = opacity[i];
        if (alpha <= 0.001) return;
        var x = projected[i * 3], y = projected[i * 3 + 1];
        var size = s.size * 1.45 * projected[i * 3 + 2] * (s.side === 1 ? 1 : 0.7);
        var color = s.color, glow = 0;
        if (herd >= 0 && s.arm !== null && origins[s.arm]) {
          var origin = origins[s.arm].r;
          var front = origin + herd * (1.1 - origin);
          var wave = Math.max(0, 1 - Math.abs(s.r - front) / 0.10) * Math.sin(Math.PI * herd);
          alpha = Math.min(1, alpha + wave * 0.45); glow = wave; size *= 1 + wave * 0.45;
        }
        if (!reduced && !restoring && s.tl >= 0) {
          var age = cycle - (4 + s.tl / endMinute * 8);
          if (age >= 0 && age < 0.73) { color = age < 0.12 ? '255,236,205' : '255,105,35'; glow = Math.max(glow, 1 - age / 0.73); size *= 1 + 1.1 * glow; alpha = Math.min(1, alpha + glow * 0.5); }
        }
        if (!s.whale && glow <= 0 && size > 1.2) {
          ctx.fillStyle = 'rgba(' + color + ',' + (alpha * 0.07) + ')';
          ctx.beginPath(); ctx.arc(x, y, size * 2.6, 0, Math.PI * 2); ctx.fill();
        }
        if (s.whale || glow > 0) {
          ctx.fillStyle = 'rgba(' + color + ',' + (alpha * (0.10 + glow * 0.14)) + ')';
          ctx.beginPath(); ctx.arc(x, y, size * (1.6 + glow), 0, Math.PI * 2); ctx.fill();
        }
        ctx.fillStyle = 'rgba(' + color + ',' + alpha + ')';
        if (size < 1.6) ctx.fillRect(x - size / 2, y - size / 2, size, size);
        else { ctx.beginPath(); ctx.arc(x, y, size / 2, 0, Math.PI * 2); ctx.fill(); }
        if (!reduced && s.whale) {
          var pulse = ((t + s.phase) % 4) / 0.9;
          if (pulse < 1) {
            ctx.strokeStyle = 'rgba(124,245,214,' + (0.13 * Math.sin(Math.PI * pulse) * alpha) + ')';
            ctx.lineWidth = 0.7; ctx.beginPath(); ctx.arc(x, y, size * 2 + pulse * 15, 0, Math.PI * 2); ctx.stroke();
          }
        }
      });
      ctx.globalCompositeOperation = 'source-over';
      if (!reduced && shock) {
        // BTC prices affect wave brightness only; liquidation timings remain the source events.
        var falling = Math.max(0, prices[Math.max(0, lo - 1)] - prices[lo]);
        for (var k = 0; k < 3; k++) {
          var waveU = (cycle - 4) / 8 - k * 0.1;
          if (waveU <= 0 || waveU >= 1) continue;
          ctx.strokeStyle = 'rgba(255,120,60,' + ((0.10 + Math.min(0.3, falling * 14)) * Math.sin(Math.PI * waveU)) + ')';
          ctx.lineWidth = 1.6 - k * 0.4; ctx.beginPath(); ctx.arc(cx, cy, waveU * scale * 2.1, 0, Math.PI * 2); ctx.stroke();
        }
        var heat = Math.min(1, amount / cum[endMinute]);
        var vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
        vg.addColorStop(0, 'rgba(255,90,30,0)'); vg.addColorStop(1, 'rgba(255,90,30,' + (0.07 * heat) + ')');
        ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
      }
      if (!reduced && world.inProblem && !mobile) {
        // cumulative liquidated USD, source data only, drawn up to the current replay minute
        var x0 = W * 0.58, x1 = W * 0.94, yb = 392, yh = 64, total = cum[endMinute];
        ctx.strokeStyle = 'rgba(236,230,218,0.16)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x0, yb); ctx.lineTo(x1, yb); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,138,31,0.95)'; ctx.lineWidth = 1.6; ctx.beginPath();
        for (var m = 0; m <= lo; m++) { var px = x0 + (x1 - x0) * m / endMinute, py = yb - yh * cum[m] / total; if (m === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
        var hx = x0 + (x1 - x0) * minute / endMinute, hy = yb - yh * amount / total;
        ctx.lineTo(hx, hy); ctx.stroke();
        ctx.fillStyle = '#ff8a1f'; ctx.beginPath(); ctx.arc(hx, hy, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(190,182,170,0.95)'; ctx.font = '12px ui-monospace, Menlo, monospace'; ctx.textAlign = 'right';
        ctx.fillText(zh ? '累计强平 · 2025 年 10 月 10 日 · 回放' : 'CUMULATIVE · OCT 10, 2025 · REPLAY', x1, yb + 22); ctx.textAlign = 'left';
      }
    }

    function frame(now) {
      raf = 0;
      if (document.hidden || !visible || motion.matches) { last = null; return; }
      if (last !== null) elapsed += (now - last) / 1000;
      last = now;
      draw(elapsed);
      raf = requestAnimationFrame(frame);
    }
    function update() {
      if (!document.hidden && visible && !motion.matches) {
        if (!raf) { last = null; raf = requestAnimationFrame(frame); }
      } else {
        if (raf) cancelAnimationFrame(raf);
        raf = 0; last = null;
      }
    }
    resize();
    var bounds = hero.getBoundingClientRect();
    visible = bounds.bottom > 0 && bounds.top < innerHeight;
    visible = true;
    document.addEventListener('visibilitychange', update);
    motion.addEventListener('change', function () {
      elapsed = 0; update(); if (motion.matches) draw(0);
    });
    var resizeTimer;
    window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(resize, 120); });
    update();
  }
})();
