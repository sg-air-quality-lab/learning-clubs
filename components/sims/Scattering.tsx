'use client';

// "Inside the sensor": particles drift through a laser beam; the detector sees the sideways flashes.
// Physics lives in lib/sim/scattering.ts; this file only draws.

import { useEffect, useRef, useState } from 'react';
import { diameterGrowth, flashStrength, pm25Band, sensorReading, spawnRate } from '@/lib/sim/scattering';

interface Particle {
  x: number;
  y: number;
  /** Dry diameter in µm */
  d: number;
  vx: number;
  wobble: number;
  seen: boolean;
}

const LASER = '#e5484d';
const FLASH = '#ffcf3d';
const HISTORY = 240;

export default function Scattering() {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [haze, setHaze] = useState(80);
  const [rh, setRh] = useState(60);
  const [flashesPerSec, setFlashesPerSec] = useState(0);
  const params = useRef({ haze, rh });
  params.current = { haze, rh };

  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext('2d')!;
    let W = 0;
    let H = 0;
    let chamberH = 0;
    let colors = readColors();
    let particles: Particle[] = [];
    const signal: number[] = new Array(HISTORY).fill(0);
    const flashTimes: number[] = [];
    let spawnDebt = 0;
    let last = performance.now();
    let raf = 0;
    let visible = true;
    const slow = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0.45 : 1;

    function readColors() {
      const s = getComputedStyle(document.documentElement);
      const v = (n: string) => s.getPropertyValue(n).trim();
      return { ink: v('--ink'), ink2: v('--ink-2'), muted: v('--muted'), hair: v('--hair'), surface: v('--surface'), page: v('--page') };
    }

    function resize() {
      const w = wrap.current!.clientWidth;
      W = w;
      chamberH = Math.round(Math.min(300, Math.max(190, w * 0.48)));
      H = chamberH + 84;
      const dpr = window.devicePixelRatio || 1;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      cv.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      particles = particles.filter((p) => p.x < W);
    }

    // Chamber geometry
    const geo = () => {
      const pad = 12;
      const top = pad + 18;
      const bottom = chamberH - pad;
      const left = pad;
      const right = W - pad;
      const beamX = Math.round(left + (right - left) * 0.5);
      const det = { x: beamX + Math.min(110, (right - left) * 0.22), y: bottom - 2 };
      return { top, bottom, left, right, beamX, det };
    };

    function spawn(g: ReturnType<typeof geo>) {
      const r = Math.random();
      particles.push({
        x: g.left - 6,
        y: g.top + 14 + Math.random() * (g.bottom - g.top - 28),
        d: 0.3 + 2.2 * r * r,
        vx: (W * 0.16 + Math.random() * W * 0.06) * slow,
        wobble: Math.random() * Math.PI * 2,
        seen: false,
      });
    }

    function frame(now: number) {
      raf = requestAnimationFrame(frame);
      if (!visible) {
        last = now;
        return;
      }
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const { haze: c, rh: humidity } = params.current;
      const g = geo();
      const grow = diameterGrowth(humidity);

      spawnDebt += spawnRate(c) * dt * slow;
      while (spawnDebt >= 1 && particles.length < 220) {
        spawn(g);
        spawnDebt -= 1;
      }

      let detector = 0;
      for (const p of particles) {
        p.x += p.vx * dt;
        p.wobble += dt * 2.4;
        p.y += Math.sin(p.wobble) * 6 * dt;
        const inBeam = Math.abs(p.x - g.beamX) < 4 + p.d * grow;
        if (inBeam) {
          detector += flashStrength(p.d * grow);
          if (!p.seen) {
            p.seen = true;
            flashTimes.push(now);
          }
        }
      }
      particles = particles.filter((p) => p.x < g.right + 8);
      while (flashTimes.length && now - flashTimes[0] > 3000) flashTimes.shift();

      // The detector reacts in a split second; a short afterglow keeps each pulse visible on the graph.
      const prev = signal[signal.length - 1];
      signal.push(Math.max(detector, prev * 0.72));
      signal.shift();

      draw(g, grow);
    }

    function draw(g: ReturnType<typeof geo>, grow: number) {
      ctx.clearRect(0, 0, W, H);

      // chamber
      ctx.fillStyle = colors.surface;
      ctx.strokeStyle = colors.hair;
      ctx.lineWidth = 1;
      roundRect(g.left, g.top, g.right - g.left, g.bottom - g.top, 10);
      ctx.fill();
      ctx.stroke();

      ctx.font = '600 11px system-ui, -apple-system, "Segoe UI", sans-serif';
      ctx.fillStyle = colors.muted;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText('air in →', g.left + 8, g.top - 9);
      ctx.textAlign = 'right';
      ctx.fillText('→ fan, air out', g.right - 8, g.top - 9);

      // laser and beam
      ctx.fillStyle = colors.ink2;
      roundRect(g.beamX - 15, g.top - 16, 30, 14, 3);
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillStyle = colors.muted;
      ctx.fillText('laser', g.beamX + 38, g.top - 9);
      const grad = ctx.createLinearGradient(g.beamX - 4, 0, g.beamX + 4, 0);
      grad.addColorStop(0, 'rgba(229,72,77,0)');
      grad.addColorStop(0.5, 'rgba(229,72,77,0.55)');
      grad.addColorStop(1, 'rgba(229,72,77,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(g.beamX - 4, g.top, 8, g.bottom - g.top);
      ctx.fillStyle = LASER;
      ctx.fillRect(g.beamX - 0.75, g.top, 1.5, g.bottom - g.top);

      // detector
      ctx.save();
      ctx.translate(g.det.x, g.det.y);
      const aim = Math.atan2((g.top + g.bottom) / 2 - g.det.y, g.beamX - g.det.x);
      ctx.rotate(aim + Math.PI / 2);
      ctx.fillStyle = colors.ink2;
      roundRect(-11, -4, 22, 12, 3);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = colors.muted;
      ctx.textAlign = 'left';
      ctx.fillText('detector', g.det.x + 18, g.det.y - 4);

      // particles
      for (const p of particles) {
        const d = p.d * grow;
        const r = 1.3 + d * 2.1;
        const inBeam = Math.abs(p.x - g.beamX) < 4 + d;
        if (inBeam) {
          const s = flashStrength(d);
          const glow = 6 + s * 2.2;
          const halo = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, glow);
          halo.addColorStop(0, 'rgba(255,207,61,0.95)');
          halo.addColorStop(1, 'rgba(255,207,61,0)');
          ctx.fillStyle = halo;
          ctx.beginPath();
          ctx.arc(p.x, p.y, glow, 0, Math.PI * 2);
          ctx.fill();
          // the sideways light that reaches the detector
          ctx.strokeStyle = `rgba(255,207,61,${Math.min(0.9, 0.25 + s * 0.06)})`;
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(g.det.x, g.det.y - 4);
          ctx.stroke();
          ctx.setLineDash([]);
        }
        ctx.fillStyle = inBeam ? FLASH : colors.muted;
        ctx.globalAlpha = inBeam ? 1 : 0.75;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // detector signal
      const gTop = chamberH + 20;
      const gBottom = H - 8;
      const gLeft = 12;
      const gRight = W - 12;
      ctx.fillStyle = colors.muted;
      ctx.textAlign = 'left';
      ctx.fillText('What the detector sees (light over time)', gLeft, gTop - 10);
      ctx.strokeStyle = colors.hair;
      ctx.beginPath();
      ctx.moveTo(gLeft, gBottom);
      ctx.lineTo(gRight, gBottom);
      ctx.stroke();
      const maxSignal = 60;
      ctx.strokeStyle = FLASH;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      signal.forEach((v, i) => {
        const x = gLeft + ((gRight - gLeft) * i) / (HISTORY - 1);
        // square-root scale, so single faint flashes and a busy humid chamber both stay readable
        const y = gBottom - Math.min(1, Math.sqrt(v / maxSignal)) * (gBottom - gTop - 4);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    function roundRect(x: number, y: number, w: number, h: number, r: number) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    }

    resize();
    // Start with a chamber that is already full of air, so flashes begin right away.
    {
      const g = geo();
      const n = Math.round(spawnRate(params.current.haze) * ((g.right - g.left) / (W * 0.19)));
      for (let i = 0; i < n; i++) {
        spawn(g);
        particles[particles.length - 1].x = g.left + Math.random() * (g.right - g.left);
      }
    }
    raf = requestAnimationFrame(frame);
    const ro = new ResizeObserver(resize);
    ro.observe(wrap.current!);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting && !document.hidden));
    io.observe(cv);
    const onVis = () => (visible = !document.hidden);
    document.addEventListener('visibilitychange', onVis);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onTheme = () => (colors = readColors());
    mq.addEventListener('change', onTheme);
    const counter = setInterval(() => setFlashesPerSec(Math.round(flashTimes.length / 3)), 1000);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      mq.removeEventListener('change', onTheme);
      clearInterval(counter);
    };
  }, []);

  const reading = Math.round(sensorReading(haze, rh));

  return (
    <div className="sim">
      <div ref={wrap} className="sim-canvas">
        <canvas
          ref={canvas}
          role="img"
          aria-label={`Particles drifting through a laser beam. Real PM2.5 ${haze}, humidity ${rh} percent, sensor shows ${reading}.`}
        />
      </div>

      <div className="sim-readout" aria-live="polite">
        <div>
          <span className="tile-label">Real smoke</span>
          <span className="sim-value">
            {haze} <small>µg/m³</small>
          </span>
          <span className="tag">{pm25Band(haze)}</span>
        </div>
        <div>
          <span className="tile-label">Sensor shows</span>
          <span className="sim-value">
            {reading} <small>µg/m³</small>
          </span>
          <span className="tag">{pm25Band(reading)}</span>
        </div>
        <div>
          <span className="tile-label">Flashes / s</span>
          <span className="sim-value">{flashesPerSec}</span>
        </div>
      </div>

      <div className="sim-controls">
        <label>
          <span>
            Haze <b>{haze} µg/m³</b>
          </span>
          <input type="range" min={0} max={300} step={5} value={haze} onChange={(e) => setHaze(Number(e.target.value))} />
          <span className="range-ends">
            <span>clean</span>
            <span>very high</span>
          </span>
        </label>
        <label>
          <span>
            Humidity <b>{rh}%</b>
          </span>
          <input type="range" min={40} max={98} step={1} value={rh} onChange={(e) => setRh(Number(e.target.value))} />
          <span className="range-ends">
            <span>dry</span>
            <span>tropical rain</span>
          </span>
        </label>
      </div>
    </div>
  );
}
