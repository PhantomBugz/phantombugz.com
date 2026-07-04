const canvas = document.getElementById("phantom-field");
const gl = canvas.getContext("webgl", { antialias: false, alpha: false });

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

float lines(vec2 uv, float scale, float speed) {
  float n = noise(vec2(uv.x * scale + time * speed, uv.y * scale * .22));
  float ridge = abs(sin((uv.y + n * .11) * 44.0));
  return smoothstep(.985, 1.0, ridge);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec2 p = (gl_FragCoord.xy - .5 * resolution.xy) / resolution.y;

  float vignette = smoothstep(1.05, .08, length(p));
  float sweep = lines(uv + vec2(.0, sin(time * .12) * .05), 8.0, .035);
  float fine = lines(uv.yx + vec2(.2, .0), 19.0, -.02);
  float node = 0.0;

  for (int i = 0; i < 7; i++) {
    float fi = float(i);
    vec2 center = vec2(
      sin(time * .17 + fi * 1.7) * .42,
      cos(time * .13 + fi * 2.1) * .24
    );
    node += .018 / max(.01, length(p - center));
  }

  vec3 deep = vec3(.005, .025, .028);
  vec3 blue = vec3(.04, .47, .76);
  vec3 green = vec3(.12, .92, .55);
  vec3 color = deep;
  color += blue * sweep * .58;
  color += green * fine * .34;
  color += mix(blue, green, uv.x) * node * .36;
  color *= vignette;
  color += vec3(.0, .02, .018);

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

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

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
      gl.uniform1f(time, reducedMotion.matches ? 6.5 : (performance.now() - start) / 1000);
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

const clock = document.getElementById("signal-clock");
const ticker = document.getElementById("ticker");
const bountyUi = {
  month: document.getElementById("goal-month"),
  total: document.getElementById("goal-total"),
  deadline: document.getElementById("goal-deadline"),
  collected: document.getElementById("goal-collected"),
  submitted: document.getElementById("goal-submitted"),
  lanes: document.getElementById("goal-lanes"),
  ready: document.getElementById("goal-ready"),
  meter: document.getElementById("goal-meter-fill")
};

let feed = [
  ["GOAL", "July bug bounty target: $25,000"],
  ["READY", "1 report package ready for platform submission"],
  ["LANES", "7 active research lanes tracked"],
  ["SHOP", "Field kit concepts queued"],
  ["WEBGL", "Signal field stable"]
];

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0
});

function formatDate(value) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Deadline pending";
  return `Deadline ${date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}`;
}

function applyBountyStatus(status) {
  const goal = Number(status.goal || 0);
  const collected = Number(status.collected || 0);
  const submitted = Number(status.submittedPossible || 0);
  const progress = goal > 0 ? Math.min(((collected + submitted) / goal) * 100, 100) : 0;
  const monthLabel = status.month ? `${status.month} sprint` : status.label || "Monthly sprint";

  bountyUi.month.textContent = monthLabel;
  bountyUi.total.textContent = money.format(goal);
  bountyUi.deadline.textContent = formatDate(status.deadline);
  bountyUi.collected.textContent = money.format(collected);
  bountyUi.submitted.textContent = money.format(submitted);
  bountyUi.lanes.textContent = String(status.activeLaneCount || 0);
  bountyUi.ready.textContent = String(status.readyToSubmitCount || 0);
  bountyUi.meter.style.width = `${progress}%`;

  feed = [
    ["GOAL", `${monthLabel} target: ${money.format(goal)}`],
    ["READY", status.publicNextAction || `${status.readyToSubmitCount || 0} report packages ready`],
    ["LANES", `${status.activeLaneCount || 0} active research lanes tracked`],
    ["PACE", `${money.format(collected + submitted)} counted toward this month`],
    ["SHOP", "Gear drop stays tied to the bounty sprint"]
  ];

  ticker.replaceChildren(...feed.slice(0, 3).map(([label, text]) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${label}</span> ${text}`;
    return li;
  }));
}

fetch("./data/bugbounty-public.json", { cache: "no-store" })
  .then((response) => {
    if (!response.ok) throw new Error(`Bounty status ${response.status}`);
    return response.json();
  })
  .then(applyBountyStatus)
  .catch(() => {
    bountyUi.deadline.textContent = "Using cached sprint defaults";
  });

setInterval(() => {
  const now = new Date();
  clock.textContent = now.toLocaleTimeString([], { hour12: false });
}, 1000);

setInterval(() => {
  const item = feed[Math.floor(Math.random() * feed.length)];
  const li = document.createElement("li");
  li.innerHTML = `<span>${item[0]}</span> ${item[1]}`;
  ticker.prepend(li);
  while (ticker.children.length > 3) ticker.lastElementChild.remove();
}, 3400);
