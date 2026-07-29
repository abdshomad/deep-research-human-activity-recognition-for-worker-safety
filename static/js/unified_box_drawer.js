(function () {
  let mode = 'select'; // 'select' | 'draw'
  let isMouseDown = false, dragStartX = 0, dragStartY = 0, dragDist = 0, point1Anchor = null;
  let drawnBoxesMap = {}; // Keyed by `${video_id}_${json_filename}`
  let tempRect = null, tempAnchorDot = null, tempText = null;

  function getFrameKey(frame) {
    const f = frame || (window.ViewerApp ? window.ViewerApp.getCurrentFrame() : null);
    return f ? `${f.video_id}_${f.json_filename}` : 'default';
  }

  function getDrawnBoxes() { return drawnBoxesMap[getFrameKey()] || []; }

  function getDefaultTargetLabel() {
    const selectEl = document.getElementById('active-draw-class-select');
    if (selectEl && selectEl.value) {
      return selectEl.value;
    }
    const targets = window.TARGETS_STR || '';
    if (targets && targets !== 'auto-detect') { const first = targets.split(',')[0].trim(); if (first) return first; }
    if (window.LabelManager && typeof window.LabelManager.getLabels === 'function') {
      const activeLabels = window.LabelManager.getLabels();
      if (activeLabels && activeLabels.length > 0) return activeLabels[0];
    }
    const pl = window.PLAYLIST_NAME || '';
    if (pl === 'fighter-jets') return 'jets';
    if (['dolphin', 'egg', 'stingray'].includes(pl)) return pl;
    return 'object';
  }

  function getStorageKey() { return `EZLAB_DRAWN_BOXES_${window.PLAYLIST_NAME || 'default'}`; }
  function saveDrawnBoxesToStorage() { try { localStorage.setItem(getStorageKey(), JSON.stringify(drawnBoxesMap)); } catch (e) {} }
  function loadDrawnBoxesFromStorage() { try { const s = localStorage.getItem(getStorageKey()); if (s) drawnBoxesMap = JSON.parse(s) || {}; } catch (e) {} }

  function initBoxDrawer() {
    loadDrawnBoxesFromStorage();
    const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
    bind('btn-mode-select', () => setMode('select')); bind('btn-mode-draw', () => setMode('draw'));
    bind('btn-segment-all-boxes', () => segmentAllDrawnBoxes()); bind('btn-popover-segment', () => segmentSelectedBox());

    const svg = document.getElementById('canvas-svg-overlay'), img = document.getElementById('main-frame-img'), viewport = document.getElementById('canvas-viewport');
    [svg, img, viewport].filter(Boolean).forEach((el) => {
      el.addEventListener('mousedown', onMouseDown);
      el.addEventListener('contextmenu', (e) => { e.preventDefault(); cancelPoint1(); });
    });
    [svg, img].filter(Boolean).forEach((el) => {
      el.addEventListener('dblclick', (e) => {
        if (e.target.tagName && !['img', 'svg'].includes(e.target.tagName.toLowerCase())) return;
        e.stopPropagation();
        segmentPointAtCoords(getCanvasCoords(e));
      });
    });

    window.addEventListener('mousemove', onMouseMove); window.addEventListener('mouseup', onMouseUp);
    document.addEventListener('keydown', (e) => {
      const tag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return;
      if (e.key === 'b' || e.key === 'B') setMode(mode === 'draw' ? 'select' : 'draw');
      else if (e.key === 's' || e.key === 'S') setMode('select');
      else if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        if (e.shiftKey) segmentAllDrawnBoxes();
        else segmentSelectedBox();
      } else if (e.key === 'Escape') cancelPoint1();
    });
  }

  function setMode(newMode) {
    mode = newMode; cancelPoint1();
    document.getElementById('btn-mode-select')?.classList.toggle('hud-btn--active', mode === 'select');
    document.getElementById('btn-mode-draw')?.classList.toggle('hud-btn--active', mode === 'draw');

    const svg = document.getElementById('canvas-svg-overlay'), img = document.getElementById('main-frame-img'), viewport = document.getElementById('canvas-viewport');
    if (mode === 'draw') {
      if (svg) { svg.style.pointerEvents = 'all'; svg.classList.add('draw-mode'); }
      if (img) img.style.cursor = 'crosshair'; if (viewport) viewport.classList.add('draw-mode');
    } else {
      if (svg) { svg.style.pointerEvents = 'none'; svg.classList.remove('draw-mode'); }
      if (img) img.style.cursor = 'default'; if (viewport) viewport.classList.remove('draw-mode');
    }
    if (window.SvgOverlay?.syncSvgToImage) window.SvgOverlay.syncSvgToImage();
    if (window.ViewerUI?.showToast) window.ViewerUI.showToast(mode === 'draw' ? `✏️ Draw Box active! Press [G] to segment box, [Shift+G] for all.` : '🖐 Select mode active.', 'info');
  }

  function getCanvasCoords(e) {
    const img = document.getElementById('main-frame-img'); if (!img) return { x: 0, y: 0 };
    const rect = img.getBoundingClientRect(), scaleX = (img.naturalWidth || 1280) / rect.width, scaleY = (img.naturalHeight || 720) / rect.height;
    return { x: Math.round(Math.max(0, Math.min(rect.width, e.clientX - rect.left)) * scaleX), y: Math.round(Math.max(0, Math.min(rect.height, e.clientY - rect.top)) * scaleY) };
  }

  function cancelPoint1() { point1Anchor = null; [tempRect, tempAnchorDot, tempText].forEach((el) => el && el.remove()); tempRect = tempAnchorDot = tempText = null; }

  function getPreviewGroup() {
    const svg = document.getElementById('canvas-svg-overlay'); if (!svg) return null;
    let grp = svg.querySelector('#svg-preview-group');
    if (!grp) { grp = document.createElementNS('http://www.w3.org/2000/svg', 'g'); grp.id = 'svg-preview-group'; svg.appendChild(grp); }
    return grp;
  }

  function createPreviewElements(x, y) {
    const grp = getPreviewGroup(); if (!grp) return;
    if (!tempAnchorDot) { tempAnchorDot = document.createElementNS('http://www.w3.org/2000/svg', 'circle'); tempAnchorDot.setAttribute('r', '8'); tempAnchorDot.setAttribute('fill', '#06b6d4'); tempAnchorDot.setAttribute('stroke', '#ffffff'); tempAnchorDot.setAttribute('stroke-width', '3'); grp.appendChild(tempAnchorDot); }
    tempAnchorDot.setAttribute('cx', x); tempAnchorDot.setAttribute('cy', y);
    if (!tempRect) { tempRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect'); tempRect.setAttribute('fill', '#06b6d433'); tempRect.setAttribute('stroke', '#38bdf8'); tempRect.setAttribute('stroke-width', '4'); tempRect.setAttribute('stroke-dasharray', '6,4'); grp.appendChild(tempRect); }
    if (!tempText) { tempText = document.createElementNS('http://www.w3.org/2000/svg', 'text'); tempText.setAttribute('fill', '#38bdf8'); tempText.setAttribute('font-size', '16'); tempText.setAttribute('font-weight', '700'); tempText.setAttribute('text-anchor', 'middle'); grp.appendChild(tempText); }
  }

  function updatePreviewRect(x1, y1, x2, y2) {
    const xmin = Math.min(x1, x2), ymin = Math.min(y1, y2), w = Math.abs(x2 - x1), h = Math.abs(y2 - y1);
    if (tempRect) { tempRect.setAttribute('x', xmin); tempRect.setAttribute('y', ymin); tempRect.setAttribute('width', w); tempRect.setAttribute('height', h); }
    if (tempText) { tempText.setAttribute('x', xmin + w / 2); tempText.setAttribute('y', Math.max(24, ymin - 10)); tempText.textContent = `📐 ${w} × ${h} px (${getDefaultTargetLabel()})`; }
  }

  let isSelectDragging = false;

  function onMouseDown(e) {
    if (e.button !== 0) return;
    if (mode === 'select') {
      const tag = e.target.tagName ? e.target.tagName.toLowerCase() : '';
      if (['img', 'svg', 'polygon', 'rect'].includes(tag) || e.target.id === 'canvas-viewport') {
        isMouseDown = true; isSelectDragging = true;
        const coords = getCanvasCoords(e); dragStartX = coords.x; dragStartY = coords.y; dragDist = 0;
      }
      return;
    }
    if (mode !== 'draw') return;
    e.preventDefault(); isMouseDown = true; isSelectDragging = false;
    const coords = getCanvasCoords(e); dragStartX = coords.x; dragStartY = coords.y; dragDist = 0;
  }

  function onMouseMove(e) {
    if (!isMouseDown && mode !== 'draw') return;
    const coords = getCanvasCoords(e);
    if (isMouseDown) {
      dragDist += Math.hypot(coords.x - dragStartX, coords.y - dragStartY);
      if (dragDist > 6) {
        if (!tempRect) createPreviewElements(dragStartX, dragStartY);
        if (isSelectDragging && tempRect) { tempRect.setAttribute('stroke', '#0284c7'); tempRect.setAttribute('fill', '#0284c72a'); }
        updatePreviewRect(dragStartX, dragStartY, coords.x, coords.y);
      }
    } else if (point1Anchor && mode === 'draw') { updatePreviewRect(point1Anchor.x, point1Anchor.y, coords.x, coords.y); }
  }

  function finalizeSelectionMarquee(x1, y1, x2, y2, isShiftKey) {
    const xmin = Math.min(x1, x2), ymin = Math.min(y1, y2), xmax = Math.max(x1, x2), ymax = Math.max(y1, y2); cancelPoint1();
    const frame = window.ViewerApp ? window.ViewerApp.getCurrentFrame() : null; if (!frame) return;
    const isShowDel = window.ViewerApp ? window.ViewerApp.showDeleted : false, minConf = window.ViewerApp ? window.ViewerApp.minConfidence : 0;
    const allDets = [...(frame.detections || []), ...getDrawnBoxes()], selectedIds = [];
    allDets.forEach((det) => {
      if (det.hidden || (!det.is_drawn && (det.confidence || 0.85) < minConf) || (det.deleted && !isShowDel)) return;
      const b = det.bbox_xyxy || [0, 0, 0, 0];
      if (b[0] <= xmax && b[2] >= xmin && b[1] <= ymax && b[3] >= ymin) selectedIds.push(det.id);
    });
    if (window.ViewerApp?.setSelectedDetections) window.ViewerApp.setSelectedDetections(selectedIds, isShiftKey);
  }

  function finalizeBox(x1, y1, x2, y2) {
    const xmin = Math.min(x1, x2), ymin = Math.min(y1, y2), w = Math.abs(x2 - x1), h = Math.abs(y2 - y1); cancelPoint1();
    if (w >= 10 && h >= 10) {
      const key = getFrameKey(); if (!drawnBoxesMap[key]) drawnBoxesMap[key] = [];
      const boxId = `user_box_${Date.now()}`, defaultLabel = getDefaultTargetLabel();
      const newBox = { id: boxId, label: defaultLabel, bbox_xyxy: [xmin, ymin, xmin + w, ymin + h], is_drawn: true, confidence: 1.0, mask_color: '#f59e0b', is_segmenting: false, is_failed: false };
      drawnBoxesMap[key].push(newBox); saveDrawnBoxesToStorage(); updateDrawnBoxesUI();
      if (window.ViewerApp?.selectDetection) window.ViewerApp.selectDetection(boxId);
      segmentBoxes([newBox]);
    }
  }

  function onMouseUp(e) {
    if (!isMouseDown) return;
    isMouseDown = false; const coords = getCanvasCoords(e);
    if (isSelectDragging) {
      isSelectDragging = false;
      if (dragDist > 6) finalizeSelectionMarquee(dragStartX, dragStartY, coords.x, coords.y, e.shiftKey);
      else { cancelPoint1(); }
      return;
    }
    if (mode !== 'draw') return;
    if (dragDist > 6) { finalizeBox(dragStartX, dragStartY, coords.x, coords.y); }
    else {
      if (!point1Anchor) { point1Anchor = { x: coords.x, y: coords.y }; createPreviewElements(coords.x, coords.y); updatePreviewRect(coords.x, coords.y, coords.x + 5, coords.y + 5); }
      else { finalizeBox(point1Anchor.x, point1Anchor.y, coords.x, coords.y); }
    }
  }

  function updateDrawnBoxesUI() {
    const activeDrawn = getDrawnBoxes(), btn = document.getElementById('btn-segment-all-boxes');
    if (btn) { btn.classList.toggle('hidden', activeDrawn.length === 0); btn.textContent = `⚡ Segment Drawn Boxes (${activeDrawn.length})`; }
    const frame = window.ViewerApp ? window.ViewerApp.getCurrentFrame() : null; if (frame && window.SvgOverlay) window.SvgOverlay.render(frame, true, 0);
  }

  function segmentSelectedBox() {
    const frame = window.ViewerApp?.getCurrentFrame(), activeDrawn = getDrawnBoxes(), selSet = window.ViewerApp?.selectedDetIds || new Set();
    if (selSet.size > 0) {
      const targets = []; selSet.forEach((id) => { let d = (frame?.detections || []).find((det) => det.id === id && !det.deleted); if (!d) d = activeDrawn.find((b) => b.id === id); if (d) targets.push(d); });
      if (targets.length > 0) {
        const pct = parseFloat(document.getElementById('propagate-expand-select')?.value || '10') / 100.0 + 1.0;
        const expBoxes = targets.map((det) => { const b = det.bbox_xyxy, w = Math.max(1, b[2] - b[0]), h = Math.max(1, b[3] - b[1]), cx = (b[0] + b[2]) / 2.0, cy = (b[1] + b[3]) / 2.0; return { id: det.id, label: det.label || getDefaultTargetLabel(), bbox_xyxy: [Math.max(0, Math.round(cx - (w * pct) / 2)), Math.max(0, Math.round(cy - (h * pct) / 2)), Math.round(cx + (w * pct) / 2), Math.round(cy + (h * pct) / 2)] }; });
        return segmentBoxes(expBoxes);
      }
    }
    if (activeDrawn.length === 1) return segmentSingleBox(activeDrawn[0]);
    if (window.ViewerUI?.showToast) window.ViewerUI.showToast('💡 Select bounding box(es) or draw a box first, then press [G] to segment.', 'warning');
    return Promise.resolve(null);
  }

  function segmentAllDrawnBoxes() {
    const activeDrawn = getDrawnBoxes(); return activeDrawn.length > 0 ? segmentBoxes([...activeDrawn]) : Promise.resolve(null);
  }

  function segmentBoxes(boxesToSegment) {
    const frame = window.ViewerApp ? window.ViewerApp.getCurrentFrame() : null; if (!frame) return Promise.resolve(null);
    const btnAll = document.getElementById('btn-segment-all-boxes'), btnPop = document.getElementById('btn-popover-segment'), sideBtns = document.querySelectorAll('.btn-det-segment'), loaderEl = document.getElementById('canvas-loader');

    // Check if SAM3 is online
    const sam3Badge = document.getElementById("sam3-model-badge");
    const isSam3Online = sam3Badge && sam3Badge.classList.contains("hud-badge--sam3-online");
    if (!isSam3Online) {
      if (window.ViewerUI?.showToast) {
        window.ViewerUI.showToast("⚠️ SAM3 is not online. Keeping box(es) on screen, will auto-segment once online.", "warning");
      }
      return Promise.resolve(null);
    }

    boxesToSegment.forEach((b) => { b.is_segmenting = true; b.is_failed = false; }); updateDrawnBoxesUI();
    if (loaderEl) { loaderEl.classList.remove('hidden'); loaderEl.style.display = 'flex'; const textSpan = loaderEl.querySelector('span'); if (textSpan) textSpan.textContent = `⚡ Segmenting ${boxesToSegment.length} box(es)...`; }
    const pulseHtml = '<span class="text-pulsing">⚡ Segmenting...</span>';
    if (btnAll) { btnAll.disabled = true; btnAll.innerHTML = pulseHtml; } if (btnPop) { btnPop.disabled = true; btnPop.innerHTML = pulseHtml; } sideBtns.forEach((b) => { b.disabled = true; b.innerHTML = pulseHtml; });
    if (window.ViewerUI?.showToast) window.ViewerUI.showToast(`⚡ Segmenting ${boxesToSegment.length} box prompt(s)...`, 'info');
    const formData = new FormData(); formData.append('playlist_name', window.PLAYLIST_NAME); formData.append('video_id', frame.video_id); formData.append('json_filename', frame.json_filename); formData.append('boxes_json', JSON.stringify(boxesToSegment)); formData.append('targets', window.TARGETS_STR || '');
    const resetUIState = () => { if (loaderEl) { loaderEl.classList.add('hidden'); loaderEl.style.display = 'none'; const textSpan = loaderEl.querySelector('span'); if (textSpan) textSpan.textContent = 'Loading keyframe...'; } if (btnAll) btnAll.disabled = false; if (btnPop) btnPop.disabled = false; sideBtns.forEach((b) => { b.disabled = false; b.innerHTML = '⚡ Segment'; }); };
    return fetch('/api/frame/segment-box', { method: 'POST', body: formData }).then((r) => r.json()).then((data) => {
      resetUIState();
      const key = getFrameKey(frame), segIds = new Set(boxesToSegment.map((b) => b.id));
      if (data.success && data.detections) {
        if (drawnBoxesMap[key]) drawnBoxesMap[key] = drawnBoxesMap[key].filter((b) => !segIds.has(b.id)); saveDrawnBoxesToStorage(); updateDrawnBoxesUI();
        frame.detections = data.detections; frame._lastLocalUpdate = Date.now();
        if (window.ViewerApp) { window.ViewerApp.deselectAll(); if (data.newly_segmented?.length > 0) window.ViewerApp.selectDetection(data.newly_segmented[0].id); }
        const newlySeg = data.newly_segmented || [];
        const segLabels = newlySeg.length > 0 ? Array.from(new Set(newlySeg.map((d) => d.label))).join(', ') : '';
        const labelStr = segLabels ? `'${segLabels}'` : `'${getDefaultTargetLabel()}'`;
        if (data.warning) { if (window.ViewerUI?.showToast) window.ViewerUI.showToast(`⚠️ ${data.warning}`, 'warning'); }
        else if (window.ViewerUI?.showToast) window.ViewerUI.showToast(`✅ SAM3 segmented ${boxesToSegment.length} box prompt(s) as ${labelStr}!`, 'success');

        if (window.ViewerApp && typeof window.ViewerApp.fetchDatasetCrops === 'function') {
          window.ViewerApp.fetchDatasetCrops(() => {
            if (window.ViewerApp.loadFrame) window.ViewerApp.loadFrame(window.ViewerApp.currentIndex);
          });
        } else if (window.ViewerApp && window.ViewerApp.loadFrame) {
          window.ViewerApp.loadFrame(window.ViewerApp.currentIndex);
        }
      } else {
        boxesToSegment.forEach((b) => { b.is_segmenting = false; b.is_failed = true; }); updateDrawnBoxesUI();
        if (window.ViewerUI?.showToast) window.ViewerUI.showToast(`⚠️ SAM3 Box Segmentation Failed: ${data.error || 'No object detected.'}`, 'error');
      }
    }).catch((err) => {
      resetUIState();
      boxesToSegment.forEach((b) => { b.is_segmenting = false; b.is_failed = true; }); updateDrawnBoxesUI();
      if (window.ViewerUI?.showToast) window.ViewerUI.showToast(`⚠️ SAM3 Box Segmentation Error: ${err.message || err}`, 'error');
    });
  }

  function segmentSingleBox(det) {
    if (!det || !det.bbox_xyxy) return Promise.resolve(null);
    const pct = parseFloat(document.getElementById('propagate-expand-select')?.value || '10') / 100.0 + 1.0;
    const b = det.bbox_xyxy, w = Math.max(1, b[2] - b[0]), h = Math.max(1, b[3] - b[1]), cx = (b[0] + b[2]) / 2.0, cy = (b[1] + b[3]) / 2.0;
    return segmentBoxes([{ id: det.id, label: det.label || getDefaultTargetLabel(), bbox_xyxy: [Math.max(0, Math.round(cx - (w * pct) / 2)), Math.max(0, Math.round(cy - (h * pct) / 2)), Math.round(cx + (w * pct) / 2), Math.round(cy + (h * pct) / 2)] }]);
  }

  function segmentPointAtCoords(coords) {
    if (!coords) return Promise.resolve(null);
    return segmentBoxes([{ id: `pt_prompt_${Date.now()}`, label: getDefaultTargetLabel(), bbox_xyxy: [Math.max(0, coords.x - 8), Math.max(0, coords.y - 8), coords.x + 8, coords.y + 8] }]);
  }

  window.BoxDrawer = {
    init: initBoxDrawer, setMode, getMode: () => mode, getDrawnBoxes, cancelPoint1,
    onFrameChange: () => { cancelPoint1(); updateDrawnBoxesUI(); }, getDefaultTargetLabel, getCanvasCoords,
    removeDrawnBox: (id) => { const key = getFrameKey(); if (drawnBoxesMap[key]) drawnBoxesMap[key] = drawnBoxesMap[key].filter((b) => b.id !== id); saveDrawnBoxesToStorage(); updateDrawnBoxesUI(); },
    segmentSelectedBox, segmentAllDrawnBoxes, segmentSingleBox, segmentPointAtCoords,
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initBoxDrawer);
  else initBoxDrawer();
})();
