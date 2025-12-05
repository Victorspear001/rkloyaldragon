// --- CONFIGURATION ---
const API_URL = '/api';

// ⚠️ PASTE KEYS HERE
const SUPABASE_URL = 'https://iszzxbakpuwjxhgjwrgi.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzenp4YmFrcHV3anhoZ2p3cmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDE4MDcsImV4cCI6MjA3OTgxNzgwN30.NwWX_PUzLKsfw2UjT0SK7wCZyZnd9jtvggf6bAlD3V0'; 

let supabaseClient = null;
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && document.getElementById('admin-portal')) {
            showSection('admin-dashboard');
            loadCustomers();
        }
        if (event === 'PASSWORD_RECOVERY') showSection('admin-update-pass-sec');
    });
}

// --- UTILS ---
function showSection(id) {
    const ids = ['admin-login-sec', 'admin-register-sec', 'admin-forgot-sec', 'admin-update-pass-sec', 'admin-dashboard'];
    ids.forEach(sid => {
        const el = document.getElementById(sid);
        if(el) el.classList.add('hidden');
    });
    document.getElementById(id).classList.remove('hidden');
}

// --- ADMIN LIST ---
let customersList = [];

async function loadCustomers() {
    const el = document.getElementById('customer-list');
    if(!el) return;
    
    // Don't wipe the list if we are just refreshing data, only if empty
    if(el.innerHTML === "" || el.innerHTML.includes("Loading")) {
        el.innerHTML = '<div style="color:#888; margin-top:20px;">Summoning data...</div>';
    }

    try {
        const res = await fetch(`${API_URL}/customer?action=list`);
        if(res.ok) {
            customersList = await res.json();
            renderAdminList(customersList);
        }
    } catch(e) { console.error("Load failed"); }
}

function renderAdminList(data) {
    const el = document.getElementById('customer-list');
    if(!el) return;
    el.innerHTML = "";
    
    data.forEach(c => {
        const rank = calculateRank(c.lifetime_stamps || 0);
        let btns = '';

        // Prevent negative stamps or nulls visually
        const safeStamps = c.stamps || 0;
        const safeLife = c.lifetime_stamps || 0;

        if(safeStamps >= 6) {
            btns = `
            <div class="stamp-control">
                <button onclick="updateStamp(this, '${c.customer_id}', 'reset')" style="background:linear-gradient(45deg, gold, orange); color:black; font-weight:bold; flex:3;">🎁 REDEEM</button>
                <button onclick="updateStamp(this, '${c.customer_id}', 'remove')" class="secondary" style="flex:1;">Undo</button>
            </div>`;
        } else {
            btns = `
            <div class="stamp-control">
                <button onclick="updateStamp(this, '${c.customer_id}', 'add')" style="flex:3;">+ Stamp</button>
                <button onclick="updateStamp(this, '${c.customer_id}', 'remove')" class="secondary" style="flex:1;">-</button>
            </div>`;
        }

        const div = document.createElement('div');
        div.className = 'cust-item';
        div.innerHTML = `
            <div style="position:absolute; top:10px; right:10px; width:30px;">${getRankSVG(rank.name)}</div>
            <div class="cust-header">
                <div>
                    <div class="cust-name">${c.name}</div>
                    <div class="cust-id">${c.customer_id}</div>
                </div>
            </div>
            <div style="font-size:0.8em; color:#888; margin-bottom:10px;">
                Mobile: ${c.mobile} | Lvl: <span style="color:${rank.color}">${rank.name}</span> (${safeLife})
            </div>
            
            <div class="stamp-container" style="justify-content:flex-start; margin: 10px 0;">
                ${getOrbHTML(safeStamps)}
            </div>
            ${btns}
            <div class="action-row" style="margin-top:10px; display:flex; gap:10px;">
                <button class="secondary small-btn" onclick="generateIDCard('${c.name}', '${c.customer_id}', ${safeLife})">ID Card</button>
                <button class="secondary small-btn danger" onclick="deleteCustomer('${c.customer_id}')">Delete</button>
            </div>
        `;
        el.appendChild(div);
    });
}

// --- UPDATED STAMP LOGIC (Prevents Double Clicks) ---
async function updateStamp(btnElement, id, type) {
    // 1. Disable button visually to prevent double click
    if(btnElement) {
        btnElement.disabled = true;
        btnElement.style.opacity = "0.5";
        btnElement.innerText = "...";
    }

    // 2. Send Request
    await fetch(`${API_URL}/customer`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'stamp', id, type})
    });

    // 3. Reload Truth from Server (No guessing)
    await loadCustomers();
}

