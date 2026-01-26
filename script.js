// --- 1. SOZLAMALAR ---
const BOT_USER = "Cafe888adminbot"; 
const SHEET_ID = "1j6VojbeSYWgYj3UY98xCxHLCzHcGlEg0nXjYwHDkKQk";
const ADS_ID = "1ENQ4bnzBxj7x5jmrXUwdDZhmEMQ7umPTPwq2bgXfj3k";

firebase.initializeApp({
    apiKey: "AIzaSyCVSfWRZ77PFFxip93NcD5QZ9Fc0gMUyW8",
    authDomain: "cafe888-c2d7d.firebaseapp.com",
    databaseURL: "https://cafe888-c2d7d-default-rtdb.firebaseio.com",
    projectId: "cafe888-c2d7d",
    storageBucket: "cafe888-c2d7d.firebasestorage.app",
    messagingSenderId: "286769489924",
    appId: "1:286769489924:web:f778a8d15d46abaf1b2d51"
});
const db = firebase.database();

let products = [], cart = {}, user = null, loc = null, favs = {}, stories = [], stIdx = 0, stTimer, shopLoc = null, activePromo = null;
let tempPmId = null, tempPmQty = 1, map = null, carMarker = null;

// --- INIT ---
window.onload = () => {
    // Mavzuni tekshirish
    if (localStorage.getItem('theme') === 'light') document.body.classList.add('light-mode');
    
    // Auth tekshirish
    const uid = localStorage.getItem('cafe_uid');
    if (uid) checkAuth(uid); else document.getElementById('loginModal').style.display = 'flex';
    
    loadData(); loadStories();
    db.ref('info/location').on('value', s => shopLoc = s.val());
};

// --- 2. AUTHENTICATION ---
function doLogin() {
    const token = 'req_' + Date.now();
    document.getElementById('tgBtn').style.display = 'none';
    document.getElementById('loadSpinner').classList.remove('hidden');
    window.open(`https://t.me/${BOT_USER}?start=login_${token}`, '_blank');
    
    const ref = db.ref('auth_tokens/' + token);
    ref.on('value', s => {
        if (s.val()) {
            user = s.val();
            localStorage.setItem('cafe_uid', user.phone.replace('+', ''));
            ref.remove();
            document.getElementById('loginModal').style.display = 'none';
            initApp();
        }
    });
}

function checkAuth(uid) {
    db.ref('users/' + uid).on('value', s => {
        if (s.val()) { 
            user = s.val(); 
            document.getElementById('loginModal').style.display = 'none'; 
            initApp(); 
        } else {
            document.getElementById('loginModal').style.display = 'flex';
        }
    });
}

function initApp() {
    document.getElementById('uName').innerText = user.name;
    document.getElementById('uPhone').innerText = user.phone;
    favs = user.favorites || {};
    loadHistory(); 
    loadChat();
    updateStats();
}

