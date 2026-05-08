// ── Chasing Platypus (Desktop Goose style) ──
(function () {
  const SIZE       = 72;
  const WAND_SPEED = 1.8;
  const CHASE_SPEED = 7.5;

  let platy, bubble, raf;
  let px, py, vx = 1.5, vy = 1;
  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let userName = 'chud';
  let state = 'wander'; // wander | chase | idle
  let chaseTimer  = 0;
  let chaseMaxTime = 0;
  let idleTimer    = 0;
  let idleMaxTime  = 0;
  let bubbleTO;
  let active = false;

  const TAUNTS = [
    "got you, {name}. too slow.",
    "lmaooo nowhere to run {name}",
    "caught you chudding, {name}",
    "your cursor speed reflects your macros, {name}",
    "framemogged by a platypus, {name}. embarrassing.",
    "i found you {name}. log your meals.",
    "ngmi {name}. i literally walked to you.",
    "you call that evading? big back reflexes, {name}.",
    "ascension starts with faster reflexes, {name}",
    "{name} you can't even outrun a duck-billed mammal",
    "caught lackin as usual, {name}",
    "mewing won't help you escape me, {name}",
  ];

  const CHASE_TAUNTS = [
    "GET BACK HERE {name}",
    "COME HERE {name}",
    "YOU CANNOT ESCAPE {name}",
    "STAY STILL {name}",
    "I SEE YOU {name}",
    "CHUD {name} STOP RUNNING",
  ];

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function fmt(str)  { return str.replace(/{name}/g, userName); }

  // ── CSS ──
  function injectStyles() {
    if (document.getElementById('platy-chase-css')) return;
    const s = document.createElement('style');
    s.id = 'platy-chase-css';
    s.textContent = `
      #chase-platy {
        position: fixed;
        z-index: 9998;
        width: ${SIZE}px;
        height: ${SIZE}px;
        cursor: default;
        user-select: none;
        pointer-events: all;
        transform-origin: center bottom;
        will-change: transform, left, top;
        filter: drop-shadow(0 3px 8px rgba(255,124,74,0.35));
      }
      #chase-platy svg { width: 100%; height: 100%; display: block; }

      #chase-bubble {
        position: fixed;
        z-index: 9999;
        background: #1c1212;
        border: 1.5px solid rgba(255,77,143,0.55);
        border-radius: 14px;
        padding: 0.55rem 0.9rem;
        font-family: 'DM Sans', sans-serif;
        font-size: 0.78rem;
        color: #f5eeee;
        max-width: 215px;
        line-height: 1.45;
        pointer-events: none;
        box-shadow: 0 6px 24px rgba(0,0,0,0.55);
        display: none;
        white-space: normal;
      }
      #chase-bubble::after {
        content: '';
        position: absolute;
        bottom: -7px;
        left: 50%;
        transform: translateX(-50%);
        border: 7px solid transparent;
        border-bottom: none;
        border-top-color: rgba(255,77,143,0.55);
      }
      #chase-bubble.visible {
        display: block;
        animation: platBubbleIn 0.18s cubic-bezier(0.34,1.56,0.64,1) both;
      }
      @keyframes platBubbleIn {
        from { opacity:0; transform: scale(0.75) translateY(6px); }
        to   { opacity:1; transform: scale(1) translateY(0); }
      }
    `;
    document.head.appendChild(s);
  }

  const PLATY_SVG = `<svg viewBox="0 0 140 140" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M28 88 Q8 72 11 96 Q14 112 31 102 Z" fill="#e86030"/>
    <ellipse cx="70" cy="86" rx="42" ry="31" fill="#ff7c4a"/>
    <ellipse cx="70" cy="91" rx="26" ry="19" fill="#ffb89e"/>
    <ellipse cx="70" cy="54" rx="28" ry="26" fill="#ff7c4a"/>
    <ellipse cx="95" cy="60" rx="19" ry="9" fill="#ff4d8f"/>
    <ellipse cx="107" cy="57" rx="2.5" ry="1.5" fill="#c02868"/>
    <circle cx="80" cy="49" r="7" fill="white"/>
    <circle cx="80" cy="49" r="4" fill="#1a0a0a"/>
    <circle cx="82" cy="47" r="1.5" fill="white"/>
    <ellipse cx="89" cy="58" rx="6" ry="3.5" fill="#ff4d8f" opacity="0.3"/>
    <ellipse cx="54" cy="33" rx="9" ry="7" fill="#ff6030"/>
    <ellipse cx="36" cy="97" rx="11" ry="7" fill="#e86030" transform="rotate(-25 36 97)"/>
    <ellipse cx="104" cy="97" rx="11" ry="7" fill="#e86030" transform="rotate(25 104 97)"/>
    <ellipse cx="54" cy="116" rx="15" ry="6" fill="#ff4d8f" transform="rotate(-8 54 116)"/>
    <ellipse cx="86" cy="116" rx="15" ry="6" fill="#ff4d8f" transform="rotate(8 86 116)"/>
    <text x="56" y="47" font-size="11" fill="#ff4d8f" opacity="0.75">♥</text>
    <path d="M88 66 Q93 70 98 66" stroke="#c02868" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  </svg>`;

  function createElements() {
    document.getElementById('chase-platy')?.remove();
    document.getElementById('chase-bubble')?.remove();

    platy = document.createElement('div');
    platy.id = 'chase-platy';
    platy.innerHTML = PLATY_SVG;

    bubble = document.createElement('div');
    bubble.id = 'chase-bubble';

    document.body.appendChild(platy);
    document.body.appendChild(bubble);

    px = 120 + Math.random() * (window.innerWidth  - 240);
    py = 120 + Math.random() * (window.innerHeight - 240);
    platy.style.left = px + 'px';
    platy.style.top  = py + 'px';
  }

  // ── Show bubble ──
  function showBubble(text, duration) {
    bubble.classList.remove('visible');
    void bubble.offsetWidth;
    bubble.textContent = text;
    bubble.classList.add('visible');
    positionBubble();
    clearTimeout(bubbleTO);
    bubbleTO = setTimeout(() => bubble.classList.remove('visible'), duration || 3500);
  }

  function positionBubble() {
    const bw = 215;
    let bx = px + SIZE / 2 - bw / 2;
    bx = Math.max(8, Math.min(bx, window.innerWidth - bw - 8));
    bubble.style.left = bx + 'px';
    bubble.style.top  = (py - 68) + 'px';
  }

  // ── State scheduler ──
  function scheduleNextState() {
    if (!active) return;
    if (state === 'wander') {
      // Random chance to go idle or start chasing
      const r = Math.random();
      if (r < 0.35) {
        // Go idle for a bit (stop and look around)
        state = 'idle';
        idleMaxTime = 60 + Math.random() * 90; // ~1-2.5s at 60fps
        idleTimer = 0;
      } else {
        // Chase the cursor!
        state = 'chase';
        chaseMaxTime = 180 + Math.random() * 240; // 3-7s at 60fps
        chaseTimer = 0;
        showBubble(fmt(pick(CHASE_TAUNTS)), 2500);
      }
    }
    // Next state decision in 8-20 seconds
    setTimeout(scheduleNextState, 8000 + Math.random() * 12000);
  }

  // ── Main loop ──
  let lastTime = 0;
  function tick(ts) {
    if (!active) return;
    const dt = Math.min((ts - lastTime) / 16.67, 3);
    lastTime = ts;

    const W = window.innerWidth;
    const H = window.innerHeight;
    const cx = px + SIZE / 2;
    const cy = py + SIZE / 2;

    if (state === 'chase') {
      chaseTimer += dt;
      const dx   = mx - cx;
      const dy   = my - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 36) {
        // Caught the cursor!
        showBubble(fmt(pick(TAUNTS)), 3800);
        state = 'wander';
        // Bounce away slightly after catch
        vx = (Math.random() - 0.5) * 4;
        vy = (Math.random() - 0.5) * 4;
      } else if (chaseTimer > chaseMaxTime) {
        // Gave up
        state = 'wander';
      } else {
        // Accelerate toward cursor
        const angle = Math.atan2(dy, dx);
        const force = Math.min(dist / 80, 1) * 2.2;
        vx += Math.cos(angle) * force * dt;
        vy += Math.sin(angle) * force * dt;
      }
    } else if (state === 'idle') {
      idleTimer += dt;
      // Slow to a stop
      vx *= Math.pow(0.88, dt);
      vy *= Math.pow(0.88, dt);
      if (idleTimer > idleMaxTime) state = 'wander';
    } else {
      // Wander: small random nudges + gentle steering
      if (Math.random() < 0.03 * dt) {
        vx += (Math.random() - 0.5) * 2.2;
        vy += (Math.random() - 0.5) * 2.2;
      }
    }

    // Speed cap
    const spd    = Math.sqrt(vx * vx + vy * vy);
    const maxSpd = state === 'chase' ? CHASE_SPEED : (state === 'idle' ? 0.4 : WAND_SPEED);
    if (spd > maxSpd) { vx = (vx / spd) * maxSpd; vy = (vy / spd) * maxSpd; }

    // Friction
    const friction = state === 'chase' ? 0.94 : 0.97;
    vx *= Math.pow(friction, dt);
    vy *= Math.pow(friction, dt);

    // Keep wandering if too slow
    if (state === 'wander' && spd < 0.6) {
      vx += (Math.random() - 0.5) * 1.0;
      vy += (Math.random() - 0.5) * 1.0;
    }

    px += vx * dt;
    py += vy * dt;

    // Wall bounce
    if (px < 4)            { px = 4;            vx =  Math.abs(vx) * 0.75; }
    if (px > W - SIZE - 4) { px = W - SIZE - 4; vx = -Math.abs(vx) * 0.75; }
    if (py < 4)            { py = 4;            vy =  Math.abs(vy) * 0.75; }
    if (py > H - SIZE - 4) { py = H - SIZE - 4; vy = -Math.abs(vy) * 0.75; }

    platy.style.left = px + 'px';
    platy.style.top  = py + 'px';

    // ── Visuals ──
    const flipX   = vx < -0.2 ? -1 : 1;
    const bobFreq = state === 'chase' ? 20 : (state === 'idle' ? 1.5 : 7);
    const bobAmp  = state === 'chase' ? 6  : (state === 'idle' ? 1   : 3);
    const bob     = Math.sin(ts / 1000 * bobFreq) * bobAmp * (spd / (maxSpd || 1));
    const tilt    = state === 'chase' ? Math.atan2(vy, vx) * 10 * (Math.PI / 180) : 0;
    platy.style.transform = `scaleX(${flipX}) translateY(${bob}px) rotate(${tilt}rad)`;

    if (bubble.classList.contains('visible')) positionBubble();

    raf = requestAnimationFrame(tick);
  }

  // ── Input ──
  function onMouseMove(e) { mx = e.clientX; my = e.clientY; }
  function onTouchMove(e) { mx = e.touches[0].clientX; my = e.touches[0].clientY; }

  // ── Public ──
  window.initChasePlatypus = function (name) {
    userName = (name || 'chud').split(' ')[0];
    if (active) destroyChasePlatypus();
    injectStyles();
    createElements();
    active   = true;
    state    = 'wander';
    lastTime = performance.now();
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    raf = requestAnimationFrame(tick);
    // First state decision after 6-14 seconds of chill wandering
    setTimeout(scheduleNextState, 6000 + Math.random() * 8000);
  };

  window.destroyChasePlatypus = function () {
    active = false;
    cancelAnimationFrame(raf);
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('touchmove', onTouchMove);
    document.getElementById('chase-platy')?.remove();
    document.getElementById('chase-bubble')?.remove();
    clearTimeout(bubbleTO);
  };
})();
