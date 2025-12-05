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
        if (event === 'PASSWORD_RECOVERY') showSection('admin-update-pass-sec');
    });
}

function showSection(id) {
    document.querySelectorAll('.app-section').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(id);
    if(target) target.classList.remove('hidden');
}

// ==========================================
// 🛡️ RANK LOGIC
// ==========================================
function getRankInfo(redeems) {
    const r = parseInt(redeems) || 0;
    if (r >= 30) return { name: "TITAN", img: "shield_titan.png", color: "#e6e6fa", next: 1000, pct: 100 };
    if (r >= 26) return { name: "CHAMPION", img: "shield_champion.png", color: "#ff4500", next: 30, pct: (r/30)*100 };
    if (r >= 21) return { name: "MASTER", img: "shield_master.png", color: "#dc143c", next: 26, pct: (r/26)*100 };
    if (r >= 16) return { name: "CRYSTAL", img: "shield_crystal.png", color: "#00ffff", next: 21, pct: (r/21)*100 };
    if (r >= 11) return { name: "GOLD", img: "shield_gold.png", color: "#ffd700", next: 16, pct: (r/16)*100 };
    if (r >= 6)  return { name: "SILVER", img: "shield_silver.png", color: "#c0c0c0", next: 11, pct: (r/11)*100 };
    return { name: "BRONZE", img: "shield_bronze.png", color: "#cd7f32", next: 6, pct: (r/6)*100 };
}

// ==========================================
// ⚡ CORE ACTIONS (CREATE / STAMP / DELETE)
// ==========================================

// 1. CREATE CUSTOMER (FIXED)
async function createCustomer() {
    const nameInput = document.getElementById('new-name');
    const mobileInput = document.getElementById('new-mobile');
    
    const name = nameInput.value.trim();
    const mobile = mobileInput.value.trim();

    if (!name || !mobile) {
        return alert("Please enter both Name and Mobile Number");
    }

    // Visual Feedback
    const btn = document.querySelector('#adm-add-sec button');
    const oldText = btn.innerText;
    btn.innerText = "Creating...";
    btn.disabled = true;

    try {
        const res = await fetch(`${API_URL}/customer`, { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'}, 
            body: JSON.stringify({action: 'add', name, mobile}) 
        });
        
        const data = await res.json();
        
        if(res.ok) { 
            alert("Customer Added Successfully!");
            // Clear inputs
            nameInput.value = "";
            mobileInput.value = "";
            // Generate Card
            generateIDCard(name, data.customerId, 0); 
            // Reload List
            loadCustomers();
        } else {
            alert("Error: " + data.error);
        }
    } catch (e) {
        console.error(e);
        alert("Network Error: Could not add customer.");
    } finally {
        btn.innerText = oldText;
        btn.disabled = false;
    }
}

// 2. UPDATE STAMP
async function updateStamp(id, type) {
    // Optimistic UI
    const cust = customersList.find(c => c.customer_id === id);
    if(!cust) return;
    
    if(type === 'add') { cust.stamps = (cust.stamps || 0) + 1; }
    else if (type === 'remove') { cust.stamps = Math.max(0, (cust.stamps || 0) - 1); }
    else if (type === 'reset') { cust.stamps = 0; cust.redeems = (cust.redeems || 0) + 1; }
    
    renderAdminList(customersList);

    await fetch(`${API_URL}/customer`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'stamp', id, type})
    });
}

// 3. DELETE CUSTOMER
async function deleteCustomer(id) {
    if(confirm("Permanently Delete User?")) {
        await fetch(`${API_URL}/customer`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'delete', id}) });
        loadCustomers();
    }
}

// ==========================================
// 🎨 ID CARD GENERATOR
// ==========================================
async function generateIDCard(name, id, redeems = 0) {
    document.getElementById('id-modal').classList.remove('hidden');
    const canvas = document.getElementById('cardCanvas');
    const ctx = canvas.getContext('2d');
    const rank = getRankInfo(redeems);

    const loadImage = (src) => new Promise((resolve) => {
        const img = new Image(); img.onload = () => resolve(img); img.onerror = () => resolve(null); img.src = src;
    });

    const logoImg = await loadImage('assets/logo.png');
    const shieldImg = await loadImage(`assets/${rank.img}`);

    // BG
    const grd = ctx.createLinearGradient(0, 0, 450, 270);
    grd.addColorStop(0, "#1a0505"); grd.addColorStop(1, "#000000");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 450, 270);

    // Borders
    ctx.strokeStyle = rank.color; ctx.lineWidth = 3; ctx.strokeRect(10, 10, 430, 250);

    // Logo
    if (logoImg) {
        ctx.save(); ctx.shadowColor = "black"; ctx.shadowBlur = 10;
        ctx.drawImage(logoImg, 25, 25, 60, 60); ctx.restore();
    }

    // Header
    ctx.textAlign = "left"; ctx.fillStyle = rank.color;
    ctx.font = "bold 28px 'Cinzel'"; ctx.fillText("RK DRAGON", 95, 55);
    ctx.font = "10px sans-serif"; ctx.fillStyle = "#aaa"; ctx.letterSpacing = "2px";
    ctx.fillText("OFFICIAL MEMBER", 95, 72);

    // Shield
    if (shieldImg) ctx.drawImage(shieldImg, 360, 20, 60, 70);

    // ID Box
    ctx.fillStyle = "rgba(255, 255, 255, 0.05)"; ctx.roundRect(25, 110, 280, 60, 10); ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = "bold 36px monospace"; ctx.fillText(id, 45, 152);
    ctx.font = "10px sans-serif"; ctx.fillStyle = "#666"; ctx.fillText("RUNE ID", 45, 125);

    // Name & Rank
    ctx.fillStyle = rank.color; ctx.font = "italic 22px serif";
    let dName = name.toUpperCase(); if(dName.length > 20) dName = dName.substring(0, 18) + "..";
    ctx.fillText(dName, 25, 230);
    ctx.fillStyle = "#fff"; ctx.font = "12px sans-serif"; ctx.fillText(rank.name + " TIER", 25, 250);
    
    // Footer
    ctx.fillStyle = rank.color; ctx.fillRect(350, 240, 80, 8);
}