// --- 3. DATA & UI ---
function loadData() {
    fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`).then(r => r.text()).then(t => {
        const j = JSON.parse(t.substr(47).slice(0, -2));
        products = j.table.rows.map(r => ({
            id: r.c[0]?.v, cat: r.c[1]?.v || "Boshqa", name: r.c[2]?.v, 
            price: r.c[3]?.v || 0, img: r.c[4]?.v, desc: r.c[5]?.v || ""
        }));
        renderCats(); 
        renderGrid('Barchasi');
    });
}

function renderCats() {
    const cats = ['Barchasi', ...new Set(products.map(p => p.cat))];
    document.getElementById('catNav').innerHTML = cats.map(c => 
        `<div class="cat-pill tap-effect ${c == 'Barchasi' ? 'active' : ''}" onclick="filter('${c}',this)">${c}</div>`
    ).join('');
}

function filter(c, el) {
    document.querySelectorAll('.cat-pill').forEach(x => x.classList.remove('active'));
    el.classList.add('active'); 
    renderGrid(c);
}

function renderGrid(c) {
    const list = c == 'Barchasi' ? products : products.filter(p => p.cat == c);
    document.getElementById('menuGrid').innerHTML = list.map(p => {
        const qty = cart[p.id] || 0;
        const btnHtml = qty > 0 
            ? `<div class="qty-selector" onclick="event.stopPropagation()">
                 <div class="qs-btn" onclick="updCart(${p.id},-1)">-</div>
                 <div class="qs-num">${qty}</div>
                 <div class="qs-btn" onclick="updCart(${p.id},1)">+</div>
               </div>`
            : `<div class="btn-add tap-effect" onclick="updCart(${p.id},1);event.stopPropagation()">+</div>`;
        
        return `
        <div class="product-card tap-effect" onclick="openProd(${p.id})">
            <div class="card-image-wrap">
                <img src="${p.img}">
                <div class="card-fav-btn ${favs[p.id]?'active':''}" onclick="toggleFav(${p.id});event.stopPropagation()">
                    <i class="fa fa-heart"></i>
                </div>
            </div>
            <div class="card-content">
                <div class="card-title">${p.name}</div>
                <div class="card-footer">
                    <div class="card-price">${p.price.toLocaleString()} so'm</div>
                    ${btnHtml}
                </div>
            </div>
        </div>`;
    }).join('');
}

// --- 4. CART & GPS ---
function updCart(id, n) { 
    cart[id] = (cart[id] || 0) + n; 
    if (cart[id] <= 0) delete cart[id]; 
    renderGrid(document.querySelector('.cat-pill.active').innerText); 
    renderCart(); 
}

function renderCart() {
    let t = 0, h = '';
    const items = Object.keys(cart);
    document.getElementById('navCartBadge').innerText = items.length;
    document.getElementById('navCartBadge').classList.toggle('hidden', items.length === 0);

    for (let id in cart) {
        const p = products.find(x => x.id == id);
        t += p.price * cart[id];
        h += `<div class="cart-item">
            <img src="${p.img}" class="cart-thumb">
            <div class="cart-info">
                <div class="cart-title">${p.name}</div>
                <div class="cart-price">${p.price.toLocaleString()} so'm</div>
            </div>
            <div class="cart-controls">
                <div onclick="updCart(${p.id},-1)" style="font-size:18px;font-weight:bold;">-</div>
                <b>${cart[id]}</b>
                <div onclick="updCart(${p.id},1)" style="font-size:18px;font-weight:bold;">+</div>
            </div>
        </div>`;
    }
    
    let disp = t.toLocaleString() + " so'm";
    if (activePromo) {
        let final = t - (t * activePromo / 100);
        disp = `<span class="strike">${t.toLocaleString()}</span> ${final.toLocaleString()} so'm`;
    }
    
    document.getElementById('cartList').innerHTML = h || "<div style='text-align:center;padding:40px;color:var(--text-muted)'>Savat bo'sh</div>";
    document.getElementById('cartTotal').innerHTML = disp;
    
    const btn = document.getElementById('orderBtn');
    // Button Logic
    if (t > 0 && loc) { 
        btn.classList.remove('disabled'); 
        btn.style.opacity = '1';
    } else { 
        btn.classList.add('disabled'); 
        btn.style.opacity = '0.5';
    }
}

function getGPS() {
    const b = document.getElementById('gpsBtn');
    b.innerHTML = "<i class='fa fa-circle-notch fa-spin'></i> Aniqlanmoqda...";
    
    if (window.Android && window.Android.checkGPS) window.Android.checkGPS();

    navigator.geolocation.getCurrentPosition(p => {
        const lat = p.coords.latitude, lng = p.coords.longitude;
        // Radius Check
        if (shopLoc && shopLoc.radius) {
            const d = getDist(lat, lng, shopLoc.lat, shopLoc.long);
            if (d > shopLoc.radius) {
                b.innerHTML = "❌ Yetkazib berish hududidan tashqarisiz"; 
                b.classList.remove('ok'); b.classList.add('error');
                toast(`Biz faqat ${shopLoc.radius}km ichida ishlaymiz. Siz ${d.toFixed(1)}km uzoqsiz.`);
                loc = null; renderCart(); return;
            }
        }
        loc = { lat, long: lng };
        b.innerHTML = "✅ Manzil aniqlandi"; 
        b.classList.remove('error'); b.classList.add('success');
        renderCart();
    }, () => {
        b.innerHTML = "❌ GPS Xatosi"; toast("GPS yoqilganligini tekshiring!");
    }, { enableHighAccuracy: true, timeout: 10000 });
}

function sendOrder() {
    const items = []; let t = 0;
    for (let id in cart) { const p = products.find(x => x.id == id); items.push({ name: p.name, qty: cart[id] }); t += p.price * cart[id]; }
    let final = activePromo ? t - (t * activePromo / 100) : t;

    db.ref('orders').push({
        user_id: user.phone, user_info: `${user.name} (${user.phone})`,
        items, total: final, original_total: t, promo_discount: activePromo || 0,
        location: loc, status: 'yangi', time: new Date().toLocaleString()
    }, (e) => {
        if (!e) {
            cart = {}; loc = null; activePromo = null;
            toast("✅ Buyurtma muvaffaqiyatli yuborildi!");
            nav('history', document.querySelectorAll('.nav-item')[2]);
            document.getElementById('gpsBtn').innerHTML = `<i class="fa fa-map-marker-alt"></i> Manzilni aniqlash`;
            document.getElementById('gpsBtn').classList.remove('success');
            clearCart();
        }
    });
}

