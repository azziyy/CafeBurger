const BOT_USER="Cafe888adminbot", SHEET_ID="1j6VojbeSYWgYj3UY98xCxHLCzHcGlEg0nXjYwHDkKQk", ADS_ID="1ENQ4bnzBxj7x5jmrXUwdDZhmEMQ7umPTPwq2bgXfj3k";
firebase.initializeApp({apiKey:"AIzaSyCVSfWRZ77PFFxip93NcD5QZ9Fc0gMUyW8",authDomain:"cafe888-c2d7d.firebaseapp.com",databaseURL:"https://cafe888-c2d7d-default-rtdb.firebaseio.com",projectId:"cafe888-c2d7d",storageBucket:"cafe888-c2d7d.firebasestorage.app",messagingSenderId:"286769489924",appId:"1:286769489924:web:f778a8d15d46abaf1b2d51"});
const db=firebase.database();
let products=[], cart={}, user=null, loc=null, favs={}, stories=[], stIdx=0, stTimer, shopLoc=null, activePromo=null;
let tempPmId=null, tempPmQty=1, map=null, carMarker=null;

window.onload=()=>{
    if(localStorage.getItem('theme')==='light')document.body.classList.add('light-mode');
    const uid=localStorage.getItem('cafe_uid');
    if(uid)checkAuth(uid); else document.getElementById('loginModal').style.display='flex';
    loadData(); loadStories();
    db.ref('info/location').on('value',s=>shopLoc=s.val());
};

function doLogin(){
    const t='req_'+Date.now();
    window.open(`https://t.me/${BOT_USER}?start=login_${t}`, '_blank');
    db.ref('auth_tokens/'+t).on('value',s=>{
        if(s.val()){ user=s.val(); localStorage.setItem('cafe_uid',user.phone.replace('+','')); db.ref('auth_tokens/'+t).remove(); document.getElementById('loginModal').style.display='none'; initApp(); }
    });
}
function checkAuth(uid){ db.ref('users/'+uid).on('value',s=>{ if(s.val()){ user=s.val(); document.getElementById('loginModal').style.display='none'; initApp(); } else document.getElementById('loginModal').style.display='flex'; }); }
function initApp(){ document.getElementById('uName').innerText=user.name; document.getElementById('uPhone').innerText=user.phone; favs=user.favorites||{}; loadHistory(); loadChat(); }

function loadData(){
    fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json`).then(r=>r.text()).then(t=>{
        const j=JSON.parse(t.substr(47).slice(0,-2));
        products=j.table.rows.map(r=>({id:r.c[0]?.v, cat:r.c[1]?.v||"Boshqa", name:r.c[2]?.v, price:r.c[3]?.v||0, img:r.c[4]?.v, desc:r.c[5]?.v||""}));
        renderCats(); renderGrid('Barchasi');
    });
}
function loadStories(){
    fetch(`https://docs.google.com/spreadsheets/d/${ADS_ID}/gviz/tq?tqx=out:json`).then(r=>r.text()).then(t=>{
        const j=JSON.parse(t.substr(47).slice(0,-2));
        stories=j.table.rows.map(r=>r.c[0]?.v).filter(u=>u);
        document.getElementById('storiesContainer').innerHTML=stories.map((u,i)=>`<div class="story-c tap" onclick="openStory(${i})"><img src="${u}"></div>`).join('');
    });
}

function openStory(i){ stIdx=i; document.getElementById('storyViewer').style.display='flex'; showStory(); }
function showStory(){
    if(stIdx>=stories.length){closeStory();return;}
    document.getElementById('storyImg').src=stories[stIdx];
    document.getElementById('storyBars').innerHTML=stories.map((_,i)=>`<div style="flex:1;height:3px;background:rgba(255,255,255,0.3);border-radius:2px;overflow:hidden;"><div style="height:100%;background:#fff;width:${i===stIdx?'0%':(i<stIdx?'100%':'0%')};transition:${i===stIdx?'width 5s linear':'none'};animation:${i===stIdx?'fillBar 5s linear forwards':'none'}"></div></div>`).join('');
    clearTimeout(stTimer); stTimer=setTimeout(nextStory,5000);
}
function nextStory(){ stIdx++; showStory(); } function prevStory(){ if(stIdx>0)stIdx--; showStory(); } function closeStory(){ clearTimeout(stTimer); document.getElementById('storyViewer').style.display='none'; }

