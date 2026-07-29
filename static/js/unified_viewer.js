/** Unified SAM3 Viewer Engine */
(function () {
  let allFrames = [], currentIndex = 0, showMasks = true, showDeleted = false, showLabels = localStorage.getItem('ezlab_show_labels') !== 'false', minConfidence = 0, selectedDetId = null, slideshowInterval = null, saveTimer = null;

  function initViewer() {
    allFrames = [];
    (window.WORKSPACE_DATA || []).forEach((album) => { (album.frames || []).forEach((f) => allFrames.push({ ...f, video_title: album.title, video_id: album.video_id })); });
    if (allFrames.length === 0) return;
    const startIdx = (window.ViewerUI && window.ViewerUI.resolveInitialIndex) ? window.ViewerUI.resolveInitialIndex(allFrames) : 0;
    if (window.ViewerUI) window.ViewerUI.renderThumbnails(allFrames, startIdx, loadFrame);
    document.getElementById('btn-toggle-labels')?.classList.toggle('hud-btn--active', showLabels);
    
    if (typeof fetchDatasetCrops === 'function') {
      fetchDatasetCrops(() => {
        loadFrame(startIdx);
      });
    } else {
      loadFrame(startIdx);
    }
    bindUIEvents();
  }

  function toggleShowDeleted() {
    showDeleted = !showDeleted;
    if (window.SvgOverlay) window.SvgOverlay.render(allFrames[currentIndex], showMasks, minConfidence, showDeleted, showLabels);
    if (window.ViewerUI) window.ViewerUI.updateSidePanel(allFrames[currentIndex], selectedDetId, minConfidence, showDeleted);
  }

  function toggleLabels() {
    showLabels = !showLabels; localStorage.setItem('ezlab_show_labels', showLabels);
    document.getElementById('btn-toggle-labels')?.classList.toggle('hud-btn--active', showLabels);
    if (window.SvgOverlay) window.SvgOverlay.render(allFrames[currentIndex], showMasks, minConfidence, showDeleted, showLabels);
  }

  function saveCurrentFrameConfidence() {
    if (allFrames.length === 0 || currentIndex < 0 || currentIndex >= allFrames.length) return;
    const currF = allFrames[currentIndex]; if (!currF) return;
    const prevConf = (currF.min_confidence !== undefined) ? parseFloat(currF.min_confidence) : 0.0;
    if (Math.abs(minConfidence - prevConf) > 0.001) {
      currF.min_confidence = minConfidence;
      postApi('/api/frame/confidence', { playlist_name: window.PLAYLIST_NAME, video_id: currF.video_id, json_filename: currF.json_filename, min_confidence: minConfidence });
    }
  }

  function saveCurrentFrameVerification() {
    if (allFrames.length === 0 || currentIndex < 0 || currentIndex >= allFrames.length) return;
    const frame = allFrames[currentIndex], currentNotes = document.getElementById('verification-notes-input')?.value || '', cachedNotes = frame.verification ? (frame.verification.notes || '') : '';
    if (currentNotes === cachedNotes) return;
    const st = frame.verification ? (frame.verification.status || 'pending') : 'pending';
    postApi('/api/verify', { playlist_name: window.PLAYLIST_NAME, video_id: frame.video_id, json_filename: frame.json_filename, status: st, notes: currentNotes, min_confidence: minConfidence }, (data) => {
      frame.verification = data.verification || data;
      if (window.ViewerUI) { window.ViewerUI.updateSidePanel(frame, selectedDetId, minConfidence); window.ViewerUI.renderThumbnails(allFrames, currentIndex, loadFrame); }
    });
  }

  let uiEventsBound = false;

  function reprocessCurrentFrame() {
    if (allFrames.length === 0 || currentIndex < 0 || currentIndex >= allFrames.length) return;
    const frame = allFrames[currentIndex], btn = document.getElementById('btn-reprocess-frame');
    if (frame.is_processing || (btn && btn.disabled)) return;
    const pct = Math.round(minConfidence * 100), expandPct = parseFloat(document.getElementById('propagate-expand-select')?.value || '10');
    if (btn) { btn.disabled = true; btn.innerHTML = '<span class="badge-spin">⚡</span> Reprocessing...'; }
    frame.is_processing = true;
    if (window.ViewerUI) { window.ViewerUI.renderThumbnails(allFrames, currentIndex, loadFrame); if (window.ViewerUI.showToast) window.ViewerUI.showToast(`🔄 Reprocessing SAM3 for Frame #${frame.frame_index + 1}...`, 'info'); }
    const targets = document.getElementById('workspace-app')?.dataset.targets || '';
    postApi('/api/frame/reprocess', { playlist_name: window.PLAYLIST_NAME, video_id: frame.video_id, json_filename: frame.json_filename, targets, min_confidence: minConfidence, expand_pct: expandPct }, (data) => {
      frame.is_processing = false; frame.is_processed = true;
      if (btn) { btn.disabled = false; btn.innerHTML = `🔄 Reprocess SAM3${pct > 0 ? ` (Conf ≥ ${pct}%)` : ''}`; }
      if (data && data.success) {
        if (data.detections) { frame.detections = data.detections; frame._lastLocalUpdate = Date.now(); }
        let msg = `✅ SAM3 reprocessed! (${(data.detections || []).length} objects)`;
        if (data.yolo_applied_count > 0) {
          msg += ` (Applied ${data.yolo_applied_count} YOLO classifier corrections)`;
        }
        if (window.ViewerUI && window.ViewerUI.showToast) window.ViewerUI.showToast(msg, 'success');
      } else {
        if (window.ViewerUI && window.ViewerUI.showToast) window.ViewerUI.showToast(data?.error || '⚠️ Reprocess completed', 'warning');
      }
      loadFrame(currentIndex); if (window.ViewerUI) window.ViewerUI.renderThumbnails(allFrames, currentIndex, loadFrame);
    });
  }

  function updateUrlFrameIndex(index) {
    if (window.history && window.history.replaceState) {
      const url = new URL(window.location.href), frame = allFrames[index];
      url.searchParams.set('pl', window.PLAYLIST_NAME || 'dolphin');
      if (frame) { url.searchParams.set('v', frame.video_id); url.searchParams.set('f', frame.frame_index !== undefined ? frame.frame_index : index); } else { url.searchParams.set('f', index); }
      ['playlist_name', 'targets', 't', 'video_id', 'vid', 'frame_index', 'frame', 'image_name', 'image'].forEach((k) => url.searchParams.delete(k));
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  }

  function loadFrame(index) {
    if (index < 0 || index >= allFrames.length) return;
    saveCurrentFrameVerification(); saveCurrentFrameConfidence();
    const currVideo = allFrames[currentIndex]?.video_id, nextVideo = allFrames[index]?.video_id;
    if (window.UnifiedZoom && currVideo !== nextVideo) window.UnifiedZoom.resetZoom();
    currentIndex = index; selectedDetId = null; hidePopover(); updateUrlFrameIndex(index);
    const frame = allFrames[currentIndex];
    minConfidence = (frame.min_confidence !== undefined) ? parseFloat(frame.min_confidence) : 0.0;
    const slider = document.getElementById('confidence-slider'), labelVal = document.getElementById('conf-threshold-val');
    if (slider) slider.value = Math.round(minConfidence * 100);
    if (labelVal) labelVal.textContent = `${Math.round(minConfidence * 100)}%`;

    const targetUrl = frame.raw_image_url || frame.image_url, imgEl = document.getElementById('main-frame-img'), counterEl = document.getElementById('hud-frame-counter'), loaderEl = document.getElementById('canvas-loader');
    const isPreloaded = (window.UnifiedPreloader && window.UnifiedPreloader.isFramePreloaded(targetUrl)) || imgEl.complete;
    if (loaderEl) { const span = loaderEl.querySelector('span'); if (span) span.textContent = 'Loading keyframe...'; if (isPreloaded) loaderEl.classList.add('hidden'); else { loaderEl.style.display = ''; loaderEl.classList.remove('hidden'); } }
    const onFinish = () => { if (loaderEl) { loaderEl.classList.add('hidden'); const span = loaderEl.querySelector('span'); if (span) span.textContent = 'Loading keyframe...'; } if (window.SvgOverlay) window.SvgOverlay.render(frame, showMasks, minConfidence); };
    imgEl.onload = onFinish; imgEl.onerror = onFinish; imgEl.src = targetUrl;
    if (imgEl.complete) onFinish();
    if (window.UnifiedPreloader) window.UnifiedPreloader.preloadNeighborFrames(allFrames, currentIndex);

    if (counterEl) {
      const sameVidFrames = allFrames.filter((f) => f.video_id === frame.video_id);
      const localIdx = sameVidFrames.findIndex((f) => f.frame_index === frame.frame_index) + 1;
      const realFrameNum = (frame.frame_index !== undefined) ? frame.frame_index : currentIndex;
      const rawVidId = frame.video_id || 'Video';
      const shortVidId = rawVidId.length > 4 ? (rawVidId.substring(0, 2) + '..') : rawVidId;
      counterEl.textContent = `${shortVidId} • F${realFrameNum} (${localIdx > 0 ? localIdx : currentIndex + 1}/${sameVidFrames.length || allFrames.length})`;
      if (window.updateFrameStepperForVideo) window.updateFrameStepperForVideo(frame.video_id, sameVidFrames.length, frame.total_video_frames || 0);
    }
    if (window.BoxDrawer && window.BoxDrawer.onFrameChange) window.BoxDrawer.onFrameChange(frame);
    if (window.ViewerUI) { window.ViewerUI.updateSidePanel(frame, selectedDetId, minConfidence); window.ViewerUI.highlightActiveThumbnail(currentIndex, allFrames); }
  }

  const postApi = window.postApi || function(endpoint, dataObj, callback) {
    const formData = new FormData(); Object.keys(dataObj).forEach((k) => formData.append(k, dataObj[k]));
    fetch(endpoint, { method: 'POST', body: formData })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          if (callback) callback(d);
        } else if (window.showToast) {
          window.showToast(d.error || d.message || 'Action failed', 'danger');
        }
      })
      .catch((err) => {
        if (window.showToast) window.showToast('Request failed: ' + err, 'danger');
      });
  };

  let selectedDetIds = new Set();

  function selectDetection(detId, isMulti = false) {
    const frame = allFrames[currentIndex]; if (!frame) return;
    if (isMulti) { if (selectedDetIds.has(detId)) selectedDetIds.delete(detId); else if (detId) selectedDetIds.add(detId); }
    else { selectedDetIds.clear(); if (detId) selectedDetIds.add(detId); }
    selectedDetId = selectedDetIds.size > 0 ? Array.from(selectedDetIds)[0] : null;
    if (frame.detections) frame.detections.forEach((d) => d.selected = selectedDetIds.has(d.id));
    if (window.SvgOverlay) window.SvgOverlay.render(frame, showMasks, minConfidence, showDeleted, showLabels);
    if (window.ViewerUI) window.ViewerUI.updateSidePanel(frame, selectedDetId, minConfidence);
    showPopover(selectedDetId);
  }

  function setSelectedDetections(idsArray, isAdditive = false) {
    const frame = allFrames[currentIndex]; if (!frame) return;
    if (!isAdditive) selectedDetIds.clear();
    (idsArray || []).forEach((id) => { if (id) selectedDetIds.add(id); });
    selectedDetId = selectedDetIds.size > 0 ? Array.from(selectedDetIds)[0] : null;
    if (frame.detections) frame.detections.forEach((d) => d.selected = selectedDetIds.has(d.id));
    if (window.SvgOverlay) window.SvgOverlay.render(frame, showMasks, minConfidence, showDeleted, showLabels);
    if (window.ViewerUI) window.ViewerUI.updateSidePanel(frame, selectedDetId, minConfidence);
    showPopover(selectedDetId);
  }

  function deselectAll() {
    selectedDetIds.clear(); selectedDetId = null; const frame = allFrames[currentIndex];
    if (frame && frame.detections) frame.detections.forEach((d) => d.selected = false);
    if (window.SvgOverlay) window.SvgOverlay.render(frame, showMasks, minConfidence, showDeleted, showLabels);
    if (window.ViewerUI) window.ViewerUI.updateSidePanel(frame, selectedDetId, minConfidence);
    hidePopover();
  }

  function showPopover(detId) {
    const popover = document.getElementById('popover-action-bar'), deleteBtn = document.getElementById('btn-popover-delete'), segmentBtn = document.getElementById('btn-popover-segment'), cropBtn = document.getElementById('btn-popover-crop-train');
    const frame = allFrames[currentIndex], count = selectedDetIds.size;
    let det = (frame?.detections || []).find((d) => d.id === detId);
    if (!det && window.BoxDrawer && window.BoxDrawer.getDrawnBoxes) det = window.BoxDrawer.getDrawnBoxes().find((b) => b.id === detId);
    if (popover && count > 0) {
      if (segmentBtn) {
        segmentBtn.classList.toggle('hidden', !((det && det.is_drawn) || count > 0));
        segmentBtn.setAttribute('title', count > 1 ? `Segment Selected Objects [G] (${count} items)` : 'Segment Object [G]');
        segmentBtn.onclick = () => window.BoxDrawer && window.BoxDrawer.segmentSelectedBox();
        const segmentBadge = segmentBtn.querySelector('.hud-popover__badge');
        if (segmentBadge) { segmentBadge.textContent = count; segmentBadge.classList.toggle('hidden', count <= 1); }
      }
      if (deleteBtn) {
        const isRestore = det && det.deleted && count === 1;
        deleteBtn.setAttribute('title', isRestore ? 'Restore Object' : (count > 1 ? `Delete Selected Objects [X] (${count} items)` : 'Delete Object [X]'));
        deleteBtn.className = isRestore ? 'hud-popover__btn hud-popover__btn--restore' : 'hud-popover__btn hud-popover__btn--delete';
        if (isRestore) {
          deleteBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><polyline points="3 3 3 8 8 8"/></svg><span class="hud-popover__badge hidden"></span>`;
        } else {
          deleteBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg><span class="hud-popover__badge hidden"></span>`;
        }
        deleteBtn.onclick = () => { if (isRestore) restoreDetection(detId); else deleteDetection(); };
        const delBadge = deleteBtn.querySelector('.hud-popover__badge');
        if (delBadge) { delBadge.textContent = count; delBadge.classList.toggle('hidden', count <= 1); }
      }
      if (cropBtn) {
        cropBtn.classList.toggle('hidden', count === 0);
        cropBtn.setAttribute('title', count > 1 ? `Crop & Sample Objects [C] (${count} items)` : 'Crop & Sample Object [C]');
        cropBtn.onclick = () => cropSelectedBoxesAndTrain();
        const cropBadge = cropBtn.querySelector('.hud-popover__badge');
        if (cropBadge) { cropBadge.textContent = count; cropBadge.classList.toggle('hidden', count <= 1); }
      }
      popover.classList.remove('hidden');
    }
  }

  function hidePopover() { document.getElementById('popover-action-bar')?.classList.add('hidden'); }
  function deleteDetection(detId) {
    const targets = detId ? [detId] : Array.from(selectedDetIds), frame = allFrames[currentIndex]; if (targets.length === 0 || !frame) return; let pending = targets.length;
    targets.forEach((tid) => {
      if (window.BoxDrawer && window.BoxDrawer.getDrawnBoxes().some((b) => b.id === tid)) { window.BoxDrawer.removeDrawnBox(tid); pending--; if (pending === 0) { deselectAll(); loadFrame(currentIndex); } }
      else { postApi('/api/detection/delete', { playlist_name: window.PLAYLIST_NAME, video_id: frame.video_id, json_filename: frame.json_filename, detection_id: tid }, (data) => { frame.detections = data.detections; frame._lastLocalUpdate = Date.now(); pending--; if (pending === 0) { deselectAll(); loadFrame(currentIndex); } }); }
    });
  }
  function restoreDetection(detId) { const targetId = detId || selectedDetId, frame = allFrames[currentIndex]; if (!targetId || !frame) return; postApi('/api/detection/restore', { playlist_name: window.PLAYLIST_NAME, video_id: frame.video_id, json_filename: frame.json_filename, detection_id: targetId }, (data) => { frame.detections = data.detections; frame._lastLocalUpdate = Date.now(); deselectAll(); loadFrame(currentIndex); }); }
  function verifyCurrentFrame(status) { if (allFrames.length === 0) return; const frame = allFrames[currentIndex], notes = document.getElementById('verification-notes-input')?.value || ''; postApi('/api/verify', { playlist_name: window.PLAYLIST_NAME, video_id: frame.video_id, json_filename: frame.json_filename, status, notes, min_confidence: minConfidence }, (data) => { frame.verification = data.verification; frame._lastLocalUpdate = Date.now(); if (window.ViewerUI) { window.ViewerUI.updateSidePanel(frame, selectedDetId, minConfidence); window.ViewerUI.renderThumbnails(allFrames, currentIndex, loadFrame); } }); }
  function editDetectionLabel(detId) {
    const targetId = detId || selectedDetId, frame = allFrames[currentIndex];
    if (!targetId || !frame) return;
    const det = (frame.detections || []).find((d) => d.id === targetId);
    if (!det) return;
    const handleApplyLabel = (newLabel) => {
      if (!newLabel || newLabel === det.label) return;
      if (window.LabelManager?.addLabel) window.LabelManager.addLabel(newLabel);
      postApi('/api/detection/label', { playlist_name: window.PLAYLIST_NAME, video_id: frame.video_id, json_filename: frame.json_filename, detection_id: targetId, new_label: newLabel }, (data) => {
        if (data.success && data.detections) {
          frame.detections = data.detections; frame._lastLocalUpdate = Date.now();
          if (window.ViewerUI?.showToast) window.ViewerUI.showToast(`✅ Updated label to '${newLabel}' and saved crop`, 'success');
          if (typeof fetchDatasetCrops === 'function') {
            fetchDatasetCrops(() => {
              loadFrame(currentIndex);
            });
          } else {
            loadFrame(currentIndex);
          }
        }
      });
    };
    if (window.LabelManager?.openLabelPickerModal) window.LabelManager.openLabelPickerModal(det.label, handleApplyLabel);
    else { const fallback = prompt('Enter new target label:', det.label); if (fallback) handleApplyLabel(fallback.trim().toLowerCase()); }
  }


  function triggerSam3TopBarDetection() {
    if (allFrames.length === 0) return;
    const activeFrame = allFrames[currentIndex], vid = activeFrame ? activeFrame.video_id : null, btn = document.getElementById('btn-run-sam3-topbar');
    if (btn) btn.disabled = true;
    postApi('/api/detection/run', { playlist_name: window.PLAYLIST_NAME || '', video_id: vid || '', targets: window.TARGETS_STR || '', force_reprocess: 'true' }, (data) => {
      if (data.status === 'busy') {
        if (window.showToast) window.showToast(data.message || '⚠️ SAM3 detection is already running.', 'warning');
        if (btn) btn.disabled = false;
      } else {
        if (window.showToast) window.showToast(data.message || `Started SAM3 detection for video '${vid}'`, 'success');
        const statusElem = document.getElementById('sam3-status-container');
        if (statusElem && window.htmx) window.htmx.trigger(statusElem, 'load');
      }
    });
  }

  function bindUIEvents() {
    const bind = (id, fn) => document.getElementById(id)?.addEventListener('click', fn);
    bind('btn-prev-frame', () => loadFrame(currentIndex - 1)); bind('btn-next-frame', () => loadFrame(currentIndex + 1));
    bind('btn-toggle-mask', () => { showMasks = !showMasks; document.getElementById('btn-toggle-mask')?.classList.toggle('hud-btn--active', showMasks); if (window.SvgOverlay) window.SvgOverlay.render(allFrames[currentIndex], showMasks, minConfidence, showDeleted, showLabels); });
    bind('btn-render-dataset', () => postApi('/api/render', { playlist_name: window.PLAYLIST_NAME, targets: window.TARGETS_STR }, (data) => alert(`Render complete! ${data.total_rendered} MP4 video(s) saved to 03-render/`)));
    bind('btn-propagate-prev', () => window.UnifiedPropagator && window.UnifiedPropagator.propagateBBoxes('prev')); bind('btn-propagate-next', () => window.UnifiedPropagator && window.UnifiedPropagator.propagateBBoxes('next'));
    bind('btn-toggle-labels', () => toggleLabels()); bind('btn-toggle-deleted', () => toggleShowDeleted()); bind('btn-open-json', () => window.openJsonModal && window.openJsonModal()); bind('btn-open-help', () => window.toggleHelpModal && window.toggleHelpModal());
    bind('btn-run-sam3-topbar', () => triggerSam3TopBarDetection());
    bind('btn-toggle-left-drawer', () => document.getElementById('left-drawer')?.classList.toggle('hud-drawer--collapsed'));
    bind('btn-minimize-left-drawer', () => { const drawer = document.getElementById('left-drawer'); if (!drawer) return; drawer.classList.remove('hud-drawer--collapsed'); const isMin = drawer.classList.toggle('hud-drawer--minimized'); document.getElementById('btn-minimize-left-drawer')?.classList.toggle('hud-drawer__toggle--active', isMin); });
    bind('btn-toggle-right-sidesheet', () => document.getElementById('right-sidesheet')?.classList.toggle('hud-sidesheet--collapsed')); bind('main-frame-img', () => deselectAll());
    bind('btn-reprocess-frame', () => reprocessCurrentFrame());

    const slider = document.getElementById('confidence-slider'), labelVal = document.getElementById('conf-threshold-val'), reprocBtn = document.getElementById('btn-reprocess-frame');
    slider?.addEventListener('input', (e) => {
      const pct = parseInt(e.target.value, 10); minConfidence = pct / 100;
      if (labelVal) labelVal.textContent = `${pct}%`;
      if (reprocBtn && !reprocBtn.disabled) reprocBtn.innerHTML = pct > 0 ? `🔄 Reprocess SAM3 (Conf ≥ ${pct}%)` : '🔄 Reprocess SAM3 Frame';
      if (window.SvgOverlay) window.SvgOverlay.render(allFrames[currentIndex], showMasks, minConfidence, showDeleted, showLabels);
      if (window.ViewerUI) window.ViewerUI.updateSidePanel(allFrames[currentIndex], selectedDetId, minConfidence);
    });
    slider?.addEventListener('change', () => saveCurrentFrameConfidence());
    const notesInput = document.getElementById('verification-notes-input');
    notesInput?.addEventListener('blur', () => saveCurrentFrameVerification());
    notesInput?.addEventListener('input', () => { clearTimeout(saveTimer); saveTimer = setTimeout(saveCurrentFrameVerification, 600); });
    window.addEventListener('resize', () => window.SvgOverlay && window.SvgOverlay.render(allFrames[currentIndex], showMasks, minConfidence, showDeleted, showLabels));
  }

  function cropSelectedBoxesAndTrain() {
    const frame = allFrames[currentIndex];
    if (!frame) return;

    const count = selectedDetIds.size;
    if (count === 0) {
      if (window.ViewerUI && window.ViewerUI.showToast) {
        window.ViewerUI.showToast("⚠️ Select at least one bounding box to crop & train.", "error");
      }
      return;
    }

    const allDets = (frame.detections || []).concat(window.BoxDrawer && typeof window.BoxDrawer.getDrawnBoxes === 'function' ? window.BoxDrawer.getDrawnBoxes() : []);
    const selectedDets = allDets.filter(d => selectedDetIds.has(d.id));
    const validDets = selectedDets.filter(d => d.label && d.label !== 'object' && d.label !== 'unknown' && !d.label.startsWith('drawn_box') && !d.label.startsWith('custom_box'));

    if (validDets.length === 0) {
      if (window.ViewerUI && window.ViewerUI.showToast) {
        window.ViewerUI.showToast("⚠️ No selected detections with valid target labels to crop. Assign labels first.", "error");
      }
      return;
    }

    const detectionsData = validDets.map(d => ({
      id: d.id,
      bbox_xyxy: d.bbox_xyxy,
      label: d.label,
      confidence: d.confidence || 1.0
    }));

    if (window.ViewerUI && window.ViewerUI.showToast) {
      window.ViewerUI.showToast(`✂️ Cropping and queuing ${validDets.length} samples...`, 'info');
    }

    postApi('/api/classifier/crop-and-train', {
      playlist_name: window.PLAYLIST_NAME,
      video_id: frame.video_id,
      json_filename: frame.json_filename,
      detections_json: JSON.stringify(detectionsData)
    }, (data) => {
      if (data.success) {
        deselectAll();
        fetchDatasetCrops(() => {
          loadFrame(currentIndex);
        });
      } else {
        if (window.ViewerUI && window.ViewerUI.showToast) {
          window.ViewerUI.showToast(`🔴 Failed to crop & train: ${data.error || 'unknown error'}`, 'error');
        }
      }
    });
  }

  function fetchDatasetCrops(callback) {
    const url = `/api/classifier/dataset/crops?playlist_name=${encodeURIComponent(window.PLAYLIST_NAME)}`;
    fetch(url)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          window.ViewerApp.datasetCrops = data.crops || [];
        }
        if (callback) callback();
      })
      .catch(err => {
        console.error('Failed to load dataset crops:', err);
        if (callback) callback();
      });
  }

  function cropSingleDetection(detId) {
    const frame = allFrames[currentIndex];
    if (!frame) return;

    const det = (frame.detections || []).concat(window.BoxDrawer?.getDrawnBoxes() || []).find((d) => d.id === detId);
    if (!det) return;

    const detectionsData = [{
      id: det.id,
      bbox_xyxy: det.bbox_xyxy,
      label: det.label,
      confidence: det.confidence || 1.0
    }];

    if (window.ViewerUI && window.ViewerUI.showToast) {
      window.ViewerUI.showToast(`✂️ Cropping and queuing sample...`, 'info');
    }

    postApi('/api/classifier/crop-and-train', {
      playlist_name: window.PLAYLIST_NAME,
      video_id: frame.video_id,
      json_filename: frame.json_filename,
      detections_json: JSON.stringify(detectionsData)
    }, (data) => {
      if (data.success) {
        fetchDatasetCrops(() => {
          loadFrame(currentIndex);
        });
      } else {
        if (window.ViewerUI && window.ViewerUI.showToast) {
          window.ViewerUI.showToast(`🔴 Failed to crop & train: ${data.error || 'unknown error'}`, 'error');
        }
      }
    });
  }

  window.ViewerApp = {
    stepFrames: (d) => loadFrame(currentIndex + d), nextFrame: () => loadFrame(currentIndex + 1), prevFrame: () => loadFrame(currentIndex - 1), loadFrame,
    propagateBBoxes: (dir) => window.UnifiedPropagator && window.UnifiedPropagator.propagateBBoxes(dir), triggerSam3TopBarDetection,
    getAllFrames: () => allFrames, get currentIndex() { return currentIndex; }, get minConfidence() { return minConfidence; }, get showDeleted() { return showDeleted; }, get showLabels() { return showLabels; },
    toggleShowDeleted, toggleLabels, verifyCurrentFrame, saveCurrentFrameVerification, saveCurrentFrameConfidence, deleteDetection, restoreDetection, selectDetection, setSelectedDetections, deselectAll, get selectedDetIds() { return selectedDetIds; },
    editDetectionLabel, toggleDetectionVisibility: (detId) => {
      const frame = allFrames[currentIndex];
      const det = (frame?.detections || []).find((d) => d.id === detId);
      if (det) {
        det.hidden = !det.hidden;
        det.manually_hidden = det.hidden;
        window.ViewerApp.manuallyHiddenCache = window.ViewerApp.manuallyHiddenCache || {};
        const key = `${frame.json_filename}_${det.id}`;
        window.ViewerApp.manuallyHiddenCache[key] = det.hidden;
        if (window.ViewerUI) window.ViewerUI.updateSidePanel(frame, selectedDetId, minConfidence);
        if (window.SvgOverlay) window.SvgOverlay.render(frame, showMasks, minConfidence, showDeleted, showLabels);
      }
    },
    updateDatasetFromPolling: (newAlbums, activeProcessingFrame) => {
      if (window.ViewerHelpers?.updateDatasetFromPolling) {
        allFrames = window.ViewerHelpers.updateDatasetFromPolling(newAlbums, allFrames, currentIndex, selectedDetId, showMasks, minConfidence, showDeleted, showLabels, loadFrame, showPopover);
      }
    },
    getCurrentFrame: () => allFrames[currentIndex], get selectedDetId() { return selectedDetId; },
    cropSelectedBoxesAndTrain,
    cropSingleDetection,
    fetchDatasetCrops,
    datasetCrops: [],
    startSam3Service: () => {
      const btn = document.getElementById("btn-start-sam3");
      const badge = document.getElementById("sam3-model-badge");
      
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `⏳ Starting...`;
        btn.style.opacity = "0.6";
        btn.style.cursor = "not-allowed";
      }
      
      if (badge) {
        badge.classList.remove("hud-badge--sam3-offline", "hud-badge--sam3-warming", "hud-badge--sam3-online", "hud-badge--sam3-failed");
        badge.textContent = "SAM3: WARM";
        badge.classList.add("hud-badge--sam3-warming");
      }

      if (window.ViewerUI && window.ViewerUI.showToast) {
        window.ViewerUI.showToast("🚀 Starting SAM3 service asynchronously...", "info");
      }
      
      fetch("/api/server/start-sam3", { method: "POST" })
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            if (window.ViewerUI && window.ViewerUI.showToast) {
              window.ViewerUI.showToast("🟢 SAM3 service start triggered successfully.", "success");
            }
          } else {
            if (btn) {
              btn.disabled = false;
              btn.innerHTML = `▶ Start SAM3`;
              btn.style.opacity = "";
              btn.style.cursor = "";
            }
            if (badge) {
              badge.classList.remove("hud-badge--sam3-warming");
              badge.textContent = "SAM3: FAILED";
              badge.classList.add("hud-badge--sam3-failed");
            }
            if (window.ViewerUI && window.ViewerUI.showToast) {
              window.ViewerUI.showToast(`🔴 Failed to start: ${data.error}`, "error");
            }
          }
        })
        .catch(err => {
          if (btn) {
            btn.disabled = false;
            btn.innerHTML = `▶ Start SAM3`;
            btn.style.opacity = "";
            btn.style.cursor = "";
          }
          if (badge) {
            badge.classList.remove("hud-badge--sam3-warming");
            badge.textContent = "SAM3: OFFLINE";
            badge.classList.add("hud-badge--sam3-offline");
          }
          if (window.ViewerUI && window.ViewerUI.showToast) {
            window.ViewerUI.showToast(`🔴 Connection error: ${err.message}`, "error");
          }
        });
    },
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initViewer); else initViewer();
})();

