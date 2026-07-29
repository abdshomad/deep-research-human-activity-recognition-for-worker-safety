/**
 * Additional Helper Routines for SAM3 Viewer Engine
 * Keeps unified_viewer.js modular and strictly within the 256 LOC threshold.
 */
(function () {
  function updateDatasetFromPolling(newAlbums, currentAllFrames, currentIndex, selectedDetId, showMasks, minConfidence, showDeleted, showLabels, loadFrame, showPopover) {
    if (!newAlbums?.length) return currentAllFrames;
    window.WORKSPACE_DATA = newAlbums;
    if (!currentAllFrames || currentAllFrames.length === 0) return currentAllFrames;

    const savedDetId = selectedDetId;
    const newFrames = [];
    newAlbums.forEach((album) => {
      (album.frames || []).forEach((f) => newFrames.push({ ...f, video_title: album.title, video_id: album.video_id }));
    });
    if (newFrames.length === 0) return currentAllFrames;

    const oldFrameMap = new Map();
    currentAllFrames.forEach((f) => oldFrameMap.set(`${f.video_id}_${f.frame_index}`, f));

    newFrames.forEach((newF) => {
      const oldF = oldFrameMap.get(`${newF.video_id}_${newF.frame_index}`);
      if (oldF) {
        if (oldF._lastLocalUpdate && (Date.now() - oldF._lastLocalUpdate < 15000)) {
          newF.detections = oldF.detections;
          newF._lastLocalUpdate = oldF._lastLocalUpdate;
          newF.is_processed = true;
        } else if (oldF.detections && newF.detections) {
          const oldDetMap = new Map();
          oldF.detections.forEach((d) => oldDetMap.set(d.id, d));
          newF.detections.forEach((newD) => {
            const oldD = oldDetMap.get(newD.id);
            if (oldD) {
              if (oldD.hidden !== undefined) newD.hidden = oldD.hidden;
              if (oldD.selected !== undefined) newD.selected = oldD.selected;
              if (oldD.manually_hidden !== undefined) newD.manually_hidden = oldD.manually_hidden;
            }
          });
        }
      }
    });

    const activeIndex = Math.min(currentIndex, newFrames.length - 1);
    const frame = newFrames[activeIndex];
    if (frame) {
      if (savedDetId) {
        (frame.detections || []).forEach((d) => d.selected = (d.id === savedDetId));
        if (showPopover) showPopover(savedDetId);
      }
      if (window.SvgOverlay) window.SvgOverlay.render(frame, showMasks, minConfidence, showDeleted, showLabels);
      if (window.ViewerUI) {
        window.ViewerUI.updateSidePanel(frame, savedDetId, minConfidence);
        window.ViewerUI.renderThumbnails(newFrames, activeIndex, loadFrame);
      }
    }
    return newFrames;
  }

  window.ViewerHelpers = {
    updateDatasetFromPolling,
  };
})();
