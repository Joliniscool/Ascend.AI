// ── Chasing Platypus ──
(function () {
  const SIZE     = 72;
  const FLEE_R   = 200;   // pixels — starts fleeing when cursor within this
  const TEASE_R  = 120;   // gets this close before darting away (tease mode)
  const MAX_FLEE = 10;
  const MAX_WAND = 2.8;

  let platy, bubble, raf;
  let px, py, vx = 2, vy = 1.5;
  let mx = -9999, my = -9999;
  let userName = 'chud';
  let state = 'wander';     // wander | flee | tease
  let teaseTimer = 0;       // how long we've been teasing
  let bubbleTO;
  let active = false;

  const TAUNTS = [
    "lmaooo too slow {name}, hit cardio more",
    "ngmi {name}, can't even click a platypus",
    "your cursor speed reflects your protein intake {name}",
    "framemogged by a duck-billed mammal, {name}. embarrassing.",
    "jestermaxxing won't help you catch me {name}",
    "imagine being outrun by something that lays eggs, {name}",
    "that's literally all the mewing you've been doing? {name}?",
    "you're larping as someone fast enough to catch me, {name}",
    "chud behavior {name}. get your macros up then try again",
    "big back reflexes, {name}. couldn't catch a cold",
    "zero clavicular width AND can't click? ngmi {name}",
    "ascension requires faster clicks than that {name}",
    "blackpill cope won't help you catch me {name}",
    "i've been mogging you this whole time and you didn't even notice, {name}",
  ];

  function taunt() {
    return TAUNTS[Math.floor(Math.random() * TAUNTS.length)]
      .replace(/{name}/g, userName);
  }

  // ── Inject CSS ──
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
        cursor: pointer;
        user-select: none;
        pointer-events: all;
        transform-origin: center bottom;
        will-change: transform, left, top;
        filter: drop-shadow(0 4px 12px rgba(255,124,74,0.4));
        transition: filter 0.15s;
      }
      #chase-platy:hover { filter: drop-shadow(0 4px 20px rgba(255,77,143,0.8)); }
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
        max-width: 210px;
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
        animation: bubbleIn 0.18s cubic-bezier(0.34,1.56,0.64,1) both;
      }
      @keyframes bubbleIn {
        from { opacity:0; transform: scale(0.7) translateY(6px); }
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
    // Remove any existing instances
    document.getElementById('chase-platy')?.remove();
    document.getElementById('chase-bubble')?.remove();

    platy = document.createElement('div');
    platy.id = 'chase-platy';
    platy.innerHTML = PLATY_SVG;

    bubble = document.createElement('div');
    bubble.id = 'chase-bubble';

    document.body.appendChild(platy);
    document.body.appendChild(bubble);

    // Random starting position away from edges
    px = 120 + Math.random() * (window.innerWidth  - 240);
    py = 120 + Math.random() * (window.innerHeight - 240);

    platy.style.left = px + 'px';
    platy.style.top  = py + 'px';

    platy.addEventListener('click',      onCatch);
    platy.addEventListener('touchstart', onCatch, { passive: true });
  }

  // ── Physics tick ──
  let lastTime = 0;
  function tick(ts) {
    if (!active) return;
    const dt = Math.min((ts - lastTime) / 16.67, 3); // capped delta, normalised to 60fps
    lastTime = ts;

    const W = window.innerWidth;
    const H = window.innerHeight;

    const dx   = mx - (px + SIZE / 2);
    const dy   = my - (py + SIZE / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);

    // ── State machine ──
    if (state === 'wander') {
      if (dist < TEASE_R) {
        // Cursor is very close — switch to tease: drift toward cursor then dash away
        state = 'tease';
        teaseTimer = 0;
      } else if (dist < FLEE_R) {
        state = 'flee';
      }
    } else if (state === 'flee') {
      if (dist >= FLEE_R) state = 'wander';
    } else if (state === 'tease') {
      teaseTimer += dt;
      // After ~0.6s of "considering" the cursor, dash hard away
      if (teaseTimer > 36) {
        const angle = Math.atan2(dy, dx);
        vx = -Math.cos(angle) * MAX_FLEE * 1.6;
        vy = -Math.sin(angle) * MAX_FLEE * 1.6;
        state = 'flee';
      }
    }

    // ── Forces ──
    if (state === 'flee' || state === 'tease') {
      const angle = Math.atan2(dy, dx);
      const force = state === 'tease'
        ? ((FLEE_R - dist) / FLEE_R) * 1.2   // gentle drift while teasing
        : ((FLEE_R - dist) / FLEE_R) * MAX_FLEE * 0.55;
      vx -= Math.cos(angle) * force * dt;
      vy -= Math.sin(angle) * force * dt;
    } else {
      // Wander: small random nudges
      if (Math.random() < 0.025 * dt) {
        vx += (Math.random() - 0.5) * 2;
        vy += (Math.random() - 0.5) * 2;
      }
    }

    // Speed cap
    const spd    = Math.sqrt(vx * vx + vy * vy);
    const maxSpd = (state === 'flee') ? MAX_FLEE : (state === 'tease' ? 1.5 : MAX_WAND);
    if (spd > maxSpd) { vx = (vx / spd) * maxSpd; vy = (vy / spd) * maxSpd; }

    // Friction + minimum wander speed
    const friction = state === 'flee' ? 0.96 : 0.97;
    vx *= Math.pow(friction, dt);
    vy *= Math.pow(friction, dt);
    if (state === 'wander' && spd < 0.8) {
      vx += (Math.random() - 0.5) * 0.8;
      vy += (Math.random() - 0.5) * 0.8;
    }

    // Move
    px += vx * dt;
    py += vy * dt;

    // Wall bounce
    if (px < 4)             { px = 4;             vx =  Math.abs(vx) * 0.8; }
    if (px > W - SIZE - 4)  { px = W - SIZE - 4;  vx = -Math.abs(vx) * 0.8; }
    if (py < 4)             { py = 4;             vy =  Math.abs(vy) * 0.8; }
    if (py > H - SIZE - 4)  { py = H - SIZE - 4;  vy = -Math.abs(vy) * 0.8; }

    platy.style.left = px + 'px';
    platy.style.top  = py + 'px';

    // ── Visual transform ──
    const flipX  = vx < -0.25 ? -1 : 1;
    const bobFreq = state === 'flee' ? 18 : 6;
    const bobAmp  = state === 'flee' ? 5  : 2.5;
    const bob     = Math.sin(ts / 1000 * bobFreq) * bobAmp;
    const squishX = state === 'flee' ? (1 + Math.abs(vx) / MAX_FLEE * 0.12) : 1;
    const squishY = state === 'flee' ? (1 - Math.abs(vx) / MAX_FLEE * 0.08) : 1;
    platy.style.transform = `scaleX(${flipX * squishX}) scaleY(${squishY}) translateY(${bob}px)`;

    // Move bubble with platypus
    if (bubble.classList.contains('visible')) {
      bubble.style.left = (px + SIZE / 2 - parseInt(bubble.style.width || 200) / 2) + 'px';
      bubble.style.top  = (py - 72) + 'px';
    }

    raf = requestAnimationFrame(tick);
  }

  // ── Periodic jump/dash across screen ──
  function scheduleJump() {
    const delay = 10000 + Math.random() * 14000;
    setTimeout(() => {
      if (!active) return;
      // Taunt shake then teleport-dash
      let shakes = 0;
      const shake = setInterval(() => {
        const r = (shakes % 2 === 0 ? 1 : -1) * 18;
        platy.style.transform = `rotate(${r}deg) scale(1.15)`;
        shakes++;
        if (shakes > 5) {
          clearInterval(shake);
          // Dash to opposite area of screen
          const W = window.innerWidth, H = window.innerHeight;
          px = 80 + Math.random() * (W - 160);
          py = 80 + Math.random() * (H - 160);
          vx = (Math.random() - 0.5) * MAX_FLEE * 1.4;
          vy = (Math.random() - 0.5) * MAX_FLEE * 1.4;
          state = 'flee';
          setTimeout(() => { state = 'wander'; }, 1200);
        }
      }, 80);
      scheduleJump();
    }, delay);
  }

  // ── Click / catch handler ──
  function onCatch(e) {
    if (e.cancelable) e.preventDefault();
    e.stopPropagation();

    bubble.classList.remove('visible');
    void bubble.offsetWidth; // reflow to re-trigger animation
    bubble.textContent = taunt();
    bubble.classList.add('visible');
    bubble.style.left = (px + SIZE / 2 - 105) + 'px';
    bubble.style.top  = (py - 72)  + 'px';

    // Panic-dash away
    vx = (Math.random() - 0.5) * MAX_FLEE * 2.2;
    vy = -Math.abs(Math.random() * MAX_FLEE * 1.8); // always upward first
    state = 'flee';

    clearTimeout(bubbleTO);
    bubbleTO = setTimeout(() => bubble.classList.remove('visible'), 3800);
  }

  // ── Mouse / touch tracking ──
  function onMouseMove(e) { mx = e.clientX; my = e.clientY; }
  function onTouchMove(e) { mx = e.touches[0].clientX; my = e.touches[0].clientY; }

  // ── Public API ──
  window.initChasePlatypus = function (name) {
    userName = (name || 'chud').split(' ')[0];
    if (active) destroyChasePlatypus();
    injectStyles();
    createElements();
    active = true;
    state  = 'wander';
    lastTime = performance.now();
    document.addEventListener('mousemove',  onMouseMove);
    document.addEventListener('touchmove',  onTouchMove, { passive: true });
    raf = requestAnimationFrame(tick);
    scheduleJump();
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