async function deleteCustomer(id) {
    if(!confirm("Permanently Delete?")) return;
    await fetch(`${API_URL}/customer`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'delete', id})
    });
    loadCustomers();
}

// --- REST OF THE CODE (Login, ID Card, SVGs) ---
// (Keep the calculateRank, getRankSVG, generateIDCard, adminAuth functions exactly as they were in the previous "Ultimate" response. They are fine.)

function calculateRank(total) {
    if (total > 30) return { name: "TITAN", color: "#e6e6fa", pct: 100, next: "Max" };
    if (total > 25) return { name: "CHAMPION", color: "#ff4500", pct: (total/30)*100, next: "Titan" };
    if (total > 20) return { name: "MASTER", color: "#dc143c", pct: (total/25)*100, next: "Champion" };
    if (total > 15) return { name: "CRYSTAL", color: "#00ffff", pct: (total/20)*100, next: "Master" };
    if (total > 10) return { name: "GOLD", color: "#ffd700", pct: (total/15)*100, next: "Crystal" };
    if (total > 5)  return { name: "SILVER", color: "#c0c0c0", pct: (total/10)*100, next: "Gold" };
    return { name: "BRONZE", color: "#cd7f32", pct: (total/5)*100, next: "Silver" };
}

function getRankSVG(rankName) {
    const c = { "BRONZE":"#cd7f32", "SILVER":"#c0c0c0", "GOLD":"#ffd700", "CRYSTAL":"#00ffff", "MASTER":"#dc143c", "CHAMPION":"#ff4500", "TITAN":"#e6e6fa" }[rankName.split(' ')[0]] || "#fff";
    return `<svg viewBox="0 0 100 100" fill="none"><path d="M50 5 L90 20 V50 Q90 80 50 95 Q10 80 10 50 V20 Z" fill="${c}" fill-opacity="0.3" stroke="${c}" stroke-width="3"/><path d="M50 20 V80" stroke="${c}" stroke-width="1"/><circle cx="50" cy="50" r="12" fill="${c}"/></svg>`;
}

function getOrbHTML(count) {
    let html = '';
    for(let i=0; i<6; i++) html += `<div class="orb ${i < count ? 'filled' : ''}"></div>`;
    return html;
}

// ... (Paste the rest of the Auth/Create/Import/IDCard functions from the previous response here) ...
// Ensure you include adminSignUp, adminSignIn, createCustomer, generateIDCard, etc.
// The key changes above were in `updateStamp` and `renderAdminList`.

async function createCustomer() {
    const name = document.getElementById('new-name').value;
    const mobile = document.getElementById('new-mobile').value;
    const res = await fetch(`${API_URL}/customer`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'add', name, mobile}) });
    const data = await res.json();
    if(res.ok) { generateIDCard(name, data.customerId); loadCustomers(); } else alert(data.error);
}

// ... (Add Admin Auth functions from previous response) ...
async function adminSignUp() {
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-pass').value;
    const username = document.getElementById('reg-username').value;
    if (!email || !password || !username) return alert("Fill all fields");
    const { data: existing } = await supabaseClient.from('admin_profiles').select('username').eq('username', username).single();
    if(existing) return alert("Username taken");
    const { error } = await supabaseClient.auth.signUp({ email, password });
    if (error) return alert(error.message);
    await supabaseClient.from('admin_profiles').insert([{ username, email }]);
    alert("Success! Login now.");
    showSection('admin-login-sec');
}
async function adminSignIn() {
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-pass').value;
    if (!username || !password) return alert("Enter credentials");
    const { data } = await supabaseClient.from('admin_profiles').select('email').eq('username', username).single();
    if (!data) return alert("Username not found");
    const { error } = await supabaseClient.auth.signInWithPassword({ email: data.email, password });
    if (error) alert("Incorrect Password");
}
async function adminSignOut() { await supabaseClient.auth.signOut(); window.location.reload(); }
async function resetAdminPassword() {
    const email = document.getElementById('forgot-email').value;
    if(!email) return alert("Enter email");
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.href });
    if(error) alert(error.message); else alert("Reset link sent!");
}
async function updateAdminPassword() {
    const newPass = document.getElementById('new-password').value;
    if(newPass.length < 6) return alert("Too short");
    const { error } = await supabaseClient.auth.updateUser({ password: newPass });
    if (error) alert(error.message); else { alert("Updated! Login."); adminSignOut(); }
}

