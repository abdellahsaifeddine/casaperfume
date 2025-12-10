// ================== Utilitaires ==================

/**
 * Formate un nombre en dirhams (ex : 119 -> "119 DH")
 */
function formatCurrency(n) {
  return Number(n).toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }) + " DH";
}

/**
 * Raccourcis DOM
 */
const qs  = (selector) => document.querySelector(selector);
const qsa = (selector) => Array.from(document.querySelectorAll(selector));

/**
 * Création d'élément DOM pratique
 */
function createEl(tag, props, children) {
  const node = document.createElement(tag);

  if (props) {
    Object.keys(props).forEach((key) => {
      if (key === "class") node.className = props[key];
      else if (key === "text") node.textContent = props[key];
      else node.setAttribute(key, props[key]);
    });
  }

  if (children) {
    children.forEach((child) => {
      if (typeof child === "string") {
        node.appendChild(document.createTextNode(child));
      } else if (child) {
        node.appendChild(child);
      }
    });
  }

  return node;
}

// ================== État du panier ==================

const CART_KEY = "casaperf_cart_v1"; // clé unique de stockage local
const state = {
  items: [],
};

// Chargement initial du panier depuis localStorage
try {
  const raw = JSON.parse(localStorage.getItem(CART_KEY) || "[]");
  state.items = Array.isArray(raw) ? raw : [];
} catch {
  state.items = [];
}

/**
 * Sauvegarde du panier + re-render
 */
function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(state.items));
  renderCart();
}

/**
 * Rendu visuel du panier (drawer)
 */
function renderCart() {
  const wrap = qs("#cartItems");

  if (wrap) {
    // Nettoie le contenu
    while (wrap.firstChild) wrap.removeChild(wrap.firstChild);

    // Chaque ligne du panier
    state.items.forEach((item) => {
      const row = createEl("div", { class: "cart-item", role: "listitem" }, []);

      // Miniature
      const thumb = createEl("div", { class: "thumb", "aria-hidden": "true" }, []);
      const pic = createEl(
        "img",
        {
          src: item.img || "https://via.placeholder.com/64?text=Parfum",
          alt: "",
        },
        []
      );
      thumb.appendChild(pic);

      // Infos (titre + prix + quantité)
      const info = createEl("div", { class: "info" }, []);
      const title = createEl("div", { class: "title" }, [item.title || "Produit"]);
      title.style.fontWeight = "600";

      const small = createEl("small", null, []);
      small.style.color = "#94A3B8";

      const priceTxt = createEl("span", null, [formatCurrency(item.price), " — Qté "]);

      const qtyInput = createEl(
        "input",
        {
          type: "number",
          min: "1",
          value: String(item.qty),
          inputmode: "numeric",
          "aria-label": "Quantité",
        },
        []
      );
      qtyInput.style.width = "64px";
      qtyInput.style.marginLeft = "6px";

      function commitQty() {
        setQty(item.title, qtyInput.value);
      }

      qtyInput.addEventListener("change", commitQty);
      qtyInput.addEventListener("blur", commitQty);
      qtyInput.addEventListener("input", () => {
        if (qtyInput.value !== "" && Number(qtyInput.value) < 1) qtyInput.value = "1";
      });

      small.appendChild(priceTxt);
      small.appendChild(qtyInput);

      info.appendChild(title);
      info.appendChild(small);

      // Bouton suppression
      const btnRemove = createEl(
        "button",
        {
          type: "button",
          class: "cart-close",
          "aria-label": "Supprimer l'article",
          title: "Supprimer",
        },
        [createEl("i", { class: "fas fa-trash", "aria-hidden": "true" }, [])]
      );
      btnRemove.addEventListener("click", () => removeItem(item.title));

      row.appendChild(thumb);
      row.appendChild(info);
      row.appendChild(btnRemove);
      wrap.appendChild(row);
    });
  }

  // Sous-total
  const subtotalEl = qs("#subtotal");
  if (subtotalEl) {
    const sum = state.items.reduce((s, i) => s + i.price * i.qty, 0);
    subtotalEl.textContent = formatCurrency(sum);
  }

  // Nombre total d'articles dans le header
  const countEl = qs("#cartCount");
  if (countEl) {
    const count = state.items.reduce((n, i) => n + i.qty, 0);
    countEl.textContent = String(count);
  }
}

// ================== API Panier ==================

/**
 * Ajoute un produit au panier
 */
function addToCart(title, price, img) {
  const existing = state.items.find((i) => i.title === title);

  if (existing) {
    existing.qty++;
  } else {
    state.items.push({
      title,
      price: Number(price),
      qty: 1,
      img: img || "",
    });
  }

  saveCart();
  document.body.classList.add("cart-open");
  flashToast("✅ Ajouté au panier");
}

/**
 * Supprime un produit du panier
 */
