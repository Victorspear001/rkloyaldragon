// --- CONFIGURATION ---
const API_URL = '/api';

// ⚠️ PASTE YOUR KEYS HERE
const SUPABASE_URL = 'https://iszzxbakpuwjxhgjwrgi.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzenp4YmFrcHV3anhoZ2p3cmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDE4MDcsImV4cCI6MjA3OTgxNzgwN30.NwWX_PUzLKsfw2UjT0SK7wCZyZnd9jtvggf6bAlD3V0'; 

let supabaseClient = null;
let customersList = []; // Global list

if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // 1. Auth Listener: Triggers when user logs in or page loads with active session
    supabaseClient.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            // Only run this if we are on the Admin Page
            if (document.getElementById('admin-portal')) {
                showSection('admin-dashboard');
                loadCustomers(); // Force load list
            }
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

// ==========================================
// 📋 ADMIN LIST LOADING (THE FIX)
// ==========================================
async function loadCustomers() {
    const el = document.getElementById('customer-list');
    if(!el) return;
    
    el.innerHTML = '<div style="color:#d4af37; margin-top:20px; animation:pulse 1s infinite;">Summoning Scrolls...</div>';
    
    try {
        const res = await fetch(`${API_URL}/customer?action=list`);
        
        if (!res.ok) {
            const errText = await res.text();
            throw new Error(errText || "Server Error");
        }

        customersList = await res.json();
        
        if (!Array.isArray(customersList)) {
            throw new Error("Invalid data format received");
        }

        renderAdminList(customersList);

    } catch (e) {
        console.error("Load Error:", e);
        el.innerHTML = `<div style="color:red; margin-top:20px;">Error loading data: ${e.message}<br><button onclick="loadCustomers()" class="small-btn">Retry</button></div>`;
    }
}

