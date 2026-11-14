// commands-base engine: deterministic frame-by-frame compositor.
// render.mjs calls window.renderAt(seconds) for every frame and screenshots the page.
const W = 1080, H = 1920, FPS = 30;
const pad = n => String(n).padStart(4, '0');
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const eo = t => 1 - Math.pow(1 - clamp(t), 3);                 // ease out
const eio = t => { t = clamp(t); return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
const fidx = t => Math.max(1, Math.min(CLIP.n, Math.round(t * CLIP.fps) + 1));
const FR = t => `footage/f_${pad(fidx(t))}.jpg`;   // frame
const MT = t => `footage/m_${pad(fidx(t))}.png`;   // person matte (alpha = you)
const FB = t => FACES[fidx(t) - 1];                // face box [x, y, w, h] in 1080×1920
const CHIN = Math.max(...FACES.map(b => b[1] + b[3]));   // lowest chin in the clip
function el(tag, cls, parent, css, html) { const e = document.createElement(tag); if (cls) e.className = cls; if (css) e.style.cssText = css; if (html != null) e.innerHTML = html; if (parent) parent.appendChild(e); return e; }
const pending = [], post = [];
function setSrc(img, src) { if (img._src === src) return; img._src = src; img.src = src; pending.push(img.decode().catch(() => {})); }

// person cut-out; face → keep only the head (above the chin, around the face)
function drawCut(x, f, m, face) {
  x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, W, H);
  x.drawImage(f, 0, 0, W, H);
  x.globalCompositeOperation = 'destination-in'; x.drawImage(m, 0, 0, W, H);
  if (face) {
    const [fx, fy, fw, fh] = face, fe = 40, y1 = fy + fh * 1.04, x0 = fx - fw * .32, x1 = fx + fw * 1.32;
    let g = x.createLinearGradient(0, y1, 0, y1 + fe); g.addColorStop(0, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    const a = fe / (x1 - x0 + 2 * fe);
    g = x.createLinearGradient(x0 - fe, 0, x1 + fe, 0); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(a, '#000'); g.addColorStop(1 - a, '#000'); g.addColorStop(1, 'rgba(0,0,0,0)');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
  }
  x.globalCompositeOperation = 'source-over';
}
// the clip itself
class Video { constructor(p) { this.img = el('img', 'fill', p); } set(t) { setSrc(this.img, FR(t)); } }
// you, cut out of the background. Cut(p) = whole person, Cut(p, true) = head only.
// Layer order: Video → things behind you → Cut(p) → things in front of your body → Cut(p, true) (head, always last)
class Cut {
  constructor(p, head = false) { this.head = head; this.cv = el('canvas', 'fill', p); this.cv.width = W; this.cv.height = H; this.f = new Image(); this.m = new Image(); }
  set(t) { setSrc(this.f, FR(t)); setSrc(this.m, MT(t)); const face = this.head ? FB(t) : null; post.push(() => drawCut(this.cv.getContext('2d'), this.f, this.m, face)); }
}

window.renderAt = async function (t) {
  pending.length = 0; post.length = 0;
  window.SCENE.render(t);
  await Promise.all(pending);
  for (const p of post) p();
  return Math.round(t * FPS);
};
document.fonts.ready.then(async () => { await renderAt(0); window.READY = true; }).catch(e => { window.READY_ERROR = String(e); });