function renderCats(){ const c=['Barchasi',...new Set(products.map(p=>p.cat))]; document.getElementById('catNav').innerHTML=c.map(k=>`<div class="cat-pill tap ${k=='Barchasi'?'active':''}" onclick="filt('${k}',this)">${k}</div>`).join(''); }
function filt(c,el){ document.querySelectorAll('.cat-pill').forEach(x=>x.classList.remove('active')); el.classList.add('active'); renderGrid(c); }
function renderGrid(c){
    const l=c=='Barchasi'?products:products.filter(p=>p.cat==c);
    document.getElementById('menuGrid').innerHTML=l.map(p=>{
        const q=cart[p.id]||0;
        const btn = q>0 ? `<div class="qty-mini tap" onclick="event.stopPropagation()"><div class="qm-btn" onclick="updCart(${p.id},-1)">-</div><b>${q}</b><div class="qm-btn" onclick="updCart(${p.id},1)">+</div></div>` : `<div class="btn-mini-add tap" onclick="updCart(${p.id},1);event.stopPropagation()">+</div>`;
        return `<div class="card tap" onclick="openProd(${p.id})">
            <div class="card-img-wrap"><img src="${p.img}"><div class="fav-abs ${favs[p.id]?'active':''}" onclick="togFav(${p.id});event.stopPropagation()"><i class="fa fa-heart"></i></div></div>
            <div class="card-body"><div class="card-title">${p.name}</div><div class="card-foot"><div class="card-price">${p.price.toLocaleString()} so'm</div>${btn}</div></div>
        </div>`;
    }).join('');
}

function updCart(id,n){ cart[id]=(cart[id]||0)+n; if(cart[id]<=0)delete cart[id]; renderGrid(document.querySelector('.cat-pill.active').innerText); renderCart(); }
function renderCart(){
    let t=0, h='';
    for(let id in cart){
        const p=products.find(x=>x.id==id); t+=p.price*cart[id];
        h+=`<div class="cart-item"><img src="${p.img}" class="cart-img"><div class="cart-info"><h4>${p.name}</h4><p>${p.price.toLocaleString()} so'm</p></div>
        <div class="cart-qty-pill"><div class="c-btn tap" onclick="updCart(${p.id},-1)">-</div><div class="c-num">${cart[id]}</div><div class="c-btn tap" onclick="updCart(${p.id},1)">+</div></div></div>`;
    }
    let disp=t.toLocaleString()+" so'm";
    if(activePromo) disp = `<span class="strike">${t.toLocaleString()}</span> ${(t-(t*activePromo/100)).toLocaleString()} so'm`;
    document.getElementById('cartList').innerHTML=h||"<div style='text-align:center;padding:30px;color:#666'>Savat bo'sh</div>";
    document.getElementById('cartTotal').innerHTML=disp;
    const b=document.getElementById('orderBtn'); if(t>0&&loc){b.style.opacity='1';b.style.pointerEvents='all';}else{b.style.opacity='0.5';b.style.pointerEvents='none';}
}

function getGPS(){
    const b=document.getElementById('gpsBtn'); b.innerHTML="Aniqlanmoqda...";
    if(window.Android && window.Android.checkGPS) window.Android.checkGPS();
    navigator.geolocation.getCurrentPosition(p=>{
        const lat=p.coords.latitude, lng=p.coords.longitude;
        if(shopLoc && shopLoc.radius){
            const d=getDist(lat,lng,shopLoc.lat,shopLoc.long);
            if(d>shopLoc.radius){ b.innerHTML="❌ Uzoq masofa"; b.className='btn-gps err'; loc=null; renderCart(); return; }
        }
        loc={lat,long:lng}; b.innerHTML="✅ Manzil aniqlandi"; b.className='btn-gps ok'; renderCart();
    },()=>{b.innerHTML="❌ GPS Xatosi";},{enableHighAccuracy:true});
}

