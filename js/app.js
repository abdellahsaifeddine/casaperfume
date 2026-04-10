// ================== SUPABASE TRACKING ==================

const SUPABASE_URL = "https://rzfeetzksgdiqcgybeou.supabase.co";
const SUPABASE_KEY = "sb_publishable_Z5v_4w-e3Qq7DgDLyJ5oHw_sL3eSaGc";

async function trackEvent(type, parfum = null, prix = null) {
  try {
    const page = window.location.pathname;
    await fetch(`${SUPABASE_URL}/rest/v1/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({ type, parfum, prix, page })
    });
  } catch(e) {
    console.warn("Tracking error:", e);
  }
}

// Tracker la visite de page
trackEvent("page_view");

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
  trackEvent("add_to_cart", title, String(price));
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
    div.innerHTML = `
      <img src="${item.img || 'https://via.placeholder.com/70'}" alt="${item.title}">
      <div class="item-details">
        <div class="item-title">${item.title}</div>
        <div class="item-price">${formatCurrency(item.price)}</div>
        <div class="item-controls">
          <input type="number" class="qty-input" value="${item.qty}" min="1">
          <button class="remove-btn">Supprimer</button>
        </div>
      </div>
    `;

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
  const inPages = window.location.pathname.includes('/pages/');
  const pagesPrefix = inPages ? '' : 'pages/';
  const PRODUCTS_DB = [
    { name: "Khadlaj Shiyaaka Blue", url: pagesPrefix + "KhadlajShiyaakaBlue.html" },
    { name: "Azzaro The Most Wanted Parfum", url: pagesPrefix + "azzaro-the-most-wanted-parfum.html" },
    { name: "Lancôme La Vie Est Belle", url: pagesPrefix + "lancome-la-vie-est-belle-edp-recharge.html" },
    { name: "YSL Y Eau de Parfum", url: pagesPrefix + "ysl-y-edp.html" },
    { name: "YSL MYSLF", url: pagesPrefix + "ysl-myslf-edp.html" },
    { name: "Rasasi Hawas Black", url: pagesPrefix + "rasasi-hawas-black-edp.html" },
    { name: "Rue Broca Théorème Matrix", url: pagesPrefix + "rue-broca-theoreme-matrix-edp.html" },
    { name: "Jean Paul Gaultier Scandal", url: pagesPrefix + "jean-paul-gaultier-scandal-edp.html" }
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

  // Tracker le clic sur "Commander"
  document.querySelectorAll(".checkout-btn, .checkout").forEach(btn => {
    btn.addEventListener("click", () => {
      trackEvent("click_commander");
    });
  });

});
