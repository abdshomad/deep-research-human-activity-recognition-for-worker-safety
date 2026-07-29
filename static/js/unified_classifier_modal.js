/**
 * Unified SAM3 Classifier Modal & Integration
 */
(function () {
  function saveLabelForDetection(detId, label) {
    const frame = window.ViewerApp ? window.ViewerApp.getCurrentFrame() : null;
    if (!frame || !detId || !label) return console.error("[saveLabelForDetection] Missing arguments or frame");
    const cleanLabel = label.trim().toLowerCase();
    if (window.LabelManager?.addLabel) window.LabelManager.addLabel(cleanLabel);

    const detIdStr = String(detId);
    let box = null;
    if (window.BoxDrawer && typeof window.BoxDrawer.getDrawnBoxes === 'function') {
      box = window.BoxDrawer.getDrawnBoxes().find(b => b.id === detIdStr);
    }
    console.log("[saveLabelForDetection] Type:", box ? "drawn" : "backend", "ID:", detIdStr, "Label:", cleanLabel);

    if (box) {
      box.label = cleanLabel;
      try {
        const k = `EZLAB_DRAWN_BOXES_${window.PLAYLIST_NAME||'default'}`, s = localStorage.getItem(k);
        if (s) {
          const m = JSON.parse(s)||{}, fk = `${frame.video_id}_${frame.json_filename}`;
          if (m[fk]) { const b = m[fk].find(item => item.id === detIdStr); if (b) { b.label = cleanLabel; localStorage.setItem(k, JSON.stringify(m)); } }
        }
      } catch (e) {}
      if (window.SvgOverlay) window.SvgOverlay.render(frame, window.ViewerApp.showMasks, window.ViewerApp.minConfidence, window.ViewerApp.showDeleted, window.ViewerApp.showLabels);
      if (window.ViewerUI) window.ViewerUI.updateSidePanel(frame, window.ViewerApp.selectedDetId, window.ViewerApp.minConfidence);
      if (window.ViewerUI?.showToast) window.ViewerUI.showToast(`✅ Updated temporary label to '${cleanLabel}'`, 'success');
      window.ViewerApp.loadFrame(window.ViewerApp.currentIndex);
    } else {
      if (window.ViewerUI?.showToast) window.ViewerUI.showToast(`⏳ Updating label to '${cleanLabel}'...`, 'info');
      window.postApi('/api/detection/label', {
        playlist_name: window.PLAYLIST_NAME, video_id: frame.video_id,
        json_filename: frame.json_filename, detection_id: detIdStr, new_label: cleanLabel
      }, (data) => {
        console.log("[saveLabelForDetection] Response:", data);
        if (data.success && data.detections) {
          frame.detections = data.detections; frame._lastLocalUpdate = Date.now();
          if (window.ViewerUI?.showToast) window.ViewerUI.showToast(`✅ Updated label to '${cleanLabel}'`, 'success');
          if (typeof window.ViewerApp.fetchDatasetCrops === 'function') {
            window.ViewerApp.fetchDatasetCrops(() => window.ViewerApp.loadFrame(window.ViewerApp.currentIndex));
          } else { window.ViewerApp.loadFrame(window.ViewerApp.currentIndex); }
        } else if (window.ViewerUI?.showToast) { window.ViewerUI.showToast('⚠️ Label could not be updated.', 'warning'); }
      });
    }
  }

  function classifyBoundingBox(detId) {
    console.log("[classifyBoundingBox] START -> detId:", detId);
    if (window.ViewerApp) window.ViewerApp.currentDetIdToClassify = detId;
    const frame = window.ViewerApp ? window.ViewerApp.getCurrentFrame() : null;
    console.log("[classifyBoundingBox] Frame info:", frame ? { video_id: frame.video_id, json_filename: frame.json_filename } : "none");
    if (!frame) return;

    let det = (frame.detections || []).find((d) => d.id === detId);
    if (!det && window.BoxDrawer && typeof window.BoxDrawer.getDrawnBoxes === 'function') {
      det = window.BoxDrawer.getDrawnBoxes().find((b) => b.id === detId);
      console.log("[classifyBoundingBox] Found in drawn boxes:", !!det);
    } else { console.log("[classifyBoundingBox] Found in backend detections:", !!det); }
    if (!det) {
      console.error("[classifyBoundingBox] ERROR: Bounding box object not found!");
      if (window.showToast) window.showToast("⚠️ Could not find bounding box object.", "error");
      return;
    }

    const modal = document.getElementById('modal-classification-result');
    if (!modal) return console.error("[classifyBoundingBox] ERROR: modal element not found!");
    modal.classList.remove('hidden');

    const loadingEl = document.getElementById('classification-loading');
    const untrainedEl = document.getElementById('classification-untrained');
    const resultsEl = document.getElementById('classification-results');
    const trainingEl = document.getElementById('classification-training');
    const confirmBtn = document.getElementById('btn-classification-confirm');

    loadingEl.classList.remove('hidden'); untrainedEl.classList.add('hidden'); resultsEl.classList.add('hidden');
    if (trainingEl) trainingEl.classList.add('hidden');
    if (confirmBtn) confirmBtn.classList.add('hidden');

    const formData = new FormData();
    formData.append('playlist_name', window.PLAYLIST_NAME);
    formData.append('image_path', frame.raw_image_url || frame.image_url);
    formData.append('bbox_json', JSON.stringify(det.bbox_xyxy));

    console.log("[classifyBoundingBox] Fetching predict API...");
    fetch('/api/classifier/predict', { method: 'POST', body: formData })
      .then(res => res.json())
      .then(data => {
        console.log("[classifyBoundingBox] Predict API response:", data);
        loadingEl.classList.add('hidden');
        if (data.success) {
          resultsEl.classList.remove('hidden');
          const cropImg = document.getElementById('classification-crop-img');
          if (cropImg) cropImg.src = data.crop_url;

          const topLabel = document.getElementById('classification-top-label');
          const topBar = document.getElementById('classification-top-bar');
          const topConf = document.getElementById('classification-top-conf');

          if (topLabel) topLabel.textContent = data.predicted_class.toUpperCase();
          const topPct = Math.round(data.confidence * 100);
          if (topBar) topBar.style.width = `${topPct}%`; if (topConf) topConf.textContent = `${topPct}%`;

          let currentSelectedLabel = data.predicted_class;
          const updateConfirmButton = (lbl) => {
            console.log("[classifyBoundingBox] updateConfirmButton for label:", lbl);
            if (confirmBtn) {
              confirmBtn.classList.remove('hidden');
              confirmBtn.textContent = `Confirm Label: ${lbl.toUpperCase()}`;
              confirmBtn.onclick = () => {
                console.log("[classifyBoundingBox] Confirm clicked -> saving label:", lbl, "for detId:", detId);
                saveLabelForDetection(detId, lbl);
                modal.classList.add('hidden');
              };
            }
          };
          updateConfirmButton(currentSelectedLabel);

          const listEl = document.getElementById('classification-bars-list');
          if (listEl) {
            listEl.innerHTML = '';
            const allProbs = data.all_probabilities || {};
            const sortedLabels = Object.entries(allProbs).sort((a, b) => b[1] - a[1]);
            
            sortedLabels.forEach(([label, prob]) => {
              const pct = Math.round(prob * 100);
              const barItem = document.createElement('div');
              const isSelected = label === currentSelectedLabel;
              barItem.dataset.selected = isSelected ? 'true' : 'false';
              
              barItem.style.cssText = `display:flex; flex-direction:column; gap:4px; padding:6px 10px; border-radius:6px; border:1px solid ${isSelected ? '#8b5cf6' : 'transparent'}; cursor:pointer; transition:all 0.15s; background:${isSelected ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.02)'};`;
              
              barItem.innerHTML = `
                <div style="display:flex; justify-content:space-between; font-size:12px; color:${isSelected ? '#c4b5fd' : '#f8fafc'};" class="class-label-row">
                  <span style="font-weight:500;" class="class-label-name">${label.toUpperCase()}</span>
                  <span style="font-weight:600; color:#cbd5e1;">${pct}%</span>
                </div>
                <div style="background:#0f172a; height:6px; border-radius:3px; overflow:hidden;">
                  <div style="background:#8b5cf6; height:100%; width:${pct}%;"></div>
                </div>
              `;

              barItem.onmouseover = () => { if (barItem.dataset.selected !== 'true') { barItem.style.background = 'rgba(255,255,255,0.06)'; barItem.style.borderColor = 'rgba(255,255,255,0.1)'; } };
              barItem.onmouseout = () => { if (barItem.dataset.selected !== 'true') { barItem.style.background = 'rgba(255,255,255,0.02)'; barItem.style.borderColor = 'transparent'; } };
              barItem.onclick = () => {
                console.log("[classifyBoundingBox] User clicked label item:", label);
                Array.from(listEl.children).forEach(c => { c.dataset.selected = 'false'; c.style.background = 'rgba(255,255,255,0.02)'; c.style.borderColor = 'transparent'; const r = c.querySelector('.class-label-row'); if (r) r.style.color = '#f8fafc'; });
                barItem.dataset.selected = 'true'; barItem.style.background = 'rgba(139,92,246,0.15)'; barItem.style.borderColor = '#8b5cf6';
                const row = barItem.querySelector('.class-label-row'); if (row) row.style.color = '#c4b5fd';
                currentSelectedLabel = label; updateConfirmButton(currentSelectedLabel);
              };
              listEl.appendChild(barItem);
            });
          }
        } else if (data.model_not_trained) {
          console.warn("[classifyBoundingBox] Model not trained.");
          untrainedEl.classList.remove('hidden');
        } else {
          console.error("[classifyBoundingBox] Predict failed:", data.error);
          if (window.showToast) window.showToast(data.error || "Prediction failed.", "danger");
          modal.classList.add('hidden');
        }
      })
      .catch(err => {
        console.error("[classifyBoundingBox] Network error:", err);
        loadingEl.classList.add('hidden');
        if (window.showToast) window.showToast("Request failed: " + err, "danger");
        modal.classList.add('hidden');
      });
  }

  function updatePopoverClassifyBtn(detId) {
    const classifyBtn = document.getElementById('btn-popover-classify-this');
    if (!classifyBtn) return;
    const count = window.ViewerApp && window.ViewerApp.selectedDetIds ? window.ViewerApp.selectedDetIds.size : 0;
    if (count === 1 && detId) {
      classifyBtn.classList.remove('hidden');
      classifyBtn.onclick = () => classifyBoundingBox(detId);
    } else { classifyBtn.classList.add('hidden'); }
  }

  function addSidePanelClassifyButtons(frame) {
    const detListEl = document.getElementById('side-detections-list'); if (!detListEl) return;
    detListEl.querySelectorAll('.det-item').forEach((item) => {
      const actionsEl = item.querySelector('.det-item__actions'); if (!actionsEl || actionsEl.querySelector('.btn-det-classify') || item.classList.contains('det-item--deleted')) return;
      const anyBtn = actionsEl.querySelector('button'); if (!anyBtn) return;
      const idMatch = (anyBtn.getAttribute('onclick') || '').match(/'([^']+)'/); if (!idMatch) return;
      const detId = idMatch[1], classifyBtn = document.createElement('button');
      classifyBtn.className = 'hud-btn--mini btn-det-classify';
      classifyBtn.setAttribute('title', 'Re-Classify Object');
      classifyBtn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>';
      classifyBtn.onclick = (e) => { e.stopPropagation(); classifyBoundingBox(detId); };
      actionsEl.insertBefore(classifyBtn, actionsEl.firstChild);
    });
  }

  function initClassifierModal() {
    if (window.ViewerApp) {
      window.ViewerApp.classifySingleDetection = classifyBoundingBox;
      window.ViewerApp.classifySelectedBox = function () {
        const selectedIds = window.ViewerApp.selectedDetIds;
        if (!selectedIds || selectedIds.size === 0) {
          if (window.showToast) window.showToast("⚠️ Please select a bounding box to classify.", "warning");
          return;
        }
        classifyBoundingBox(Array.from(selectedIds)[0]);
      };
      const origSelect = window.ViewerApp.selectDetection;
      if (typeof origSelect === 'function') window.ViewerApp.selectDetection = (detId, isMulti) => { origSelect(detId, isMulti); updatePopoverClassifyBtn(detId); };
      const origSetSelected = window.ViewerApp.setSelectedDetections;
      if (typeof origSetSelected === 'function') window.ViewerApp.setSelectedDetections = (idsArray, isAdditive) => { origSetSelected(idsArray, isAdditive); updatePopoverClassifyBtn(window.ViewerApp.selectedDetId); };
    }
    if (window.ViewerUI && typeof window.ViewerUI.updateSidePanel === 'function') {
      const origUpdateSidePanel = window.ViewerUI.updateSidePanel;
      window.ViewerUI.updateSidePanel = function (frame, selectedDetId, minConfidence, showDeleted) {
        origUpdateSidePanel(frame, selectedDetId, minConfidence, showDeleted);
        addSidePanelClassifyButtons(frame);
      };
    }
  }

  function tryInit() {
    if (window.ViewerApp && window.ViewerUI && typeof window.ViewerUI.updateSidePanel === 'function') initClassifierModal();
    else setTimeout(tryInit, 50);
  }
  tryInit();
})();
