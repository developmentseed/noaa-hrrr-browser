/**
 * Modal functionality for the info dialog
 */

/**
 * Initialize modal functionality
 */
function initializeModal() {
  const infoButton = document.getElementById("info-button");
  const infoModal = document.getElementById("info-modal");
  const closeButton = document.querySelector(".close-button");

  if (!infoButton || !infoModal || !closeButton) {
    console.error("Modal elements not found");
    return;
  }

  // Event listeners for the modal
  infoButton.addEventListener("click", openModal);
  closeButton.addEventListener("click", closeModal);

  // Close modal when clicking outside of it
  window.addEventListener("click", (event) => {
    if (event.target === infoModal) {
      closeModal();
    }
  });

  // Show modal automatically on first visit (after map loads)
  if (isFirstVisit()) {
    if (map.loaded()) {
      // Short delay to ensure map is visible first
      setTimeout(openModal, 1000);
    } else {
      map.on("load", () => {
        setTimeout(openModal, 1000);
      });
    }
  }
}

/**
 * Check if this is the user's first visit
 * @returns {boolean} True if first visit, false otherwise
 */
function isFirstVisit() {
  if (!localStorage.getItem("hrrrBrowserVisited")) {
    localStorage.setItem("hrrrBrowserVisited", "true");
    return true;
  }
  return false;
}

/**
 * Open the modal
 */
function openModal() {
  const infoModal = document.getElementById("info-modal");
  if (infoModal) {
    infoModal.style.display = "block";
  }
}

/**
 * Close the modal
 */
function closeModal() {
  const infoModal = document.getElementById("info-modal");
  if (infoModal) {
    infoModal.style.display = "none";
  }
}
