// --- CONFIGURATION ---
const API_URL = '/api';
// ⚠️ PASTE YOUR SUPABASE KEYS HERE
const SUPABASE_URL = 'https://iszzxbakpuwjxhgjwrgi.supabase.co'; 
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlzenp4YmFrcHV3anhoZ2p3cmdpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDE4MDcsImV4cCI6MjA3OTgxNzgwN30.NwWX_PUzLKsfw2UjT0SK7wCZyZnd9jtvggf6bAlD3V0'; 

let supabaseClient = null;
if (typeof supabase !== 'undefined') {
    supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    
    supabaseClient.auth.onAuthStateChange((event, session) => {
        // If logged in AND on admin page, show dashboard
        if (event === 'SIGNED_IN' && document.getElementById('admin-dashboard')) {
            showSection('admin-dashboard');
            loadCustomers();
        }
        // If password reset, show update screen
        if (event === 'PASSWORD_RECOVERY') showSection('admin-update-pass-sec');
    });
}

function showSection(id) {
    document.querySelectorAll('.app-section').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById(id);
    if(target) target.classList.remove('hidden');
}

// ==========================================
// 🛡️ ADMIN AUTH LOGIC
// ==========================================
async function checkAdminSession() {
    if(!supabaseClient) return;
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    // IF SESSION EXISTS -> SHOW DASHBOARD
    if (session) {
        showSection('admin-dashboard');
        loadCustomers();
    } 
    // IF NO SESSION -> SHOW LOGIN (Already visible by default in HTML, but safe to enforce)
    else {
        showSection('admin-login-sec');
    }
}

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
    alert("Registered! Login now.");
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

async function adminSignOut() {
    await supabaseClient.auth.signOut();
    showSection('admin-login-sec');
}

async function resetAdminPassword() {
    const email = document.getElementById('forgot-email').value;
    if(!email) return alert("Enter email");
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: window.location.href });
    if(error) alert(error.message); else alert("Reset link sent!");
}

async function updateAdminPassword() {
    const newPass = document.getElementById('new-password').value;
    const { error } = await supabaseClient.auth.updateUser({ password: newPass });
    if (error) alert(error.message); else { alert("Updated! Login."); adminSignOut(); }
}

// ==========================================
// 🎨 REST OF THE LOGIC (Rank, ID Card, Etc)
// ==========================================
// (Copy the rest of the functions from previous responses: 
//  getRankInfo, generateIDCard, loadCustomers, renderAdminList, 
//  customerLogin, etc. They function perfectly.)

function getRankInfo(redeems) {
    if (redeems >= 30) return { name: "TITAN", img: "shield_titan.png", color: "#e6e6fa", next: 1000, pct: 100 };
    if (redeems >= 26) return { name: "CHAMPION", img: "shield_champion.png", color: "#ff4500", next: 30, pct: (redeems/30)*100 };
    if (redeems >= 21) return { name: "MASTER", img: "shield_master.png", color: "#dc143c", next: 26, pct: (redeems/26)*100 };
    if (redeems >= 16) return { name: "CRYSTAL", img: "shield_crystal.png", color: "#00ffff", next: 21, pct: (redeems/21)*100 };
    if (redeems >= 11) return { name: "GOLD", img: "shield_gold.png", color: "#ffd700", next: 16, pct: (redeems/16)*100 };
    if (redeems >= 6)  return { name: "SILVER", img: "shield_silver.png", color: "#c0c0c0", next: 11, pct: (redeems/11)*100 };
    return { name: "BRONZE", img: "shield_bronze.png", color: "#cd7f32", next: 6, pct: (redeems/6)*100 };
}

// ... Paste generateIDCard, loadCustomers, updateStamp, etc here ...
// Use the versions from the previous "Premium ID" response.