function removeItem(title) {
  state.items = state.items.filter((i) => i.title !== title);
  saveCart();
}

/**
 * Change la quantité d’un produit
 */
function setQty(title, qty) {
  const item = state.items.find((i) => i.title === title);
  if (!item) return;

  let value = parseInt(qty, 10);
  if (isNaN(value) || value < 1) value = 1;

  item.qty = value;
  saveCart();
}

/**
 * Toggle du drawer panier
 */
window.toggleCart = function () {
  document.body.classList.toggle("cart-open");
};

// ================== Micro toast ==================

/**
 * Petit toast en bas à droite (confirmation ajout)
 */
function flashToast(text) {
  const node = createEl("div", null, [text]);
  node.style.position = "fixed";
  node.style.right = "24px";
  node.style.bottom = "24px";
  node.style.padding = "10px 14px";
  node.style.borderRadius = "999px";
  node.style.display = "grid";
  node.style.placeItems = "center";
  node.style.background = "#000";
  node.style.color = "#fff";
  node.style.zIndex = "1001";
  node.style.opacity = "1";
  node.style.boxShadow = "0 8px 20px rgba(0,0,0,0.25)";
  document.body.appendChild(node);

  let y = 0;
  let op = 1;
  const id = setInterval(() => {
    y -= 2;
    op -= 0.04;
    node.style.transform = "translateY(" + y + "px)";
    node.style.opacity = String(op);
    if (op <= 0) {
      clearInterval(id);
      node.remove();
    }
  }, 16);
}

// ================== Initialisation globale ==================