function clearCart() {
    cart = {}; loc = null; activePromo = null;
    renderCart(); renderGrid(document.querySelector('.cat-pill.active').innerText);
    document.getElementById('promoInp').value = "";
    document.getElementById('promoMsg').innerHTML = "";
}

// --- 5. STORIES & HISTORY ---
function loadStories() {
    fetch(`https://docs.google.com/spreadsheets/d/${ADS_ID}/gviz/tq?tqx=out:json`).then(r => r.text()).then(t => {
        const j = JSON.parse(t.substr(47).slice(0, -2));
        stories = j.table.rows.map(r => r.c[0]?.v).filter(u => u);
        document.getElementById('storiesContainer').innerHTML = stories.map((u, i) => `
            <div class="story-circle tap-effect" onclick="openStory(${i})"><img src="${u}"></div>
        `).join('');
    });
}

function openStory(i) { stIdx = i; document.getElementById('storyViewer').classList.remove('hidden'); showStory(); }
function showStory() {
    if (stIdx >= stories.length) { closeStory(); return; }
    document.getElementById('storyImg').src = stories[stIdx];
    document.getElementById('storyBars').innerHTML = stories.map((_, i) => `
        <div class="progress-bg"><div class="progress-fill ${i === stIdx ? 'active' : (i < stIdx ? 'seen' : '')}"></div></div>
    `).join('');
    clearTimeout(stTimer); stTimer = setTimeout(nextStory, 5000);
}
function nextStory() { stIdx++; showStory(); } 
function prevStory() { if (stIdx > 0) stIdx--; showStory(); } 
function closeStory() { clearTimeout(stTimer); document.getElementById('storyViewer').classList.add('hidden'); }

function loadHistory() {
    db.ref('orders').orderByChild('user_id').equalTo(user.phone).limitToLast(20).on('value', s => {
        const d = s.val(); if (!d) return;
        updateStats(Object.keys(d).length);
        document.getElementById('histList').innerHTML = Object.values(d).reverse().map(o => {
            let st = o.status, cls = 'st-blue', txt = 'YANGI';
            if (st == 'kuryerda') { cls = 'st-gold'; txt = 'KURYERDA'; }
            if (st == 'yetkazildi') { cls = 'st-green'; txt = 'YETKAZILDI'; }
            if (st == 'tayyorlanmoqda') { cls = 'st-orange'; txt = 'TAYYORLANMOQDA'; }
            
            let trk = (st == 'kuryerda' && o.courier_id) ? `<button class="track-btn" onclick="track('${o.courier_id}')">Kuryerni Kuzatish</button>` : '';
            
            return `<div class="hist-card ${cls}">
                <div class="h-header"><span style="font-size:12px;color:var(--text-muted);">${o.time}</span><span class="status-pill ${cls}">${txt}</span></div>
                <div style="font-size:14px;margin-bottom:10px;">${o.items.map(i => `${i.name} x${i.qty}`).join(', ')}</div>
                <div style="font-size:18px;font-weight:800;">${parseInt(o.total).toLocaleString()} so'm</div>
                ${trk}
            </div>`;
        }).join('');
    });
}

function updateStats(orderCount = 0) {
    document.getElementById('statOrders').innerText = orderCount;
    // Bonus logic example
    document.getElementById('statBonus').innerText = (orderCount * 500).toLocaleString();
}

// --- 6. CHAT & MAP & UTILS ---
function loadChat() {
    db.ref('messages/' + user.phone.replace('+', '')).limitToLast(50).on('child_added', s => {
        const m = s.val();
        if (m.from === 'admin' && document.getElementById('chatModal').style.display === 'none') 
            document.getElementById('chatBadge').classList.add('active');
            
        const div = document.createElement('div');
        div.style.display = 'flex';
        div.style.justifyContent = m.from === 'user' ? 'flex-end' : 'flex-start';
        div.innerHTML = `<div class="chat-bubble ${m.from === 'user' ? 'msg-me' : 'msg-adm'}">${m.body}</div>`;
        document.getElementById('chatBox').appendChild(div);
        setTimeout(() => document.getElementById('chatBox').scrollTop = document.getElementById('chatBox').scrollHeight, 100);
    });
}
function sendChat() {
    const t = document.getElementById('chatInp').value; if (!t) return;
    db.ref('messages/' + user.phone.replace('+', '')).push({ from: 'user', body: t, time: Date.now() });
    document.getElementById('chatInp').value = "";
}

