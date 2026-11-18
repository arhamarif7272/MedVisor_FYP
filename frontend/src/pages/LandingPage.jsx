import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './landing.css';

// ──────────────────────────────────────────────────────────────────
// CONFIG & DATA
// ──────────────────────────────────────────────────────────────────
const MODEL_BASE = '/models/';

const MODULES = [
  { name: 'Heart Disease', organ: 'Human heart', model: 'heart.glb', tag: 'Extended', tagColor: '#7A9E8B', default: true },
  { name: 'Diabetes', organ: 'Pancreas', model: 'diabetes.glb', tag: 'Clinical Data', tagColor: '#8AAFC0' },
  { name: "Parkinson's Disease", organ: 'Human brain', model: 'brain2.glb', tag: 'Clinical Data', tagColor: '#8AAFC0' },
  { name: 'Brain Tumor (MRI)', organ: 'Human brain', model: 'brain.glb', tag: 'Medical Imaging', tagColor: '#FAD6A5' },
  { name: 'Breast Cancer', organ: 'Breast', model: 'breast.glb', tag: 'Medical Imaging', tagColor: '#FAD6A5' },
  { name: "Alzheimer's (MRI)", organ: 'Human brain', model: 'brain.glb', tag: 'Medical Imaging', tagColor: '#FAD6A5' },
  { name: 'Kidney Disease', organ: 'Kidney', model: 'kidney.glb', tag: 'Extended', tagColor: '#7A9E8B' },
  { name: 'Liver Disease', organ: 'Liver', model: 'Liver.glb', tag: 'Extended', tagColor: '#7A9E8B' },
  { name: 'Pneumonia & Malaria', organ: 'Lungs', model: 'Lungs.glb', tag: 'Medical Imaging', tagColor: '#FAD6A5' },
  { name: 'Skin Disease', organ: 'Skin', model: 'skin.glb', tag: 'Medical Imaging', tagColor: '#FAD6A5' },
];