function renderAdminList(data) {
    const el = document.getElementById('customer-list');
    if(!el) return;
    el.innerHTML = "";
    
    if (data.length === 0) {
        el.innerHTML = '<div style="color:#666; margin-top:20px;">No customers found. Add one!</div>';
        return;
    }

    data.forEach(c => {
        const rank = calculateRank(c.lifetime_stamps || 0);
        let btns = '';

        if(c.stamps >= 6) {
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
            <div style="position:absolute; top:10px; right:10px; width:40px;">${getRankSVG(rank.name)}</div>
            <div class="cust-header">
                <div>
                    <div class="cust-name">${c.name}</div>
                    <div class="cust-id">${c.customer_id}</div>
                </div>
            </div>
            <div style="font-size:0.8em; color:#888; margin-bottom:10px;">
                Mobile: ${c.mobile} | Lvl: <span style="color:${rank.color}">${rank.name}</span>
            </div>
            
            <div class="stamp-container" style="justify-content:flex-start; margin: 10px 0;">
                ${getOrbHTML(c.stamps)}
            </div>
            
            ${btns}

            <div class="action-row" style="margin-top:10px; display:flex; gap:10px;">
                <button class="secondary small-btn" onclick="generateIDCard('${c.name}', '${c.customer_id}', ${c.lifetime_stamps||0})">View ID</button>
                <button class="secondary small-btn danger" onclick="deleteCustomer('${c.customer_id}')">Delete</button>
            </div>
        `;
        el.appendChild(div);
    });
}

// --- STAMP UPDATE LOGIC ---
async function updateStamp(btn, id, type) {
    if(btn) { btn.disabled = true; btn.style.opacity = "0.5"; } // Prevent double click
    
    // Optimistic Update (Make UI feel fast)
    const c = customersList.find(x => x.customer_id === id);
    if(c) {
        if(type === 'add') { c.stamps++; c.lifetime_stamps = (c.lifetime_stamps||0)+1; }
        if(type === 'remove' && c.stamps > 0) { c.stamps--; c.lifetime_stamps--; }
        if(type === 'reset') c.stamps = 0;
        renderAdminList(customersList);
    }

    await fetch(`${API_URL}/customer`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({action: 'stamp', id, type})
    });
    
    // Background reload to ensure sync
    loadCustomers(); 
}

// ==========================================
// 🎨 LEGENDARY ID CARD GENERATOR
// ==========================================
function generateIDCard(name, id, lifetimeStamps = 0) {
    document.getElementById('id-modal').classList.remove('hidden');
    const canvas = document.getElementById('cardCanvas');
    const ctx = canvas.getContext('2d');
    const rank = calculateRank(lifetimeStamps);

    // 1. CLEAR & BG
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const grd = ctx.createLinearGradient(0, 0, 450, 270);
    grd.addColorStop(0, "#0a0a0a"); grd.addColorStop(1, "#1a1a1a");
    ctx.fillStyle = grd; ctx.fillRect(0, 0, 450, 270);

    // 2. HEX PATTERN
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.03)";
    ctx.lineWidth = 1;
    for (let y = 0; y < 270; y += 30) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(450, y); ctx.stroke(); }
    ctx.restore();

    // 3. RANK BORDER
    ctx.shadowBlur = 20; ctx.shadowColor = rank.color;
    ctx.strokeStyle = rank.color; ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, 430, 250); ctx.shadowBlur = 0;

    // 4. POWER DIAMOND (Rank Icon)
    ctx.save();
    ctx.translate(380, 50);
    ctx.beginPath();
    ctx.moveTo(0, -35); ctx.lineTo(30, 0); ctx.lineTo(0, 35); ctx.lineTo(-30, 0);
    ctx.closePath();
    const badgeGrad = ctx.createLinearGradient(0, -35, 0, 35);
    badgeGrad.addColorStop(0, rank.color); badgeGrad.addColorStop(1, "#000");
    ctx.fillStyle = badgeGrad; ctx.fill();
    ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = "bold 24px serif"; ctx.textAlign = "center"; 
    ctx.fillText(rank.name[0], 0, 8); // Rank Letter
    ctx.restore();

    // 5. TEXT
    ctx.textAlign = "left";
    ctx.fillStyle = rank.color; ctx.font = "bold 26px 'Cinzel', serif"; 
    ctx.shadowColor = rank.color; ctx.shadowBlur = 10;
    ctx.fillText("RK DRAGON", 30, 50); ctx.shadowBlur = 0;
    ctx.font = "10px sans-serif"; ctx.fillStyle = "#aaa"; ctx.letterSpacing = "2px";
    ctx.fillText("OFFICIAL GUILD PASS", 30, 68);

    // 6. EMV CHIP
    ctx.fillStyle = "linear-gradient(135deg, #d4af37, #aa8833)";
    const chipGrad = ctx.createLinearGradient(30, 100, 80, 140);
    chipGrad.addColorStop(0, "#ebd197"); chipGrad.addColorStop(1, "#b38b38");
    ctx.fillStyle = chipGrad; ctx.roundRect(30, 100, 50, 35, 5); ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1; ctx.strokeRect(30, 100, 50, 35);

    // 7. ID
    ctx.fillStyle = "#fff"; ctx.font = "bold 34px monospace";
    ctx.shadowColor = rank.color; ctx.shadowBlur = 15;
    ctx.fillText(id, 30, 180); ctx.shadowBlur = 0;

    // 8. NAME
    ctx.fillStyle = "#fff"; ctx.font = "14px sans-serif"; ctx.letterSpacing = "1px";
    ctx.fillText(rank.name + " TIER", 30, 215);
    ctx.fillStyle = rank.color; ctx.font = "italic 22px serif";
    let dName = name.toUpperCase(); if(dName.length>22) dName=dName.substring(0,20)+"..";
    ctx.fillText(dName, 30, 240);
}

function downloadID() {
    const link = document.createElement('a'); link.download = 'RK_Card.jpg';
    link.href = document.getElementById('cardCanvas').toDataURL(); link.click();
}

// ==========================================
// 📥 IMPORT / EXPORT (Improved)
// ==========================================
function importCSV() {
    const fileInput = document.getElementById('csv-input');
    const file = fileInput.files[0];
    if (!file) { fileInput.click(); return; }

    const reader = new FileReader();
    reader.onload = async function(e) {
        const text = e.target.result;
        const lines = text.split(/\r?\n/);
        if (lines.length < 2) return alert("Invalid CSV");

        const headers = lines[0].toLowerCase().split(",").map(h => h.trim());
        const idxName = headers.findIndex(h => h.includes('name'));
        const idxID = headers.findIndex(h => h.includes('id'));
        const idxStamps = headers.findIndex(h => h.includes('stamps') && !h.includes('lifetime'));
        const idxLife = headers.findIndex(h => h.includes('lifetime'));

        if(idxName === -1 || idxID === -1) return alert("CSV Error: Need Name & ID");

        let batch = [];
        let successCount = 0;
        const batchSize = 50; 

        alert("Importing... Please wait.");

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;
            const cols = line.split(","); 
            const cName = cols[idxName]?.replace(/"/g, '').trim();
            const cID = cols[idxID]?.trim();
            const cStamps = idxStamps > -1 ? (parseInt(cols[idxStamps]) || 0) : 0;
            const cLife = idxLife > -1 ? (parseInt(cols[idxLife]) || 0) : 0;

            if (cName && cID) {
                batch.push({
                    name: cName, mobile: cols[1]||"", customer_id: cID, stamps: cStamps, lifetime_stamps: cLife
                });
            }

            if (batch.length >= batchSize || i === lines.length - 1) {
                if (batch.length > 0) {
                    await sendBatch(batch);
                    successCount += batch.length;
                    batch = [];
                }
            }
        }
        alert(`Success! ${successCount} records imported.`);
        loadCustomers();
        fileInput.value = "";
    };
    reader.readAsText(file);
}

async function sendBatch(data) {
    try {
        await fetch(`${API_URL}/customer`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'import', data: data })
        });
    } catch (err) { console.error("Batch error", err); }
}

function exportCSV() { 
    if(customersList.length === 0) return alert("No data");
    let csv = "Name,Mobile,ID,Stamps,Lifetime_Stamps\n" + 
    customersList.map(r => `"${r.name}",${r.mobile},${r.customer_id},${r.stamps},${r.lifetime_stamps||0}`).join("\n");
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "dragon_customers.csv";
    link.click();
}

// ==========================================
// 🛡️ ADMIN AUTH (Username/Pass)
// ==========================================
async function adminSignUp() {
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-pass').value;
    const username = document.getElementById('reg-username').value;
    if (!email || !password || !username) return alert("Fill all fields");
    if (password.length < 6) return alert("Password too short");

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
    if (error) alert(error.message); else { alert("Updated! Login now."); adminSignOut(); }
}

// --- UTILITIES (Rank, SVGs, etc) ---
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

// --- CUSTOMER LOGIC ---
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
    document.getElementById('display-cust-name').innerText = c.name;
    const rankData = calculateRank(c.lifetime_stamps || 0);
    document.getElementById('rpg-rank').innerText = rankData.name;
    document.getElementById('rpg-rank').style.color = rankData.color;
    
    // Bind View ID Button for Customer
    const btn = document.getElementById('view-my-id-btn');
    if(btn) btn.onclick = () => generateIDCard(c.name, c.customer_id, c.lifetime_stamps || 0);

    const badgeEl = document.getElementById('rank-badge-display');
    if(badgeEl) badgeEl.innerHTML = getRankSVG(rankData.name);

    if(document.getElementById('next-rank-name')) document.getElementById('next-rank-name').innerText = rankData.next;
    
    const barEl = document.getElementById('xp-bar');
    if(barEl) {
        barEl.style.width = Math.min(rankData.pct, 100) + "%";
        barEl.style.background = rankData.color;
    }

    let html = '<div class="stamp-container">';
    for(let i=0; i<6; i++) html += `<div class="orb ${i < c.stamps ? 'filled' : ''}"></div>`;
    html += '</div>';
    document.getElementById('cust-stamps-display').innerHTML = html;
    
    const msg = c.stamps >= 6 ? "🎉 REWARD UNLOCKED!" : `Collect ${6 - c.stamps} more.`;
    document.getElementById('cust-status-msg').innerText = msg;
    document.getElementById('cust-status-msg').style.color = c.stamps >= 6 ? "#0f0" : "#aaa";
}

async function createCustomer() {
    const name = document.getElementById('new-name').value;
    const mobile = document.getElementById('new-mobile').value;
    const res = await fetch(`${API_URL}/customer`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'add', name, mobile}) });
    const data = await res.json();
    if(res.ok) { generateIDCard(name, data.customerId, 0); loadCustomers(); } else alert(data.error);
}

async function deleteCustomer(id) {
    if(!confirm("Delete?")) return;
    await fetch(`${API_URL}/customer`, { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'delete', id}) });
    loadCustomers();
}

function closeModal(id) { document.getElementById(id).classList.add('hidden'); }
function showAdminTab(tab) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active')); event.target.classList.add('active');
    document.getElementById('adm-add-sec').classList.add('hidden'); document.getElementById('adm-list-sec').classList.add('hidden');
    if(tab === 'add') document.getElementById('adm-add-sec').classList.remove('hidden');
    if(tab === 'list') { document.getElementById('adm-list-sec').classList.remove('hidden'); loadCustomers(); }
}
function searchCustomers() {
    const q = document.getElementById('search-input').value.toLowerCase();
    renderAdminList(customersList.filter(c => c.name.toLowerCase().includes(q) || c.customer_id.toLowerCase().includes(q)));
}
