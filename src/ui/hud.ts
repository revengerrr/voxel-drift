// commit: feat(ui): retro pixel HUD — minimap, inventory grid, drone panel, resource bars
// description: Complete HUD overhaul with 8-bit retro pixel aesthetic. Features:
// - Radar-style minimap (top-left) showing planetoids and player position
// - Inventory grid with visual slots and item icons (bottom-center)
// - Drone fleet panel (left) with status, battery bars, cargo
// - Resource bars (bottom) with horizontal fill indicators
// - Retro crosshair + mining progress bar
// - Score display (top-right) with pixel font styling

import { ResourceType, DroneState } from "../ecs/components";
import {
  isTargetingBlock,
  targetBlockType,
  miningProgress,
  getInventorySummary,
} from "../ecs/systems/MiningSystem";
import { getScoreSnapshot } from "../ecs/systems/ScoreSystem";
import { players, drones, planetoids } from "../ecs/world";

// ─── Retro Pixel Styles ──────────────────────────────────────

function injectPixelStyles(): void {
  const style = document.createElement("style");
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

    .pxf { font-family: 'Press Start 2P', 'Courier New', monospace; image-rendering: pixelated; }

    .pxb {
      background: rgba(0,0,0,0.85);
      border: 3px solid #4ade80;
      box-shadow: inset 0 0 0 1px #000, 0 0 0 1px #000, 0 0 12px rgba(74,222,128,0.15);
    }
    .pxb-a { border-color: #fbbf24; box-shadow: inset 0 0 0 1px #000, 0 0 0 1px #000, 0 0 12px rgba(251,191,36,0.15); }
    .pxb-c { border-color: #22d3ee; box-shadow: inset 0 0 0 1px #000, 0 0 0 1px #000, 0 0 12px rgba(34,211,238,0.15); }

    .pxl { font-size:7px; letter-spacing:1px; text-transform:uppercase; opacity:0.8; }
    .pxv { font-size:9px; color:#e4e4e7; }

    .pxbar { height:6px; background:#1a1a2e; border:1px solid #333; }
    .pxfill { height:100%; transition:width 0.15s linear; }

    .inv-s {
      width:36px; height:36px; background:rgba(0,0,0,0.6);
      border:2px solid #333; display:flex; align-items:center;
      justify-content:center; position:relative;
    }
    .inv-s.has { border-color:#4ade80; }
    .inv-s .cnt { position:absolute; bottom:1px; right:2px; font-size:6px; color:#fff; }

    .dr-e { display:flex; align-items:center; gap:6px; padding:4px 6px; border-bottom:1px solid rgba(74,222,128,0.1); }

    .scanl::after {
      content:''; position:absolute; inset:0; pointer-events:none;
      background:repeating-linear-gradient(0deg,transparent 0px,transparent 2px,rgba(0,0,0,0.08) 2px,rgba(0,0,0,0.08) 4px);
    }
  `;
  document.head.appendChild(style);
}

// ─── Config ───────────────────────────────────────────────────

const BLOCK_NAMES: Record<number, string> = { 1:"STONE", 2:"ORE", 3:"CRYSTAL", 4:"BIO", 5:"ROCK", 6:"MOSS" };
const RES_NAMES: Record<ResourceType, string> = { [ResourceType.Ore]:"ORE", [ResourceType.Crystal]:"CRYS", [ResourceType.BioMatter]:"BIO", [ResourceType.Energy]:"NRG" };
const RES_COLORS: Record<ResourceType, string> = { [ResourceType.Ore]:"#cd7f32", [ResourceType.Crystal]:"#a78bfa", [ResourceType.BioMatter]:"#4ade80", [ResourceType.Energy]:"#fbbf24" };
const RES_ICONS: Record<ResourceType, string> = { [ResourceType.Ore]:"⬡", [ResourceType.Crystal]:"◆", [ResourceType.BioMatter]:"✦", [ResourceType.Energy]:"⚡" };
const DRONE_COLORS: Record<string, string> = { [DroneState.Idle]:"#71717a", [DroneState.Executing]:"#4ade80", [DroneState.Returning]:"#22d3ee", [DroneState.Charging]:"#fbbf24", [DroneState.Error]:"#ef4444" };
const RES_ORDER = [ResourceType.Ore, ResourceType.Crystal, ResourceType.BioMatter, ResourceType.Energy];

// ─── DOM Refs ─────────────────────────────────────────────────

let mmapCtx: CanvasRenderingContext2D;
let invGrid: HTMLDivElement;
let droneP: HTMLDivElement;
let resBars: HTMLDivElement;
let scoreD: HTMLDivElement;
let crossD: HTMLDivElement;
let mineD: HTMLDivElement;

// ─── Init ─────────────────────────────────────────────────────

export function initHUD(): void {
  const ov = document.getElementById("ui-overlay");
  if (!ov) return;
  injectPixelStyles();

  // Minimap
  const mm = el("div", "pxb scanl", "position:fixed;top:16px;left:16px;padding:6px;z-index:20;pointer-events:auto;");
  mm.innerHTML = `<div class="pxf pxl" style="color:#4ade80;margin-bottom:4px;">RADAR</div>`;
  const cv = document.createElement("canvas");
  cv.width = 120; cv.height = 120;
  cv.style.cssText = "width:120px;height:120px;display:block;image-rendering:pixelated;border:2px solid #4ade80;";
  mmapCtx = cv.getContext("2d")!;
  mm.appendChild(cv); ov.appendChild(mm);

  // Score
  scoreD = el("div", "pxb pxb-a pxf scanl", "position:fixed;top:16px;right:16px;padding:8px 12px;z-index:20;pointer-events:auto;min-width:140px;text-align:right;");
  ov.appendChild(scoreD);

  // Drone panel
  droneP = el("div", "pxb pxb-c pxf scanl", "position:fixed;top:180px;left:16px;padding:8px;z-index:20;pointer-events:auto;min-width:150px;max-height:200px;overflow-y:auto;");
  ov.appendChild(droneP);

  // Inventory
  const iw = el("div", "pxb pxf", "position:fixed;bottom:16px;left:50%;transform:translateX(-50%);padding:8px;z-index:20;pointer-events:auto;");
  iw.innerHTML = `<div class="pxl" style="color:#4ade80;margin-bottom:6px;text-align:center;">INVENTORY</div>`;
  invGrid = el("div", "", "display:flex;gap:3px;flex-wrap:wrap;max-width:260px;justify-content:center;");
  iw.appendChild(invGrid); ov.appendChild(iw);

  // Resource bars
  resBars = el("div", "pxf", "position:fixed;bottom:90px;left:16px;z-index:20;pointer-events:auto;display:flex;flex-direction:column;gap:6px;min-width:160px;");
  ov.appendChild(resBars);

  // Crosshair
  crossD = el("div", "", "position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);pointer-events:none;z-index:20;");
  crossD.innerHTML = `<div style="position:relative;width:20px;height:20px;">
    <div id="cx1" style="position:absolute;top:0;left:9px;width:2px;height:7px;background:#4ade80;"></div>
    <div id="cx2" style="position:absolute;bottom:0;left:9px;width:2px;height:7px;background:#4ade80;"></div>
    <div id="cx3" style="position:absolute;top:9px;left:0;width:7px;height:2px;background:#4ade80;"></div>
    <div id="cx4" style="position:absolute;top:9px;right:0;width:7px;height:2px;background:#4ade80;"></div>
    <div style="position:absolute;top:9px;left:9px;width:2px;height:2px;background:#4ade80;opacity:0.4;"></div>
  </div>`;
  ov.appendChild(crossD);

  // Mining indicator
  mineD = el("div", "pxf", "position:fixed;top:calc(50% + 24px);left:50%;transform:translateX(-50%);pointer-events:none;z-index:20;text-align:center;opacity:0;transition:opacity 0.1s;");
  ov.appendChild(mineD);

  // Controls hint
  const ch = el("div", "pxf", "position:fixed;bottom:16px;right:16px;z-index:20;pointer-events:none;font-size:6px;color:rgba(74,222,128,0.35);text-align:right;line-height:1.8;transition:opacity 5s ease;");
  ch.innerHTML = "WASD - MOVE<br>MOUSE - LOOK<br>E - MINE<br>SPACE - JUMP";
  ov.appendChild(ch);
  setTimeout(() => { ch.style.opacity = "0"; }, 10000);
}

function el(tag: string, cls: string, css: string): HTMLDivElement {
  const e = document.createElement(tag) as HTMLDivElement;
  if (cls) e.className = cls;
  e.style.cssText = css;
  return e;
}

// ─── Update ───────────────────────────────────────────────────

export function updateHUD(): void {
  updMinimap(); updScore(); updDrones(); updInv(); updRes(); updCross(); updMine();
}

function updMinimap(): void {
  if (!mmapCtx) return;
  const c = mmapCtx, w = 120, h = 120, cx = 60, cy = 60;
  c.fillStyle = "#0a0a1a"; c.fillRect(0, 0, w, h);

  // Grid
  c.strokeStyle = "rgba(74,222,128,0.1)"; c.lineWidth = 1;
  for (let i = 0; i < w; i += 20) {
    c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke();
    c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke();
  }

  // Sweep
  const sw = (Date.now() / 2000) % (Math.PI * 2);
  c.strokeStyle = "rgba(74,222,128,0.3)"; c.beginPath();
  c.moveTo(cx, cy); c.lineTo(cx + Math.cos(sw) * 60, cy + Math.sin(sw) * 60); c.stroke();

  // Rings
  c.strokeStyle = "rgba(74,222,128,0.15)";
  for (const r of [20, 40, 55]) { c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke(); }

  const pl = players.entities[0];
  if (!pl?.transform) return;
  const pp = pl.transform.position;
  const sc = 0.8;

  // Planets
  for (const p of planetoids.entities) {
    if (!p.transform || !p.gravityField) continue;
    const dx = (p.transform.position.x - pp.x) * sc, dz = (p.transform.position.z - pp.z) * sc;
    const px = cx + dx, py = cy + dz;
    if (px < -5 || px > w + 5 || py < -5 || py > h + 5) continue;
    const r = Math.max(3, p.gravityField.radius * sc * 0.15);
    c.fillStyle = "rgba(74,222,128,0.05)"; c.beginPath(); c.arc(px, py, r * 3, 0, Math.PI * 2); c.fill();
    c.fillStyle = "#4ade80"; c.fillRect(Math.floor(px - r), Math.floor(py - r), r * 2, r * 2);
  }

  // Drones
  for (const d of drones.entities) {
    if (!d.transform) continue;
    const dx = (d.transform.position.x - pp.x) * sc, dz = (d.transform.position.z - pp.z) * sc;
    c.fillStyle = "#22d3ee"; c.fillRect(Math.floor(cx + dx - 1), Math.floor(cy + dz - 1), 3, 3);
  }

  // Player blink
  if (Math.sin(Date.now() / 200) > 0) { c.fillStyle = "#fbbf24"; c.fillRect(cx - 2, cy - 2, 4, 4); }

  // Corners
  c.fillStyle = "#4ade80";
  c.fillRect(0, 0, 6, 2); c.fillRect(0, 0, 2, 6);
  c.fillRect(w - 6, 0, 6, 2); c.fillRect(w - 2, 0, 2, 6);
  c.fillRect(0, h - 2, 6, 2); c.fillRect(0, h - 6, 2, 6);
  c.fillRect(w - 6, h - 2, 6, 2); c.fillRect(w - 2, h - 6, 2, 6);
}

function updScore(): void {
  const s = getScoreSnapshot();
  if (!s) { scoreD.innerHTML = `<div class="pxl" style="color:#fbbf24;">SCORE</div><div class="pxv" style="font-size:12px;margin-top:4px;">0</div>`; return; }
  const m = Math.floor(s.elapsedTime / 60), sec = Math.floor(s.elapsedTime % 60);
  scoreD.innerHTML = `
    <div class="pxl" style="color:#fbbf24;">SCORE</div>
    <div style="font-size:14px;color:#fbbf24;margin:4px 0;">${s.totalScore}</div>
    <div style="height:2px;margin:4px 0;background:repeating-linear-gradient(90deg,#fbbf24 0px,#fbbf24 4px,transparent 4px,transparent 8px);opacity:0.4;"></div>
    <div style="font-size:6px;color:#a1a1aa;line-height:1.8;">TIME ${m}:${sec.toString().padStart(2,"0")}<br>AUTO ${Math.round(s.automationRatio * 100)}%<br>DRONES ${s.activeDrones}<br>PLANETS ${s.planetsExplored}</div>`;
}

function updDrones(): void {
  const dl = drones.entities;
  if (dl.length === 0) { droneP.innerHTML = `<div class="pxl" style="color:#22d3ee;">FLEET</div><div style="font-size:6px;color:#52525b;margin-top:6px;line-height:1.6;">NO DRONES<br>DEPLOYED</div>`; return; }
  let h = `<div class="pxl" style="color:#22d3ee;margin-bottom:6px;">FLEET (${dl.length})</div>`;
  for (const e of dl) {
    if (!e.drone) continue;
    const d = e.drone, sc = DRONE_COLORS[d.state] ?? "#71717a";
    const bc = d.battery > 50 ? "#4ade80" : d.battery > 20 ? "#fbbf24" : "#ef4444";
    let ct = 0; d.cargo.forEach((v: number) => (ct += v));
    h += `<div class="dr-e"><div style="width:6px;height:6px;flex-shrink:0;background:${sc};"></div><div style="flex:1;"><div style="font-size:7px;color:#e4e4e7;">${d.droneId}</div><div style="font-size:5px;color:${sc};text-transform:uppercase;">${d.state}</div><div class="pxbar" style="margin-top:2px;"><div class="pxfill" style="width:${d.battery}%;background:${bc};"></div></div><div style="font-size:5px;color:#71717a;margin-top:1px;">BAT ${Math.round(d.battery)}% | CARGO ${ct}/${d.maxCargo}</div></div></div>`;
  }
  droneP.innerHTML = h;
}

function updInv(): void {
  const inv = getInventorySummary();
  let h = "", si = 0;
  for (const t of RES_ORDER) {
    const a = inv.get(t) ?? 0;
    if (a > 0) { h += `<div class="inv-s has" style="border-color:${RES_COLORS[t]};"><span style="font-size:14px;color:${RES_COLORS[t]};">${RES_ICONS[t]}</span><span class="cnt pxf">${a}</span></div>`; si++; }
  }
  for (let i = si; i < 8; i++) h += `<div class="inv-s"><span style="font-size:8px;color:#27272a;">·</span></div>`;
  invGrid.innerHTML = h;
}

function updRes(): void {
  const inv = getInventorySummary();
  let h = "", any = false;
  for (const t of RES_ORDER) {
    const a = inv.get(t) ?? 0; if (a > 0) any = true;
    const p = Math.min(100, a);
    h += `<div style="display:flex;align-items:center;gap:6px;"><span style="font-size:6px;color:${RES_COLORS[t]};min-width:28px;">${RES_NAMES[t]}</span><div class="pxbar" style="flex:1;border-color:${a > 0 ? RES_COLORS[t] : '#333'}44;"><div class="pxfill" style="width:${p}%;background:${RES_COLORS[t]};"></div></div><span style="font-size:7px;color:#a1a1aa;min-width:24px;text-align:right;">${a}</span></div>`;
  }
  if (!any) h = `<div style="font-size:6px;color:rgba(74,222,128,0.25);">PRESS E TO MINE</div>`;
  resBars.innerHTML = h;
}

function updCross(): void {
  const c = isTargetingBlock ? "#fbbf24" : "#4ade80";
  ["cx1","cx2","cx3","cx4"].forEach(id => {
    const e = document.getElementById(id);
    if (e) e.style.background = c;
  });
}

function updMine(): void {
  if (isTargetingBlock) {
    mineD.style.opacity = "1";
    mineD.innerHTML = `<div style="font-size:7px;color:#fbbf24;margin-bottom:4px;">[E] ${BLOCK_NAMES[targetBlockType] ?? "???"}</div><div class="pxbar" style="width:80px;margin:0 auto;border-color:#fbbf2444;"><div class="pxfill" style="width:${Math.round(miningProgress * 100)}%;background:#fbbf24;"></div></div>`;
  } else { mineD.style.opacity = "0"; }
}
