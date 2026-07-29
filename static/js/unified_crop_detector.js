/**
 * Unified Crop-based Similarity Detector Controller
 */
(function () {
  async function runCropMatcher() {
    if (!window.ViewerApp) return;
    const currentFrame = window.ViewerApp.getCurrentFrame();
    if (!currentFrame) return;

    const threshold = parseFloat(document.getElementById('crop-match-threshold')?.value || '0.65');
    const btn = document.getElementById('btn-detect-by-sample-crop');
    const origHtml = btn ? btn.innerHTML : '';
    
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '⚡ Matching... <span class="hud-stepper__spinner"></span>';
    }

    const loaderEl = document.getElementById('canvas-loader');
    if (loaderEl) {
      loaderEl.classList.remove('hidden');
      loaderEl.style.display = 'flex';
      const span = loaderEl.querySelector('span');
      if (span) span.textContent = '⚡ Running visual crop similarity matcher...';
    }

    try {
      const fd = new FormData();
      fd.append('playlist_name', window.PLAYLIST_NAME || '');
      fd.append('video_id', currentFrame.video_id);
      fd.append('json_filename', currentFrame.json_filename);
      fd.append('threshold', threshold.toString());
      fd.append('targets', window.TARGETS_STR || '');

      const res = await fetch('/api/frame/detect-by-sample-crop', { method: 'POST', body: fd });
      const data = await res.json();

      if (loaderEl) {
        loaderEl.classList.add('hidden');
        loaderEl.style.display = '';
        const span = loaderEl.querySelector('span');
        if (span) span.textContent = 'Loading keyframe...';
      }

      if (data.success && data.detections) {
        currentFrame.detections = data.detections;
        currentFrame._lastLocalUpdate = Date.now();
        
        const allFrames = window.ViewerApp.getAllFrames ? window.ViewerApp.getAllFrames() : [];
        const match = allFrames.find(f => f.video_id === currentFrame.video_id && f.frame_index === currentFrame.frame_index);
        if (match) {
          match.detections = data.detections;
          match.is_processed = true;
          match._lastLocalUpdate = Date.now();
        }

        const latestFrame = window.ViewerApp.getCurrentFrame();
        if (latestFrame && latestFrame.video_id === currentFrame.video_id && latestFrame.frame_index === currentFrame.frame_index) {
          latestFrame.detections = data.detections;
          latestFrame._lastLocalUpdate = Date.now();
        }

        const activeFrame = latestFrame || currentFrame;
        if (window.SvgOverlay) window.SvgOverlay.render(activeFrame, true, window.ViewerApp.minConfidence || 0);
        if (window.ViewerUI) {
          window.ViewerUI.updateSidePanel(activeFrame, window.ViewerApp.selectedDetId, window.ViewerApp.minConfidence || 0);
          window.ViewerUI.renderThumbnails(allFrames, window.ViewerApp.currentIndex, window.ViewerApp.loadFrame);
        }

        const matchedCount = data.newly_segmented?.length || 0;
        if (window.ViewerUI?.showToast) {
          window.ViewerUI.showToast(`✅ Matcher finished! Found ${matchedCount} objects matching your manual crops.`, 'success');
        }
      } else {
        if (window.ViewerUI?.showToast) {
          window.ViewerUI.showToast(`⚠️ Matching failed: ${data.error || 'Unknown error'}`, 'warning');
        }
      }
    } catch (err) {
      if (loaderEl) {
        loaderEl.classList.add('hidden');
        loaderEl.style.display = '';
      }
      if (window.ViewerUI?.showToast) {
        window.ViewerUI.showToast(`⚠️ Error running matcher: ${err.message || err}`, 'error');
      }
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = origHtml;
      }
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-detect-by-sample-crop')?.addEventListener('click', runCropMatcher);
  });
})();