const PALETTE = {
  charcoal: 0x30434a,
  dusty: 0x8aafc0,
  sage: 0x7a9e8b,
  tuscan: 0xfad6a5,
  offwhite: 0xfaf9f6,
};
const MAX_PIXEL_RATIO = 1.75;
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function LandingPage() {
  // ──────────────────────────────────────────────────────────────────
  // STATE
  // ──────────────────────────────────────────────────────────────────
  const [splashProgress, setSplashProgress] = useState(0);
  const [splashStatus, setSplashStatus] = useState('Initializing secure workspace...');
  const [showMain, setShowMain] = useState(false);
  
  const [activeDiag, setActiveDiag] = useState('alzheimers');
  const [activeRole, setActiveRole] = useState('patient');
  const [diagSpecs, setDiagSpecs] = useState({
    category: 'NEUROLOGICAL MODEL', title: "Alzheimer's Disease Detection", accuracy: '98.2%',
    input: 'Volumetric MRI & Biomarkers', arch: 'DenseNet-121 + XGBoost', latency: '140 ms / batch', alert: 'Automated Email & EHR Sync'
  });

  const [mlStep, setMlStep] = useState(6);
  const [adminStatus, setAdminStatus] = useState(null);
  const [bpm, setBpm] = useState(72);

  // ──────────────────────────────────────────────────────────────────
  // REFS
  // ──────────────────────────────────────────────────────────────────
  const stageRef = useRef(null);
  const viewerRef = useRef(null);
  const modelGridRef = useRef(null);
  const targetBpmRef = useRef(72);

  // ──────────────────────────────────────────────────────────────────
  // SPLASH SCREEN
  // ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const msgs = [
      { at: 15, text: 'Initializing secure workspace...' },
      { at: 45, text: 'Connecting clinical telemetry...' },
      { at: 75, text: 'Calibrating 3D engine...' },
      { at: 95, text: 'Ready.' },
    ];
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 5) + 3;
      if (currentProgress > 100) currentProgress = 100;
      setSplashProgress(currentProgress);
      
      const cur = msgs.slice().reverse().find(m => currentProgress >= m.at);
      if (cur) setSplashStatus(cur.text);
      
      if (currentProgress >= 100) {
        clearInterval(interval);
        setTimeout(() => setShowMain(true), 300);
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  // ──────────────────────────────────────────────────────────────────
  // EYE TRACKING ENGINE
  // ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showMain || !stageRef.current) return;
    const W = 578, H = 432;
    const CHARACTERS = [
      { id: 'patient', src: '/models/patient.png', alt: 'Patient', cutY: 0.41 * H, pivotX: 290, iris: 5.0, eyes: [{ x: 269.4, y: 108.8, rx: 8.8, ry: 6.1 }, { x: 309.4, y: 108.8, rx: 8.8, ry: 6.1 }] },
      { id: 'doctor', src: '/models/doctor.png', alt: 'Doctor', cutY: 0.40 * H, pivotX: 289, iris: 6.6, eyes: [{ x: 264.5, y: 112.5, rx: 11.0, ry: 7.2 }, { x: 314.5, y: 112.5, rx: 11.0, ry: 7.2 }] },
      { id: 'student', src: '/models/student.png', alt: 'Medical student', cutY: 0.44 * H, pivotX: 292, iris: 6.5, eyes: [{ x: 265.3, y: 127.5, rx: 10.3, ry: 7.5 }, { x: 312.9, y: 127.2, rx: 10.3, ry: 7.5 }] }
    ];

    const NS = 'http://www.w3.org/2000/svg';
    const stage = stageRef.current;
    
    function svgEl(tag, attrs, parent) {
      const el = document.createElementNS(NS, tag);
      for (const k in attrs) el.setAttribute(k, attrs[k]);
      if (parent) parent.appendChild(el);
      return el;
    }

    function buildEye(svg, defs, cfg, iris, key) {
      const { x, y, rx, ry } = cfg;
      const sg = svgEl('radialGradient', { id: `sg-${key}`, cx: '50%', cy: '55%', r: '60%' }, defs);
      svgEl('stop', { offset: '0', 'stop-color': '#FAF9F6' }, sg);
      svgEl('stop', { offset: '.7', 'stop-color': '#eceae4' }, sg);
      svgEl('stop', { offset: '1', 'stop-color': '#d2cec6' }, sg);

      const lg = svgEl('linearGradient', { id: `lid-${key}`, x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
      svgEl('stop', { offset: '0', 'stop-color': '#30434A', 'stop-opacity': '.38' }, lg);
      svgEl('stop', { offset: '.55', 'stop-color': '#30434A', 'stop-opacity': '0' }, lg);

      const ig = svgEl('radialGradient', { id: `ig-${key}`, cx: '50%', cy: '50%', r: '50%' }, defs);
      svgEl('stop', { offset: '0', 'stop-color': '#1a2327' }, ig);
      svgEl('stop', { offset: '.55', 'stop-color': '#30434A' }, ig);
      svgEl('stop', { offset: '.88', 'stop-color': '#4a6068' }, ig);
      svgEl('stop', { offset: '1', 'stop-color': '#202a2e' }, ig);

      const cp = svgEl('clipPath', { id: `cp-${key}` }, defs);
      svgEl('ellipse', { cx: x, cy: y, rx, ry }, cp);

      const g = svgEl('g', { 'clip-path': `url(#cp-${key})` }, svg);
      svgEl('ellipse', { cx: x, cy: y, rx, ry, fill: `url(#sg-${key})` }, g);

      const mover = svgEl('g', {}, g);
      svgEl('circle', { cx: x, cy: y, r: iris, fill: `url(#ig-${key})` }, mover);
      svgEl('circle', { cx: x, cy: y, r: iris * 0.5, fill: '#0c1012' }, mover);
      const hl = svgEl('circle', { cx: x + iris * 0.32, cy: y - iris * 0.34, r: iris * 0.22, fill: '#FAF9F6', opacity: '.94' }, mover);
      svgEl('ellipse', { cx: x, cy: y, rx, ry, fill: `url(#lid-${key})` }, g);

      return { mover, cfg, hl };
    }

    const actors = CHARACTERS.map(c => {
      const box = document.createElement('div');
      box.className = `char ${c.id}`;
      box.innerHTML = `
        <div class="body"><img src="${c.src}" alt="${c.alt}" draggable="false"></div>
        <div class="head"><img src="${c.src}" alt="" aria-hidden="true" draggable="false"></div>`;

      const head = box.querySelector('.head');
      head.style.transformOrigin = `${(c.pivotX / W * 100).toFixed(2)}% ${(c.cutY / H * 100).toFixed(2)}%`;

      const svg = svgEl('svg', { class: 'eyes', viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' });
      const defs = svgEl('defs', {}, svg);
      const eyes = c.eyes.map((e, i) => buildEye(svg, defs, e, c.iris, `${c.id}${i}`));
      head.appendChild(svg);
      
      // Ensure we don't duplicate if strict mode runs twice
      if (!stage.querySelector(`.char.${c.id}`)) {
        stage.appendChild(box);
      }

      return {
        c, box, head, eyes, img: box.querySelector('.body img'),
        gx: 0, gy: 0, tilt: 0, lift: 0,
        phase: Math.random() * 6.28
      };
    });

    const canTrack = window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !prefersReducedMotion;
    const MAX_TILT = 3.6;
    const IDLE_AFTER = 2000;
    const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2, last: -1e9 };

    function applyPose(a, gx, gy, tilt, lift) {
      for (const e of a.eyes) {
        const { rx, ry } = e.cfg;
        const dx = gx * rx * 0.44, dy = gy * ry * 0.36;
        e.mover.setAttribute('transform', `translate(${dx.toFixed(2)} ${dy.toFixed(2)})`);
        e.hl.setAttribute('transform', `translate(${(-dx * 0.55).toFixed(2)} ${(-dy * 0.55).toFixed(2)})`);
      }
      a.head.style.transform = `translate(${(tilt * 0.28).toFixed(2)}px, ${lift.toFixed(2)}px) rotate(${tilt.toFixed(2)}deg)`;
    }

    actors.forEach(a => applyPose(a, 0, 0, 0, 0));

    let reqId;
    if (canTrack) {
      const onPointerMove = e => {
        mouse.x = e.clientX;
        mouse.y = e.clientY;
        mouse.last = performance.now();
      };
      const onPointerLeave = () => { mouse.last = -1e9; };

      window.addEventListener('pointermove', onPointerMove, { passive: true });
      document.addEventListener('pointerleave', onPointerLeave);

      let prev = performance.now();
      const frame = (now) => {
        const dt = Math.min(0.05, (now - prev) / 1000);
        prev = now;
        const t = now / 1000;
        const idle = now - mouse.last > IDLE_AFTER;

        for (const a of actors) {
          const r = a.img.getBoundingClientRect();
          const eyeX = r.left + (a.c.pivotX / W) * r.width;
          const eyeY = r.top + (a.c.eyes[0].y / H) * r.height;

          let tgx, tgy, ttilt, tlift;
          if (idle) {
            tgx = Math.sin(t * 0.52 + a.phase) * 0.5;
            tgy = Math.sin(t * 0.4 + a.phase * 1.6) * 0.28;
            ttilt = Math.sin(t * 0.35 + a.phase) * 0.9;
            tlift = 0;
          } else {
            const dx = mouse.x - eyeX;
            const dy = mouse.y - eyeY;
            const R = Math.max(200, r.width * 0.85);
            let vx = dx / R, vy = dy / R;
            const len = Math.hypot(vx, vy);
            if (len > 1) { vx /= len; vy /= len; }
            tgx = vx;
            tgy = vy;
            ttilt = Math.max(-1, Math.min(1, dx / (window.innerWidth * 0.5))) * MAX_TILT;
            tlift = Math.max(-1, Math.min(1, dy / (window.innerHeight * 0.5))) * 1.5;
          }

          const ke = 1 - Math.exp(-dt * 9.5);
          const kh = 1 - Math.exp(-dt * 3.4);
          a.gx += (tgx - a.gx) * ke;
          a.gy += (tgy - a.gy) * ke;
          a.tilt += (ttilt - a.tilt) * kh;
          a.lift += (tlift - a.lift) * kh;

          applyPose(a, a.gx, a.gy, a.tilt, a.lift);
          a.box.style.setProperty('--bob', (Math.sin(t * 0.95 + a.phase) * 1.3).toFixed(2) + 'px');
        }
        reqId = requestAnimationFrame(frame);
      };
      reqId = requestAnimationFrame(frame);

      return () => {
        window.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerleave', onPointerLeave);
        cancelAnimationFrame(reqId);
        actors.forEach(a => {
          if (a.box.parentNode) a.box.parentNode.removeChild(a.box);
        });
      };
    }
  }, [showMain]);

  // ──────────────────────────────────────────────────────────────────
  // 3D ORGAN VIEWER & MODEL GRID
  // ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!showMain || !viewerRef.current || !modelGridRef.current) return;
    
    // 1. Build the grid
    const grid = modelGridRef.current;
    grid.innerHTML = MODULES.map((m, i) => `
      <button type="button" class="mv-model-card" data-organ-trigger data-model="${MODEL_BASE}${m.model}" data-label="${m.organ} — ${m.name}" data-callout-title="${m.organ}" data-callout-desc="3D anatomical model for ${m.name} (${m.tag})." ${m.default ? 'data-default="true"' : ''} aria-pressed="false">
        <span class="mv-model-card__tag" style="color: ${m.tagColor}">${m.tag}</span>
        <span class="mv-model-card__name">${m.name}</span>
        <span class="mv-model-card__organ">${m.organ}</span>
      </button>
    `).join('');

    // 2. Setup 3D Viewer
    const root = viewerRef.current;
    const stage = root.querySelector('[data-organ-stage]');
    const bar = root.querySelector('[data-organ-bar]');
    let renderer, scene, camera, controls, heartPivot;
    let animationId;
    let currentModel = null;
    let isHeart = false;
    let initialCamPos = null;
    let initialTarget = null;
    const clock = new THREE.Clock();

    const initViewer = () => {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
      renderer.setSize(stage.clientWidth, stage.clientHeight, false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      stage.appendChild(renderer.domElement);

      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(38, stage.clientWidth / stage.clientHeight, 0.01, 1000);
      camera.position.set(0, 0, 3);

      heartPivot = new THREE.Group();
      scene.add(heartPivot);

      scene.add(new THREE.HemisphereLight(PALETTE.offwhite, PALETTE.charcoal, 0.9));
      const key = new THREE.DirectionalLight(PALETTE.offwhite, 1.45);
      key.position.set(2.5, 3.2, 2.6);
      scene.add(key);
      const rim = new THREE.DirectionalLight(PALETTE.dusty, 0.85);
      rim.position.set(-3, 1.2, -2.4);
      scene.add(rim);
      const warm = new THREE.DirectionalLight(PALETTE.tuscan, 0.4);
      warm.position.set(1.8, -2.4, 1.2);
      scene.add(warm);

      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.08;
      controls.enablePan = false;
      controls.autoRotate = !prefersReducedMotion;
      controls.autoRotateSpeed = 0.7;

      const resizeObserver = new ResizeObserver(() => {
        if (!renderer) return;
        const { clientWidth: w, clientHeight: h } = stage;
        if (!w || !h) return;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      });
      resizeObserver.observe(stage);

      const animate = () => {
        animationId = requestAnimationFrame(animate);
        const elapsed = clock.getElapsedTime();
        controls.update();
        
        if (heartPivot && currentModel && !prefersReducedMotion) {
          if (isHeart) {
            const period = 60 / Math.max(30, Math.min(180, targetBpmRef.current));
            const phase = (elapsed % period) / period;
            const bump = (c, w) => Math.exp(-((phase - c) ** 2) / (2 * w * w));
            const beat = 0.055 * bump(0.12, 0.045) + 0.028 * bump(0.32, 0.055);
            const sx = 1 + beat;
            const sy = 1 + beat * 1.15;
            heartPivot.scale.set(sx, sy, sx);
            heartPivot.position.y = Math.sin(elapsed * 0.7) * 0.015;
          } else {
            heartPivot.scale.setScalar(1);
            heartPivot.position.y = Math.sin(elapsed * 0.6) * 0.02;
          }
        }
        renderer.render(scene, camera);
      };
      animate();
    };

    const clearModel = () => {
      if (!currentModel) return;
      heartPivot.remove(currentModel);
      currentModel.traverse((child) => {
        if (!child.isMesh) return;
        child.geometry?.dispose();
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => {
          if (!m) return;
          Object.values(m).forEach((v) => { if (v && v.isTexture) v.dispose(); });
          m.dispose();
        });
      });
      currentModel = null;
    };

    const loadModel = (url) => {
      if (!renderer) initViewer();
      isHeart = /heart\.(glb|gltf|stl)(\?|$)/i.test(url);
      
      root.dataset.organState = 'loading';
      if (bar) { bar.style.width = '0%'; bar.dataset.active = 'true'; }

      const draco = new DRACOLoader();
      draco.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/libs/draco/gltf/');
      const loader = new GLTFLoader();
      loader.setDRACOLoader(draco);

      const onProgress = (e) => {
        if (e.total && bar) bar.style.width = `${Math.round((e.loaded / e.total) * 100)}%`;
      };

      const settle = (object) => {
        clearModel();
        currentModel = object;
        heartPivot.add(currentModel);
        heartPivot.scale.setScalar(1);
        heartPivot.position.set(0, 0, 0);

        const box = new THREE.Box3().setFromObject(currentModel);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        currentModel.position.sub(center);

        const radius = Math.max(size.x, size.y, size.z) * 0.5 || 1;
        const distance = (radius / Math.sin(THREE.MathUtils.degToRad(camera.fov) / 2)) * 1.15;

        camera.position.set(0, radius * 0.12, distance);
        camera.near = distance * 0.02;
        camera.far = distance * 12;
        camera.updateProjectionMatrix();

        controls.target.set(0, 0, 0);
        controls.minDistance = distance * 0.45;
        controls.maxDistance = distance * 2.2;
        controls.update();

        initialCamPos = camera.position.clone();
        initialTarget = controls.target.clone();

        root.dataset.organState = 'ready';
        if (bar) { bar.style.width = '0%'; bar.dataset.active = 'false'; }
      };

      const ext = url.split('.').pop().toLowerCase().split('?')[0];
      if (ext === 'stl') {
        const stlLoader = new STLLoader();
        stlLoader.load(url, (geometry) => {
          geometry.computeVertexNormals();
          const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
            color: PALETTE.dusty, roughness: 0.55, metalness: 0.06, emissive: PALETTE.charcoal, emissiveIntensity: 0.12
          }));
          const wrapper = new THREE.Group();
          wrapper.add(mesh);
          settle(wrapper);
        }, onProgress);
      } else {
        loader.load(url, (gltf) => settle(gltf.scene), onProgress);
      }
    };

    const triggers = Array.from(grid.querySelectorAll('[data-organ-trigger]'));
    
    const activate = (trigger) => {
      triggers.forEach((t) => t.setAttribute('aria-pressed', String(t === trigger)));
      loadModel(trigger.dataset.model);

      const titleEl = document.getElementById('calloutTitle');
      const descEl = document.getElementById('calloutDesc');
      if (titleEl && trigger.dataset.calloutTitle) titleEl.textContent = trigger.dataset.calloutTitle;
      if (descEl && trigger.dataset.calloutDesc) descEl.textContent = trigger.dataset.calloutDesc;
    };

    triggers.forEach((trigger) => {
      trigger.addEventListener('click', () => {
        activate(trigger);
        if (!root.dataset.organSeen) root.dataset.organSeen = 'true';
        root.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'center' });
      });
    });

    // Autoload default
    const preferred = triggers.find((t) => t.dataset.default === 'true') || triggers[0];
    const once = new IntersectionObserver(([entry], observer) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      root.dataset.organSeen = 'true';
      if (preferred) activate(preferred);
    }, { threshold: 0.25 });
    once.observe(root);

    // Reset & BPM
    const resetBtn = root.querySelector('[data-organ-reset]');
    if (resetBtn) resetBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (initialCamPos) camera.position.copy(initialCamPos);
      if (initialTarget) controls.target.copy(initialTarget);
      controls.update();
      heartPivot.scale.setScalar(1);
      heartPivot.position.set(0, 0, 0);
    });

    const bpmSlider = document.getElementById('bpmRangeSlider');
    if (bpmSlider) {
      bpmSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10) || 72;
        setBpm(val);
        targetBpmRef.current = val;
      });
    }

    return () => {
      cancelAnimationFrame(animationId);
      if (renderer) {
        renderer.dispose();
        if (stage.contains(renderer.domElement)) stage.removeChild(renderer.domElement);
      }
    };
  }, [showMain]);

  // ──────────────────────────────────────────────────────────────────
  // INTERACTIVE UI HANDLERS
  // ──────────────────────────────────────────────────────────────────
  const handleDiagClick = (diag, category, title, accuracy, input, arch, latency, alert) => {
    setActiveDiag(diag);
    setDiagSpecs({ category, title, accuracy, input, arch, latency, alert });
  };

  const handleAdminApproval = (isApproved) => {
    if (isApproved) {
      setAdminStatus({ type: 'success', text: 'Consultation Approved Successfully' });
    } else {
      setAdminStatus({ type: 'rejected', text: 'Request Rejected' });
    }
    setTimeout(() => setAdminStatus(null), 3000);
  };

  const advancePipelineDemo = () => {
    setMlStep((prev) => (prev >= 10 ? 1 : prev + 1));
  };

  const renderPipelineNodes = () => {
    const nodes = [];
    for (let i = 1; i <= 10; i++) {
      nodes.push(
        <button 
          key={i} 
          className={`mv-stepper__node ${i < mlStep ? 'done' : ''} ${i === mlStep ? 'active' : ''}`}
        >
          {i}
        </button>
      );
    }
    return nodes;
  };

  const getPipelineContent = () => {
    if (mlStep === 7) return { title: 'Step 7: Automated Machine Learning (AutoML)', badge: 'Training Active', chips: ['Bayesian Opt', '5-Fold CV', 'Top AUC: 0.992'] };
    if (mlStep === 8) return { title: 'Step 8: Model Evaluation', badge: 'Evaluating', chips: ['Precision: 0.98', 'Recall: 0.97', 'F1 Score: 0.975'] };
    if (mlStep === 9) return { title: 'Step 9: Model Export', badge: 'Saving', chips: ['ONNX Format', 'Quantized', 'Ready for Edge'] };
    if (mlStep === 10) return { title: 'Step 10: Federated Simulation', badge: 'Deploying', chips: ['3 Clients', 'FedAvg', 'Privacy Preserved'] };
    return { title: `Step ${mlStep}: Pipeline Active`, badge: 'In Progress', chips: ['Processing', 'Running...'] };
  };

  const pipelineInfo = getPipelineContent();

  return (
    <>
      {/* SPLASH SCREEN */}
      {!showMain && (
        <div id="splashScreen" className="splash-screen">
          <div className="splash-glow glow-1"></div>
          <div className="splash-glow glow-2"></div>
          <div className="splash-content">
            <div className="splash-logo-wrapper">
              <div className="pulse-ring ring-1"></div>
              <div className="pulse-ring ring-2"></div>
              <div className="logo-box">
                <img src="/models/logo_fix.png" alt="MedVisor Logo" className="splash-logo" />
              </div>
            </div>
            <div className="splash-brand">
              <h1 className="splash-title">Med<span className="highlight-tuscan">Visor</span></h1>
              <p className="splash-tagline">INTELLIGENT HEALTHCARE SOLUTIONS</p>
            </div>
            <div className="ecg-container">
              <svg className="ecg-svg" viewBox="0 0 300 40" preserveAspectRatio="none">
                <path className="ecg-bg-line" d="M0,20 L60,20 L75,8 L90,32 L105,12 L120,28 L135,20 L300,20" />
                <path className="ecg-pulse-line" d="M0,20 L60,20 L75,8 L90,32 L105,12 L120,28 L135,20 L300,20" />
              </svg>
            </div>
            <div className="splash-loader-area">
              <div className="splash-progress-track">
                <div className="splash-progress-bar" style={{ width: `${splashProgress}%` }}></div>
              </div>
              <div className="splash-status">
                <span>{splashStatus}</span>
                <span>{splashProgress}%</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTENT */}
      <div id="mainContent" className={`main-content ${showMain ? 'visible' : ''}`}>
        
        {/* NAVBAR */}
        <header className="mv-navbar">
          <nav className="mv-navbar__inner">
            <div className="mv-nav-capsule">
              <a href="#ecosystem" className="mv-nav-link active">Platform</a>
              <a href="#diagnostics" className="mv-nav-link">AI Diagnostics</a>
              <a href="#roles" className="mv-nav-link">Roles</a>
              <a href="#anatomy" className="mv-nav-link">3D Anatomy</a>
              <a href="#team" className="mv-nav-link">Team</a>
            </div>
            <div className="mv-nav-cta-wrap">
              <Link to="/login" className="mv-launch-btn">
                <span>Launch</span>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </nav>
        </header>

        {/* HERO */}
        <section id="home" className="hero-section">
          <div className="hero-content">
            <span className="hero-eyebrow"><span className="eyebrow-dot"></span> Intelligent Healthcare Platform</span>
            <h1 className="hero-heading">Better Decisions. Better <span className="hero-highlight">Patient Care.</span></h1>
            <p className="hero-tagline">MedVisor connects patients, doctors, and students in real time with clinical AI diagnostics and unified workflows.</p>
            <div className="hero-cta-group">
              <a href="#ecosystem" className="cta-primary">Get Started &rarr;</a>
              <a href="#diagnostics" className="cta-ghost">Watch Overview</a>
            </div>
          </div>

          <div className="stage-wrapper">
            <div className="stage" id="stage" ref={stageRef}>
              <div className="stage-backdrop"></div>
              <div className="stage-pedestal"></div>
              
              <a href="#roles" className="floating-badge badge-patient-pos">
                <div className="badge-icon-box">👤</div>
                <div className="badge-meta">
                  <span className="badge-role">Patient Portal <span className="badge-status-dot"></span></span>
                  <span className="badge-desc">Clear treatment pathway</span>
                </div>
              </a>
              <a href="#roles" className="floating-badge badge-doctor-pos">
                <div className="badge-icon-box">🩺</div>
                <div className="badge-meta">
                  <span className="badge-role">Lead Physician <span className="badge-status-dot"></span></span>
                  <span className="badge-desc">Real-time clinical insights</span>
                </div>
              </a>
              <a href="#roles" className="floating-badge badge-student-pos">
                <div className="badge-icon-box">📚</div>
                <div className="badge-meta">
                  <span className="badge-role">Medical Student <span className="badge-status-dot"></span></span>
                  <span className="badge-desc">Interactive residency cases</span>
                </div>
              </a>
            </div>
          </div>
        </section>

        {/* ECOSYSTEM */}
        <section id="ecosystem" className="mv-section mv-ecosystem">
          <div className="mv-container">
            <div className="mv-section-header">
              <h2 className="mv-section-title">Two Specialized Interfaces.<br/>One Unified Platform.</h2>
              <p className="mv-section-subtitle">Frontline clinical delivery and computational biomedical research running in tandem.</p>
            </div>

            <div className="eco-stage">
              <div className="eco-char eco-char--doctor">
                <img src="/models/doctor_transparent.png" alt="Doctor character pointing at clinical interface card" />
              </div>

              <div className="eco-card eco-card--dark" onClick={() => window.location.hash = '#roles'}>
                <div className="eco-card__header">
                  <div className="eco-card__chips">
                    <span className="eco-chip eco-chip--green"><span className="eco-chip__dot eco-chip__dot--green"></span>CLINICAL SUITE</span>
                    <span className="eco-chip eco-chip--ghost">HIPAA Verified</span>
                  </div>
                  <div className="eco-card__icon eco-card__icon--sage">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/><circle cx="12" cy="12" r="2"/></svg>
                  </div>
                </div>
                <h3 className="eco-card__title">Professional Care<br/>Interface</h3>
                <p className="eco-card__desc">Patient telemetry &amp; clinical AI diagnostics for frontline care delivery.</p>
                <ul className="eco-card__features">
                  <li><span className="eco-feat-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg></span>Patient Portal &amp; Telehealth</li>
                  <li><span className="eco-feat-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg></span>Doctor AI Diagnostics</li>
                  <li><span className="eco-feat-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg></span>Admin Approval Queue</li>
                </ul>
                <div className="eco-card__footer">
                  <Link to="/login" className="eco-signin-btn eco-signin-btn--light">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                    Sign In to Clinical Suite
                  </Link>
                  <div className="eco-card__status"><span className="eco-pulse eco-pulse--green"></span>3 Roles Online</div>
                </div>
              </div>

              <div className="eco-card eco-card--light" onClick={() => window.location.hash = '#roles'}>
                <div className="eco-card__header">
                  <div className="eco-card__chips">
                    <span className="eco-chip eco-chip--blue"><span className="eco-chip__dot eco-chip__dot--blue"></span>RESEARCH LAB</span>
                    <span className="eco-chip eco-chip--ghost-dark">AutoML &amp; WebGL</span>
                  </div>
                  <div className="eco-card__icon eco-card__icon--dusty">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 2v7.31M14 9.3V1.99M8.5 2h7M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.52 16h12.96"/></svg>
                  </div>
                </div>
                <h3 className="eco-card__title eco-card__title--dark">Educational<br/>Research Hub</h3>
                <p className="eco-card__desc eco-card__desc--dark">End-to-end ML training &amp; 3D organ exploration for biomedical research.</p>
                <ul className="eco-card__features eco-card__features--dark">
                  <li><span className="eco-feat-icon eco-feat-icon--dark"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg></span>10-Step ML Workbench</li>
                  <li><span className="eco-feat-icon eco-feat-icon--dark"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg></span>Interactive 3D Heart Studio</li>
                  <li><span className="eco-feat-icon eco-feat-icon--dark"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg></span>Federated Learning Sim</li>
                </ul>
                <div className="eco-card__footer eco-card__footer--dark">
                  <Link to="/login" className="eco-signin-btn eco-signin-btn--dark">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                    Sign In to Research Hub
                  </Link>
                  <div className="eco-card__status eco-card__status--dark"><span className="eco-pulse eco-pulse--blue"></span>10 Stages Ready</div>
                </div>
              </div>

              <div className="eco-char eco-char--student">
                <img src="/models/student_transparent.png" alt="Medical student pointing at research hub card" />
              </div>
            </div>
          </div>
        </section>

        {/* DIAGNOSTICS */}
        <section id="diagnostics" className="mv-section mv-diagnostics">
          <div className="mv-container">
            <div className="mv-section-header">
              <span className="mv-section-badge">AI CLINICAL DIAGNOSTICS</span>
              <h2 className="mv-section-title">Predictive Biomarker &amp; Imaging Console</h2>
              <p className="mv-section-subtitle">Select any model to trigger real-time neural inference telemetry.</p>
            </div>

            <div className="mv-diag-pills">
              <button className={`mv-diag-pill ${activeDiag === 'alzheimers' ? 'active' : ''}`} onClick={() => handleDiagClick('alzheimers', 'NEUROLOGICAL MODEL', "Alzheimer's Disease Detection", '98.2%', 'Volumetric MRI & Biomarkers', 'DenseNet-121 + XGBoost', '140 ms / batch', 'Automated Email & EHR Sync')}>Alzheimer's Early Risk <strong className="mv-diag-pill__acc">98.2%</strong></button>
              <button className={`mv-diag-pill ${activeDiag === 'tumor' ? 'active' : ''}`} onClick={() => handleDiagClick('tumor', 'ONCOLOGY MODEL', 'Brain Tumor Profiling', '99.1%', 'T1-Weighted MRI', 'VGG16 + Fine-Tuning', '210 ms / batch', 'Oncology Team Alert')}>Brain Tumor Profiling <strong className="mv-diag-pill__acc">99.1%</strong></button>
              <button className={`mv-diag-pill ${activeDiag === 'breast_cancer' ? 'active' : ''}`} onClick={() => handleDiagClick('breast_cancer', 'ONCOLOGY MODEL', 'Breast Malignancy', '97.8%', 'Histopathology Slides', 'ResNet-50', '180 ms / batch', 'Pathology Sync')}>Breast Malignancy <strong className="mv-diag-pill__acc">97.8%</strong></button>
              <button className={`mv-diag-pill ${activeDiag === 'parkinsons' ? 'active' : ''}`} onClick={() => handleDiagClick('parkinsons', 'NEUROLOGICAL MODEL', "Parkinson's Motor", '96.4%', 'Voice Biomarkers', 'XGBoost', '85 ms / batch', 'Neurology Queue')}>Parkinson's Motor <strong className="mv-diag-pill__acc">96.4%</strong></button>
              <button className={`mv-diag-pill ${activeDiag === 'diabetes' ? 'active' : ''}`} onClick={() => handleDiagClick('diabetes', 'METABOLIC MODEL', 'Diabetes & Glucose', '98.9%', 'EHR Tabular Data', 'Random Forest', '45 ms / batch', 'Endocrine Alert')}>Diabetes &amp; Glucose <strong className="mv-diag-pill__acc">98.9%</strong></button>
            </div>

            <div className="mv-diag-console">
              <div className="mv-diag-console__header">
                <div>
                  <span className="mv-diag-console__category">{diagSpecs.category}</span>
                  <h3 className="mv-diag-console__title">{diagSpecs.title}</h3>
                </div>
                <div className="mv-diag-console__meta">
                  <div className="mv-diag-console__stat">
                    <span className="mv-diag-console__stat-val">{diagSpecs.accuracy}</span>
                    <span className="mv-diag-console__stat-lbl">Accuracy</span>
                  </div>
                  <div className="mv-diag-console__live">
                    <span className="mv-live-dot"></span>
                    <span>Inference Online</span>
                  </div>
                </div>
              </div>

              <div className="mv-diag-visual">
                {/* ALZHEIMERS */}
                <div className={`mv-drp-screen ${activeDiag === 'alzheimers' ? 'active' : ''}`}>
                  <div className="mv-diag-layout">
                    <div className="mv-radar">
                      <div className="mv-radar__circle rc-1"></div>
                      <div className="mv-radar__circle rc-2"></div>
                      <div className="mv-radar__circle rc-3"></div>
                      <div className="mv-radar__sweep"></div>
                      <div className="mv-radar__blip blip-1"></div>
                      <div className="mv-radar__blip blip-2"></div>
                    </div>
                    <div className="mv-gauges">
                      <div className="mv-gauge">
                        <span className="mv-gauge__lbl">Hippocampal Atrophy</span>
                        <strong className="mv-gauge__val mv-gauge__val--red">87% High Risk</strong>
                        <div className="mv-gauge__bar"><div className="mv-gauge__fill mv-gauge__fill--red" style={{ width: '87%' }}></div></div>
                      </div>
                      <div className="mv-gauge">
                        <span className="mv-gauge__lbl">Biomarker Severity</span>
                        <strong className="mv-gauge__val mv-gauge__val--yellow">Stage II Alert</strong>
                        <div className="mv-gauge__bar"><div className="mv-gauge__fill mv-gauge__fill--yellow" style={{ width: '65%' }}></div></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* TUMOR */}
                <div className={`mv-drp-screen ${activeDiag === 'tumor' ? 'active' : ''}`}>
                  <div className="mv-diag-layout">
                    <div className="mv-mri">
                      <div className="mv-mri__grid">
                        <div className="mv-mri__bar" style={{ height: '25%' }}></div>
                        <div className="mv-mri__bar" style={{ height: '45%' }}></div>
                        <div className="mv-mri__bar" style={{ height: '85%' }}></div>
                        <div className="mv-mri__bar mv-mri__bar--alert" style={{ height: '100%' }}></div>
                        <div className="mv-mri__bar mv-mri__bar--alert" style={{ height: '92%' }}></div>
                        <div className="mv-mri__bar" style={{ height: '60%' }}></div>
                        <div className="mv-mri__bar" style={{ height: '35%' }}></div>
                        <div className="mv-mri__bar" style={{ height: '15%' }}></div>
                      </div>
                      <div className="mv-mri__target">ROI #04 Anomaly</div>
                    </div>
                    <div className="mv-gauges">
                      <div className="mv-gauge">
                        <span className="mv-gauge__lbl">Lesion Volume</span>
                        <strong className="mv-gauge__val mv-gauge__val--yellow">2.8 cm³</strong>
                        <div className="mv-gauge__bar"><div className="mv-gauge__fill mv-gauge__fill--yellow" style={{ width: '58%' }}></div></div>
                      </div>
                      <div className="mv-gauge">
                        <span className="mv-gauge__lbl">Confidence Rate</span>
                        <strong className="mv-gauge__val mv-gauge__val--green">99.1% High</strong>
                        <div className="mv-gauge__bar"><div className="mv-gauge__fill mv-gauge__fill--green" style={{ width: '99%' }}></div></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* BREAST */}
                <div className={`mv-drp-screen ${activeDiag === 'breast_cancer' ? 'active' : ''}`}>
                  <div className="mv-diag-layout">
                    <div className="mv-histo">
                      <div className="mv-histo__ring mv-histo__ring--1"></div>
                      <div className="mv-histo__ring mv-histo__ring--2"></div>
                      <div className="mv-histo__nodes">
                        <div className="mv-histo__node cn-1"></div>
                        <div className="mv-histo__node cn-2"></div>
                        <div className="mv-histo__node cn-3"></div>
                      </div>
                    </div>
                    <div className="mv-gauges">
                      <div className="mv-gauge">
                        <span className="mv-gauge__lbl">Cell Morphology</span>
                        <strong className="mv-gauge__val mv-gauge__val--green">Benign Structure</strong>
                        <div className="mv-gauge__bar"><div className="mv-gauge__fill mv-gauge__fill--green" style={{ width: '94%' }}></div></div>
                      </div>
                      <div className="mv-gauge">
                        <span className="mv-gauge__lbl">Perimeter Uniformity</span>
                        <strong className="mv-gauge__val mv-gauge__val--green">97.8% Regular</strong>
                        <div className="mv-gauge__bar"><div className="mv-gauge__fill mv-gauge__fill--green" style={{ width: '97%' }}></div></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PARKINSONS */}
                <div className={`mv-drp-screen ${activeDiag === 'parkinsons' ? 'active' : ''}`}>
                  <div className="mv-diag-layout">
                    <div className="mv-audio">
                      <div className="mv-audio__bar f1"></div>
                      <div className="mv-audio__bar f2"></div>
                      <div className="mv-audio__bar f3"></div>
                      <div className="mv-audio__bar f4"></div>
                      <div className="mv-audio__bar f5"></div>
                      <div className="mv-audio__bar f6"></div>
                      <div className="mv-audio__bar f7"></div>
                      <div className="mv-audio__bar f8"></div>
                    </div>
                    <div className="mv-gauges">
                      <div className="mv-gauge">
                        <span className="mv-gauge__lbl">Resting Tremor Peak</span>
                        <strong className="mv-gauge__val mv-gauge__val--yellow">5.4 Hz Band</strong>
                        <div className="mv-gauge__bar"><div className="mv-gauge__fill mv-gauge__fill--yellow" style={{ width: '62%' }}></div></div>
                      </div>
                      <div className="mv-gauge">
                        <span className="mv-gauge__lbl">Gait Telemetry</span>
                        <strong className="mv-gauge__val mv-gauge__val--yellow">62% Moderate</strong>
                        <div className="mv-gauge__bar"><div className="mv-gauge__fill mv-gauge__fill--yellow" style={{ width: '62%' }}></div></div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* DIABETES */}
                <div className={`mv-drp-screen ${activeDiag === 'diabetes' ? 'active' : ''}`}>
                  <div className="mv-diag-layout">
                    <div className="mv-glucose">
                      <div className="mv-glucose__track">
                        <div className="mv-glucose__fill"></div>
                      </div>
                      <div className="mv-glucose__threshold">Critical Threshold: 180 mg/dL</div>
                    </div>
                    <div className="mv-gauges">
                      <div className="mv-gauge">
                        <span className="mv-gauge__lbl">Fasting Level</span>
                        <strong className="mv-gauge__val mv-gauge__val--red">214 mg/dL Spike</strong>
                        <div className="mv-gauge__bar"><div className="mv-gauge__fill mv-gauge__fill--red" style={{ width: '88%' }}></div></div>
                      </div>
                      <div className="mv-gauge">
                        <span className="mv-gauge__lbl">Auto-Dispatch</span>
                        <strong className="mv-gauge__val mv-gauge__val--red">Email Triggered</strong>
                        <div className="mv-gauge__bar"><div className="mv-gauge__fill mv-gauge__fill--red" style={{ width: '100%' }}></div></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mv-diag-strip">
                <div className="mv-diag-strip__item"><span className="mv-diag-strip__lbl">MODALITY</span><strong className="mv-diag-strip__val">{diagSpecs.input}</strong></div>
                <div className="mv-diag-strip__item"><span className="mv-diag-strip__lbl">ARCHITECTURE</span><strong className="mv-diag-strip__val">{diagSpecs.arch}</strong></div>
                <div className="mv-diag-strip__item"><span className="mv-diag-strip__lbl">LATENCY</span><strong className="mv-diag-strip__val">{diagSpecs.latency}</strong></div>
                <div className="mv-diag-strip__item"><span className="mv-diag-strip__lbl">DISPATCH</span><strong className="mv-diag-strip__val">{diagSpecs.alert}</strong></div>
              </div>
            </div>
          </div>
        </section>

        {/* ROLES */}
        <section id="roles" className="mv-section mv-roles">
          <div className="mv-container">
            <div className="mv-section-header">
              <span className="mv-section-badge">UNIFIED ROLE WORKSTATIONS</span>
              <h2 className="mv-section-title">Interactive Stakeholder Command Hub</h2>
              <p className="mv-section-subtitle">Toggle through real platform interfaces tailored for patient care, clinical diagnosis, governance, and ML research.</p>
            </div>

            <div className="mv-role-tabs">
              <button className={`mv-role-tab ${activeRole === 'patient' ? 'active' : ''}`} onClick={() => setActiveRole('patient')}>Patient Portal</button>
              <button className={`mv-role-tab ${activeRole === 'doctor' ? 'active' : ''}`} onClick={() => setActiveRole('doctor')}>Doctor Workstation</button>
              <button className={`mv-role-tab ${activeRole === 'admin' ? 'active' : ''}`} onClick={() => setActiveRole('admin')}>Admin Governance</button>
              <button className={`mv-role-tab ${activeRole === 'researcher' ? 'active' : ''}`} onClick={() => setActiveRole('researcher')}>ML Researcher Hub</button>
            </div>

            <div className="mv-role-panels">
              {/* PATIENT */}
              {activeRole === 'patient' && (
                <div className="mv-role-panel active">
                  <div className="mv-role-layout">
                    <div className="mv-role-side">
                      <span className="mv-role-side__badge">PATIENT WORKSPACE</span>
                      <h3 className="mv-role-side__title">Frictionless Healthcare Access</h3>
                      <div className="mv-role-side__list">
                        <div className="mv-role-pill">1-Click Self-Scheduling &amp; Instant Sync</div>
                        <div className="mv-role-pill">Encrypted HD Video Telehealth Room</div>
                        <div className="mv-role-pill">Longitudinal Medical History Log</div>
                      </div>
                      <Link to="/login" className="mv-role-action">Create Patient Account &rarr;</Link>
                    </div>
                    <div className="mv-role-sim">
                      <div className="mv-sim">
                        <div className="mv-sim__header">
                          <div className="mv-sim__dots"><span className="mv-sim__dot mv-sim__dot--red"></span><span className="mv-sim__dot mv-sim__dot--yellow"></span><span className="mv-sim__dot mv-sim__dot--green"></span></div>
                          <span className="mv-sim__title">Patient Portal • Active Consultation</span>
                          <span className="mv-sim__chip mv-sim__chip--live">Verified Session</span>
                        </div>
                        <div className="mv-sim__body">
                          <div className="mv-sim__subcard">
                            <div className="mv-sim__head">
                              <strong>Upcoming Cardiology Telehealth</strong>
                              <span className="mv-sim__badge mv-sim__badge--green">Unlocked &amp; Ready</span>
                            </div>
                            <div className="mv-sim__doctor">
                              <div className="mv-sim__avatar">SK</div>
                              <div><strong>Dr. Sarah Khan, MD</strong><span>Cardiology • 10:30 AM Tomorrow</span></div>
                            </div>
                            <button className="mv-sim__cta">Enter Encrypted Video Room</button>
                          </div>
                          <div className="mv-sim__stats">
                            <div className="mv-sim__stat"><span className="mv-sim__stat-val">3</span><span className="mv-sim__stat-lbl">Prescriptions</span></div>
                            <div className="mv-sim__stat"><span className="mv-sim__stat-val">2</span><span className="mv-sim__stat-lbl">Lab Reports</span></div>
                            <div className="mv-sim__stat"><span className="mv-sim__stat-val mv-sim__stat-val--green">Active</span><span className="mv-sim__stat-lbl">Doctor Sync</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* DOCTOR */}
              {activeRole === 'doctor' && (
                <div className="mv-role-panel active">
                  <div className="mv-role-layout">
                    <div className="mv-role-side">
                      <span className="mv-role-side__badge">PHYSICIAN STATION</span>
                      <h3 className="mv-role-side__title">Diagnostic Telemetry &amp; Alerts</h3>
                      <div className="mv-role-side__list">
                        <div className="mv-role-pill">AI Disease Risk Inference &amp; Telemetry</div>
                        <div className="mv-role-pill">1-Click Emergency Email Dispatch</div>
                        <div className="mv-role-pill">Patient Directory &amp; History Lookup</div>
                      </div>
                      <Link to="/login" className="mv-role-action">Doctor Portal Sign In &rarr;</Link>
                    </div>
                    <div className="mv-role-sim">
                      <div className="mv-sim">
                        <div className="mv-sim__header">
                          <div className="mv-sim__dots"><span className="mv-sim__dot mv-sim__dot--red"></span><span className="mv-sim__dot mv-sim__dot--yellow"></span><span className="mv-sim__dot mv-sim__dot--green"></span></div>
                          <span className="mv-sim__title">Physician Station • Dr. S. Khan</span>
                          <span className="mv-sim__chip mv-sim__chip--red">Risk Detected</span>
                        </div>
                        <div className="mv-sim__body">
                          <div className="mv-sim__subcard mv-sim__subcard--alert">
                            <div className="mv-sim__head">
                              <strong>Patient #104 Diagnostic Alert</strong>
                              <span className="mv-sim__badge mv-sim__badge--red">Critical Glucose Spike</span>
                            </div>
                            <div className="mv-sim__chips">
                              <span className="mv-sim__chip-sm">Glucose: 214 mg/dL</span>
                              <span className="mv-sim__chip-sm">HbA1c: 8.9%</span>
                              <span className="mv-sim__chip-sm">Confidence: 98.9%</span>
                            </div>
                            <button className="mv-sim__cta mv-sim__cta--red">Dispatch Emergency Alert</button>
                          </div>
                          <div className="mv-sim__list">
                            <div className="mv-sim__item"><span>John Doe (#104)</span><span className="mv-sim__tag mv-sim__tag--red">Action Req</span></div>
                            <div className="mv-sim__item"><span>Elena Rostova (#105)</span><span className="mv-sim__tag mv-sim__tag--green">Stable</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ADMIN */}
              {activeRole === 'admin' && (
                <div className="mv-role-panel active">
                  <div className="mv-role-layout">
                    <div className="mv-role-side">
                      <span className="mv-role-side__badge">GOVERNANCE PANEL</span>
                      <h3 className="mv-role-side__title">Approval Queue &amp; Oversight</h3>
                      <div className="mv-role-side__list">
                        <div className="mv-role-pill">Physician Appointment Queue Moderation</div>
                        <div className="mv-role-pill">Strict Role Visibility Enforcement</div>
                        <div className="mv-role-pill">Whole-System Uptime &amp; Audit Logs</div>
                      </div>
                      <Link to="/login" className="mv-role-action">Admin Control Sign In &rarr;</Link>
                    </div>
                    <div className="mv-role-sim">
                      <div className="mv-sim">
                        <div className="mv-sim__header">
                          <div className="mv-sim__dots"><span className="mv-sim__dot mv-sim__dot--red"></span><span className="mv-sim__dot mv-sim__dot--yellow"></span><span className="mv-sim__dot mv-sim__dot--green"></span></div>
                          <span className="mv-sim__title">Admin Console • Governance Queue</span>
                          <span className="mv-sim__chip mv-sim__chip--yellow">1 Pending</span>
                        </div>
                        <div className="mv-sim__body">
                          <div className="mv-sim__subcard">
                            <div className="mv-sim__head">
                              <strong>Slot Request #840</strong>
                              <span className="mv-sim__badge mv-sim__badge--yellow">Pending Approval</span>
                            </div>
                            <div className="mv-sim__detail">
                              <div><strong>Physician:</strong> Dr. Sarah Khan (Cardiology)</div>
                              <div><strong>Patient:</strong> John Doe (#104) • Tomorrow 10:30 AM</div>
                            </div>
                            <div className="mv-sim__split">
                              <button className="mv-sim__cta mv-sim__cta--green" onClick={() => handleAdminApproval(true)}>Approve Consultation</button>
                              <button className="mv-sim__cta mv-sim__cta--red-ghost" onClick={() => handleAdminApproval(false)}>Reject</button>
                            </div>
                            {adminStatus && (
                              <div className={`mv-sim__feedback mv-sim__feedback--${adminStatus.type}`}>
                                {adminStatus.text}
                              </div>
                            )}
                          </div>
                          <div className="mv-sim__stats">
                            <div className="mv-sim__stat"><span className="mv-sim__stat-val mv-sim__stat-val--green">99.98%</span><span className="mv-sim__stat-lbl">Uptime</span></div>
                            <div className="mv-sim__stat"><span className="mv-sim__stat-val">12</span><span className="mv-sim__stat-lbl">Active Rooms</span></div>
                            <div className="mv-sim__stat"><span className="mv-sim__stat-val mv-sim__stat-val--green">0</span><span className="mv-sim__stat-lbl">Audit Flags</span></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* RESEARCHER */}
              {activeRole === 'researcher' && (
                <div className="mv-role-panel active">
                  <div className="mv-role-layout">
                    <div className="mv-role-side">
                      <span className="mv-role-side__badge">RESEARCH WORKBENCH</span>
                      <h3 className="mv-role-side__title">10-Step ML Pipeline</h3>
                      <div className="mv-role-side__list">
                        <div className="mv-role-pill">CSV Ingest &rarr; AutoML &rarr; Model Export</div>
                        <div className="mv-role-pill">Bayesian Hyperparameter Optimization</div>
                        <div className="mv-role-pill">Multi-Node Federated Learning Simulation</div>
                      </div>
                      <Link to="/login" className="mv-role-action">Launch ML Workbench &rarr;</Link>
                    </div>
                    <div className="mv-role-sim">
                      <div className="mv-sim">
                        <div className="mv-sim__header">
                          <div className="mv-sim__dots"><span className="mv-sim__dot mv-sim__dot--red"></span><span className="mv-sim__dot mv-sim__dot--yellow"></span><span className="mv-sim__dot mv-sim__dot--green"></span></div>
                          <span className="mv-sim__title">ML Pipeline Visualizer</span>
                          <span className="mv-sim__chip mv-sim__chip--blue">Step {mlStep} of 10</span>
                        </div>
                        <div className="mv-sim__body">
                          <div className="mv-stepper">{renderPipelineNodes()}</div>
                          <div className="mv-sim__subcard">
                            <div className="mv-sim__head">
                              <strong>{pipelineInfo.title}</strong>
                              <span className="mv-sim__badge mv-sim__badge--green">{pipelineInfo.badge}</span>
                            </div>
                            <div className="mv-sim__chips">
                              {pipelineInfo.chips.map((c, i) => <span key={i} className="mv-sim__chip-sm">{c}</span>)}
                            </div>
                            <button className="mv-sim__cta" onClick={advancePipelineDemo}>Advance to Next Step</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 3D ANATOMY */}
        <section id="anatomy" className="mv-section mv-anatomy">
          <div className="mv-container">
            <div className="mv-section-header">
              <span className="mv-section-badge">EDUCATIONAL 3D MODULE</span>
              <h2 className="mv-section-title">Interactive 3D Human Anatomy Studio</h2>
              <p className="mv-section-subtitle">Select any disease module below to load its anatomical model — orbit 360°, zoom, and observe the live cardiac rhythm.</p>
            </div>

            <div className="mv-viewer-card" ref={viewerRef} data-organ-state="idle" data-autoload="true">
              <div className="mv-viewer-card__topbar">
                <div className="mv-viewer-card__meta">
                  <span className="mv-live-dot"></span>
                  <strong>WebGL 3D Engine &bull; Human Anatomy Viewer</strong>
                </div>
                <div className="mv-viewer-card__status" id="sceneBpmStatus">
                  {bpm} BPM • {bpm < 60 ? 'Bradycardia Pace' : bpm > 100 ? 'Tachycardia Rhythm' : 'Sinus Rhythm'}
                </div>
              </div>

              <div className="mv-viewer-card__canvas">
                <span className="mv-organ__bar" data-organ-bar aria-hidden="true"></span>
                <div className="mv-organ__stage" data-organ-stage>
                  <p className="mv-organ__empty">Select a prediction module below to load its anatomical model.</p>
                </div>
                <div className="mv-viewer-card__hint">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><path d="m4.93 4.93 4.24 4.24" /><path d="m14.83 9.17 4.24-4.24" /></svg>
                  <span>Click &amp; Drag to Rotate • Scroll to Zoom</span>
                </div>
              </div>

              <div className="mv-viewer-card__console">
                <div className="mv-bpm-widget" hidden={!/heart/.test(MODULES.find(m => m.default)?.model || '')}>
                  <div className="mv-bpm-widget__header">
                    <span>Heart Rate Controller:</span>
                    <strong id="bpmCounter">{bpm} BPM</strong>
                  </div>
                  <input 
                    type="range" 
                    id="bpmRangeSlider" 
                    min="40" 
                    max="160" 
                    value={bpm} 
                    onChange={(e) => setBpm(parseInt(e.target.value, 10))}
                    className="mv-bpm-slider" 
                  />
                  <div className="mv-bpm-widget__scale">
                    <span>40 (Rest)</span><span>72 (Normal)</span><span>160 (Peak)</span>
                  </div>
                </div>
                <div className="mv-callout">
                  <div className="mv-callout__head">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8AAFC0" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
                    <strong id="calloutTitle">Human Heart</strong>
                  </div>
                  <p id="calloutDesc">Four-chambered neuromuscular pump circulating ~5 L/min through systemic &amp; pulmonary loops.</p>
                </div>
                <div className="mv-viewer-card__reset">
                  <button type="button" className="mv-reset-btn" data-organ-reset>Reset 3D View</button>
                </div>
              </div>
            </div>

            <div className="mv-models">
              <div className="mv-models__head">
                <span className="mv-models__label">Disease Prediction Modules</span>
                <span className="mv-models__hint">Click any card to load its model</span>
              </div>
              <div className="mv-models__grid" id="modelGrid" ref={modelGridRef}></div>
            </div>
          </div>
        </section>

        {/* TEAM */}
        <section id="team" className="mv-section mv-team">
          <div className="mv-container">
            <div className="mv-team__header">
              <span className="mv-team__eyebrow">Final Year Project Team</span>
              <h2 className="mv-team__title">Developed By</h2>
              <p className="mv-team__subtitle">Meet the team behind MedVisor</p>
            </div>
            <div className="mv-team__grid">
              <div className="mv-team__card">
                <div className="mv-team__avatar mv-team__avatar--sage-dusty">AA</div>
                <p className="mv-team__name">Aliha Asif</p>
                <p className="mv-team__id">FA23-BSE-092</p>
              </div>
              <div className="mv-team__card">
                <div className="mv-team__avatar mv-team__avatar--dusty-tuscan">AA</div>
                <p className="mv-team__name">Arham Arif</p>
                <p className="mv-team__id">FA23-BSE-113</p>
              </div>
              <div className="mv-team__card">
                <div className="mv-team__avatar mv-team__avatar--tuscan-sage">AA</div>
                <p className="mv-team__name">Ariba Amir</p>
                <p className="mv-team__id">FA23-BSE-138</p>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="site-footer">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="footer-logo-row">
                <span className="footer-logo-badge">
                  <img src="/models/logo_fix.png" alt="MedVisor Logo" />
                </span>
                <span className="brand-text">Med<span className="brand-accent">Visor</span></span>
              </div>
              <p>Integrated healthcare and computational biomedical exploration platform.</p>
              <div className="footer-trust-badges">
                <div className="ft-badge">HIPAA Compliant</div>
                <div className="ft-badge">256-Bit Encrypted</div>
                <div className="ft-badge">HL7 FHIR Ready</div>
              </div>
            </div>

            <div className="footer-links">
              <h4>Navigation</h4>
              <a href="#home">Home Overview</a>
              <a href="#ecosystem">Platform Ecosystem</a>
              <a href="#diagnostics">AI Diagnostics</a>
              <a href="#roles">Role Portals</a>
              <a href="#anatomy">3D Anatomy Lab</a>
            </div>

            <div className="footer-links">
              <h4>Clinical &amp; ML</h4>
              <a href="#diagnostics">Alzheimer's Detection</a>
              <a href="#diagnostics">Brain Tumor Profiling</a>
              <a href="#diagnostics">Metabolic Screening</a>
              <a href="#roles">10-Step ML Pipeline</a>
            </div>
          </div>

          <div className="footer-bottom">
            <div className="footer-bottom-inner">
              <p>&copy; {new Date().getFullYear()} MedVisor FYP Healthcare Platform. All rights reserved.</p>
              <div className="footer-legal-links">
                <a href="#">Privacy</a>
                <a href="#">Terms</a>
                <a href="#">Security</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}