/**
 * SVG Vector Annotation Overlay Renderer with Accuracy Confidence Filter & Drawn Box Overlay
 */
(function () {
  function syncSvgToImage() {
    const img = document.getElementById('main-frame-img');
    const svg = document.getElementById('canvas-svg-overlay');
    if (!img || !svg || !img.complete || img.naturalWidth === 0) return;

    const imgRect = img.getBoundingClientRect();
    const parentRect = img.parentElement ? img.parentElement.getBoundingClientRect() : imgRect;

    svg.style.left = `${imgRect.left - parentRect.left}px`;
    svg.style.top = `${imgRect.top - parentRect.top}px`;
    svg.style.width = `${imgRect.width}px`;
    svg.style.height = `${imgRect.height}px`;
    svg.style.transform = 'none';
  }

  function renderSvgOverlay(frame, showMasks = true, minConfidence = 0, showDeleted, showLabels) {
    const svg = document.getElementById('canvas-svg-overlay');
    if (!svg) return;
    const isShowLabels = (showLabels !== undefined) ? showLabels : (window.ViewerApp && window.ViewerApp.showLabels !== undefined ? window.ViewerApp.showLabels : true);
    const prevGrp = svg.querySelector('#svg-preview-group');
    svg.innerHTML = '';
    if (prevGrp) svg.appendChild(prevGrp);

    syncSvgToImage();

    // Synchronize detections visibility flags
    if (window.ViewerUI && window.ViewerUI.syncDetectionsVisibility) {
      window.ViewerUI.syncDetectionsVisibility(frame, minConfidence);
    }

    const naturalW = (frame && frame.width) ? frame.width : (document.getElementById('main-frame-img')?.naturalWidth || 1280);
    const naturalH = (frame && frame.height) ? frame.height : (document.getElementById('main-frame-img')?.naturalHeight || 720);
    svg.setAttribute('viewBox', `0 0 ${naturalW} ${naturalH}`);

    if (!showMasks) return;

    let allDetections = [];
    if (frame && frame.detections) {
      allDetections = [...frame.detections];
    }

    if (window.BoxDrawer && window.BoxDrawer.getDrawnBoxes) {
      const drawn = window.BoxDrawer.getDrawnBoxes();
      drawn.forEach((b) => {
        if (!allDetections.some((d) => d.id === b.id)) {
          allDetections.push(b);
        }
      });
    }

    if (allDetections.length === 0) return;

    const isShowDel = (showDeleted !== undefined) ? showDeleted : (window.ViewerApp && window.ViewerApp.showDeleted);

    allDetections.forEach((det) => {
      const confVal = det.confidence || 0.85;
      if (det.hidden || (det.deleted === true && !isShowDel)) return;

      const isSelected = det.selected === true || (window.ViewerApp?.selectedDetIds?.has(det.id)) || (window.ViewerApp?.selectedDetId === det.id);
      const isDeleted = det.deleted === true;
      const isDrawn = det.is_drawn === true;
      const isSegmenting = det.is_segmenting === true;
      const isFailed = det.is_failed === true;
      const color = det.mask_color || (isDrawn ? '#f59e0b' : '#3b82f6');

      let strokeColor = isDeleted ? '#ef4444' : isSegmenting ? '#38bdf8' : isFailed ? '#ef4444' : isSelected ? '#38bdf8' : color;
      let strokeW = isSelected || isSegmenting || isFailed ? '5' : '3';
      let strokeDash = isDeleted ? '6,4' : isSegmenting ? '6,4' : isFailed ? '4,4' : isDrawn ? '5,5' : 'none';
      let polygonFill = isDeleted ? '#ef44441a' : isSegmenting ? '#38bdf833' : isFailed ? '#ef444433' : isSelected ? '#38bdf866' : isDrawn ? '#f59e0b22' : color + '55';

      const label = det.label || (isDrawn ? 'drawn box' : 'object');
      const conf = Math.round(confVal * 100);
      const bbox = det.bbox_xyxy || [0, 0, 100, 100];

      const onClick = (e) => {
        e.stopPropagation();
        if (window.ViewerApp && window.ViewerApp.selectDetection) {
          window.ViewerApp.selectDetection(det.id);
        }
      };

      const onDblClick = (e) => {
        e.stopPropagation();
        if (window.BoxDrawer && window.BoxDrawer.segmentSingleBox) {
          window.BoxDrawer.segmentSingleBox(det);
        }
      };

      const onMouseEnter = (e) => {
        const itemEl = document.querySelector(`.det-item[data-det-id="${det.id}"]`);
        if (itemEl) {
          itemEl.classList.add('det-item--hovered');
        }
        document.querySelectorAll(`#canvas-svg-overlay [data-det-id="${det.id}"]`).forEach(el => {
          if (el.tagName === 'rect' || el.tagName === 'polygon') {
            el.classList.add('svg-hovered');
          }
        });
      };

      const onMouseLeave = (e) => {
        const itemEl = document.querySelector(`.det-item[data-det-id="${det.id}"]`);
        if (itemEl) {
          itemEl.classList.remove('det-item--hovered');
        }
        document.querySelectorAll(`#canvas-svg-overlay [data-det-id="${det.id}"]`).forEach(el => {
          el.classList.remove('svg-hovered');
        });
      };

      const polys = det.polygons || (det.polygon ? [det.polygon] : []);
      polys.forEach((pts) => {
        if (pts && pts.length >= 3) {
          const polygonEl = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
          polygonEl.setAttribute('data-det-id', det.id);
          polygonEl.setAttribute('points', pts.map((p) => `${p[0]},${p[1]}`).join(' '));
          polygonEl.setAttribute('fill', polygonFill);
          polygonEl.setAttribute('stroke', strokeColor);
          polygonEl.setAttribute('stroke-width', strokeW);
          if (isDeleted || isDrawn || isSegmenting || isFailed) polygonEl.setAttribute('stroke-dasharray', strokeDash);
          if (isSegmenting) polygonEl.setAttribute('class', 'svg-dash-anim');
          polygonEl.style.cursor = 'pointer';
          polygonEl.style.pointerEvents = 'all';
          polygonEl.onclick = onClick;
          polygonEl.ondblclick = onDblClick;
          polygonEl.addEventListener('mouseenter', onMouseEnter);
          polygonEl.addEventListener('mouseleave', onMouseLeave);
          svg.appendChild(polygonEl);
        }
      });

      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('data-det-id', det.id);
      rect.setAttribute('x', bbox[0]);
      rect.setAttribute('y', bbox[1]);
      rect.setAttribute('width', bbox[2] - bbox[0]);
      rect.setAttribute('height', bbox[3] - bbox[1]);
      rect.setAttribute('fill', isDrawn && (!polys || polys.length === 0) ? polygonFill : 'none');
      rect.setAttribute('stroke', strokeColor);
      rect.setAttribute('stroke-width', strokeW);
      rect.setAttribute('rx', '4');
      if (isDeleted || isDrawn || isSegmenting || isFailed) rect.setAttribute('stroke-dasharray', strokeDash);
      if (isSegmenting) rect.setAttribute('class', 'svg-dash-anim');
      rect.style.cursor = 'pointer';
      rect.style.pointerEvents = 'all';
      rect.onclick = onClick;
      rect.ondblclick = onDblClick;
      rect.addEventListener('mouseenter', onMouseEnter);
      rect.addEventListener('mouseleave', onMouseLeave);
      svg.appendChild(rect);

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('data-det-id', det.id);
      g.style.cursor = 'pointer';
      g.style.pointerEvents = 'all';
      g.onclick = onClick;
      g.ondblclick = onDblClick;
      g.addEventListener('mouseenter', onMouseEnter);
      g.addEventListener('mouseleave', onMouseLeave);

      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      const textY = Math.max(24, bbox[1] - 8);
      text.setAttribute('x', bbox[0] + 6);
      text.setAttribute('y', textY);
      text.setAttribute('fill', isDeleted || isFailed ? '#fca5a5' : '#ffffff');
      text.setAttribute('font-size', '14');
      text.setAttribute('font-weight', '600');
      if (isDeleted) text.setAttribute('text-decoration', 'line-through');

      let headerText = `${label} ${conf}%`;
      if (isDeleted) headerText = `[DEL] ${label}`;
      else if (isSegmenting) headerText = `⚡ [SEG] ${label}`;
      else if (isFailed) headerText = `❌ [ERR] ${label}`;
      else if (isDrawn) headerText = `✏️ [DRW] ${label}`;

      text.textContent = headerText;

      const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      const textLen = Math.max(140, (headerText.length + 4) * 9.5);
      bg.setAttribute('x', bbox[0]);
      bg.setAttribute('y', textY - 18);
      bg.setAttribute('width', textLen);
      bg.setAttribute('height', '24');

      let bgFill = isDeleted ? '#7f1d1d' : isSegmenting ? '#0284c7' : isFailed ? '#991b1b' : isSelected ? '#0284c7' : isDrawn ? '#d97706' : '#111827';
      bg.setAttribute('fill', bgFill);
      bg.setAttribute('rx', '4');
      bg.setAttribute('stroke', strokeColor);
      if (isDeleted || isDrawn || isSegmenting || isFailed) bg.setAttribute('stroke-dasharray', strokeDash);
      if (isSegmenting) bg.setAttribute('class', 'svg-dash-anim');

      if (isShowLabels || isSelected) {
        g.appendChild(bg);
        g.appendChild(text);
        svg.appendChild(g);
      }
    });
  }

  window.addEventListener('resize', syncSvgToImage);

  window.SvgOverlay = {
    render: renderSvgOverlay,
    syncSvgToImage,
  };
})();
