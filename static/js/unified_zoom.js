/**
 * Unified Canvas Mouse Wheel Zoom & Drag-to-Pan Controller
 */
(function () {
  let scale = 1.0;
  let panX = 0;
  let panY = 0;
  let isPanning = false;
  let startMouseX = 0;
  let startMouseY = 0;
  let startPanX = 0;
  let startPanY = 0;

  const MIN_SCALE = 0.5;
  const MAX_SCALE = 5.0;

  function updateTransform() {
    const img = document.getElementById('main-frame-img');
    if (!img) return;

    img.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    img.style.transformOrigin = 'center center';

    if (window.SvgOverlay?.syncSvgToImage) {
      window.SvgOverlay.syncSvgToImage();
    }

    const badgeText = document.getElementById('zoom-level-text');
    if (badgeText) {
      badgeText.textContent = `${Math.round(scale * 100)}%`;
    }
  }

  function resetZoom() {
    scale = 1.0;
    panX = 0;
    panY = 0;
    updateTransform();
  }

  function onWheel(e) {
    if (!e.target.closest('#canvas-viewport')) return;
    e.preventDefault();

    const zoomFactor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale * zoomFactor));
    if (newScale === scale) return;

    const viewport = document.getElementById('canvas-viewport');
    if (viewport) {
      const rect = viewport.getBoundingClientRect();
      const mouseX = e.clientX - (rect.left + rect.width / 2);
      const mouseY = e.clientY - (rect.top + rect.height / 2);
      const scaleRatio = newScale / scale;
      panX = mouseX - (mouseX - panX) * scaleRatio;
      panY = mouseY - (mouseY - panY) * scaleRatio;
    }

    scale = newScale;
    updateTransform();
  }

  function onMouseDown(e) {
    const isMiddle = e.button === 1;
    const isSpace = e.code === 'Space' || e.spaceKey;
    const isSelectMode = window.BoxDrawer ? window.BoxDrawer.getMode() === 'select' : true;
    const canPan = (scale > 1.05 && isSelectMode && e.button === 0) || isMiddle || isSpace;

    if (!canPan || !e.target.closest('#canvas-viewport')) return;
    isPanning = true;
    startMouseX = e.clientX;
    startMouseY = e.clientY;
    startPanX = panX;
    startPanY = panY;

    const viewport = document.getElementById('canvas-viewport');
    if (viewport) viewport.style.cursor = 'grabbing';
  }

  function onMouseMove(e) {
    if (!isPanning) return;
    panX = startPanX + (e.clientX - startMouseX);
    panY = startPanY + (e.clientY - startMouseY);
    updateTransform();
  }

  function onMouseUp() {
    if (!isPanning) return;
    isPanning = false;
    const viewport = document.getElementById('canvas-viewport');
    if (viewport) viewport.style.cursor = '';
  }

  function initZoom() {
    const viewport = document.getElementById('canvas-viewport');
    if (viewport) {
      viewport.addEventListener('wheel', onWheel, { passive: false });
      viewport.addEventListener('mousedown', onMouseDown);
      viewport.addEventListener('dblclick', (e) => {
        if (e.target.id === 'main-frame-img' || e.target.id === 'canvas-viewport' || e.target.id === 'canvas-svg-overlay') {
          resetZoom();
        }
      });
    }

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    document.addEventListener('keydown', (e) => {
      const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === '0') resetZoom();
    });

    const resetBtn = document.getElementById('btn-zoom-reset');
    if (resetBtn) resetBtn.onclick = resetZoom;
  }

  window.UnifiedZoom = {
    init: initZoom,
    resetZoom,
    getZoom: () => scale,
    getPan: () => ({ x: panX, y: panY }),
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initZoom);
  } else {
    initZoom();
  }
})();
