/**
 * Unified SAM3 Bounding Box & Mask Sequential Propagator & Keyframe Span Extractor
 */
(function () {
  function expandBBoxXyxy(bbox, expandPct) {
    if (!bbox || !expandPct || expandPct <= 0) return bbox;
    const xmin = bbox[0], ymin = bbox[1], xmax = bbox[2], ymax = bbox[3];
    const w = Math.max(1, xmax - xmin), h = Math.max(1, ymax - ymin);
    const cx = (xmin + xmax) / 2.0, cy = (ymin + ymax) / 2.0;
    const factor = 1.0 + (expandPct / 100.0);
    const newW = w * factor, newH = h * factor;
    return [Math.max(0, Math.round(cx - newW / 2.0)), Math.max(0, Math.round(cy - newH / 2.0)), Math.round(cx + newW / 2.0), Math.round(cy + newH / 2.0)];
  }

  async function propagateBBoxes(dir) {
    if (!window.ViewerApp) return;
    const currentFrame = window.ViewerApp.getCurrentFrame();
    if (!currentFrame) return;

    if (window.BoxDrawer && window.BoxDrawer.getDrawnBoxes) {
      const drawn = window.BoxDrawer.getDrawnBoxes();
      if (drawn && drawn.length > 0) {
        if (window.ViewerUI?.showToast) window.ViewerUI.showToast('⚡ Segmenting drawn box drafts first...', 'info');
        await window.BoxDrawer.segmentAllDrawnBoxes();
      }
    }

    const cnt = parseInt(document.getElementById('propagate-count-select')?.value || '1', 10);
    const expandPct = parseFloat(document.getElementById('propagate-expand-select')?.value || '10');
    const targetBtn = document.getElementById(dir === 'prev' ? 'btn-propagate-prev' : 'btn-propagate-next');
    const origHtml = targetBtn ? targetBtn.innerHTML : '';
    if (targetBtn) { targetBtn.disabled = true; targetBtn.innerHTML = '⚡ Propagating...'; }

    const loaderEl = document.getElementById('canvas-loader');
    const targets = document.getElementById('workspace-app')?.dataset.targets || '';
    let successCount = 0;

    for (let step = 1; step <= cnt; step++) {
      const srcFrame = window.ViewerApp.getCurrentFrame();
      if (!srcFrame) break;

      const targetIndex = dir === 'next' ? window.ViewerApp.currentIndex + 1 : window.ViewerApp.currentIndex - 1;
      const allFrames = window.ViewerApp.getAllFrames ? window.ViewerApp.getAllFrames() : [];

      if (targetIndex < 0 || targetIndex >= allFrames.length) {
        if (window.ViewerUI?.showToast) window.ViewerUI.showToast(`Reached ${targetIndex < 0 ? 'first' : 'last'} keyframe of video.`, 'info');
        break;
      }

      window.ViewerApp.loadFrame(targetIndex);
      const targetFrame = window.ViewerApp.getCurrentFrame();

      const srcDets = (srcFrame.detections || []).filter((d) => !d.deleted && d.bbox_xyxy);
      if (srcDets.length > 0 && targetFrame) {
        const promptBBoxes = srcDets.map((d, i) => ({
          id: `prop_prompt_${i}`, label: d.label || 'object', bbox_xyxy: expandBBoxXyxy(d.bbox_xyxy, expandPct),
          is_drawn: true, is_segmenting: true, confidence: 1.0, mask_color: '#38bdf8'
        }));
        const existingDets = (targetFrame.detections || []).filter((d) => !d.id?.startsWith('prop_prompt_'));
        targetFrame.detections = [...existingDets, ...promptBBoxes];
        if (window.SvgOverlay) window.SvgOverlay.render(targetFrame, true, 0);
        if (window.ViewerUI) window.ViewerUI.updateSidePanel(targetFrame, null, 0);
      }

      if (loaderEl) {
        loaderEl.classList.remove('hidden');
        loaderEl.style.display = 'flex';
        const span = loaderEl.querySelector('span');
        if (span) span.textContent = `⚡ Segmenting frame ${step} of ${cnt} with SAM3...`;
      }

      try {
        const fd = new FormData();
        fd.append('playlist_name', window.PLAYLIST_NAME);
        fd.append('video_id', srcFrame.video_id);
        fd.append('json_filename', srcFrame.json_filename);
        fd.append('direction', dir);
        fd.append('count', '1');
        fd.append('targets', targets);
        fd.append('expand_pct', expandPct.toString());

        const res = await fetch('/api/frame/propagate', { method: 'POST', body: fd });
        const data = await res.json();

        if (loaderEl) { loaderEl.classList.add('hidden'); loaderEl.style.display = ''; const span = loaderEl.querySelector('span'); if (span) span.textContent = 'Loading keyframe...'; }

        if (data.success && data.updated_frames && data.updated_frames.length > 0) {
          successCount++;
          data.updated_frames.forEach((uf) => {
            const match = allFrames.find((f) => f.video_id === srcFrame.video_id && (f.json_filename === uf.json_filename || f.frame_index === uf.frame_index));
            if (match) { match.is_processed = true; match.json_filename = uf.json_filename; match.detections = uf.detections; match._lastLocalUpdate = Date.now(); }
          });
          const curr = window.ViewerApp.getCurrentFrame();
          if (curr && window.SvgOverlay) window.SvgOverlay.render(curr, true, window.ViewerApp.minConfidence || 0);
          if (curr && window.ViewerUI) {
            window.ViewerUI.updateSidePanel(curr, window.ViewerApp.selectedDetId, window.ViewerApp.minConfidence || 0);
            window.ViewerUI.renderThumbnails(allFrames, window.ViewerApp.currentIndex, window.ViewerApp.loadFrame);
          }
        } else {
          if (window.ViewerUI?.showToast) window.ViewerUI.showToast(`⚠️ Propagation failed: ${data.error || 'Unknown error'}`, 'warning');
          break;
        }
      } catch (err) {
        if (loaderEl) { loaderEl.classList.add('hidden'); loaderEl.style.display = ''; const span = loaderEl.querySelector('span'); if (span) span.textContent = 'Loading keyframe...'; }
        if (window.ViewerUI?.showToast) window.ViewerUI.showToast(`⚠️ Error: ${err.message || err}`, 'error');
        break;
      }
    }

    if (targetBtn) { targetBtn.disabled = false; targetBtn.innerHTML = origHtml; }
    if (successCount > 0 && window.ViewerUI?.showToast) {
      window.ViewerUI.showToast(`✅ Propagated bboxes & segmented ${successCount} frame(s) with SAM3!`, 'success');
    }
  }

  let isSpanExtracting = false;
  let activeSpanButtonId = null;

  function updateSpanButtonLabels() {
    const countSelect = document.getElementById("span-count-select");
    const stepSelect = document.getElementById("span-step-select");
    const x = countSelect ? countSelect.value : "3";
    const y = parseInt(stepSelect ? stepSelect.value : "30", 10);

    const btnPrev = document.getElementById("btn-span-prev");
    const btnBoth = document.getElementById("btn-span-both");
    const btnNext = document.getElementById("btn-span-next");
    const warnEl = document.getElementById("span-overfit-warning");

    if (warnEl) {
      const curr = window.ViewerApp?.getCurrentFrame ? window.ViewerApp.getCurrentFrame() : null;
      const durSec = (curr?.total_video_frames || 0) / 30.0;
      const threshold = durSec >= 300 ? 15 : (durSec >= 60 ? 10 : 0);
      if (threshold > 0 && y < threshold) {
        warnEl.style.display = "flex";
        const span = warnEl.querySelector("span");
        if (span) span.textContent = `⚠️ Overfitting Risk: Close Frames (<${threshold}f)`;
      } else {
        warnEl.style.display = "none";
      }
    }

    if (btnPrev && !btnPrev.disabled) btnPrev.textContent = `◀ Prev (${x}f)`;
    if (btnBoth && !btnBoth.disabled) btnBoth.textContent = `Both (${x}f)`;
    if (btnNext && !btnNext.disabled) btnNext.textContent = `Next (${x}f) ▶`;
  }

  window.updateSpanProgress = function (processed, total, isComplete, percent) {
    const container = document.getElementById("span-progress-container");
    const textElem = document.getElementById("span-progress-text");
    const percentElem = document.getElementById("span-progress-percent");
    const fillElem = document.getElementById("span-progress-fill");
    const btn = activeSpanButtonId ? document.getElementById(activeSpanButtonId) : null;

    if (isComplete || (processed > 0 && processed >= total)) {
      if (container) container.style.display = "none";
      isSpanExtracting = false;
      activeSpanButtonId = null;
      updateSpanButtonLabels();
    } else if (isSpanExtracting) {
      const pct = Math.round(percent || 0);
      if (container) container.style.display = "block";
      if (textElem) textElem.textContent = `⚡ Extracting ${processed}/${total} frames...`;
      if (percentElem) percentElem.textContent = `${pct}%`;
      if (fillElem) fillElem.style.width = `${pct}%`;
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = `⚡ ${processed}/${total} (${pct}%)`;
      }
    }
  };

  async function triggerSpanExtraction(direction) {
    if (!window.ViewerApp?.getCurrentFrame) return;
    const curr = window.ViewerApp.getCurrentFrame();
    if (!curr) {
      if (window.ViewerUI?.showToast) window.ViewerUI.showToast("⚠️ Select a keyframe first.", "warning");
      return;
    }

    const countSelect = document.getElementById("span-count-select");
    const stepSelect = document.getElementById("span-step-select");
    const spanCount = countSelect ? parseInt(countSelect.value, 10) || 3 : 3;
    const stepFrames = stepSelect ? parseInt(stepSelect.value, 10) || 30 : 30;
    const btnId = direction === "prev" ? "btn-span-prev" : (direction === "next" ? "btn-span-next" : "btn-span-both");
    const btn = document.getElementById(btnId);

    isSpanExtracting = true;
    activeSpanButtonId = btnId;

    if (btn) { btn.disabled = true; btn.innerHTML = "⚡ 0% <span class='hud-stepper__spinner'></span>"; }
    const container = document.getElementById("span-progress-container");
    if (container) container.style.display = "block";

    try {
      const fd = new FormData();
      fd.append("playlist_name", window.PLAYLIST_NAME || "");
      fd.append("video_id", curr.video_id);
      fd.append("center_frame_index", curr.frame_index !== undefined ? curr.frame_index : 0);
      fd.append("span_count", spanCount);
      fd.append("step_frames", stepFrames);
      fd.append("direction", direction);
      fd.append("targets", window.TARGETS_STR || "");

      const res = await fetch("/api/frames/extract-span", { method: "POST", body: fd });
      const data = await res.json();

      if (data.status === "busy" || res.status === 409) {
        if (window.ViewerUI?.showToast) window.ViewerUI.showToast(data.message || "⚠️ Processing busy.", "warning");
        isSpanExtracting = false; if (container) container.style.display = "none"; updateSpanButtonLabels();
      } else if (data.status === "ok") {
        if (window.ViewerUI?.showToast) window.ViewerUI.showToast(data.message || `Started ${direction} extraction (${spanCount}f, ${stepFrames}f step).`, "success");
        const statusElem = document.getElementById("sam3-status-container");
        if (statusElem && window.htmx) window.htmx.trigger(statusElem, "load");
      }
    } catch (err) {
      if (window.ViewerUI?.showToast) window.ViewerUI.showToast("Failed to start span extraction.", "error");
      isSpanExtracting = false; if (container) container.style.display = "none"; updateSpanButtonLabels();
    }
  }

  async function triggerSam3SpanDetection() {
    const btn = document.getElementById("btn-run-sam3-span");
    if (btn) { btn.disabled = true; btn.innerHTML = '⚡ Starting SAM3... <span class="hud-stepper__spinner"></span>'; }
    try {
      const fd = new FormData();
      fd.append("playlist_name", window.PLAYLIST_NAME || "");
      fd.append("targets", window.TARGETS_STR || "");
      const res = await fetch("/api/frames/run-sam3-span", { method: "POST", body: fd });
      const data = await res.json();
      if (data.status === "ok") {
        if (window.ViewerUI?.showToast) window.ViewerUI.showToast("⚡ SAM3 detection started on span keyframes!", "info");
        const statusElem = document.getElementById("sam3-status-container");
        if (statusElem && window.htmx) window.htmx.trigger(statusElem, "load");
      } else {
        if (window.ViewerUI?.showToast) window.ViewerUI.showToast(data.message || "Failed to start SAM3 detection.", "warning");
      }
    } catch (err) {
      if (window.ViewerUI?.showToast) window.ViewerUI.showToast("Error starting SAM3 detection.", "error");
    } finally {
      if (btn) { btn.disabled = false; btn.innerHTML = '⚡ Run SAM3 Detection on Spans'; }
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    ["prev", "both", "next"].forEach((dir) => document.getElementById(`btn-span-${dir}`)?.addEventListener("click", () => triggerSpanExtraction(dir)));
    document.getElementById("btn-run-sam3-span")?.addEventListener("click", triggerSam3SpanDetection);
    document.getElementById("span-count-select")?.addEventListener("change", updateSpanButtonLabels);
    document.getElementById("span-step-select")?.addEventListener("change", updateSpanButtonLabels);
    updateSpanButtonLabels();
  });

  window.UnifiedPropagator = { propagateBBoxes, triggerSpanExtraction, triggerSam3SpanDetection, updateSpanButtonLabels };
})();
