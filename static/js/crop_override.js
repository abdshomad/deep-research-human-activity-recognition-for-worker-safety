/**
 * SAM3 Crop Strategy Override Controller
 * Just adds crops to dataset without starting training.
 */
(function () {
  function bindCropOverrides() {
    if (window.ViewerApp) {
      const cropBtn = document.getElementById('btn-popover-crop-train');
      if (cropBtn) {
        let originalTextContent = cropBtn.textContent;
        Object.defineProperty(cropBtn, 'textContent', {
          get() { return originalTextContent; },
          set(val) {
            if (typeof val === 'string') {
              val = val.replace(/Crop\s*&\s*Train/g, '➕ Sample').replace(/Crop\s*\\u0026\s*Train/g, '➕ Sample').replace(/Add Crop/g, '➕ Sample').replace(/Crop/g, '➕ Sample');
            }
            originalTextContent = val;
            Object.getOwnPropertyDescriptor(Node.prototype, 'textContent').set.call(cropBtn, val);
          },
          configurable: true
        });
        cropBtn.textContent = '➕ Sample [C]';
      }

      function reloadCropsAndFrame() {
        fetch(`/api/classifier/dataset/crops?playlist_name=${encodeURIComponent(window.PLAYLIST_NAME)}&limit=1000`)
          .then(res => res.json())
          .then(cropData => {
            if (cropData.success && window.ViewerApp) {
              window.ViewerApp.datasetCrops = cropData.crops || [];
            }
            window.ViewerApp?.loadFrame(window.ViewerApp.currentIndex);
          });
      }

      // 2. Override cropSingleDetection
      window.ViewerApp.cropSingleDetection = function (detId) {
        const frame = window.ViewerApp.getCurrentFrame();
        if (!frame) return;

        let det = (frame.detections || []).find((d) => d.id === detId);
        if (!det && window.BoxDrawer && typeof window.BoxDrawer.getDrawnBoxes === 'function') {
          det = window.BoxDrawer.getDrawnBoxes().find((b) => b.id === detId);
        }
        if (!det) return;

        if (window.ViewerUI?.isDetectionCropped?.(frame.video_id, frame.json_filename, det)) {
          window.ViewerUI?.showToast?.("⚠️ Selected box is already in samples", "warning");
          return;
        }

        const detectionsData = [{
          id: det.id,
          bbox_xyxy: det.bbox_xyxy,
          label: det.label,
          confidence: det.confidence || 1.0
        }];

        window.ViewerUI?.showToast?.(`✂️ Adding crop to dataset...`, 'info');

        const formData = new FormData();
        formData.append('playlist_name', window.PLAYLIST_NAME);
        formData.append('video_id', frame.video_id);
        formData.append('json_filename', frame.json_filename);
        formData.append('detections_json', JSON.stringify(detectionsData));

        fetch('/api/classifier/crop-and-train', {
          method: 'POST',
          body: formData
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              window.ViewerUI?.showToast?.(`🟢 Crop successfully added to dataset.`, 'success');
              reloadCropsAndFrame();
            } else {
              window.ViewerUI?.showToast?.(`🔴 Failed to add crop: ${data.error || 'unknown error'}`, 'error');
            }
          })
          .catch(err => {
            window.ViewerUI?.showToast?.(`🔴 Connection error: ${err.message}`, 'error');
          });
      };

      // 3. Override cropSelectedBoxesAndTrain
      window.ViewerApp.cropSelectedBoxesAndTrain = function () {
        const frame = window.ViewerApp.getCurrentFrame();
        if (!frame) return;

        const selectedDetIds = window.ViewerApp.selectedDetIds;
        const count = selectedDetIds ? selectedDetIds.size : 0;
        if (count === 0) {
          window.ViewerUI?.showToast?.("⚠️ Select at least one bounding box to crop.", "error");
          return;
        }

        const allDets = (frame.detections || []).concat(window.BoxDrawer && typeof window.BoxDrawer.getDrawnBoxes === 'function' ? window.BoxDrawer.getDrawnBoxes() : []);
        const selectedDets = allDets.filter(d => selectedDetIds.has(d.id));
        const validDets = selectedDets.filter(d => d.label && d.label !== 'object' && d.label !== 'unknown' && !d.label.startsWith('drawn_box') && !d.label.startsWith('custom_box'));

        if (validDets.length === 0) {
          window.ViewerUI?.showToast?.("⚠️ No selected detections with valid target labels to crop. Assign labels first.", "error");
          return;
        }

        const uncroppedDets = validDets.filter(det => !window.ViewerUI?.isDetectionCropped?.(frame.video_id, frame.json_filename, det));

        if (uncroppedDets.length === 0) {
          window.ViewerUI?.showToast?.(validDets.length === 1 ? "⚠️ Selected box is already in samples" : "⚠️ All selected boxes are already in samples", "warning");
          return;
        }

        const detectionsData = uncroppedDets.map(d => ({
          id: d.id,
          bbox_xyxy: d.bbox_xyxy,
          label: d.label,
          confidence: d.confidence || 1.0
        }));

        window.ViewerUI?.showToast?.(`✂️ Adding ${uncroppedDets.length} crops to dataset...`, 'info');

        const formData = new FormData();
        formData.append('playlist_name', window.PLAYLIST_NAME);
        formData.append('video_id', frame.video_id);
        formData.append('json_filename', frame.json_filename);
        formData.append('detections_json', JSON.stringify(detectionsData));

        fetch('/api/classifier/crop-and-train', {
          method: 'POST',
          body: formData
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              window.ViewerUI?.showToast?.(`🟢 Successfully added ${uncroppedDets.length} crop(s) to dataset.`, 'success');
              if (window.ViewerApp) window.ViewerApp.deselectAll();
              reloadCropsAndFrame();
            } else {
              window.ViewerUI?.showToast?.(`🔴 Failed to add crops: ${data.error || 'unknown error'}`, 'error');
            }
          })
          .catch(err => {
            window.ViewerUI?.showToast?.(`🔴 Connection error: ${err.message}`, 'error');
          });
      };

      // 4. Implement removeCropSingleDetection
      window.ViewerApp.removeCropSingleDetection = function (detId) {
        const frame = window.ViewerApp.getCurrentFrame();
        if (!frame) return;

        let det = (frame.detections || []).find((d) => d.id === detId);
        if (!det && window.BoxDrawer && typeof window.BoxDrawer.getDrawnBoxes === 'function') {
          det = window.BoxDrawer.getDrawnBoxes().find((b) => b.id === detId);
        }
        if (!det) return;

        if (!window.ViewerApp.datasetCrops) return;
        const frameMatch = (frame.json_filename || '').match(/frame_(\d+)/);
        const frameNum = frameMatch ? frameMatch[1] : "00000";
        const boxMatch = det.id.match(/\d+/g);
        let boxNum = boxMatch ? boxMatch[boxMatch.length - 1] : "001";
        if (/^\d+$/.test(boxNum)) boxNum = boxNum.padStart(3, '0');
        const label = (det.label || "label").trim().toLowerCase().replace(/\s+/g, '-');
        const prefix = `${label}_${frame.video_id}_frame${frameNum}_box${boxNum}_conf`;
        const matchingCrop = window.ViewerApp.datasetCrops.find(crop => (crop.filename || '').startsWith(prefix));

        if (!matchingCrop) {
          window.ViewerUI?.showToast?.("⚠️ Could not find matching crop in dataset", "warning");
          return;
        }

        if (!confirm(`Are you sure you want to remove this crop from the dataset samples?`)) return;

        window.ViewerUI?.showToast?.(`🗑️ Removing crop from samples...`, 'info');

        const formData = new FormData();
        formData.append('playlist_name', window.PLAYLIST_NAME);
        formData.append('paths_json', JSON.stringify([matchingCrop.relative_path]));

        fetch('/api/classifier/dataset/delete-crops', {
          method: 'POST',
          body: formData
        })
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              window.ViewerUI?.showToast?.(`🟢 Crop successfully removed from samples.`, 'success');
              if (window.ViewerApp) window.ViewerApp.deselectAll();
              reloadCropsAndFrame();
            } else {
              window.ViewerUI?.showToast?.(`🔴 Failed to remove crop: ${data.error || 'unknown error'}`, 'error');
            }
          })
          .catch(err => {
            window.ViewerUI?.showToast?.(`🔴 Connection error: ${err.message}`, 'error');
          });
      };
    } else {
      setTimeout(bindCropOverrides, 50);
    }
  }
  bindCropOverrides();
})();
