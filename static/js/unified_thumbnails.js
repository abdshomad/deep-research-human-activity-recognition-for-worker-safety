/**
 * Dynamic Bounding Box Thumbnail Cropper using HTML5 Canvas
 */
(function () {
  function getBBoxCropDataUrl(imgEl, bbox) {
    if (!imgEl || !bbox || bbox.length < 4) return '';
    if (!imgEl.complete || imgEl.naturalWidth === 0) return '';
    const xmin = Math.max(0, Math.floor(bbox[0]));
    const ymin = Math.max(0, Math.floor(bbox[1]));
    const xmax = Math.min(imgEl.naturalWidth, Math.ceil(bbox[2]));
    const ymax = Math.min(imgEl.naturalHeight, Math.ceil(bbox[3]));
    const w = xmax - xmin;
    const h = ymax - ymin;
    if (w <= 0 || h <= 0) return '';

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imgEl, xmin, ymin, w, h, 0, 0, w, h);
    return canvas.toDataURL();
  }

  function updateAllDetectionThumbnails() {
    const imgEl = document.getElementById('main-frame-img');
    if (!imgEl || !imgEl.complete || imgEl.naturalWidth === 0) return;
    document.querySelectorAll('.det-item__thumb-img').forEach((thumbImg) => {
      const bboxStr = thumbImg.getAttribute('data-bbox');
      if (!bboxStr) return;
      try {
        const bbox = JSON.parse(bboxStr);
        const dataUrl = getBBoxCropDataUrl(imgEl, bbox);
        if (dataUrl) {
          thumbImg.src = dataUrl;
          thumbImg.classList.remove('det-item__thumb-img--placeholder');
        }
      } catch (e) {
        console.error('Error cropping thumbnail:', e);
      }
    });
  }

  function initSizingSelector() {
    const selector = document.getElementById('det-size-selector');
    if (!selector) return;

    // Load saved preference from localStorage
    const savedSize = localStorage.getItem('ezlab_det_thumb_size') || 'medium';
    setThumbnailsSize(savedSize);

    // Add click listeners to size buttons
    selector.querySelectorAll('.det-size-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const size = btn.getAttribute('data-size');
        setThumbnailsSize(size);
        localStorage.setItem('ezlab_det_thumb_size', size);
      });
    });
  }

  function setThumbnailsSize(size) {
    const listEl = document.getElementById('side-detections-list');
    if (listEl) {
      listEl.classList.remove('detections-list--small', 'detections-list--medium', 'detections-list--big');
      listEl.classList.add(`detections-list--${size}`);
    }

    // Update active button state
    const selector = document.getElementById('det-size-selector');
    if (selector) {
      selector.querySelectorAll('.det-size-btn').forEach((btn) => {
        const isTarget = btn.getAttribute('data-size') === size;
        btn.classList.toggle('det-size-btn--active', isTarget);
        btn.style.color = isTarget ? '#38bdf8' : '#9ca3af';
      });
    }
  }

  function initThumbnailsListener() {
    const imgEl = document.getElementById('main-frame-img');
    if (imgEl) {
      imgEl.addEventListener('load', () => {
        updateAllDetectionThumbnails();
      });
      if (imgEl.complete && imgEl.naturalWidth > 0) {
        updateAllDetectionThumbnails();
      }
    }
    initSizingSelector();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThumbnailsListener);
  } else {
    initThumbnailsListener();
  }

  window.ViewerUI = window.ViewerUI || {};
  Object.assign(window.ViewerUI, {
    getBBoxCropDataUrl,
    updateAllDetectionThumbnails
  });
})();
