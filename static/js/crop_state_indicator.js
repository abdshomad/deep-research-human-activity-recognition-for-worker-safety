/**
 * SAM3 Crop State Indicator & Popover Controller
 */
(function () {
  function bindCropStateIndicator() {
    if (window.ViewerApp && window.ViewerUI) {
      function updatePopoverCropButtonState() {
        const cropBtn = document.getElementById('btn-popover-crop-train');
        if (!cropBtn) return;

        const frame = window.ViewerApp.getCurrentFrame();
        if (!frame) return;

        const selectedDetIds = window.ViewerApp.selectedDetIds;
        const count = selectedDetIds ? selectedDetIds.size : 0;
        if (count === 0) return;

        if (count === 1) {
          const detId = Array.from(selectedDetIds)[0];
          let det = (frame.detections || []).find((d) => d.id === detId);
          if (!det && window.BoxDrawer && typeof window.BoxDrawer.getDrawnBoxes === 'function') {
            det = window.BoxDrawer.getDrawnBoxes().find((b) => b.id === detId);
          }
          if (det) {
            const cropped = window.ViewerUI.isDetectionCropped && window.ViewerUI.isDetectionCropped(frame.video_id, frame.json_filename, det);
            if (cropped) {
              cropBtn.disabled = false;
              cropBtn.style.opacity = '';
              cropBtn.style.cursor = 'pointer';
              cropBtn.style.pointerEvents = '';
              cropBtn.innerHTML = '🚫 Remove Sample';
              cropBtn.classList.add('hud-popover__btn--remove-crop');
              cropBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                if (window.ViewerApp && window.ViewerApp.removeCropSingleDetection) {
                  window.ViewerApp.removeCropSingleDetection(det.id);
                }
              };
              return;
            }
          }
        } else {
          const allDets = (frame.detections || []).concat(window.BoxDrawer && typeof window.BoxDrawer.getDrawnBoxes === 'function' ? window.BoxDrawer.getDrawnBoxes() : []);
          const selectedDets = allDets.filter(d => selectedDetIds.has(d.id));
          const validDets = selectedDets.filter(d => d.label && d.label !== 'object' && d.label !== 'unknown' && !d.label.startsWith('drawn_box') && !d.label.startsWith('custom_box'));
          
          const allAlreadyCropped = validDets.length > 0 && validDets.every(det => 
            window.ViewerUI.isDetectionCropped && window.ViewerUI.isDetectionCropped(frame.video_id, frame.json_filename, det)
          );

          if (allAlreadyCropped) {
            cropBtn.disabled = true;
            cropBtn.style.opacity = '0.5';
            cropBtn.style.cursor = 'not-allowed';
            cropBtn.style.pointerEvents = 'none';
            cropBtn.classList.remove('hud-popover__btn--remove-crop');
            cropBtn.innerHTML = `🌾 In Samples (${count})`;
            return;
          }
        }

        cropBtn.disabled = false;
        cropBtn.style.opacity = '';
        cropBtn.style.cursor = '';
        cropBtn.style.pointerEvents = '';
        cropBtn.classList.remove('hud-popover__btn--remove-crop');
        cropBtn.textContent = count > 1 ? `➕ Sample (${count}) [C]` : '➕ Sample [C]';
        cropBtn.onclick = () => {
          if (window.ViewerApp && window.ViewerApp.cropSelectedBoxesAndTrain) {
            window.ViewerApp.cropSelectedBoxesAndTrain();
          }
        };
      }

      if (!window.ViewerApp._hasCropStatePatches) {
        window.ViewerApp._hasCropStatePatches = true;

        const originalSelectDetection = window.ViewerApp.selectDetection;
        window.ViewerApp.selectDetection = function (detId) {
          if (originalSelectDetection) originalSelectDetection.apply(this, arguments);
          updatePopoverCropButtonState();
        };

        const originalSetSelectedDetections = window.ViewerApp.setSelectedDetections;
        window.ViewerApp.setSelectedDetections = function (idsArray, isAdditive) {
          if (originalSetSelectedDetections) originalSetSelectedDetections.apply(this, arguments);
          updatePopoverCropButtonState();
        };

        const originalDeselectAll = window.ViewerApp.deselectAll;
        window.ViewerApp.deselectAll = function () {
          if (originalDeselectAll) originalDeselectAll.apply(this, arguments);
          updatePopoverCropButtonState();
        };

        const originalLoadFrame = window.ViewerApp.loadFrame;
        window.ViewerApp.loadFrame = function () {
          if (originalLoadFrame) originalLoadFrame.apply(this, arguments);
          updatePopoverCropButtonState();
        };
      }
      
      updatePopoverCropButtonState();
    } else {
      setTimeout(bindCropStateIndicator, 50);
    }
  }

  bindCropStateIndicator();

  // Dynamically load the popover label picker controller
  const script = document.createElement('script');
  script.src = '/static/js/popover_label_picker.js';
  document.body.appendChild(script);

  // Dynamically load the clear frame detections controller
  const script2 = document.createElement('script');
  script2.src = '/static/js/clear_frame_detections.js';
  document.body.appendChild(script2);

  // Dynamically load the delete filtered detections controller
  const script3 = document.createElement('script');
  script3.src = '/static/js/delete_filtered_detections.js';
  document.body.appendChild(script3);
})();
