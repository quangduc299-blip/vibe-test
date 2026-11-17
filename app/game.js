/* ==========================================================================
   Đập Lợn — game.js
   Hai phần:
   1. LOGIC (createGame…): trạng thái, độ khó, chọn ô, đồng hồ, điểm, lưu trữ.
      Không đụng tới DOM; nhận đồng hồ, hẹn giờ, hàm ngẫu nhiên và nơi lưu trữ
      từ bên ngoài để kiểm thử được (xem tests.html).
   2. GIAO DIỆN + ÂM THANH: chỉ chạy khi trang có phần tử #app.
   Căn cứ: docs/02-chuc-nang.html, docs/03-man-hinh.html, docs/04-quy-tac-du-lieu.html
   ========================================================================== */
(function (global) {
  "use strict";

  /* ------------------------------------------------------------------------
     1. LOGIC
     ------------------------------------------------------------------------ */

  // docs/04 §10 — Bảng hằng số
  var CONST = {
    GRID_SIZE: 3,
    CELL_COUNT: 9,
    ROUND_MS: 20000,
    COUNTDOWN_STEPS: [["3", 1000], ["2", 1000], ["1", 1000], ["Đập!", 400]],
    FIRST_SPAWN_DELAY_MS: 300,
    MIN_REMAINING_TO_SPAWN_MS: 300,
    HIT_MS: 250,
    SLIDE_MS: 120,
    ENDING_MS: 800,
    WARN_SECONDS: 5,
    HIGH_SCORE_MAX: 9999,
    KEY_HIGH: "dapLon.highScore",
    KEY_MUTED: "dapLon.muted"
  };

  // docs/04 §3 — Độ khó theo chặng (thời gian đã chơi, ms).
  // Lượt chia đều 3 chặng: 0 – 6 667 – 13 333 – 20 000 ms
  var B1 = Math.round(CONST.ROUND_MS / 3);
  var B2 = Math.round(CONST.ROUND_MS * 2 / 3);
  var PHASES = [
    { id: 1, from: 0,  to: B1,             max: 1, show: [900, 1000], gap: [600, 800] },
    { id: 2, from: B1, to: B2,             max: 2, show: [750, 900],  gap: [450, 650] },
    { id: 3, from: B2, to: CONST.ROUND_MS, max: 2, show: [600, 750],  gap: [300, 500] }
  ];

  function phaseFor(elapsedMs) {
    if (elapsedMs < PHASES[0].to) return PHASES[0];
    if (elapsedMs < PHASES[1].to) return PHASES[1];
    return PHASES[2];
  }

  function randIn(range, random) {
    return range[0] + random() * (range[1] - range[0]);
  }

  // docs/04 §4.2 — Chọn ô: bỏ ô đang bận và ô của lần xuất hiện trước
  function pickCell(cells, lastCell, random) {
    var candidates = [];
    for (var i = 0; i < cells.length; i++) {
      var busy = cells[i].state === "UP" || cells[i].state === "HIT";
      if (!busy && i !== lastCell) candidates.push(i);
    }
    if (candidates.length === 0) return null;
    var k = Math.floor(random() * candidates.length);
    if (k >= candidates.length) k = candidates.length - 1;
    return candidates[k];
  }

  // docs/04 §8 — Đọc kỷ lục: không phải số nguyên 0..9999 thì coi là 0
  function parseHighScore(raw) {
    if (typeof raw !== "string" || !/^\d+$/.test(raw)) return 0;
    var n = parseInt(raw, 10);
    return n <= CONST.HIGH_SCORE_MAX ? n : 0;
  }

  // Kỷ lục mới chỉ khi lớn hơn hẳn
  function updateHighScore(score, high) {
    return score > high ? { high: score, isNew: true } : { high: high, isNew: false };
  }

  // Bọc localStorage: lỗi thì dùng bộ nhớ tạm, không báo lỗi cho người chơi
  function safeStorage(backend) {
    var memory = {};
    return {
      getItem: function (k) {
        try { if (backend) return backend.getItem(k); } catch (e) { /* bỏ qua */ }
        return Object.prototype.hasOwnProperty.call(memory, k) ? memory[k] : null;
      },
      setItem: function (k, v) {
        memory[k] = String(v);
        try { if (backend) backend.setItem(k, String(v)); } catch (e) { /* bỏ qua */ }
      }
    };
  }

  function createGame(opts) {
    opts = opts || {};
    var now = opts.now || function () { return performance.now(); };
    var setT = opts.setTimeout || function (fn, ms) { return setTimeout(fn, ms); };
    var clearT = opts.clearTimeout || function (id) { clearTimeout(id); };
    var random = opts.random || Math.random;
    var storage = opts.storage || safeStorage(null);

    var listeners = {};
    var timers = new Set();

    var g = {
      state: "IDLE",
      score: 0,
      remainingMs: CONST.ROUND_MS,
      endAt: null,
      cells: [],
      lastCell: null,
      nextSpawnTimer: null,
      spawnSeq: 0,
      highScore: parseHighScore(storage.getItem(CONST.KEY_HIGH)),
      isNewRecord: false,
      countdownLabel: null
    };
    for (var i = 0; i < CONST.CELL_COUNT; i++) g.cells.push({ state: "EMPTY", spawnId: null, timer: null });

    function on(type, fn) { (listeners[type] = listeners[type] || []).push(fn); }
    function emit(type) {
      var args = Array.prototype.slice.call(arguments, 1);
      (listeners[type] || []).forEach(function (fn) { fn.apply(null, args); });
    }

    // Hẹn giờ có theo dõi, để huỷ toàn bộ được (docs/04 §9)
    function later(fn, ms) {
      var id = setT(function () { timers.delete(id); fn(); }, ms);
      timers.add(id);
      return id;
    }
    function cancel(id) { if (id != null) { clearT(id); timers.delete(id); } }
    function cancelAll() {
      timers.forEach(function (id) { clearT(id); });
      timers.clear();
      g.nextSpawnTimer = null;
      g.cells.forEach(function (c) { c.timer = null; });
    }

    function setState(s) { g.state = s; emit("state", s); }

    function clearCells() {
      g.cells.forEach(function (c, i) {
        if (c.state !== "EMPTY") { c.state = "EMPTY"; c.spawnId = null; c.timer = null; emit("cell", i, "EMPTY", "clear"); }
      });
    }

    function remainingNow() {
      return g.state === "PLAYING" && g.endAt != null ? Math.max(0, g.endAt - now()) : g.remainingMs;
    }
    function busyCount() {
      var n = 0;
      g.cells.forEach(function (c) { if (c.state === "UP" || c.state === "HIT") n++; });
      return n;
    }
    function currentPhase() { return phaseFor(CONST.ROUND_MS - remainingNow()); }

    /* ----- Sinh lợn (docs/04 §4.1) ----- */
    function scheduleSpawn() {
      if (g.state !== "PLAYING" || g.nextSpawnTimer != null) return;
      var phase = currentPhase();
      if (busyCount() >= phase.max) return;
      var gap = randIn(phase.gap, random);
      emit("schedule", gap, phase.id);
      g.nextSpawnTimer = later(doSpawn, gap);
    }

    function doSpawn() {
      g.nextSpawnTimer = null;
      if (g.state !== "PLAYING") return;
      var remaining = remainingNow();
      if (remaining < CONST.MIN_REMAINING_TO_SPAWN_MS) return;
      var phase = phaseFor(CONST.ROUND_MS - remaining);
      if (busyCount() >= phase.max) return; // hết chỗ: chờ ô trở về EMPTY
      var idx = pickCell(g.cells, g.lastCell, random);
      if (idx == null) return;
      var showMs = randIn(phase.show, random);
      var c = g.cells[idx];
      var id = ++g.spawnSeq;
      c.state = "UP";
      c.spawnId = id;
      g.lastCell = idx;
      c.timer = later(function () {
        if (c.spawnId !== id || c.state !== "UP") return;
        c.state = "EMPTY"; c.spawnId = null; c.timer = null;
        emit("cell", idx, "EMPTY", "timeout");
        scheduleSpawn();
      }, showMs);
      emit("cell", idx, "UP", "spawn");
      emit("spawn", idx, showMs, phase.id, busyCount());
      scheduleSpawn();
    }

    /* ----- Đếm ngược (docs/02 F-02) ----- */
    function runCountdown(step) {
      var s = CONST.COUNTDOWN_STEPS[step];
      g.countdownLabel = s[0];
      emit("countdown", s[0], step);
      later(function () {
        if (g.state !== "COUNTDOWN") return;
        if (step + 1 < CONST.COUNTDOWN_STEPS.length) runCountdown(step + 1);
        else enterPlaying();
      }, s[1]);
    }

    function enterPlaying() {
      g.countdownLabel = null;
      g.endAt = now() + g.remainingMs;
      setState("PLAYING");
      g.nextSpawnTimer = later(doSpawn, CONST.FIRST_SPAWN_DELAY_MS);
      // Dự phòng: vẫn kết thúc đúng giờ kể cả khi trình duyệt ngừng gọi khung hình
      later(tick, g.remainingMs);
    }

    /* ----- Kết thúc lượt (docs/02 F-07) ----- */
    function end() {
      if (g.state !== "PLAYING") return;
      cancelAll();
      g.remainingMs = 0;
      g.endAt = null;
      clearCells();
      var r = updateHighScore(g.score, g.highScore);
      g.isNewRecord = r.isNew;
      if (r.isNew) { g.highScore = r.high; storage.setItem(CONST.KEY_HIGH, String(r.high)); }
      setState("ENDING");
      later(function () { if (g.state === "ENDING") setState("RESULT"); }, CONST.ENDING_MS);
    }

    /* ----- API ----- */
    // Gọi mỗi khung hình: cập nhật thời gian còn lại, hết giờ thì kết thúc
    function tick() {
      if (g.state !== "PLAYING") return g.remainingMs;
      g.remainingMs = remainingNow();
      if (g.remainingMs <= 0) end();
      return g.remainingMs;
    }

    function start() {
      if (g.state !== "IDLE" && g.state !== "RESULT") return false;
      cancelAll();
      g.cells.forEach(function (c) { c.state = "EMPTY"; c.spawnId = null; c.timer = null; });
      g.score = 0;
      g.remainingMs = CONST.ROUND_MS;
      g.endAt = null;
      g.lastCell = null;
      g.spawnSeq = 0;
      g.isNewRecord = false;
      emit("reset");
      setState("COUNTDOWN");
      runCountdown(0);
      return true;
    }

    function pause() {
      if (g.state === "PLAYING") {
        tick();
        if (g.state !== "PLAYING") return false; // vừa hết giờ: không tạm dừng
        g.remainingMs = remainingNow();
        g.endAt = null;
      } else if (g.state !== "COUNTDOWN") {
        return false;
      }
      cancelAll();
      clearCells();
      g.countdownLabel = null;
      setState("PAUSED");
      return true;
    }

    function resume() {
      if (g.state !== "PAUSED") return false;
      setState("COUNTDOWN");
      runCountdown(0);
      return true;
    }

    function home() {
      if (g.state !== "RESULT") return false;
      setState("IDLE");
      return true;
    }

    // docs/04 §6 — Tính điểm
    function hit(i) {
      if (g.state !== "PLAYING") return false;
      if (now() >= g.endAt) { tick(); return false; }
      var c = g.cells[i];
      if (!c || c.state !== "UP") return false;
      cancel(c.timer);
      var id = c.spawnId;
      c.state = "HIT";
      g.score += 1;
      emit("score", g.score);
      emit("cell", i, "HIT", "hit");
      c.timer = later(function () {
        if (c.spawnId !== id || c.state !== "HIT") return;
        c.state = "EMPTY"; c.spawnId = null; c.timer = null;
        emit("cell", i, "EMPTY", "after-hit");
        scheduleSpawn();
      }, CONST.HIT_MS);
      return true;
    }

    function displaySeconds() { return Math.ceil(remainingNow() / 1000); }

    g.on = on;
    g.tick = tick;
    g.start = start;
    g.pause = pause;
    g.resume = resume;
    g.home = home;
    g.hit = hit;
    g.displaySeconds = displaySeconds;
    g.remaining = remainingNow;
    g.pendingTimers = function () { return timers.size; };
    return g;
  }

  var DapLon = {
    CONST: CONST,
    PHASES: PHASES,
    phaseFor: phaseFor,
    pickCell: pickCell,
    parseHighScore: parseHighScore,
    updateHighScore: updateHighScore,
    safeStorage: safeStorage,
    createGame: createGame
  };
  global.DapLon = DapLon;

  /* ------------------------------------------------------------------------
     2. ÂM THANH (Web Audio, không dùng file) — docs/02 F-13
     ------------------------------------------------------------------------ */
  function createAudio(storage) {
    var Ctx = global.AudioContext || global.webkitAudioContext;
    var ctx = null;
    var muted = storage.getItem(CONST.KEY_MUTED) === "1";

    function unlock() {
      if (!Ctx) return;
      try {
        if (!ctx) ctx = new Ctx();
        if (ctx.state === "suspended") ctx.resume();
      } catch (e) { ctx = null; }
    }

    function tone(type, f0, f1, dur, vol, delay) {
      if (muted || !ctx) return;
      var t = ctx.currentTime + (delay || 0);
      var o = ctx.createOscillator();
      var gn = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      gn.gain.setValueAtTime(0.0001, t);
      gn.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(gn).connect(ctx.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    }

    return {
      supported: !!Ctx,
      unlock: unlock,
      isMuted: function () { return muted; },
      setMuted: function (m) { muted = !!m; storage.setItem(CONST.KEY_MUTED, muted ? "1" : "0"); },
      hit: function () { tone("sawtooth", 260, 90, 0.14, 0.25); tone("square", 140, 70, 0.1, 0.12); },
      beep: function () { tone("sine", 660, 660, 0.12, 0.25); },
      go: function () { tone("sine", 990, 990, 0.22, 0.3); },
      timeUp: function () {
        tone("triangle", 523, 523, 0.18, 0.3, 0);
        tone("triangle", 392, 392, 0.18, 0.3, 0.18);
        tone("triangle", 262, 262, 0.35, 0.3, 0.36);
      }
    };
  }

  /* ------------------------------------------------------------------------
     3. GIAO DIỆN — docs/03
     ------------------------------------------------------------------------ */
  function initUI() {
    var root = document.getElementById("app");
    if (!root) return;

    var storage = safeStorage(global.localStorage);
    var game = createGame({ storage: storage });
    var audio = createAudio(storage);
    var reduceMotion = global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)");
    function rm() { return !!(reduceMotion && reduceMotion.matches); }

    var $ = function (id) { return document.getElementById(id); };
    var screens = { start: $("s-start"), play: $("s-play"), result: $("s-result") };
    var cells = Array.prototype.slice.call(document.querySelectorAll(".cell"));
    var el = {
      mute: $("mute"), startBtn: $("btn-start"), startHigh: $("start-high"), startHighVal: $("start-high-val"),
      score: $("score"), time: $("time"), timeWrap: $("time-wrap"), progress: $("progress"),
      grid: $("grid"), ending: $("ending"),
      ovCountdown: $("ov-countdown"), cdLabel: $("cd-label"),
      ovPause: $("ov-pause"), pauseInfo: $("pause-info"), resumeBtn: $("btn-resume"),
      resultScore: $("result-score"), badge: $("badge"), resultHigh: $("result-high"),
      againBtn: $("btn-again"), homeBtn: $("btn-home"), sr: $("sr")
    };

    function show(name) {
      Object.keys(screens).forEach(function (k) { screens[k].hidden = k !== name; });
    }

    function renderHigh() {
      el.startHighVal.textContent = game.highScore;
      el.startHigh.hidden = game.highScore === 0;
      el.resultHigh.textContent = game.highScore;
    }

    function renderTime() {
      var ms = game.remaining();
      var s = Math.ceil(ms / 1000);
      if (el.time.textContent !== String(s)) el.time.textContent = s;
      el.timeWrap.classList.toggle("warn", game.state === "PLAYING" && s <= CONST.WARN_SECONDS);
      el.progress.style.transform = "scaleX(" + (ms / CONST.ROUND_MS) + ")";
    }

    /* ----- Nút loa ----- */
    function renderMute() {
      var m = audio.isMuted();
      el.mute.textContent = m ? "🔇" : "🔊";
      el.mute.setAttribute("aria-label", m ? "Bật tiếng" : "Tắt tiếng");
      el.mute.setAttribute("aria-pressed", m ? "true" : "false");
    }
    if (!audio.supported) el.mute.hidden = true;
    el.mute.addEventListener("click", function () {
      audio.unlock();
      audio.setMuted(!audio.isMuted());
      renderMute();
    });
    renderMute();

    /* ----- Sự kiện từ logic ----- */
    game.on("reset", function () {
      el.score.textContent = "0";
      el.ending.hidden = true;
      cells.forEach(function (c) { c.dataset.state = "EMPTY"; c.dataset.face = "normal"; });
      renderTime();
    });

    game.on("countdown", function (label, step) {
      el.cdLabel.textContent = label;
      el.cdLabel.classList.remove("pop");
      void el.cdLabel.offsetWidth; // chạy lại hoạt ảnh
      el.cdLabel.classList.add("pop");
      if (step < 3) audio.beep(); else audio.go();
    });

    game.on("cell", function (i, state, reason) {
      var c = cells[i];
      c.dataset.state = state;
      if (state === "UP") c.dataset.face = "normal";
      if (state === "HIT") {
        c.dataset.face = "hit";
        if (!rm()) {
          c.classList.remove("shake"); void c.offsetWidth; c.classList.add("shake");
          var plus = document.createElement("span");
          plus.className = "plus";
          plus.textContent = "+1";
          plus.setAttribute("aria-hidden", "true");
          plus.addEventListener("animationend", function () { plus.remove(); });
          c.appendChild(plus);
        }
      }
      if (reason === "clear") c.dataset.face = "normal";
    });

    game.on("score", function (s) {
      el.score.textContent = s;
      audio.hit();
    });

    game.on("state", function (s) {
      root.dataset.state = s;
      el.grid.classList.toggle("locked", s !== "PLAYING");
      el.ovCountdown.hidden = s !== "COUNTDOWN";
      el.ovPause.hidden = s !== "PAUSED";

      if (s === "IDLE") { renderHigh(); show("start"); el.startBtn.focus(); }
      if (s === "COUNTDOWN") { show("play"); el.ending.hidden = true; renderTime(); }
      if (s === "PLAYING") { loop(); }
      if (s === "PAUSED") {
        el.pauseInfo.textContent = "Còn " + game.displaySeconds() + " giây · Điểm " + game.score;
        renderTime();
        el.resumeBtn.focus();
      }
      if (s === "ENDING") {
        renderTime();
        el.ending.hidden = false;
        audio.timeUp();
      }
      if (s === "RESULT") showResult();
    });

    function showResult() {
      renderHigh();
      el.badge.hidden = !game.isNewRecord;
      show("result");
      el.againBtn.focus();
      el.sr.textContent = "Hết giờ! Điểm của bạn: " + game.score + "." + (game.isNewRecord ? " Kỷ lục mới!" : "") + " Kỷ lục: " + game.highScore + ".";
      var target = game.score;
      if (rm() || target === 0) { el.resultScore.textContent = target; return; }
      var t0 = performance.now();
      el.resultScore.textContent = "0";
      (function step(t) {
        if (game.state !== "RESULT") return;
        var p = Math.min(1, (t - t0) / 600);
        el.resultScore.textContent = Math.round(target * p);
        if (p < 1) requestAnimationFrame(step);
      })(t0);
    }

    /* ----- Vòng lặp khung hình: chỉ chạy khi đang chơi ----- */
    var looping = false;
    function loop() {
      if (looping) return;
      looping = true;
      (function frame() {
        game.tick();
        renderTime();
        if (game.state === "PLAYING") requestAnimationFrame(frame);
        else looping = false;
      })();
    }

    /* ----- Thao tác người chơi ----- */
    cells.forEach(function (c, i) {
      c.addEventListener("pointerdown", function (e) {
        e.preventDefault(); // không focus, không chọn chữ, không phóng to
        game.hit(i);
      });
    });
    el.grid.addEventListener("contextmenu", function (e) { e.preventDefault(); });

    el.startBtn.addEventListener("click", function () { audio.unlock(); game.start(); });
    el.againBtn.addEventListener("click", function () { audio.unlock(); game.start(); });
    el.homeBtn.addEventListener("click", function () { game.home(); });
    el.resumeBtn.addEventListener("click", function () { audio.unlock(); game.resume(); });

    // docs/02 F-11 — rời tab thì tự tạm dừng
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) game.pause();
    });

    renderHigh();
    renderTime();
    show("start");
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initUI);
    else initUI();
  }
})(typeof window !== "undefined" ? window : this);
