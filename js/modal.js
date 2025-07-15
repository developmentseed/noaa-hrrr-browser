function initializeModal() {
  const infoButton = document.getElementById("info-button");
  const infoModal = document.getElementById("info-modal");
  const closeButton = document.querySelector(".close-button");

  if (!infoButton || !infoModal || !closeButton) {
    console.error("Modal elements not found");
    return;
  }

  infoButton.addEventListener("click", openModal);
  closeButton.addEventListener("click", closeModal);

  window.addEventListener("click", (event) => {
    if (event.target === infoModal) {
      closeModal();
    }
  });

  if (isFirstVisit()) {
    if (map.loaded()) {
      setTimeout(openModal, 1000);
    } else {
      map.on("load", () => {
        setTimeout(openModal, 1000);
      });
    }
  }
}

function isFirstVisit() {
  if (!localStorage.getItem("hrrrBrowserVisited")) {
    localStorage.setItem("hrrrBrowserVisited", "true");
    return true;
  }
  return false;
}

function openModal() {
  const infoModal = document.getElementById("info-modal");
  if (infoModal) {
    infoModal.style.display = "block";
  }
}

function closeModal() {
  const infoModal = document.getElementById("info-modal");
  if (infoModal) {
    infoModal.style.display = "none";
  }
}
