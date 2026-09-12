/* Vibe Event — hero-shader.js
   Tam ekran likit-krom / yanardöner şerit sahnesi. WebGL2 (GLSL ES 3.00) tercih, WebGL1 + OES_standard_derivatives yedek.
   Dışa açık API: window.VIBE_HERO = { ready: Promise, setScroll(0..1), setPaused(bool) }
   Tek geçişli fragment shader: düşük frekanslı anizotropik fBm alan → eş-yükselti şeritleri → levha normali → fresnel + spekülar + marka renk rampası. */
(function () {
  'use strict';

  var canvas = document.getElementById('hero-canvas');
  var api = { ready: null, setScroll: function () {}, setPaused: function () {} };
  window.VIBE_HERO = api;
  if (!canvas) { api.ready = Promise.resolve(false); return; }

  var azalt = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var mobil = window.matchMedia && window.matchMedia('(max-width: 800px), (pointer: coarse)').matches;

  var gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' });
  var v2 = !!gl;
  if (!gl) gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' });
  if (!gl) { document.documentElement.classList.add('webgl-yok'); api.ready = Promise.resolve(false); return; }
  if (!v2 && !gl.getExtension('OES_standard_derivatives')) { document.documentElement.classList.add('webgl-yok'); api.ready = Promise.resolve(false); return; }

  var ORTAK = [
    'precision highp float;',
    'uniform vec2 u_res;',
    'uniform float u_time;',
    'uniform vec2 u_mouse;',
    'uniform float u_scroll;',
    'uniform float u_oct;',
    'uniform float u_seed;',
    'float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }',
    'float noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f*f*f*(f*(f*6.0-15.0)+10.0);',
    '  float a = hash21(i), b = hash21(i+vec2(1.0,0.0)), c = hash21(i+vec2(0.0,1.0)), d = hash21(i+vec2(1.0,1.0));',
    '  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }',
    'float fbm(vec2 p){ float v = 0.0; float a = 0.5; mat2 m = mat2(1.62, 1.18, -1.18, 1.62);',
    '  for (int i = 0; i < 6; i++) { if (float(i) >= u_oct) break; v += a * noise(p); p = m * p + 0.37; a *= 0.5; } return v; }',
    'vec2 rot(vec2 p, float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c) * p; }',
    // marka rampası: mor ağırlıklı, magenta, kısa turuncu vurgu, geri mora (döngüsel)
    'vec3 rampa(float t){ t = fract(t);',
    '  vec3 c0 = vec3(0.227, 0.047, 0.640);',
    '  vec3 c1 = vec3(0.475, 0.000, 1.000);',
    '  vec3 c2 = vec3(0.690, 0.150, 1.000);',
    '  vec3 c3 = vec3(0.880, 0.250, 0.627);',
    '  vec3 c4 = vec3(0.990, 0.420, 0.520);',
    '  if (t < 0.30) return mix(c0, c1, smoothstep(0.0, 1.0, t / 0.30));',
    '  if (t < 0.55) return mix(c1, c2, smoothstep(0.0, 1.0, (t - 0.30) / 0.25));',
    '  if (t < 0.75) return mix(c2, c3, smoothstep(0.0, 1.0, (t - 0.55) / 0.20));',
    '  if (t < 0.88) return mix(c3, c4, smoothstep(0.0, 1.0, (t - 0.75) / 0.13));',
    '  return mix(c4, c0, smoothstep(0.0, 1.0, (t - 0.88) / 0.12)); }',
    'vec4 sahne(vec2 fragCoord){',
    '  vec2 uv = fragCoord / u_res;',
    '  vec2 p = (fragCoord - 0.5 * u_res) / min(u_res.x, u_res.y);',
    '  float t = u_time * 0.05 + u_seed;',
    '  float sc = clamp(u_scroll, 0.0, 1.0);',
    '  p += u_mouse * 0.05;',
    '  p = rot(p, -0.55 + 0.45 * sc + u_mouse.x * 0.05);',
    '  p *= 1.35 - 0.6 * sc;',
    '  vec2 pa = vec2(p.x * 0.55, p.y * 1.25);',
    '  vec2 q = vec2(fbm(pa * 0.8 + vec2(0.0, t)), fbm(pa * 0.8 + vec2(3.1, 0.7) - t * 0.8));',
    '  float f = fbm(pa * 0.9 + 1.4 * q + vec2(t * 0.3, 0.0));',
    '  float k = mix(12.0, 7.0, sc);',
    '  float fk = f * k + t * 0.6;',
    '  float s = fract(fk);',
    '  float serit = floor(fk);',
    '  float w = 2.0 * s - 1.0;',
    '  vec2 g = vec2(dFdx(f), dFdy(f)); float gl2 = length(g); vec2 gd = g / (gl2 + 0.0004);',
    '  vec3 n = normalize(vec3(gd * w * 1.25, 1.0));',
    '  float kenar = 1.0 - pow(abs(w), 6.0);',
    '  vec3 V = vec3(0.0, 0.0, 1.0);',
    '  vec3 L1 = normalize(vec3(0.6 + u_mouse.x * 0.35, 0.9 + u_mouse.y * 0.2, 0.55));',
    '  vec3 L2 = normalize(vec3(-0.8, -0.45, 0.4));',
    '  float nv = max(dot(n, V), 0.0);',
    '  float fres = pow(1.0 - nv, 3.0);',
    '  float dif = 0.28 + 0.72 * max(dot(n, L1), 0.0);',
    '  float sp1 = pow(max(dot(n, normalize(L1 + V)), 0.0), 60.0);',
    '  float sp2 = pow(max(dot(n, normalize(L2 + V)), 0.0), 16.0);',
    '  float sp3 = pow(max(dot(n, normalize(L1 + V)), 0.0), 6.0);',
    '  float hue = 0.30 + f * 0.5 + serit * 0.08 + (1.0 - nv) * 0.45 + sc * 0.12;',
    '  vec3 r = reflect(-V, n);',
    '  float env = smoothstep(-0.25, 0.85, r.y * 0.9 + r.x * 0.35);',
    '  vec3 renkA = rampa(hue);',
    '  vec3 renkB = rampa(hue + 0.14);',
    '  vec3 base = mix(renkA * 0.34, renkB * 1.15, env);',
    '  vec3 col = base * (0.6 + 0.4 * dif) * kenar;',
    '  col += vec3(0.93, 0.92, 1.0) * pow(env, 9.0) * 0.8 * kenar;',
    '  col += rampa(hue + 0.3) * fres * 0.5;',
    '  col += vec3(0.99, 0.50, 0.16) * pow(1.0 - nv, 5.0) * 0.6 * step(0.5, fract(serit * 0.5 + 0.25)) * kenar;',
    '  col += vec3(0.93, 0.92, 1.0) * sp3 * 0.2 * kenar;',
    '  col += vec3(1.0) * sp1 * 1.9 * kenar + vec3(0.92, 0.88, 1.0) * sp2 * 0.5 * kenar;',
    '  col *= mix(0.32, 1.08, smoothstep(0.15, 0.85, f));',
    '  col = mix(vec3(0.012, 0.004, 0.028), col, smoothstep(0.0, 0.10, 1.0 - abs(w)));',
    '  float luma = dot(col, vec3(0.299, 0.587, 0.114)); col = mix(vec3(luma), col, 1.3);',
    '  vec2 vc = uv - 0.5; col *= 1.0 - 0.85 * dot(vc, vc);',
    '  col += (hash21(fragCoord + fract(u_time)) - 0.5) * 0.03;',
    '  col = col / (1.0 + col * 0.10);',
    '  col = pow(max(col, 0.0), vec3(0.95));',
    '  return vec4(col, 1.0); }'
  ].join('\n');

  var VS2 = '#version 300 es\nin vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';
  var FS2 = '#version 300 es\n' + ORTAK + '\nout vec4 o; void main(){ o = sahne(gl_FragCoord.xy); }';
  var VS1 = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';
  var FS1 = '#extension GL_OES_standard_derivatives : enable\n' + ORTAK + '\nvoid main(){ gl_FragColor = sahne(gl_FragCoord.xy); }';

  function derle(tip, src) {
    var sh = gl.createShader(tip); gl.shaderSource(sh, src); gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) { console.error('VIBE shader: ' + gl.getShaderInfoLog(sh)); return null; }
    return sh;
  }
  var vs = derle(gl.VERTEX_SHADER, v2 ? VS2 : VS1);
  var fs = derle(gl.FRAGMENT_SHADER, v2 ? FS2 : FS1);
  if (!vs || !fs) { document.documentElement.classList.add('webgl-yok'); api.ready = Promise.resolve(false); return; }
  var prog = gl.createProgram(); gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { console.error('VIBE shader link: ' + gl.getProgramInfoLog(prog)); document.documentElement.classList.add('webgl-yok'); api.ready = Promise.resolve(false); return; }
  gl.useProgram(prog);

  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var aLoc = gl.getAttribLocation(prog, 'a'); gl.enableVertexAttribArray(aLoc); gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
  var U = {};
  ['u_res', 'u_time', 'u_mouse', 'u_scroll', 'u_oct', 'u_seed'].forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

  var olcek = Math.min(window.devicePixelRatio || 1, mobil ? 1.0 : 1.25) * (mobil ? 0.7 : 0.85);
  var oktav = mobil ? 3.0 : 4.0;
  var W = 0, H = 0;
  function boyutla() {
    var w = Math.max(1, Math.floor(canvas.clientWidth * olcek));
    var h = Math.max(1, Math.floor(canvas.clientHeight * olcek));
    if (w === W && h === H) return;
    W = w; H = h; canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h);
  }

  var hedefFare = [0, 0], fare = [0, 0], scroll = 0, durdu = false, gorunur = true, gizli = false;
  var t0 = performance.now(), ilkKare = false, cozReady;
  api.ready = new Promise(function (r) { cozReady = r; });
  api.setScroll = function (p) { scroll = p; };
  api.setPaused = function (b) { durdu = !!b; if (!durdu) planla(); };

  window.addEventListener('pointermove', function (e) {
    hedefFare = [(e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1)];
  }, { passive: true });
  window.addEventListener('resize', function () { boyutla(); planla(); }, { passive: true });
  document.addEventListener('visibilitychange', function () { gizli = document.hidden; if (!gizli) planla(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (es) { gorunur = es[0].isIntersecting; if (gorunur) planla(); }, { threshold: 0 }).observe(canvas);
  }

  var seed = 3.7;
  var planli = false;
  function ciz() {
    planli = false;
    boyutla();
    fare[0] += (hedefFare[0] - fare[0]) * 0.05;
    fare[1] += (hedefFare[1] - fare[1]) * 0.05;
    var t = (performance.now() - t0) / 1000;
    gl.uniform2f(U.u_res, W, H);
    gl.uniform1f(U.u_time, azalt ? 0.0 : t);
    gl.uniform2f(U.u_mouse, fare[0], fare[1]);
    gl.uniform1f(U.u_scroll, scroll);
    gl.uniform1f(U.u_oct, oktav);
    gl.uniform1f(U.u_seed, seed);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!ilkKare) { ilkKare = true; cozReady(true); }
    if (azalt) return;
    if (!durdu && gorunur && !gizli) planla();
  }
  function planla() { if (planli || (azalt && ilkKare)) return; planli = true; requestAnimationFrame(ciz); }
  planla();
})();
