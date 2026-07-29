/* ── Photo Album Interactive Lightbox Script ── */

window.openFrameModal = async function(imgUrl, jsonUrl, frameIndex, timestamp, width, height, videoId) {
  const modal = document.getElementById('album-modal');
  const modalImg = document.getElementById('modal-img');
  const modalTitle = document.getElementById('modal-title');
  const modalJson = document.getElementById('modal-json');

  if (!modal || !modalImg || !modalJson) return;

  modalImg.src = imgUrl;
  modalTitle.textContent = `Video ID: ${videoId} — Frame #${String(frameIndex).padStart(5, '0')} (${timestamp}s)`;
  modalJson.textContent = 'Loading frame metadata JSON...';
  modal.classList.add('is-active');

  try {
    const res = await fetch(jsonUrl);
    if (res.ok) {
      const data = await res.json();
      modalJson.textContent = JSON.stringify(data, null, 2);
    } else {
      modalJson.textContent = JSON.stringify({
        frame_index: frameIndex,
        timestamp_sec: parseFloat(timestamp),
        image_filename: imgUrl.split('/').pop(),
        width: width,
        height: height
      }, null, 2);
    }
  } catch (err) {
    modalJson.textContent = JSON.stringify({
      frame_index: frameIndex,
      timestamp_sec: parseFloat(timestamp),
      image_filename: imgUrl.split('/').pop(),
      width: width,
      height: height
    }, null, 2);
  }
};

window.closeFrameModal = function() {
  const modal = document.getElementById('album-modal');
  if (modal) {
    modal.classList.remove('is-active');
  }
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.closeFrameModal();
  }
});
