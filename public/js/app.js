// --- CONFIGURATION ---
const API_URL = '/api';
// ⚠️ PASTE YOUR SUPABASE KEYS HERE
const SUPABASE_URL = 'https://iszzxbakpuwjxhgjwrgi.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzenp4YmFrcHV3anhoZ2p3cmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDE4MDcsImV4cCI6MjA3OTgxNzgwN30.NwWX_PUzLKsfw2UjT0SK7wCZyZnd9jtvggf6bAlD3V0'; 

let supabaseClient = null;
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && document.getElementById('admin-dashboard')) {
            showSection('admin-dashboard');
            loadCustomers();
        }
    });
}

function showSection(id) {
    document.querySelectorAll('.app-section').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(id);
    if(target) target.classList.remove('hidden');
}

// ==========================================
// 🛡️ RANK LOGIC (Based on REDEEMS)
// ==========================================
function getRankInfo(redeems) {
    if (redeems >= 30) return { name: "TITAN", img: "shield_titan.png", color: "#e6e6fa", next: 1000 };
    if (redeems >= 26) return { name: "CHAMPION", img: "shield_champion.png", color: "#ff4500", next: 30 };
    if (redeems >= 21) return { name: "MASTER", img: "shield_master.png", color: "#dc143c", next: 26 };
    if (redeems >= 16) return { name: "CRYSTAL", img: "shield_crystal.png", color: "#00ffff", next: 21 };
    if (redeems >= 11) return { name: "GOLD", img: "shield_gold.png", color: "#ffd700", next: 16 };
    if (redeems >= 6)  return { name: "SILVER", img: "shield_silver.png", color: "#c0c0c0", next: 11 };
    return { name: "BRONZE", img: "shield_bronze.png", color: "#cd7f32", next: 6 };
}

// ==========================================
// 🎨 ID CARD GENERATOR (With Logo)
// ==========================================
async function generateIDCard(name, id, redeems = 0) {
    document.getElementById('id-modal').classList.remove('hidden');
    const canvas = document.getElementById('cardCanvas');
    const ctx = canvas.getContext('2d');
    const rank = getRankInfo(redeems);

    const loadImage = (src) => new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = src;
    });

    const logoImg = await loadImage('assets/logo.png');
    const shieldImg = await loadImage(`assets/${rank.img}`);

    // 1. BG
    ctx.fillStyle = "#0a0a0a"; ctx.fillRect(0, 0, 450, 270);
    const grd = ctx.createLinearGradient(0, 0, 450, 270);
    grd.addColorStop(0, "#1a0505"); grd.addColorStop(1, "#000000");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 450, 270);

    // 2. Borders
    ctx.strokeStyle = rank.color; ctx.lineWidth = 3; ctx.strokeRect(10, 10, 430, 250);

    // 3. Logo (Top Left - Merged)
    if (logoImg) {
        ctx.save();
        ctx.shadowColor = "black"; ctx.shadowBlur = 10;
        ctx.drawImage(logoImg, 25, 25, 60, 60);
        ctx.restore();
    }

    // 4. Header
    ctx.textAlign = "left"; ctx.fillStyle = rank.color;
    ctx.font = "bold 28px 'Cinzel'"; 
    ctx.fillText("RK DRAGON", 95, 55);
    ctx.font = "10px sans-serif"; ctx.fillStyle = "#aaa"; ctx.letterSpacing = "2px";
    ctx.fillText("OFFICIAL MEMBER", 95, 72);

    // 5. Shield (Top Right)
    if (shieldImg) ctx.drawImage(shieldImg, 360, 20, 60, 70);

    // 6. ID Box
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)"; ctx.roundRect(25, 110, 280, 60, 10); ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = "bold 36px monospace"; ctx.fillText(id, 45, 152);
    ctx.font = "10px sans-serif"; ctx.fillStyle = "#666"; ctx.fillText("RUNE ID", 45, 125);

    // 7. Name & Rank
    ctx.fillStyle = rank.color; ctx.font = "italic 22px serif";
    let dName = name.toUpperCase(); if(dName.length > 20) dName = dName.substring(0, 18) + "..";
    ctx.fillText(dName, 25, 230);
    ctx.fillStyle = "#fff"; ctx.font = "12px sans-serif"; ctx.fillText(rank.name + " TIER", 25, 250);

    // 8. Footer Accent
    ctx.fillStyle = rank.color; ctx.fillRect(350, 240, 80, 8);
}

function downloadID() {
    const link = document.createElement('a'); link.download = 'RK_Card.jpg';
    link.href = document.getElementById('cardCanvas').toDataURL(); link.click();
}

// ==========================================
// ⚡ INSTANT UI UPDATES (No Loading)
// ==========================================
async function updateStamp(id, type) {
    const cust = customersList.find(c => c.customer_id === id);
    if(!cust) return;

    // Instant Visual Update
    if(type === 'add') {
        cust.stamps = (cust.stamps || 0) + 1;
    } else if (type === 'remove') {
        cust.stamps = Math.max(0, (cust.stamps || 0) - 1);
    } else if (type === 'reset') {
        cust.stamps = 0;
        cust.redeems = (cust.redeems || 0) + 1; // Level up
    }
    
    // Refresh List Instantly
    renderAdminList(customersList);

    // Send to Server in Background
    await fetch(`${API_URL}/customer`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'stamp', id, type})
    });
}

// ==========================================
// 📋 ADMIN LIST RENDER
// ==========================================
let customersList = [];