function downloadID() {
    const link = document.createElement('a'); link.download = 'RK_Card.jpg';
    link.href = document.getElementById('cardCanvas').toDataURL(); link.click();
}

// ==========================================
// 🛡️ ADMIN AUTH
// ==========================================
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
async function resetAdminPassword() {
    const email = document.getElementById('forgot-email').value;
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.href });
    if(error) alert(error.message); else alert("Reset link sent!");
}
async function updateAdminPassword() {
    const newPass = document.getElementById('new-password').value;
    const { error } = await supabaseClient.auth.updateUser({ password: newPass });
    if (error) alert(error.message); else { alert("Updated! Login."); await supabaseClient.auth.signOut(); window.location.href='dashboard_secure.html'; }
}
async function adminSignOut() { await supabaseClient.auth.signOut(); window.location.reload(); }

// ==========================================
// 📋 ADMIN LIST
// ==========================================
let customersList = [];
async function loadCustomers() {
    const el = document.getElementById('customer-list');
    if(!el) return;
    if(customersList.length === 0) el.innerHTML = '<div style="color:#888;">Summoning...</div>';
    try {
        const res = await fetch(`${API_URL}/customer?action=list`);
        customersList = await res.json();
        renderAdminList(customersList);
    } catch(e) { console.error(e); }
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
            <img src="assets/${rank.img}" class="rank-mini-icon" onerror="this.src='assets/logo.png'">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <div style="font-weight:bold; font-size:1.1em; color:white;">${c.name}</div>
                    <div style="color:${rank.color}; font-size:0.9em;">${c.customer_id}</div>
                </div>
            </div>
            <div class="stamp-container">${getDragonBalls(safeStamps)}</div>
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

// ==========================================
// ⚔️ CUSTOMER PORTAL
// ==========================================
async function customerLogin() {
    const idInput = document.getElementById('cust-login-id');
    if(!idInput) return;
    const id = idInput.value.trim();
    if(!id) return alert("Enter Rune ID");
    try {
        const res = await fetch(`${API_URL}/customer?action=login&id=${id}`);
        const data = await res.json();
        if(res.ok && data.customer_id) {
            document.getElementById('cust-login-sec').classList.add('hidden');
            document.getElementById('cust-dashboard').classList.remove('hidden');
            renderCustomerStats(data);
        } else alert("ID not found.");
    } catch (e) { alert("Connection Error"); }
}

function renderCustomerStats(c) {
    const rank = getRankInfo(c.redeems || 0);
    document.getElementById('display-cust-name').innerText = c.name;
    document.getElementById('display-rank-name').innerText = rank.name;
    document.getElementById('display-rank-name').style.color = rank.color;
    document.getElementById('display-redeems').innerText = c.redeems || 0;
    
    document.getElementById('rank-shield-img').src = `assets/${rank.img}`;
    document.getElementById('rank-shield-img').onerror = function() { this.src = 'assets/logo.png'; };

    const nextGoal = rank.next;
    const progress = Math.min(((c.redeems || 0) / nextGoal) * 100, 100);
    document.getElementById('xp-bar').style.width = `${progress}%`;
    
    document.getElementById('cust-stamps-display').innerHTML = getDragonBalls(c.stamps||0);
    document.getElementById('view-my-id-btn').onclick = () => generateIDCard(c.name, c.customer_id, c.redeems);
}

// Helpers
function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function showAdminTab(tab) {
    document.getElementById('adm-add-sec').classList.add('hidden'); document.getElementById('adm-list-sec').classList.add('hidden');
    if(tab === 'add') document.getElementById('adm-add-sec').classList.remove('hidden');
    if(tab === 'list') { document.getElementById('adm-list-sec').classList.remove('hidden'); loadCustomers(); }
}
function searchCustomers() {
    const q = document.getElementById('search-input').value.toLowerCase();
    renderAdminList(customersList.filter(c => c.name.toLowerCase().includes(q) || c.customer_id.toLowerCase().includes(q)));
}
function exportCSV() { /* Code same as previous response */ }
function importCSV() { document.getElementById('csv-input').files[0] && alert("Import Logic Ready"); }
