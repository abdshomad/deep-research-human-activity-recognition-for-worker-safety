/**
 * Unified Keyframe Image Preloader Engine
 * Manages intelligent background image preloading for frame navigation (±1, ±2 pages PageDown/PageUp steps)
 */
(function () {
  const cachePool = new Map();
  const MAX_CACHE_SIZE = 200;

  function preloadFrameImage(url) {
    if (!url || cachePool.has(url)) return;
    if (cachePool.size >= MAX_CACHE_SIZE) {
      const firstKey = cachePool.keys().next().value;
      if (firstKey) cachePool.delete(firstKey);
    }
    const img = new Image();
    img.src = url;
    cachePool.set(url, img);
  }

  function isFramePreloaded(url) {
    if (!url) return false;
    if (cachePool.has(url)) {
      const cachedImg = cachePool.get(url);
      if (cachedImg && cachedImg.complete && cachedImg.naturalWidth > 0) return true;
    }
    const testImg = new Image();
    testImg.src = url;
    return testImg.complete && testImg.naturalWidth > 0;
  }

  function preloadNeighborFrames(allFrames, currentIndex, pageSize = 20) {
    if (!allFrames || allFrames.length === 0 || currentIndex < 0) return;
    const offsets = [1, -1, 2, -2, 5, -5, pageSize, -pageSize, 2 * pageSize, -2 * pageSize];
    offsets.forEach((offset) => {
      const idx = currentIndex + offset;
      if (idx >= 0 && idx < allFrames.length) {
        const frame = allFrames[idx];
        if (frame) {
          const rawUrl = frame.raw_image_url || frame.image_url;
          const thumbUrl = frame.thumbnail_url || frame.image_url;
          if (rawUrl) preloadFrameImage(rawUrl);
          if (thumbUrl) preloadFrameImage(thumbUrl);
        }
      }
    });
  }

  function preloadThumbnailPage(allFrames, currentVid, pageNum, pageSize = 20) {
    if (!allFrames || allFrames.length === 0) return;
    const sameVidFrames = allFrames.filter((f) => (f.video_id || 'default') === (currentVid || 'default'));
    const totalPages = Math.ceil(sameVidFrames.length / pageSize) || 1;
    // Preload 2 pages ahead (+1, +2) and 2 pages behind (-1, -2)
    [pageNum + 1, pageNum + 2, pageNum - 1, pageNum - 2].forEach((p) => {
      if (p >= 1 && p <= totalPages) {
        const start = (p - 1) * pageSize, end = Math.min(start + pageSize, sameVidFrames.length);
        for (let i = start; i < end; i++) {
          const frame = sameVidFrames[i];
          if (frame) {
            const thumbUrl = frame.thumbnail_url || frame.image_url;
            const rawUrl = frame.raw_image_url || frame.image_url;
            if (thumbUrl) preloadFrameImage(thumbUrl);
            if (rawUrl) preloadFrameImage(rawUrl);
          }
        }
      }
    });
  }

  function clearCachePool() {
    cachePool.clear();
  }

  window.UnifiedPreloader = {
    preloadFrameImage,
    isFramePreloaded,
    preloadNeighborFrames,
    preloadThumbnailPage,
    clearCachePool,
  };
})();