var carIcon = L.icon({ iconUrl: 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png', iconSize: [40, 40], iconAnchor: [20, 20] });
function track(cid) {
    document.getElementById('mapModal').style.display = 'block';
    if (!map) { map = L.map('map').setView([41, 69], 13); L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(map); }
    setTimeout(() => map.invalidateSize(), 500);
    db.ref('couriers/' + cid + '/location').on('value', s => {
        const d = s.val(); if (!d) return;
        if (carMarker) carMarker.setLatLng([d.lat, d.long]); else carMarker = L.marker([d.lat, d.long], { icon: carIcon }).addTo(map);
        map.panTo([d.lat, d.long]);
    });
}

function openProd(id) {
    const p = products.find(x => x.id == id); tempPmId = id; tempPmQty = 1;
    document.getElementById('pmImg').src = p.img; document.getElementById('pmName').innerText = p.name;
    document.getElementById('pmPrice').innerText = p.price.toLocaleString() + " so'm";
    document.getElementById('pmDesc').innerText = p.desc; document.getElementById('pmQty').innerText = "1";
    openModal('prodModal');
}
function pmQ(n) { tempPmQty += n; if (tempPmQty < 1) tempPmQty = 1; document.getElementById('pmQty').innerText = tempPmQty; }
function addFromModal() { updCart(tempPmId, tempPmQty); closeModal('prodModal'); }

function openPromoList() {
    openModal('promoListModal');
    db.ref('promocodes').once('value', s => {
        const d = s.val(); if (!d) { document.getElementById('promoListContent').innerHTML = "Kod yo'q"; return; }
        let h = ""; for (let k in d) { if (d[k].limit > 0) h += `<div style="background:rgba(255,255,255,0.05);padding:15px;border-radius:12px;margin-bottom:10px;display:flex;justify-content:space-between;"><b>${k}</b><span style="color:var(--success)">${d[k].discount}% Chegirma</span></div>`; }
        document.getElementById('promoListContent').innerHTML = h || "Aktiv kod yo'q";
    });
}

function checkPromo() {
    const c = document.getElementById('promoInp').value.toUpperCase();
    db.ref('promocodes/' + c).once('value', s => {
        if (s.val() && s.val().limit > 0) {
            activePromo = s.val().discount;
            document.getElementById('promoMsg').innerHTML = `<b style="color:var(--success)">✅ ${activePromo}% Chegirma!</b>`;
            renderCart();
        } else {
            document.getElementById('promoMsg').innerHTML = `<b style="color:var(--danger)">❌ Xato kod</b>`;
        }
    });
}

function getDist(lat1, lon1, lat2, lon2) {
    var R = 6371; var dLat = (lat2 - lat1) * Math.PI / 180; var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); return R * c;
}

function nav(p, el) {
    document.querySelectorAll('.page-container').forEach(x => x.classList.remove('active'));
    document.getElementById('p-' + p).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
    el.classList.add('active');
    if (p == 'cart') renderCart();
}

function openModal(id) { document.getElementById(id).style.display = 'flex'; if (id == 'chatModal') document.getElementById('chatBadge').classList.remove('active'); }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }
function toggleDrawer() { document.getElementById('drawerPanel').classList.toggle('active'); document.getElementById('drawerOverlay').classList.toggle('active'); }
function toast(m) { const d = document.createElement('div'); d.className = 'toast-item'; d.innerHTML = `<i class="fa fa-info-circle" style="color:var(--primary)"></i> ${m}`; document.getElementById('toastBox').appendChild(d); setTimeout(() => d.remove(), 3000); }
function logout() { localStorage.removeItem('cafe_uid'); location.reload(); }
function copy(t) { navigator.clipboard.writeText(t); toast("Nusxalandi"); }
function toggleTheme() { document.body.classList.toggle('light-mode'); localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark'); }
function openNews() { db.ref('news').limitToLast(10).once('value', s => { document.getElementById('newsContent').innerHTML = Object.values(s.val() || {}).reverse().map(n => `<div style="background:rgba(255,255,255,0.05);padding:15px;border-radius:15px;margin-bottom:10px;"><div style="font-weight:700;margin-bottom:5px;">${n.text}</div><div style="font-size:11px;color:gray;">${n.date}</div></div>`).join('') || "Yangilik yo'q"; openModal('newsModal'); }); }
function toggleFav(id) { if (favs[id]) delete favs[id]; else favs[id] = true; db.ref('users/' + user.phone.replace('+', '') + '/favorites').set(favs); renderGrid(document.querySelector('.cat-pill.active').innerText); }
function openFavs() { const l = products.filter(p => favs[p.id]); document.getElementById('favList').innerHTML = l.map(p => `<div class="fav-item"><div class="fav-del" onclick="toggleFav(${p.id});openFavs()">✕</div><img src="${p.img}"><div style="font-size:11px;">${p.name}</div><button style="width:100%;margin-top:5px;background:var(--primary);border:none;border-radius:6px;" onclick="updCart(${p.id},1);closeModal('favModal')">+</button></div>`).join('') || "Bo'sh"; openModal('favModal'); }