if (!window.__CASAPERF_INIT__) {
  window.__CASAPERF_INIT__ = true;

  // --- 1) Boutons "Ajouter" (robuste même sans data-*)

  document.addEventListener("click", function (evt) {
    const btn = evt.target.closest(".add-btn");
    if (!btn) return;

    evt.preventDefault();

    // Si data-* manquants, on reconstruit depuis la carte produit
    if (!btn.dataset.title || !btn.dataset.price || !btn.dataset.img) {
      const card = btn.closest(".project-card");
      if (card) {
        const activeToggle = card.querySelector(".opt-btn.active");
        const type = activeToggle ? activeToggle.dataset.type : "original";

        const nameAttr  = type === "decant" ? "decantName"  : "originalName";
        const priceAttr = type === "decant" ? "decantPrice" : "originalPrice";

        // Titre
        let title =
          card.dataset[nameAttr] ||
          (card.querySelector(".project-title span")?.textContent || "").trim() ||
          "Produit";

        // Prix
        let price = card.dataset[priceAttr];

        if (!price) {
          const priceText = (card.querySelector(".price")?.textContent || "")
            .replace(/[^\d,.\s]/g, "") // garde chiffres, ., ,
            .replace(/\s/g, "")        // supprime espaces
            .replace(",", ".");        // virgule -> point
          price = parseFloat(priceText || "0");
        }

        // Image
        let img =
          card.dataset.img ||
          card.querySelector(".project-image img")?.getAttribute("src") ||
          "";

        btn.dataset.title = title;
        btn.dataset.price = price;
        btn.dataset.img   = img;
      }
    }

    const title = btn.dataset.title || "Produit";
    const price = parseFloat(btn.dataset.price || "0");
    const img   = btn.dataset.img || "";

    addToCart(title, price, img);
  });

  // --- 2) Bouton "Panier" dans le header

  document.addEventListener("click", function (evt) {
    const target = evt.target.closest(".cart-btn");
    if (!target) return;

    evt.preventDefault();
    window.toggleCart();
  });

  // --- 3) Fermeture du panier en cliquant à l’extérieur

  document.addEventListener("mousedown", function (evt) {
    if (!document.body.classList.contains("cart-open")) return;

    const drawer = qs(".cart-drawer");
    const isInDrawer = drawer && drawer.contains(evt.target);
    const isCartBtn = evt.target.closest(".cart-btn");

    if (!isInDrawer && !isCartBtn) {
      // Clic en dehors : on ferme
      document.body.classList.remove("cart-open");
    }
  });

  // --- 4) Fermeture du panier avec la touche Échap

  document.addEventListener("keydown", function (evt) {
    if (evt.key === "Escape" || evt.key === "Esc") {
      if (document.body.classList.contains("cart-open")) {
        document.body.classList.remove("cart-open");
      }

      // Ferme aussi le dropdown "Nos Parfums" si ouvert
      const openDropdown = document.querySelector(".has-dropdown.open");
      if (openDropdown) {
        openDropdown.classList.remove("open");
        const btn = openDropdown.querySelector(".nav-link");
        if (btn) btn.setAttribute("aria-expanded", "false");
      }
    }
  });

  // --- 5) Gestion du bouton "Passer la commande"

  const checkoutBtn = document.querySelector("#checkoutBtn");
  if (checkoutBtn) {
    if (checkoutBtn.tagName === "A") {
      // On laisse l'URL HTML (commande.html ou ../commande.html)
      checkoutBtn.setAttribute("target", "_blank");
      checkoutBtn.setAttribute("rel", "noopener noreferrer");
    } else {
      // Fallback si un jour c’est un <button> sur une autre page
      checkoutBtn.addEventListener("click", function (ev) {
        ev.preventDefault();
        window.open("commande.html", "_blank", "noopener");
      });
    }
  }

  // --- 6) Dropdown "Nos Parfums"

  document.addEventListener("click", function (evt) {
    const btn = evt.target.closest(".has-dropdown .nav-link");
    const anyOpen = document.querySelector(".has-dropdown.open");

    // Clic en dehors : fermer le dropdown
    if (!btn && anyOpen && !evt.target.closest(".has-dropdown")) {
      anyOpen.classList.remove("open");
      const ariaBtn = anyOpen.querySelector(".nav-link");
      if (ariaBtn) ariaBtn.setAttribute("aria-expanded", "false");
      return;
    }

    // Clic sur le bouton du menu
    if (btn) {
      const parent = btn.closest(".has-dropdown");
      const isOpen = parent.classList.toggle("open");
      btn.setAttribute("aria-expanded", isOpen ? "true" : "false");
    }
  });

  // --- 7) Barre de recherche (toutes les pages)

  (function initSearch() {
    const form    = document.getElementById("searchForm");
    const input   = document.getElementById("searchInput");
    const results = document.getElementById("searchResults");
    if (!form || !input || !results) return;

    // Liste des produits indexés dans la recherche
    const PRODUCTS = [
      { name: "Azzaro The Most Wanted Parfum",                    url: "azzaro-the-most-wanted-parfum.html",           tag: "Homme" },
      { name: "Lancôme La Vie Est Belle Eau de Parfum Refillable", url: "lancome-la-vie-est-belle-edp-recharge.html",  tag: "Femme" },
      { name: "Yves Saint Laurent MYSLF Eau de Parfum",           url: "ysl-myslf-edp.html",                            tag: "Homme" },
      { name: "Yves Saint Laurent Y Eau de Parfum",               url: "ysl-y-edp.html",                                tag: "Homme" },
      { name: "Jean Paul Gaultier Scandal Eau de Parfum",         url: "jean-paul-gaultier-scandal-edp.html",          tag: "Femme" },
      { name: "Rue Broca Théorème Matrix Eau de Parfum",          url: "rue-broca-theoreme-matrix-edp.html",           tag: "Homme" },
      { name: "Rasasi Hawas Black Eau de Parfum",                 url: "rasasi-hawas-black-edp.html",                  tag: "Homme" },
    ];

    const normalize = (str) =>
      str
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

    function renderResults(list) {
      if (!list.length) {
        results.style.display = "none";
        results.innerHTML = "";
        return;
      }

      results.innerHTML = list
        .map(
          (p) =>
            '<div class="item" tabindex="0" role="button" data-url="' +
            p.url +
            '">' +
            '<i class="fas fa-spray-can" aria-hidden="true"></i>' +
            "<span>" +
            p.name +
            "</span>" +
            '<span class="tag">' +
            p.tag +
            "</span>" +
            "</div>"
        )
        .join("");

      results.style.display = "block";
    }

    function search(query) {
      const nq = normalize(query);
      if (!nq) {
        renderResults([]);
        return;
      }

      const matches = PRODUCTS.filter((p) => normalize(p.name).includes(nq));
      renderResults(matches);
    }

    input.addEventListener("input", (e) => search(e.target.value));

    results.addEventListener("click", function (evt) {
      const item = evt.target.closest(".item");
      if (item && item.dataset.url) {
        window.location.href = item.dataset.url;
      }
    });

    results.addEventListener("keydown", function (evt) {
      if (evt.key === "Enter") {
        const item = evt.target.closest(".item");
        if (item && item.dataset.url) {
          window.location.href = item.dataset.url;
        }
      }
    });

    form.addEventListener("submit", function (evt) {
      evt.preventDefault();
      const nq = normalize(input.value);
      if (!nq) return;

      const exact = PRODUCTS.find((p) => normalize(p.name) === nq);
      if (exact) {
        window.location.href = exact.url;
        return;
      }

      const partial = PRODUCTS.find((p) => normalize(p.name).includes(nq));
      if (partial) {
        window.location.href = partial.url;
        return;
      }

      renderResults([]);
      alert("Aucun parfum trouvé pour : " + input.value);
    });

    // Clic en dehors de la zone de recherche -> ferme les résultats
    document.addEventListener("click", function (evt) {
      if (!form.contains(evt.target)) {
        renderResults([]);
      }
    });
  })();
}

// Rendu initial du panier au chargement
renderCart();
