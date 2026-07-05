const canvas = document.getElementById("phantom-field");
const gl = canvas?.getContext("webgl", { antialias: false, alpha: false });
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const vertexSource = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentSource = `
precision highp float;
uniform vec2 resolution;
uniform float time;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float dotWave(vec2 uv, float scale, float wave, float speed) {
  vec2 q = uv * scale;
  q.x += sin(q.y * wave + time * speed) * 1.45;
  q.y += cos(q.x * .34 + time * speed * .7) * .34;
  vec2 cell = fract(q) - .5;
  float d = length(cell);
  return smoothstep(.105, .025, d);
}

float flowLine(vec2 uv, float frequency, float speed) {
  float bend = sin(uv.x * 8.0 + time * speed) * .038;
  bend += noise(uv * 4.0 + vec2(time * .012, 0.0)) * .045;
  float ridge = abs(sin((uv.y + bend) * frequency));
  return smoothstep(.992, 1.0, ridge);
}

float hexLines(vec2 p) {
  p.x *= 1.1547;
  vec2 a = abs(fract(p * 11.0) - .5);
  float l1 = smoothstep(.035, .008, abs(a.x - .48));
  float l2 = smoothstep(.035, .008, abs(a.y - .48));
  float l3 = smoothstep(.035, .008, abs(fract((p.x + p.y) * 7.2) - .5));
  return max(max(l1, l2) * .44, l3 * .55);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec2 p = (gl_FragCoord.xy - .5 * resolution.xy) / resolution.y;

  float t = time * .28;
  float centerShade = smoothstep(.18, .72, length(p));
  float vignette = smoothstep(1.1, .1, length(p));

  float left = 1.0 - smoothstep(.18, .56, uv.x);
  float right = smoothstep(.54, .9, uv.x);
  float top = smoothstep(.56, .94, uv.y);
  float bottom = 1.0 - smoothstep(.22, .56, uv.y);
  float topLeft = left * top;
  float topRight = right * top;
  float bottomLeft = left * bottom;
  float rightHex = right * smoothstep(.12, .82, uv.y) * (1.0 - top * .18);

  float waves =
    dotWave(uv + vec2(.0, sin(t * .08) * .02), 58.0, 3.8, .72) * topLeft +
    dotWave(uv + vec2(.18, .0), 64.0, 4.3, -.5) * topRight +
    dotWave(uv + vec2(.0, .26), 62.0, 3.2, .46) * bottomLeft;

  float flowing =
    flowLine(uv + vec2(t * .012, .0), 72.0, .62) * left * (top + bottom * .88) +
    flowLine(uv.yx + vec2(.12, t * .009), 58.0, -.44) * topRight * .72;

  float hex = hexLines(uv + vec2(t * .014, sin(t * .11) * .012)) * rightHex;
  float mist = noise(uv * 5.0 + vec2(0.0, t * .025)) * .16;
  float scan = smoothstep(.996, 1.0, sin((uv.y + t * .032) * 220.0)) * .11;

  vec3 deep = vec3(.002, .018, .023);
  vec3 cyan = vec3(.0, .84, .92);
  vec3 green = vec3(.26, .96, .64);
  vec3 amber = vec3(.92, .58, .18);
  vec3 color = deep;
  color += cyan * waves * 1.08;
  color += cyan * flowing * .86;
  color += cyan * hex * .6;
  color += green * hex * .14;
  color += amber * hex * .04;
  color += vec3(.0, .16, .18) * mist;
  color *= mix(.56, 1.0, vignette);
  color *= mix(.84, .62, 1.0 - centerShade);
  color += vec3(0.0, .025, .028) + scan;

  gl_FragColor = vec4(color, 1.0);
}
`;

function compile(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader));
  }
  return shader;
}

function createProgram() {
  const program = gl.createProgram();
  gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }
  return program;
}

if (gl) {
  try {
    const program = createProgram();
    const buffer = gl.createBuffer();
    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const position = gl.getAttribLocation(program, "position");
    const resolution = gl.getUniformLocation(program, "resolution");
    const time = gl.getUniformLocation(program, "time");

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.useProgram(program);
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * ratio);
      canvas.height = Math.floor(window.innerHeight * ratio);
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    window.addEventListener("resize", resize);
    resize();

    const start = performance.now();
    const render = () => {
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform1f(time, reducedMotion.matches ? 8 : (performance.now() - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (!reducedMotion.matches && !document.hidden) {
        requestAnimationFrame(render);
      }
    };

    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && !reducedMotion.matches) requestAnimationFrame(render);
    });

    render();
  } catch (error) {
    canvas.dataset.webglFallback = "true";
  }
}

const swarm = document.getElementById("binary-swarm");
let seed = 1337;

function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 4294967296;
}