// ... (Add ID Card Generator from previous response) ...
function generateIDCard(name, id, lifetimeStamps = 0) {
    document.getElementById('id-modal').classList.remove('hidden');
    const canvas = document.getElementById('cardCanvas');
    const ctx = canvas.getContext('2d');
    const rank = calculateRank(lifetimeStamps);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const grd = ctx.createLinearGradient(0, 0, 450, 270);
    grd.addColorStop(0, "#0a0a0a"); grd.addColorStop(1, "#1a1a1a");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 450, 270);
    ctx.save(); ctx.strokeStyle = "rgba(255, 255, 255, 0.03)"; ctx.lineWidth = 1;
    for (let y = 0; y < 270; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(450, y); ctx.stroke(); }
    for (let x = -200; x < 450; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 270, 270); ctx.stroke(); }
    ctx.restore();
    ctx.shadowBlur = 25; ctx.shadowColor = rank.color; ctx.strokeStyle = rank.color; ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, 430, 250); ctx.shadowBlur = 0;
    ctx.save(); ctx.translate(380, 50); ctx.beginPath(); ctx.moveTo(0, -35); ctx.lineTo(30, 0); ctx.lineTo(0, 35); ctx.lineTo(-30, 0); ctx.closePath();
    const badgeGrad = ctx.createLinearGradient(0, -35, 0, 35); badgeGrad.addColorStop(0, rank.color); badgeGrad.addColorStop(1, "#000");
    ctx.fillStyle = badgeGrad; ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = "bold 24px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(rank.name[0], 0, 2); ctx.restore();
    ctx.textAlign = "left"; ctx.fillStyle = rank.color; ctx.font = "bold 26px 'Cinzel', serif"; ctx.shadowColor = rank.color; ctx.shadowBlur = 10;
    ctx.fillText("RK DRAGON", 30, 50); ctx.shadowBlur = 0;
    ctx.font = "10px sans-serif"; ctx.letterSpacing = "2px"; ctx.fillStyle = "#aaa"; ctx.fillText("OFFICIAL GUILD PASS", 30, 68);
    ctx.fillStyle = "linear-gradient(135deg, #d4af37, #aa8833)"; const chipGrad = ctx.createLinearGradient(30, 100, 80, 140);
    chipGrad.addColorStop(0, "#ebd197"); chipGrad.addColorStop(1, "#b38b38"); ctx.fillStyle = chipGrad; ctx.roundRect(30, 100, 50, 35, 5);
    ctx.fill(); ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1; ctx.strokeRect(30, 100, 50, 35);
    ctx.textAlign = "left"; ctx.fillStyle = "#fff"; ctx.font = "bold 34px monospace"; ctx.shadowColor = rank.color; ctx.shadowBlur = 15;
    ctx.fillText(id, 30, 180); ctx.shadowBlur = 0;
    ctx.fillStyle = "#fff"; ctx.font = "14px sans-serif"; ctx.letterSpacing = "1px"; ctx.fillText(rank.name + " TIER", 30, 215);
    ctx.fillStyle = rank.color; ctx.font = "italic 22px serif"; let dName = name.toUpperCase(); if(dName.length > 22) dName = dName.substring(0, 20) + "..";
    ctx.fillText(dName, 30, 240);
    ctx.fillStyle = "#fff"; ctx.fillRect(370, 180, 50, 50); ctx.fillStyle = "#000"; ctx.font = "8px sans-serif"; ctx.textAlign = "center"; ctx.fillText("SCAN", 395, 208);
}
function downloadID() { const link = document.createElement('a'); link.download = 'RK_Card.jpg'; link.href = document.getElementById('cardCanvas').toDataURL(); link.click(); }
function searchCustomers() { const q = document.getElementById('search-input').value.toLowerCase(); renderAdminList(customersList.filter(c => c.name.toLowerCase().includes(q) || c.customer_id.toLowerCase().includes(q))); }
function exportCSV() { if(customersList.length === 0) return alert("No data"); let csv = "Name,Mobile,ID,Stamps,Lifetime\n" + customersList.map(r => `"${r.name}",${r.mobile},${r.customer_id},${r.stamps},${r.lifetime_stamps}`).join("\n"); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([csv], {type:'text/csv'})); link.download = "data.csv"; link.click(); }
function importCSV() { document.getElementById('csv-input').files[0] && alert("Import Logic (Use code from previous response)"); }