function sendOrder(){
    const items=[]; let t=0; for(let id in cart){const p=products.find(x=>x.id==id); items.push({name:p.name, qty:cart[id]}); t+=p.price*cart[id];}
    let f=activePromo?t-(t*activePromo/100):t;
    db.ref('orders').push({user_id:user.phone, user_info:`${user.name} (${user.phone})`, items, total:f, original_total:t, promo_discount:activePromo||0, location:loc, status:'yangi', time:new Date().toLocaleString()});
    cart={}; loc=null; activePromo=null; toast("✅ Buyurtma ketdi"); nav('history',document.querySelectorAll('.nav-item')[2]);
    document.getElementById('gpsBtn').innerHTML=`<i class="fa fa-map-marker-alt"></i> Manzilni aniqlash`; document.getElementById('gpsBtn').className='btn-gps';
}

function loadChat(){
    db.ref('messages/'+user.phone.replace('+','')).limitToLast(50).on('child_added', s=>{
        const m=s.val();
        if(m.from==='admin' && document.getElementById('chatModal').style.display==='none') document.getElementById('chatBadge').classList.add('active');
        document.getElementById('chatBox').innerHTML+=`<div style="display:flex;justify-content:${m.from=='user'?'flex-end':'flex-start'}"><div class="chat-bubble ${m.from=='user'?'me':'adm'}">${m.body}</div></div>`;
        setTimeout(()=>document.getElementById('chatBox').scrollTop=document.getElementById('chatBox').scrollHeight, 100);
    });
}
function sendChat(){
    const t=document.getElementById('chatInp').value; if(!t)return;
    db.ref('messages/'+user.phone.replace('+','')).push({from:'user', body:t, time:Date.now()});
    document.getElementById('chatInp').value="";
}

