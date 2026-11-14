// Example scene (replace with the effect): clip + glass card under the chin + head always on top.
// Rules: overlays go below CHIN + 60 or behind you (between Video and Cut); the head layer is always the last child.
const stage = document.getElementById('stage');
const video = new Video(stage);
const card = el('div', 'card', stage, `top:${Math.round(CHIN + 60)}px`, '<b>RETENTION</b><span class="num"></span>');
const head = new Cut(stage, true);

window.SCENE = {
  render(t) {
    video.set(t); head.set(t);
    const p = eo((t - 0.3) / 0.45);
    card.style.opacity = p;
    card.style.transform = `translateY(${(1 - p) * 40}px) scale(${lerp(.96, 1, p)})`;
    card.querySelector('.num').textContent = Math.round(lerp(19, 67, ss(0.3, 2.2, t))) + '%';
    stage.style.transform = `scale(${1 + 0.03 * clamp(t / 3)})`;   // slow push-in
  },
};