async function loadCustomers() {
    const el = document.getElementById('customer-list');
    if(!el) return;
    if(customersList.length === 0) el.innerHTML = '<div style="color:#888;">Summoning...</div>';
    
    const res = await fetch(`${API_URL}/customer?action=list`);
    customersList = await res.json();
    renderAdminList(customersList);
}

function renderAdminList(data) {
    const el = document.getElementById('customer-list');
    if(!el) return;
    el.innerHTML = "";
    
    data.forEach(c => {
        const rank = getRankInfo(c.redeems || 0);
        const safeStamps = c.stamps || 0;
        let btns = '';

        if(safeStamps >= 6) {
            btns = `<div style="display:flex; gap:5px;">
                <button onclick="updateStamp('${c.customer_id}', 'reset')" class="primary-btn" style="flex:2;">🎁 REDEEM</button>
                <button onclick="updateStamp('${c.customer_id}', 'remove')" class="secondary-btn" style="flex:1;">Undo</button>
            </div>`;
        } else {
            btns = `<div style="display:flex; gap:5px;">
                <button onclick="updateStamp('${c.customer_id}', 'add')" class="primary-btn" style="flex:2;">+ Stamp</button>
                <button onclick="updateStamp('${c.customer_id}', 'remove')" class="secondary-btn" style="flex:1;">-</button>
            </div>`;
        }

        const div = document.createElement('div');
        div.className = 'cust-item';
        div.innerHTML = `
            <img src="assets/${rank.img}" class="rank-mini-icon">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-weight:bold; font-size:1.1em; color:white;">${c.name}</div>
                    <div style="color:${rank.color}; font-size:0.9em;">${c.customer_id}</div>
                </div>
            </div>
            
            <div class="stamp-container">
                ${getDragonBalls(safeStamps)}
            </div>
            
            ${btns}
            
            <div style="margin-top:10px; border-top:1px solid #333; padding-top:10px; display:flex; gap:10px;">
                <button onclick="generateIDCard('${c.name}', '${c.customer_id}', ${c.redeems})" class="secondary-btn" style="font-size:0.8em; padding:8px;">View ID</button>
                <button onclick="deleteCustomer('${c.customer_id}')" class="secondary-btn" style="font-size:0.8em; padding:8px; border-color:red; color:red;">Delete</button>
            </div>
        `;
        el.appendChild(div);
    });
}

function getDragonBalls(count) {
    let html = '';
    for(let i=0; i<6; i++) {
        const filled = i < count ? 'filled' : '';
        html += `<div class="dragon-ball ${filled}"></div>`;
    }
    return html;
}

// --- CUSTOMER PAGE LOGIC ---
async function customerLogin() {
    const id = document.getElementById('cust-login-id').value.trim();
    if(!id) return alert("Enter ID");
    
    const res = await fetch(`${API_URL}/customer?action=login&id=${id}`);
    const data = await res.json();
    
    if(res.ok && data.customer_id) {
        showSection('cust-dashboard');
        renderCustomerStats(data);
    } else alert("ID not found");
}

function renderCustomerStats(c) {
    const rank = getRankInfo(c.redeems || 0);
    document.getElementById('display-cust-name').innerText = c.name;
    document.getElementById('display-rank-name').innerText = rank.name;
    document.getElementById('display-rank-name').style.color = rank.color;
    document.getElementById('display-redeems').innerText = c.redeems || 0;
    
    document.getElementById('rank-shield-img').src = `assets/${rank.img}`;
    
    const nextGoal = rank.next;
    const progress = Math.min(((c.redeems || 0) / nextGoal) * 100, 100);
    document.getElementById('xp-bar').style.width = `${progress}%`;
    
    document.getElementById('cust-stamps-display').innerHTML = getDragonBalls(c.stamps||0);
    document.getElementById('view-my-id-btn').onclick = () => generateIDCard(c.name, c.customer_id, c.redeems);
}

// --- ADMIN AUTH & HELPERS ---
async function adminSignIn() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-pass').value;
    const { data } = await supabaseClient.from('admin_profiles').select('email').eq('username', username).single();
    if (!data) return alert("User not found");
    const { error } = await supabaseClient.auth.signInWithPassword({ email: data.email, password });
    if (error) alert("Wrong Password");
}
async function adminSignUp() {
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-pass').value;
    const username = document.getElementById('reg-username').value;
    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) return alert(error.message);
    await supabaseClient.from('admin_profiles').insert([{ username, email }]);
    alert("Registered!"); showSection('admin-login-sec');
}
async function createCustomer() {
    const name = document.getElementById('new-name').value;
    const mobile = document.getElementById('new-mobile').value;
    const res = await fetch(`${API_URL}/customer`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'add', name, mobile}) });
    const data = await res.json();
    if(res.ok) { generateIDCard(name, data.customerId, 0); loadCustomers(); } else alert(data.error);
}
async function deleteCustomer(id) {
    if(confirm("Delete?")) {
        await fetch(`${API_URL}/customer`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'delete', id}) });
        loadCustomers();
    }
}
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function searchCustomers() {
    const q = document.getElementById('search-input').value.toLowerCase();
    renderAdminList(customersList.filter(c => c.name.toLowerCase().includes(q) || c.customer_id.toLowerCase().includes(q)));
}
function exportCSV() { /* Standard Logic */ }
function importCSV() { document.getElementById('csv-input').files[0] && alert("Import Logic"); }