var carIcon=L.icon({iconUrl:'https://cdn-icons-png.flaticon.com/512/3202/3202926.png',iconSize:[40,40],iconAnchor:[20,20]});
function track(cid){
    document.getElementById('mapModal').style.display='block';
    if(!map){map=L.map('map').setView([41,69],13); L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png').addTo(map);}
    setTimeout(()=>map.invalidateSize(),500);
    db.ref('couriers/'+cid+'/location').on('value',s=>{
        const d=s.val(); if(!d)return;
        if(carMarker) carMarker.setLatLng([d.lat,d.long]); else carMarker=L.marker([d.lat,d.long],{icon:carIcon}).addTo(map);
        map.panTo([d.lat,d.long]);
    });
}

function openPromoList(){
    openModal('promoListModal');
    db.ref('promocodes').once('value',s=>{
        const d=s.val(); if(!d){document.getElementById('promoListContent').innerHTML="Kod yo'q";return;}
        let h=""; for(let k in d){if(d[k].limit>0) h+=`<div style="background:rgba(255,255,255,0.05);padding:15px;border-radius:12px;margin-bottom:10px;display:flex;justify-content:space-between;"><b>${k}</b><span style="color:var(--success)">${d[k].discount}% Chegirma</span></div>`;}
        document.getElementById('promoListContent').innerHTML=h||"Aktiv kod yo'q";
    });
}

function nav(p,el){document.querySelectorAll('.page-cont').forEach(x=>x.classList.remove('active'));document.getElementById('p-'+p).classList.add('active');document.querySelectorAll('.nav-item').forEach(x=>x.classList.remove('active'));el.classList.add('active');if(p=='cart')renderCart();}
function openModal(id){document.getElementById(id).style.display='flex'; if(id=='chatModal')document.getElementById('chatBadge').classList.remove('active');}
function closeModal(id){document.getElementById(id).style.display='none';}
function toggleDrawer(){document.getElementById('drawerPanel').classList.toggle('active');document.getElementById('drawerOverlay').classList.toggle('active');}
function toast(m){const d=document.createElement('div');d.className='toast';d.innerText=m;document.getElementById('toastBox').appendChild(d);setTimeout(()=>d.remove(),3000);}
function openProd(id){const p=products.find(x=>x.id==id);tempPmId=id;tempPmQty=1;document.getElementById('pmImg').src=p.img;document.getElementById('pmName').innerText=p.name;document.getElementById('pmPrice').innerText=p.price.toLocaleString()+" so'm";document.getElementById('pmDesc').innerText=p.desc;document.getElementById('pmQty').innerText="1";openModal('prodModal');}
function pmQ(n){tempPmQty+=n;if(tempPmQty<1)tempPmQty=1;document.getElementById('pmQty').innerText=tempPmQty;}
function addFromModal(){updCart(tempPmId,tempPmQty);closeModal('prodModal');}
function togFav(id){if(favs[id])delete favs[id];else favs[id]=true;db.ref('users/'+user.phone.replace('+','')+'/favorites').set(favs);renderGrid(document.querySelector('.cat-pill.active').innerText);}
function openFavs(){const l=products.filter(p=>favs[p.id]);document.getElementById('favList').innerHTML=l.map(p=>`<div class="fav-item"><div class="fav-x" onclick="togFav(${p.id});openFavs()">✕</div><img src="${p.img}"><div style="font-size:11px;">${p.name}</div><button style="width:100%;margin-top:5px;background:var(--gold);border:none;border-radius:6px;" onclick="updCart(${p.id},1);closeModal('favModal')">+</button></div>`).join('')||"Bo'sh";openModal('favModal');}
function checkPromo(){const c=document.getElementById('promoInp').value.toUpperCase();db.ref('promocodes/'+c).once('value',s=>{if(s.val()&&s.val().limit>0){activePromo=s.val().discount;document.getElementById('promoMsg').innerHTML=`<b style="color:var(--success)">✅ ${activePromo}% Chegirma!</b>`;renderCart();}else{document.getElementById('promoMsg').innerHTML=`<b style="color:var(--red)">❌ Xato kod</b>`;}});}
function loadHistory(){db.ref('orders').orderByChild('user_id').equalTo(user.phone).limitToLast(20).on('value',s=>{const d=s.val();if(!d)return;document.getElementById('histList').innerHTML=Object.values(d).reverse().map(o=>{let st=o.status,cls='s-new',txt='YANGI';if(st=='kuryerda'){cls='s-deliv';txt='KURYERDA';}if(st=='yetkazildi'){cls='s-done';txt='YETKAZILDI';}if(st=='tayyorlanmoqda'){cls='s-cook';txt='TAYYORLANMOQDA';}let trk=(st=='kuryerda'&&o.courier_id)?`<button class="track-btn" onclick="track('${o.courier_id}')">Kuryerni Kuzatish</button>`:'';return `<div class="hist-card ${cls}"><div class="h-head"><span>${o.time}</span><span class="st-pill">${txt}</span></div><div style="font-size:14px;margin-bottom:10px;">${o.items.map(i=>`${i.name} x${i.qty}`).join(', ')}</div><div style="font-size:18px;font-weight:800;">${parseInt(o.total).toLocaleString()} so'm</div>${trk}</div>`;}).join('');});}
function getDist(lat1,lon1,lat2,lon2){var R=6371;var dLat=(lat2-lat1)*Math.PI/180;var dLon=(lon2-lon1)*Math.PI/180;var a=Math.sin(dLat/2)*Math.sin(dLat/2)+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)*Math.sin(dLon/2);var c=2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));return R*c;}
function logout(){localStorage.removeItem('cafe_uid');location.reload();}
function copy(t){navigator.clipboard.writeText(t);toast("Nusxalandi");}
function toggleTheme(){document.body.classList.toggle('light-mode');localStorage.setItem('theme',document.body.classList.contains('light-mode')?'light':'dark');}
function openNews(){db.ref('news').limitToLast(10).once('value',s=>{document.getElementById('newsContent').innerHTML=Object.values(s.val()||{}).reverse().map(n=>`<div style="background:rgba(255,255,255,0.05);padding:15px;border-radius:15px;margin-bottom:10px;"><div style="font-weight:700;margin-bottom:5px;">${n.text}</div><div style="font-size:11px;color:gray;">${n.date}</div></div>`).join('')||"Yo'q";openModal('newsModal');});}
