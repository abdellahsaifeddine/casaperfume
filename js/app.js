// ================== CONFIGURATION & UTILITAIRES ==================

function formatCurrency(n) {
  return Number(n).toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }) + " DH";
}

// SÉCURITÉ : Échappe les caractères pour éviter les attaques XSS
function escapeHTML(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}

// SÉCURITÉ : Vérifie que l'image est bien une URL valide ou un chemin local autorisé
function sanitizeURL(url) {
  if (!url) return 'https://via.placeholder.com/70';
  if (url.startsWith('http://') || url.startsWith('https://')) return escapeHTML(url);
  if (url.startsWith('images/') || url.startsWith('../images/')) return escapeHTML(url);
  return 'https://via.placeholder.com/70';
}

const CART_KEY = "casaperf_cart_v2";

// ================== GESTION DU PANIER ==================

const state = {
  items: JSON.parse(localStorage.getItem(CART_KEY) || "[]"),
};

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(state.items));
  renderCart();
}

function addToCart(title, price, img) {
  const safeTitle = escapeHTML(title); // Sécurisation à l'entrée
  const safePrice = Number(price) || 0;
  const safeImg = sanitizeURL(img);

  const existing = state.items.find((i) => i.title === safeTitle);
  if (existing) {
    existing.qty++;
  } else {
    state.items.push({ title: safeTitle, price: safePrice, qty: 1, img: safeImg });
  }
  saveCart();
  openCart();
  flashToast("Produit ajouté au panier !");
}

function updateQty(title, newQty) {
  const item = state.items.find(i => i.title === title);
  if (item) {
    item.qty = Math.max(1, parseInt(newQty) || 1);
    saveCart();
  }
}

function removeItem(title) {
  state.items = state.items.filter(i => i.title !== title);
  saveCart();
}

// ================== RENDU DU DOM ==================

function renderCart() {
  const container = document.getElementById("cartItems");
  const subtotalEl = document.getElementById("subtotal");
  const countEl = document.getElementById("cartCount");
  
  if (!container) return;

  container.innerHTML = "";
  let total = 0;
  let count = 0;

  state.items.forEach(item => {
    total += item.price * item.qty;
    count += item.qty;

    const div = document.createElement("div");
    div.className = "cart-item";

    // Sécurité à la sortie
    const safeTitle = escapeHTML(item.title);
    const safePrice = formatCurrency(item.price);
    const safeQty   = Math.min(Math.max(1, parseInt(item.qty) || 1), 99);
    const safeImg   = sanitizeURL(item.img);

    div.innerHTML = `
      <img src="${safeImg}" alt="${safeTitle}">
      <div class="item-details">
        <div class="item-title">${safeTitle}</div>
        <div class="item-price">${safePrice}</div>
        <div class="item-controls">
          <input type="number" class="qty-input" value="${safeQty}" min="1" max="99">
          <button class="remove-btn">Supprimer</button>
        </div>
      </div>
    `;

    div.querySelector(".qty-input").addEventListener("change", (e) => updateQty(item.title, e.target.value));
    div.querySelector(".remove-btn").addEventListener("click", () => removeItem(item.title));

    container.appendChild(div);
  });

  if (subtotalEl) subtotalEl.textContent = formatCurrency(total);
  if (countEl) countEl.textContent = count;
}

// ================== INTERFACE ==================

function openCart() { document.body.classList.add("cart-open"); }
function closeCart() { document.body.classList.remove("cart-open"); }
window.toggleCart = function() { document.body.classList.contains("cart-open") ? closeCart() : openCart(); };

const overlay = document.createElement("div");
overlay.className = "cart-overlay";
document.body.appendChild(overlay);
overlay.addEventListener("click", closeCart);

