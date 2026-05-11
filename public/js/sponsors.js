document.addEventListener("DOMContentLoaded", () => {
  const sponsorsGrid = document.querySelector(".sponsors-grid");

  const openSponsorLink = (linkUrl) => {
    if (!linkUrl || linkUrl === "#") {
      return;
    }
    window.open(linkUrl, "_blank", "noopener");
  };

  const getSponsorLink = (linkEl) => {
    const card = linkEl?.closest(".sponsor-card");
    return card?.dataset.linkUrl || linkEl?.dataset.linkUrl || "";
  };

  const maxLogoSize = 50 * 1024 * 1024;
  const allowedTypes = ["image/png", "image/jpeg"];

  let activeCard = null;
  let activeLogoUrl = "";
  let previewObjectUrl = "";

  const validateLogoFile = (file) => {
    if (!file) {
      return true;
    }
    if (!allowedTypes.includes(file.type)) {
      alert("Only PNG or JPG images are allowed.");
      return false;
    }
    if (file.size > maxLogoSize) {
      alert("Logo image is too large. Max size is 50 MB.");
      return false;
    }
    return true;
  };

  const requestJson = async (url, options) => {
    const response = await fetch(url, options);
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.error || "Request failed.");
    }
    return response.json().catch(() => ({}));
  };

  const applyAspectRatio = (card, img) => {
    if (!card || !img) {
      return;
    }
    const width = img.naturalWidth;
    const height = img.naturalHeight;
    if (width && height) {
      card.style.setProperty("--sponsor-aspect", `${width} / ${height}`);
    }
  };

  const updateAspectFromImage = (card) => {
    if (!card) {
      return;
    }
    const img = card.querySelector(".sponsor-logo img");
    if (!img) {
      return;
    }
    if (img.complete) {
      applyAspectRatio(card, img);
      return;
    }
    img.addEventListener("load", () => applyAspectRatio(card, img), { once: true });
  };

  if (sponsorsGrid) {
    sponsorsGrid.addEventListener("click", (event) => {
      const linkEl = event.target.closest(".sponsor-link");
      if (!linkEl) {
        return;
      }
      const linkUrl = getSponsorLink(linkEl);
      openSponsorLink(linkUrl);
    });

    sponsorsGrid.addEventListener("keydown", (event) => {
      const linkEl = event.target.closest(".sponsor-link");
      if (!linkEl) {
        return;
      }
      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      const linkUrl = getSponsorLink(linkEl);
      openSponsorLink(linkUrl);
    });
  }

  const editModal = document.getElementById("adminSponsorModal");
  if (!editModal) {
    if (sponsorsGrid) {
      sponsorsGrid.querySelectorAll(".sponsor-card").forEach((card) => {
        updateAspectFromImage(card);
      });
    }
    return;
  }

  const editForm = document.getElementById("adminSponsorForm");
  const modalTitle = document.getElementById("adminSponsorModalTitle");
  const nameInput = document.getElementById("adminSponsorName");
  const linkInput = document.getElementById("adminSponsorLink");
  const logoInput = document.getElementById("adminSponsorLogo");
  const previewCard = document.getElementById("adminSponsorPreview");
  const saveButton = editForm.querySelector(".admin-modal-save");

  const setSponsorCard = (card, { name, logoUrl, linkUrl }) => {
    card.dataset.name = name;
    card.dataset.logoUrl = logoUrl;
    card.dataset.linkUrl = linkUrl;

    const label = name || "Sponsor";

    const linkEl = card.querySelector(".sponsor-link");
    if (linkEl) {
      linkEl.dataset.linkUrl = linkUrl;
      linkEl.setAttribute("aria-label", `Visit ${label}`);
    }

    const img = card.querySelector(".sponsor-logo img");
    if (img) {
      img.setAttribute("src", logoUrl || "/icons/placeholder.png");
      img.setAttribute("alt", `${label} logo`);
    }

    updateAspectFromImage(card);
  };

  const closeModal = () => {
    editModal.classList.remove("is-open");
    editModal.setAttribute("aria-hidden", "true");
    if (activeCard && activeCard.dataset.isNew === "true") {
      activeCard.remove();
    }
    activeCard = null;
    activeLogoUrl = "";
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
      previewObjectUrl = "";
    }
    if (previewCard) {
      previewCard.innerHTML = "";
    }
    saveButton.disabled = false;
  };

  const buildPreview = () => {
    if (!activeCard || !previewCard) {
      return;
    }

    const name = nameInput.value.trim() || "Sponsor";
    const linkUrl = linkInput.value.trim() || "#";

    const clone = activeCard.cloneNode(true);
    const actions = clone.querySelector(".news-admin-actions");
    if (actions) {
      actions.remove();
    }

    const img = clone.querySelector(".sponsor-logo img");
    if (img) {
      const file = logoInput.files[0];
      if (file && validateLogoFile(file)) {
        if (previewObjectUrl) {
          URL.revokeObjectURL(previewObjectUrl);
        }
        previewObjectUrl = URL.createObjectURL(file);
        img.setAttribute("src", previewObjectUrl);
      } else if (activeLogoUrl) {
        img.setAttribute("src", activeLogoUrl);
      }
      img.setAttribute("alt", `${name} logo`);
    }

    const linkEl = clone.querySelector(".sponsor-link");
    if (linkEl) {
      linkEl.dataset.linkUrl = linkUrl;
      linkEl.setAttribute("aria-label", `Visit ${name}`);
    }

    const previewImg = clone.querySelector(".sponsor-logo img");
    if (previewImg) {
      if (previewImg.complete) {
        applyAspectRatio(clone, previewImg);
      } else {
        previewImg.addEventListener("load", () => applyAspectRatio(clone, previewImg), { once: true });
      }
    }

    previewCard.innerHTML = "";
    previewCard.appendChild(clone);
  };

  const openModal = (card) => {
    activeCard = card;
    const name = card.dataset.name || "";
    const linkUrl = card.dataset.linkUrl || "";
    const logoUrl = card.dataset.logoUrl || "";

    nameInput.value = name;
    linkInput.value = linkUrl;
    logoInput.value = "";
    activeLogoUrl = logoUrl;

    modalTitle.textContent = card.dataset.isNew === "true" ? "Add sponsor" : "Edit sponsor";
    editModal.classList.add("is-open");
    editModal.setAttribute("aria-hidden", "false");
    buildPreview();
  };

  document.addEventListener("click", (event) => {
    const addButton = event.target.closest('.admin-add-button[data-add-type="sponsor"]');
    if (addButton) {
      const template = document.getElementById("sponsorCardTemplate");
      if (!template || !sponsorsGrid) {
        return;
      }
      const fragment = template.content.cloneNode(true);
      const newCard = fragment.querySelector('[data-item-type="sponsor"]');
      sponsorsGrid.prepend(fragment);
      if (newCard) {
        newCard.dataset.isNew = "true";
        openModal(newCard);
      }
      return;
    }

    const deleteButton = event.target.closest(".admin-delete-button");
    if (deleteButton) {
      event.preventDefault();
      event.stopPropagation();
      const card = deleteButton.closest('[data-item-type="sponsor"]');
      if (!card) {
        return;
      }
      const id = Number(card.dataset.id);
      if (!id || card.dataset.isNew === "true") {
        card.remove();
        return;
      }
      requestJson(`/api/sponsors/${id}`, { method: "DELETE" })
        .then(() => card.remove())
        .catch((error) => alert(error.message));
      return;
    }

    const editButton = event.target.closest(".admin-edit-button");
    if (editButton) {
      event.preventDefault();
      event.stopPropagation();
      const card = editButton.closest('[data-item-type="sponsor"]');
      if (card) {
        openModal(card);
      }
    }
  });

  editModal.querySelectorAll("[data-admin-close]").forEach((button) => {
    button.addEventListener("click", closeModal);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && editModal.classList.contains("is-open")) {
      closeModal();
    }
  });

  editForm.addEventListener("input", () => {
    buildPreview();
  });

  logoInput.addEventListener("change", () => {
    const file = logoInput.files[0];
    if (!validateLogoFile(file)) {
      logoInput.value = "";
      return;
    }
    buildPreview();
  });

  editForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!activeCard) {
      return;
    }

    if (saveButton.disabled) {
      return;
    }
    saveButton.disabled = true;

    const name = nameInput.value.trim() || "Sponsor";
    const linkUrl = linkInput.value.trim();
    if (!linkUrl) {
      alert("Please enter a sponsor link.");
      saveButton.disabled = false;
      return;
    }

    const file = logoInput.files[0];
    if (file) {
      if (!validateLogoFile(file)) {
        saveButton.disabled = false;
        return;
      }
      try {
        const formData = new FormData();
        formData.append("logo", file);
        const payload = await requestJson("/admin/sponsor-upload", {
          method: "POST",
          body: formData
        });
        activeLogoUrl = payload.url || activeLogoUrl;
      } catch (error) {
        alert(error.message);
        saveButton.disabled = false;
        return;
      }
    }

    if (!activeLogoUrl) {
      alert("Please upload a sponsor logo.");
      saveButton.disabled = false;
      return;
    }

    const payload = { name, logoUrl: activeLogoUrl, linkUrl };

    try {
      if (activeCard.dataset.isNew === "true") {
        const result = await requestJson("/api/sponsors", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        activeCard.dataset.id = result.id;
        activeCard.dataset.isNew = "false";
      } else {
        const id = Number(activeCard.dataset.id);
        await requestJson(`/api/sponsors/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      setSponsorCard(activeCard, payload);
    } catch (error) {
      alert(error.message);
      saveButton.disabled = false;
      return;
    }

    closeModal();
    saveButton.disabled = false;
  });

  document.querySelectorAll(".sponsor-card").forEach((card) => {
    updateAspectFromImage(card);
  });
});
