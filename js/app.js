// ================== CONFIGURATION & UTILITAIRES ==================

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
 * Échappe les caractères HTML pour éviter les injections XSS
 * À utiliser sur toute valeur venant de localStorage ou d'une source externe
 */
function escapeHTML(str) {
  const div = document.createElement("div");
  div.appendChild(document.createTextNode(String(str)));
  return div.innerHTML;
}

const CART_KEY = "casaperf_cart_v2"; // Nouvelle version clé

// ================== GESTION DU PANIER (STATE) ==================

const state = {
  items: JSON.parse(localStorage.getItem(CART_KEY) || "[]"),
};

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(state.items));
  renderCart();
}

function addToCart(title, price, img) {
  const existing = state.items.find((i) => i.title === title);
  if (existing) {
    existing.qty++;
  } else {
    state.items.push({ title, price: Number(price), qty: 1, img });
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

    // Sécurité : on échappe toutes les valeurs issues de localStorage (anti-XSS)
    const safeTitle = escapeHTML(item.title);
    const safePrice = formatCurrency(item.price);
    const safeQty   = Math.min(Math.max(1, parseInt(item.qty) || 1), 99);
    const safeImg   = /^https?:\/\//.test(item.img) ? escapeHTML(item.img) : 'https://via.placeholder.com/70';

    // On construit le HTML avec les valeurs assainies
    const img = document.createElement("img");
    img.src = safeImg;
    img.alt = safeTitle;

    const details = document.createElement("div");
    details.className = "item-details";
    details.innerHTML = `
      <div class="item-title">${safeTitle}</div>
      <div class="item-price">${safePrice}</div>
      <div class="item-controls">
        <input type="number" class="qty-input" value="${safeQty}" min="1" max="99">
        <button class="remove-btn">Supprimer</button>
      </div>
    `;

    div.appendChild(img);
    div.appendChild(details);

    // Events
    div.querySelector(".qty-input").addEventListener("change", (e) => updateQty(item.title, e.target.value));
    div.querySelector(".remove-btn").addEventListener("click", () => removeItem(item.title));

    container.appendChild(div);
  });

  if (subtotalEl) subtotalEl.textContent = formatCurrency(total);
  if (countEl) countEl.textContent = count;
}

// ================== INTERFACE (DRAWER & TOAST) ==================

function openCart() {
  document.body.classList.add("cart-open");
}

function closeCart() {
  document.body.classList.remove("cart-open");
}

window.toggleCart = function() {
  document.body.classList.contains("cart-open") ? closeCart() : openCart();
};

// Overlay click to close
const overlay = document.createElement("div");
overlay.className = "cart-overlay";
document.body.appendChild(overlay);
overlay.addEventListener("click", closeCart);

// Toast Notification
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

  // Boutons Ajouter au panier (Event Delegation)
  document.body.addEventListener("click", (e) => {
    const btn = e.target.closest(".add-btn");
    if (btn) {
      // Gestion spéciale pour les cartes produits avec toggle
      const card = btn.closest(".project-card");
      if (card) {
        // Logique "Original vs Decant" sur la page d'accueil
        const activeOpt = card.querySelector(".opt-btn.active");
        const type = activeOpt ? activeOpt.dataset.type : "original"; // defaut
        
        let title, price, img;
        
        if (type === "decant") {
            title = card.dataset.decantName;
            price = card.dataset.decantPrice;
        } else {
            title = card.dataset.originalName;
            price = card.dataset.originalPrice;
        }
        img = card.dataset.img;
        
        // Si le bouton lui-même a des data (cas page produit détail)
        if(btn.dataset.title) {
            addToCart(btn.dataset.title, btn.dataset.price, btn.dataset.img);
        } else {
            addToCart(title, price, img);
        }
        
      } else if (btn.dataset.title) {
        // Cas simple (bouton direct avec data attributes)
        addToCart(btn.dataset.title, btn.dataset.price, btn.dataset.img);
      }
    }
  });

  // Gestion des toggles "Original / Decant" sur les cartes
  document.querySelectorAll(".opt-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
        if(e.target.classList.contains("disabled")) return;
        
        const parent = e.target.closest(".project-card");
        parent.querySelectorAll(".opt-btn").forEach(b => b.classList.remove("active"));
        e.target.classList.add("active");
        
        // Mise à jour visuelle prix
        const type = e.target.dataset.type;
        const displayPrice = parent.querySelector(".price");
        
        if(type === "original") {
            displayPrice.textContent = formatCurrency(parent.dataset.originalPrice);
        } else {
            displayPrice.textContent = formatCurrency(parent.dataset.decantPrice);
        }
    });
  });
  
  // Search Logic (Basic)
  const searchInput = document.getElementById("searchInput");
  const resultsBox = document.getElementById("searchResults");
  
  // LISTE DES PRODUITS (À METTRE À JOUR MANUELLEMENT)
  const PRODUCTS_DB = [
    { name: "Azzaro The Most Wanted Parfum", url: "azzaro-the-most-wanted-parfum.html" },
    { name: "Lancôme La Vie Est Belle", url: "lancome-la-vie-est-belle-edp-recharge.html" },
    { name: "YSL Y Eau de Parfum", url: "ysl-y-edp.html" },
    { name: "YSL MYSLF", url: "ysl-myslf-edp.html" },
    { name: "Rasasi Hawas Black", url: "rasasi-hawas-black-edp.html" },
    { name: "Rue Broca Théorème Matrix", url: "rue-broca-theoreme-matrix-edp.html" },
    { name: "Jean Paul Gaultier Scandal", url: "jean-paul-gaultier-scandal-edp.html" }
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
                  div.onclick = () => window.location.href = m.url;
                  resultsBox.appendChild(div);
              });
          } else {
              resultsBox.style.display = "none";
          }
      });
      
      // Fermer recherche si click dehors
      document.addEventListener("click", (e) => {
          if(!e.target.closest(".header-search")) resultsBox.style.display = "none";
      });
  }
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
});
