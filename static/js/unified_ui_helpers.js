/**
 * UI Helpers for SAM3 Side Panel, Verification & Toast Notifications
 */
(function () {
  function isDetectionCropped(video_id, json_filename, det) {
    if (!window.ViewerApp || !window.ViewerApp.datasetCrops) return false;
    const frameMatch = (json_filename || '').match(/frame_(\d+)/);
    const frameNum = frameMatch ? frameMatch[1] : "00000";
    const detId = det.id || "001";
    const boxMatch = detId.match(/\d+/g);
    let boxNum = boxMatch ? boxMatch[boxMatch.length - 1] : "001";
    if (/^\d+$/.test(boxNum)) {
      boxNum = boxNum.padStart(3, '0');
    }
    const label = (det.label || "label").trim().toLowerCase().replace(/\s+/g, '-');
    const prefix = `${label}_${video_id}_frame${frameNum}_box${boxNum}_conf`;
    return window.ViewerApp.datasetCrops.some(crop => (crop.filename || '').startsWith(prefix));
  }

  function createDetectionItem(det, selectedDetId, frame) {
    const item = document.createElement('div'), isDel = det.deleted === true, isDrawn = det.is_drawn === true;
    const isSel = (window.ViewerApp?.selectedDetIds?.has(det.id)) || det.id === selectedDetId;
    item.className = `det-item ${det.hidden ? 'det-item--hidden' : ''} ${isSel ? 'det-item--selected' : ''} ${isDel ? 'det-item--deleted' : ''} ${isDrawn ? 'det-item--drawn' : ''}`;
    item.style.cursor = 'pointer';
    item.setAttribute('data-det-id', det.id);
    
    // Wire up interactive click selection (excluding action clicks)
    item.onclick = (e) => {
      if (e.target.closest('button') || e.target.closest('.badge') || e.target.closest('.badge-in-samples')) return;
      if (window.ViewerApp && window.ViewerApp.selectDetection) {
        window.ViewerApp.selectDetection(det.id);
      }
    };

    // Wire up hover outline highlighting on the canvas SVG overlay
    item.onmouseenter = () => {
      document.querySelectorAll(`#canvas-svg-overlay [data-det-id="${det.id}"]`).forEach(el => {
        if (el.tagName === 'rect' || el.tagName === 'polygon') {
          el.classList.add('svg-hovered');
        }
      });
    };
    item.onmouseleave = () => {
      document.querySelectorAll(`#canvas-svg-overlay [data-det-id="${det.id}"]`).forEach(el => {
        el.classList.remove('svg-hovered');
      });
    };

    const labelHtml = isDel ? `<s style="color:#ef4444">[DEL] ${det.label}</s>` : isDrawn ? `✏️ [DRW] ${det.label}` : `${det.label}`;
    const confText = isDrawn ? 'Drawn Box' : `${Math.round((det.confidence || 0.85) * 100)}%`;
    
    const cropped = isDetectionCropped(frame.video_id, frame.json_filename, det);
    const badgeHtml = cropped ? `<span class="badge badge-in-samples" style="background:rgba(16,185,129,0.15); color:#34d399; border:1px solid rgba(16,185,129,0.3); font-size:9px; padding:1px 5px; border-radius:4px; margin-left:6px; font-weight:600; vertical-align:middle; display:inline-inline-flex; align-items:center; gap:3px; cursor:pointer;" onclick="if(window.ViewerApp && window.ViewerApp.removeCropSingleDetection) { event.stopPropagation(); window.ViewerApp.removeCropSingleDetection('${det.id}'); }" title="Click to Remove Crop from Samples">🌾 IN SAMPLES <span style="color:#ef4444; font-weight:bold; font-size:10px; margin-left:2px;">×</span></span>` : '';
    const cropBtnHtml = (!isDel && !cropped) ? `<button class="hud-btn--mini btn-det-crop" onclick="if(window.ViewerApp && window.ViewerApp.cropSingleDetection) window.ViewerApp.cropSingleDetection('${det.id}')" title="Add Sample to Dataset"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg></button>` : '';
    const removeCropBtnHtml = (!isDel && cropped) ? `<button class="hud-btn--mini btn-det-uncrop" onclick="if(window.ViewerApp && window.ViewerApp.removeCropSingleDetection) window.ViewerApp.removeCropSingleDetection('${det.id}')" title="Remove Crop from Samples"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="9.8" y1="8.2" x2="22" y2="20"/><line x1="9.8" y1="15.8" x2="22" y2="4"/><line x1="3" y1="21" x2="21" y2="3" stroke="#f87171" stroke-width="2.5"/></svg></button>` : '';

    const actionBtn = isDrawn
      ? `<button class="hud-btn--mini btn-det-segment" onclick="if(window.ViewerApp) window.ViewerApp.selectDetection('${det.id}'); if(window.BoxDrawer) window.BoxDrawer.segmentSelectedBox();" title="Segment Bounding Box [G]"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></button><button class="hud-btn--mini btn-det-del" onclick="if(window.BoxDrawer) window.BoxDrawer.removeDrawnBox('${det.id}');" title="Delete Box"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>`
      : isDel ? `<button class="hud-btn--mini btn-det-restore" onclick="ViewerApp.restoreDetection('${det.id}')" title="Restore Object"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg></button>` : `<button class="hud-btn--mini btn-det-del" onclick="ViewerApp.deleteDetection('${det.id}')" title="Delete Object [X]"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg></button>`;

    const actionBtnWithCrop = cropBtnHtml + removeCropBtnHtml + actionBtn;

    const bbox = det.bbox_xyxy || [0, 0, 100, 100];
    const bboxStr = JSON.stringify(bbox);
    const imgEl = document.getElementById('main-frame-img');
    const initialSrc = (window.ViewerUI && window.ViewerUI.getBBoxCropDataUrl) ? window.ViewerUI.getBBoxCropDataUrl(imgEl, bbox) : '';
    const hasImage = !!initialSrc;

    const thumbHtml = `
      <div class="det-item__thumb-wrapper">
        <img class="det-item__thumb-img ${!hasImage ? 'det-item__thumb-img--placeholder' : ''}" 
             src="${initialSrc || 'data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'44\' height=\'44\'><rect width=\'44\' height=\'44\' fill=\'%23222\'/><circle cx=\'22\' cy=\'22\' r=\'4\' fill=\'%23555\'/></svg>'}" 
             data-bbox='${bboxStr}' 
             alt="Object Thumbnail" />
      </div>
    `;

    item.innerHTML = `
      ${thumbHtml}
      <div class="det-item__details">
        <div class="det-item__header">
          <span class="det-item__label" style="color:${isDel ? '#ef4444' : det.mask_color}">${labelHtml}${badgeHtml}</span>
          <span class="det-item__conf">${confText}</span>
        </div>
        <div class="det-item__actions">
          ${!isDrawn ? `<button class="hud-btn--mini btn-det-toggle ${det.hidden ? 'btn-det-toggle--hidden' : ''}" onclick="ViewerApp.toggleDetectionVisibility('${det.id}')" title="${det.hidden ? 'Show Object' : 'Hide Object'}">${det.hidden ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/></svg>' : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0z"/><circle cx="12" cy="12" r="3"/></svg>'}</button>` : ''}
          <button class="hud-btn--mini btn-det-edit" onclick="ViewerApp.editDetectionLabel('${det.id}')" title="Edit Label [E]"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg></button>
          ${actionBtnWithCrop}
        </div>
      </div>
    `;
    return item;
  }

  function syncDetectionsVisibility(frame, minConfidence = 0) {
    if (!frame || !frame.detections) return;
    window.ViewerApp = window.ViewerApp || {};
    window.ViewerApp.manuallyHiddenCache = window.ViewerApp.manuallyHiddenCache || {};
    
    frame.detections.forEach((d) => {
      if (!d.is_drawn) {
        const key = `${frame.json_filename}_${d.id}`;
        const cachedVal = window.ViewerApp.manuallyHiddenCache[key];
        
        if (cachedVal !== undefined) {
          d.hidden = cachedVal;
          d.manually_hidden = cachedVal;
        } else if (d.manually_hidden !== undefined) {
          d.hidden = d.manually_hidden;
        } else if ((d.confidence || 0.85) < minConfidence) {
          d.hidden = true;
        } else {
          d.hidden = false;
        }
      }
    });
  }

  function updateSidePanel(frame, selectedDetId, minConfidence = 0, showDeleted) {
    const isShowDel = (showDeleted !== undefined) ? showDeleted : (window.ViewerApp && window.ViewerApp.showDeleted);
    const delBtn = document.getElementById('btn-toggle-deleted');
    if (delBtn) { delBtn.classList.toggle('hud-btn--active', isShowDel); delBtn.innerHTML = isShowDel ? '👁 Deleted' : '🙈 Deleted'; }

    // Synchronize detections visibility flags
    syncDetectionsVisibility(frame, minConfidence);

    let validDets = (frame.detections || []).filter((d) => !d.deleted || isShowDel);
    if (window.BoxDrawer?.getDrawnBoxes) window.BoxDrawer.getDrawnBoxes().forEach((b) => { if (!validDets.some((d) => d.id === b.id)) validDets.push(b); });

    validDets.sort((a, b) => {
      const confA = a.confidence !== undefined ? a.confidence : 0.85;
      const confB = b.confidence !== undefined ? b.confidence : 0.85;
      return confB - confA;
    });

    const detCountEl = document.getElementById('det-count'), detListEl = document.getElementById('side-detections-list');
    if (detCountEl) detCountEl.textContent = validDets.filter((d) => !d.deleted && !d.hidden).length;

    if (detListEl) {
      detListEl.innerHTML = '';
      
      const visibleDets = validDets.filter((d) => !d.hidden);
      const hiddenDets = validDets.filter((d) => d.hidden);

      if (validDets.length === 0) {
        detListEl.innerHTML = '<p class="text-muted">No matching objects.</p>';
      } else {
        visibleDets.forEach((det) => {
          const item = createDetectionItem(det, selectedDetId, frame);
          detListEl.appendChild(item);
        });

        if (hiddenDets.length > 0) {
          const detailsEl = document.createElement('details');
          detailsEl.className = 'filtered-group';
          detailsEl.setAttribute('open', '');

          const summaryEl = document.createElement('summary');
          summaryEl.className = 'filtered-group__summary';
          summaryEl.textContent = `Filtered (${hiddenDets.length})`;
          
          const contentEl = document.createElement('div');
          contentEl.className = 'filtered-group__content';
          
          hiddenDets.forEach((det) => {
            const item = createDetectionItem(det, selectedDetId, frame);
            contentEl.appendChild(item);
          });
          
          detailsEl.appendChild(summaryEl);
          detailsEl.appendChild(contentEl);
          detListEl.appendChild(detailsEl);
        }
      }
      if (window.ViewerUI && window.ViewerUI.updateAllDetectionThumbnails) window.ViewerUI.updateAllDetectionThumbnails();
    }
  }

  function showToast(msg, type = 'warning') {
    let container = document.getElementById('toast-container');
    if (!container) { container = document.createElement('div'); container.id = 'toast-container'; container.className = 'toast-container'; document.body.appendChild(container); }
    const toast = document.createElement('div'); toast.className = `toast toast--${type}`;
    toast.innerHTML = `<span>${msg}</span><button class="toast__close" onclick="this.parentElement.remove()">×</button>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateX(100%)'; setTimeout(() => toast.remove(), 300); }, 4000);
  }

  function postApi(endpoint, dataObj, callback) {
    const formData = new FormData();
    Object.keys(dataObj).forEach((k) => formData.append(k, dataObj[k]));
    fetch(endpoint, { method: 'POST', body: formData })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          if (callback) callback(d);
        } else {
          showToast(d.error || d.message || 'Action failed', 'danger');
        }
      })
      .catch((err) => {
        showToast('Request failed: ' + err, 'danger');
      });
  }

  function resolveInitialIndex(allFrames) {
    if (!allFrames || allFrames.length === 0) return 0;
    const p = new URLSearchParams(window.location.search);
    const vid = p.get('v') || p.get('vid') || p.get('video_id') || window.INITIAL_VIDEO_ID;
    const fParam = p.get('f') || p.get('frame') || p.get('frame_index') || window.INITIAL_FRAME_INDEX;
    if (vid) {
      const vfs = allFrames.filter((f) => f.video_id === vid || (f.video_id || '').includes(vid));
      if (vfs.length > 0) {
        if (fParam !== null && fParam !== undefined && fParam !== '') {
          const pf = parseInt(fParam, 10);
          if (!isNaN(pf)) {
            const match = vfs.find((f) => f.frame_index === pf || (f.image_filename || '').includes(`frame_${String(pf).padStart(5, '0')}`));
            if (match) return allFrames.indexOf(match);
            let closest = vfs[0];
            let minDiff = Math.abs(closest.frame_index - pf);
            for (let i = 1; i < vfs.length; i++) {
              const diff = Math.abs(vfs[i].frame_index - pf);
              if (diff < minDiff) { minDiff = diff; closest = vfs[i]; }
            }
            return allFrames.indexOf(closest);
          }
        }
        return allFrames.indexOf(vfs[0]);
      }
    }
    if (fParam !== null && fParam !== undefined && fParam !== '') {
      const pf = parseInt(fParam, 10);
      if (!isNaN(pf)) {
        const m = allFrames.findIndex((f) => f.frame_index === pf || (f.image_filename || '').includes(`frame_${String(pf).padStart(5, '0')}`));
        if (m !== -1) return m;
        let closestIdx = 0;
        let minDiff = Math.abs(allFrames[0].frame_index - pf);
        for (let i = 1; i < allFrames.length; i++) {
          const diff = Math.abs(allFrames[i].frame_index - pf);
          if (diff < minDiff) { minDiff = diff; closestIdx = i; }
        }
        return closestIdx;
      }
      const fIdx = allFrames.findIndex((f) => (f.json_filename || '').includes(fParam) || (f.image_url || '').includes(fParam));
      if (fIdx !== -1) return fIdx;
    }
    return 0;
  }

  window.postApi = postApi; window.showToast = showToast;
  window.ViewerUI = window.ViewerUI || {};
  Object.assign(window.ViewerUI, { updateSidePanel, showToast, postApi, resolveInitialIndex, isDetectionCropped, syncDetectionsVisibility });
})();