function populateBinarySwarm() {
  if (!swarm) return;
  const count = window.innerWidth < 720 ? 44 : 92;
  const fragments = document.createDocumentFragment();
  swarm.replaceChildren();

  for (let i = 0; i < count; i += 1) {
    const bit = document.createElement("span");
    bit.textContent = random() > .5 ? "1" : "0";
    const edgeBias = random();
    const x = edgeBias < .38 ? random() * 34 : edgeBias > .74 ? 64 + random() * 34 : 28 + random() * 44;
    const y = random() * 96;
    bit.style.setProperty("--x", `${x.toFixed(2)}vw`);
    bit.style.setProperty("--y", `${y.toFixed(2)}vh`);
    bit.style.setProperty("--delay", `${(-random() * 70).toFixed(2)}s`);
    bit.style.setProperty("--duration", `${(52 + random() * 54).toFixed(2)}s`);
    bit.style.setProperty("--size", `${(8 + random() * 6).toFixed(2)}px`);
    bit.style.setProperty("--opacity", `${(.06 + random() * .18).toFixed(2)}`);
    bit.style.setProperty("--drift-x", `${(-2 + random() * 4).toFixed(2)}px`);
    bit.style.setProperty("--drift-y", `${(-2 + random() * 4).toFixed(2)}px`);
    bit.style.setProperty("--turn", `${(-1.5 + random() * 3).toFixed(2)}deg`);
    fragments.append(bit);
  }

  swarm.append(fragments);
}

populateBinarySwarm();
window.addEventListener("resize", () => {
  clearTimeout(window.__phantomSwarmResize);
  window.__phantomSwarmResize = setTimeout(populateBinarySwarm, 160);
});

const clock = document.getElementById("signal-clock");
const ticker = document.getElementById("ticker");
const bountyUi = {
  month: document.getElementById("goal-month"),
  total: document.getElementById("goal-total"),
  deadline: document.getElementById("goal-deadline"),
  collected: document.getElementById("goal-collected"),
  submitted: document.getElementById("goal-submitted"),
  remaining: document.getElementById("goal-remaining"),
  lanes: document.getElementById("goal-lanes"),
  investigating: document.getElementById("goal-investigating"),
  ready: document.getElementById("goal-ready"),
  readySecondary: document.getElementById("goal-ready-secondary"),
  collectedMeter: document.getElementById("goal-meter-collected"),
  submittedMeter: document.getElementById("goal-meter-submitted")
};

let feed = [
  ["GOAL", "2026-07 target: $25,000"],
  ["SUBMITTED", "$0 possible"],
  ["COLLECTED", "$0 received"],
  ["REMAINING", "$25,000"]
];
let tickerIndex = 3;

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Pending";
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function remainingLabel(goal, collected) {
  const remaining = goal - collected;
  if (remaining >= 0) return money.format(remaining);
  return `+${money.format(Math.abs(remaining))} over`;
}

function setText(node, value) {
  if (node) node.textContent = value;
}

function applyBountyStatus(status) {
  const goal = Number(status.goal || 0);
  const collected = Number(status.collected || 0);
  const submitted = Number(status.submittedPossible || 0);
  const collectedPercent = goal > 0 ? Math.min((collected / goal) * 100, 100) : 0;
  const submittedPercent = goal > 0 ? Math.min(((collected + submitted) / goal) * 100, 100) : 0;
  const monthLabel = status.month ? `${status.month} sprint` : status.label || "Monthly sprint";
  const deadline = formatDate(status.deadline);

  setText(bountyUi.month, monthLabel);
  setText(bountyUi.total, money.format(goal));
  setText(bountyUi.deadline, deadline);
  setText(bountyUi.collected, money.format(collected));
  setText(bountyUi.submitted, money.format(submitted));
  setText(bountyUi.remaining, remainingLabel(goal, collected));
  setText(bountyUi.lanes, String(status.activeLaneCount || 0));
  setText(bountyUi.investigating, String(status.investigatingCount || 0));
  setText(bountyUi.ready, String(status.readyToSubmitCount || 0));
  setText(bountyUi.readySecondary, String(status.readyToSubmitCount || 0));
  bountyUi.collectedMeter.style.width = `${collectedPercent}%`;
  bountyUi.submittedMeter.style.width = `${submittedPercent}%`;

  feed = [
    ["GOAL", `${monthLabel} target: ${money.format(goal)} by ${deadline}`],
    ["SUBMITTED", `${money.format(submitted)} possible`],
    ["COLLECTED", `${money.format(collected)} received`],
    ["REMAINING", `${remainingLabel(goal, collected)} remaining`],
    ["READY", status.publicNextAction || `${status.readyToSubmitCount || 0} report package ready`]
  ];

  ticker.replaceChildren(...feed.slice(0, 3).map(([label, text]) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${label}</span> ${text}`;
    return li;
  }));
  tickerIndex = 3;
}

fetch("./data/bugbounty-public.json", { cache: "no-store" })
  .then((response) => {
    if (!response.ok) throw new Error(`Bounty status ${response.status}`);
    return response.json();
  })
  .then(applyBountyStatus)
  .catch(() => {
    setText(bountyUi.deadline, "Aug 1, 2026");
  });

function tickClock() {
  const now = new Date();
  setText(clock, now.toLocaleTimeString([], { hour12: false }));
}

tickClock();
setInterval(tickClock, 1000);

setInterval(() => {
  const item = feed[tickerIndex % feed.length];
  tickerIndex += 1;
  const li = document.createElement("li");
  li.innerHTML = `<span>${item[0]}</span> ${item[1]}`;
  ticker.prepend(li);
  while (ticker.children.length > 3) ticker.lastElementChild.remove();
}, 3400);