function flashToast(message) {
  const toast = document.createElement("div");
  toast.innerText = message;
  Object.assign(toast.style, {
    position: "fixed", bottom: "20px", right: "20px",
    background: "#111827", color: "#fff", padding: "12px 24px",
    borderRadius: "8px", zIndex: "2000", boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
    animation: "fadeInUp 0.3s ease-out"
  });
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ================== INITIALISATION ==================

document.addEventListener("DOMContentLoaded", () => {
  renderCart();

  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest(".add-btn");
    if (btn) {
      const card = btn.closest(".project-card");
      if (card) {
        const activeOpt = card.querySelector(".opt-btn.active");
        const type = activeOpt ? activeOpt.dataset.type : "original";
        
        let title, price, img;
        if (type === "decant") {
            title = card.dataset.decantName;
            price = card.dataset.decantPrice;
        } else {
            title = card.dataset.originalName;
            price = card.dataset.originalPrice;
        }
        img = card.dataset.img;
        
        if(btn.dataset.title) {
            addToCart(btn.dataset.title, btn.dataset.price, btn.dataset.img);
        } else {
            addToCart(title, price, img);
        }
      } else if (btn.dataset.title) {
        addToCart(btn.dataset.title, btn.dataset.price, btn.dataset.img);
      }
    }
  });

  document.querySelectorAll(".opt-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
        if(e.target.classList.contains("disabled")) return;
        const parent = e.target.closest(".project-card");
        parent.querySelectorAll(".opt-btn").forEach(b => b.classList.remove("active"));
        e.target.classList.add("active");
        
        const type = e.target.dataset.type;
        const displayPrice = parent.querySelector(".price");
        if(type === "original") {
            displayPrice.textContent = formatCurrency(parent.dataset.originalPrice);
        } else {
            displayPrice.textContent = formatCurrency(parent.dataset.decantPrice);
        }
    });
  });
  
  // LOGIQUE DE RECHERCHE
  const searchInput = document.getElementById("searchInput");
  const resultsBox = document.getElementById("searchResults");
  // ==========================================
  // SECRET ADMIN : TRIPLE CLIC SUR LE FOOTER
  // ==========================================
  const secretAdminBtn = document.getElementById("secret-admin");
  if (secretAdminBtn) {
    let clickCount = 0;
    let clickTimer;

    secretAdminBtn.addEventListener("click", () => {
      clickCount++;
      clearTimeout(clickTimer); // On réinitialise le chrono à chaque clic

      if (clickCount === 3) {
        // Au bout de 3 clics, on redirige vers ta page secrète !
        // ⚠️ REMPLACE "admin.html" PAR LE VRAI LIEN DE TES STATISTIQUES ⚠️
        window.location.href = "admin.html"; 
        clickCount = 0;
      } else {
        // Si tu t'arrêtes de cliquer pendant 1 seconde, le compteur retombe à 0
        clickTimer = setTimeout(() => {
          clickCount = 0;
        }, 1000);
      }
    });
  }
  // Note: Les URLs ici pointent vers "pages/" car le script est exécuté depuis index.html
  const PRODUCTS_DB = [
    { name: "Azzaro The Most Wanted Parfum", url: "pages/azzaro-the-most-wanted-parfum.html" },
    { name: "Lancôme La Vie Est Belle", url: "pages/lancome-la-vie-est-belle-edp-recharge.html" },
    { name: "YSL Y Eau de Parfum", url: "pages/ysl-y-edp.html" },
    { name: "YSL MYSLF", url: "pages/ysl-myslf-edp.html" },
    { name: "Rasasi Hawas Black", url: "pages/rasasi-hawas-black-edp.html" },
    { name: "Rue Broca Théorème Matrix", url: "pages/rue-broca-theoreme-matrix-edp.html" },
    { name: "Jean Paul Gaultier Scandal", url: "pages/jean-paul-gaultier-scandal-edp.html" },
    { name: "Khadlaj Shiyaaka Blue", url: "pages/khadlaj-shiyaaka-blue.html" }
  ];

  if(searchInput) {
      searchInput.addEventListener("input", (e) => {
          const val = e.target.value.toLowerCase();
          resultsBox.innerHTML = "";
          if(val.length < 2) {
              resultsBox.style.display = "none"; 
              return;
          }
          
          const matches = PRODUCTS_DB.filter(p => p.name.toLowerCase().includes(val));
          if(matches.length > 0) {
              resultsBox.style.display = "block";
              matches.forEach(m => {
                  const div = document.createElement("div");
                  div.className = "item";
                  div.textContent = m.name;
                  
                  // Détection simple : si on est déjà dans le dossier "pages", on enlève le "pages/" du lien
                  let targetUrl = m.url;
                  if (window.location.pathname.includes('/pages/')) {
                      targetUrl = m.url.replace('pages/', '');
                  }
                  
                  div.onclick = () => window.location.href = targetUrl;
                  resultsBox.appendChild(div);
              });
          } else {
              resultsBox.style.display = "none";
          }
      });
      document.addEventListener("click", (e) => {
          if(!e.target.closest(".header-search")) resultsBox.style.display = "none";
      });
  }
});
