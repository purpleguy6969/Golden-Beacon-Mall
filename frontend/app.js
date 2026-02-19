// ====================================================================
//   Golden Beacon Mall - Complete System with All Features
// ====================================================================

const API_URL = '/api';
let currentUser = null;
let token = localStorage.getItem('token');
let cachedStats = null;
let currentBanUserId = null;

// ══════════════════════════════════════════════════════════════════
//  LANDING PAGE NAVIGATION
// ══════════════════════════════════════════════════════════════════

function showLanding() {
  document.getElementById('landingPage').style.display = 'flex';
  document.getElementById('authContainer').style.display = 'none';
  document.getElementById('dashboard').style.display = 'none';
}

function showGetStarted() {
  document.getElementById('landingPage').style.display = 'none';
  document.getElementById('authContainer').style.display = 'flex';
  showRegister();
}

function showExistingLogin() {
  document.getElementById('landingPage').style.display = 'none';
  document.getElementById('authContainer').style.display = 'flex';
  showLogin();
}

function backToLanding() {
  document.getElementById('landingPage').style.display = 'flex';
  document.getElementById('authContainer').style.display = 'none';
}

// ── Init ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    document.getElementById('loadingScreen').style.display = 'none';
    if (token) validateToken();
    else showLanding();
  }, 700);

  document.getElementById('loginPassword').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') login();
  });
  document.getElementById('registerPasswordConfirm').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') register();
  });
});

// ── Auth Navigation ───────────────────────────────────────────────
function showAuth() {
  document.getElementById('authContainer').style.display = 'flex';
  document.getElementById('dashboard').style.display = 'none';
}
function showLogin() {
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('registerForm').style.display = 'none';
}
function showRegister() {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'block';
}

// ── Dashboard Navigation ──────────────────────────────────────────
function showUserDashboard() {
  document.getElementById('userDashboard').style.display = 'block';
  document.getElementById('adminDashboard').style.display = 'none';
  document.getElementById('adminNavBtn').style.display = currentUser?.role === 'admin' ? 'inline-block' : 'none';
  document.getElementById('userNavBtn').style.display = 'none';
  loadUserDashboard();
}

function showAdminDashboard() {
  document.getElementById('userDashboard').style.display = 'none';
  document.getElementById('adminDashboard').style.display = 'block';
  document.getElementById('adminNavBtn').style.display = 'none';
  document.getElementById('userNavBtn').style.display = 'inline-block';
  loadAdminDashboard();
}

// ── Toast ─────────────────────────────────────────────────────────
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 4500);
}

// ── API Helper ────────────────────────────────────────────────────
async function apiCall(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (token) options.headers['Authorization'] = `Bearer ${token}`;
  if (data) options.body = JSON.stringify(data);

  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Request failed');
    return result;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.toLowerCase().includes('fetch')) {
      throw new Error('Server offline. Make sure npm start is running.');
    }
    throw error;
  }
}

// ── Auth: Validate Token ──────────────────────────────────────────
async function validateToken() {
  try {
    const result = await apiCall('/auth/me');
    currentUser = result.user;
    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('navUsername').textContent = currentUser.username;

    if (currentUser.role === 'admin') {
      document.getElementById('adminNavBtn').style.display = 'inline-block';
      showAdminDashboard();
    } else {
      showUserDashboard();
    }
  } catch (error) {
    localStorage.removeItem('token');
    token = null;
    showLanding();
  }
}

// ── Auth: Register ────────────────────────────────────────────────
async function register() {
  const username = document.getElementById('registerUsername').value.trim();
  const password = document.getElementById('registerPassword').value;
  const passwordConfirm = document.getElementById('registerPasswordConfirm').value;
  const agreedToRules = document.getElementById('agreeToRules').checked;

  if (!username || !password || !passwordConfirm)
    return showToast('Fill in all fields', 'error');
  if (username.length < 3 || username.length > 20)
    return showToast('Username: 3-20 characters', 'error');
  if (password.length < 6)
    return showToast('Password: 6+ characters', 'error');
  if (password !== passwordConfirm)
    return showToast('Passwords do not match', 'error');
  if (!agreedToRules)
    return showToast('You must agree to the rules', 'error');

  try {
    const result = await apiCall('/auth/register', 'POST', { username, password, agreed_to_rules: true });
    token = result.token;
    localStorage.setItem('token', token);
    currentUser = result.user;

    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('navUsername').textContent = currentUser.username;
    document.getElementById('registerUsername').value = '';
    document.getElementById('registerPassword').value = '';
    document.getElementById('registerPasswordConfirm').value = '';
    document.getElementById('agreeToRules').checked = false;

    showToast(result.message, 'success');
    showUserDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ── Auth: Login ───────────────────────────────────────────────────
async function login() {
  const username = document.getElementById('loginUsername').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!username || !password)
    return showToast('Enter username and password', 'error');

  try {
    const result = await apiCall('/auth/login', 'POST', { username, password });
    token = result.token;
    localStorage.setItem('token', token);
    currentUser = result.user;

    document.getElementById('authContainer').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    document.getElementById('navUsername').textContent = currentUser.username;
    document.getElementById('loginUsername').value = '';
    document.getElementById('loginPassword').value = '';

    showToast(result.message, 'success');

    if (currentUser.role === 'admin') {
      document.getElementById('adminNavBtn').style.display = 'inline-block';
      showAdminDashboard();
    } else {
      showUserDashboard();
    }
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ── Auth: Logout ──────────────────────────────────────────────────
function logout() {
  localStorage.removeItem('token');
  token = null;
  currentUser = null;
  showLanding();
  showToast('Logged out', 'info');
}

// ══════════════════════════════════════════════════════════════════
//  USER DASHBOARD
// ══════════════════════════════════════════════════════════════════

async function loadUserDashboard() {
  try {
    const statsResult = await apiCall('/shops/stats');
    cachedStats = statsResult.stats;

    document.getElementById('statFreeTotal').textContent = cachedStats.free.total;
    document.getElementById('statFreeAvail').textContent = cachedStats.free.available;
    document.getElementById('statPaidTotal').textContent = cachedStats.paid.total;
    document.getElementById('statPaidAvail').textContent = cachedStats.paid.available;

    updateRentCalculator();

    const myShopResult = await apiCall('/shops/my-shop');

    if (myShopResult.shop) {
      showHasShop(myShopResult.shop, myShopResult.pendingUnclaim);
    } else if (myShopResult.pendingRequest) {
      showPendingRequest(myShopResult.pendingRequest);
    } else {
      showNoShop();
    }
    
    // Load Discord link for users
    await loadDiscordLink();
  } catch (error) {
    console.error('loadUserDashboard error:', error);
    showToast('Error loading dashboard', 'error');
  }
}

function showNoShop() {
  document.getElementById('noShopSection').style.display = 'block';
  document.getElementById('hasShopSection').style.display = 'none';
  document.getElementById('pendingRequestSection').style.display = 'none';
  document.getElementById('pendingUnclaimSection').style.display = 'none';
}

function showHasShop(shop, pendingUnclaim) {
  document.getElementById('noShopSection').style.display = 'none';
  document.getElementById('pendingRequestSection').style.display = 'none';
  
  if (pendingUnclaim) {
    document.getElementById('hasShopSection').style.display = 'none';
    document.getElementById('pendingUnclaimSection').style.display = 'block';
    document.getElementById('pendingUnclaimDate').textContent = new Date(pendingUnclaim.requested_at).toLocaleDateString();
    document.getElementById('pendingUnclaimShopNum').textContent = shop.shop_number;
  } else {
    document.getElementById('hasShopSection').style.display = 'block';
    document.getElementById('pendingUnclaimSection').style.display = 'none';
    
    document.getElementById('myShopNumber').textContent = shop.shop_number;
    document.getElementById('myShopType').textContent = shop.shop_type === 'free' ? 'Free Shop' : 'Paid Shop';
    document.getElementById('myShopOwnership').textContent = shop.ownership_type === 'free' ? 'Free' : shop.ownership_type === 'buy' ? 'Purchased' : 'Rented (Monthly)';
    document.getElementById('myShopMC').textContent = shop.minecraft_username || '—';
    document.getElementById('myShopDate').textContent = new Date(shop.claimed_at).toLocaleDateString();
  }
}

function showPendingRequest(request) {
  document.getElementById('noShopSection').style.display = 'none';
  document.getElementById('hasShopSection').style.display = 'none';
  document.getElementById('pendingRequestSection').style.display = 'block';
  document.getElementById('pendingUnclaimSection').style.display = 'none';

  document.getElementById('pendingOwnership').textContent = request.ownership_type === 'buy' ? 'Purchase' : 'Monthly Rent';
  document.getElementById('pendingDate').textContent = new Date(request.requested_at).toLocaleDateString();
}

function updateRentCalculator() {
  if (!cachedStats) return;
  const buyPrice = cachedStats.paid.buyPrice;
  const rentMonthly = cachedStats.paid.rentMonthly;

  document.getElementById('buyPrice').textContent = buyPrice.toLocaleString();
  document.getElementById('rentMonthly').textContent = rentMonthly.toLocaleString();
  document.getElementById('rent3').textContent = (rentMonthly * 3).toLocaleString();
  document.getElementById('rent6').textContent = (rentMonthly * 6).toLocaleString();
  document.getElementById('rent12').textContent = (rentMonthly * 12).toLocaleString();

  const breakEven = Math.ceil(buyPrice / rentMonthly);
  document.getElementById('breakEven').textContent = breakEven;
}

// ── User: Free Shop Modal ─────────────────────────────────────────
function openFreeShopModal() {
  document.getElementById('freeShopModal').style.display = 'flex';
}
function closeFreeShopModal() {
  document.getElementById('freeShopModal').style.display = 'none';
  document.getElementById('freeShopMCUsername').value = '';
}

async function submitFreeShopClaim() {
  const mcUsername = document.getElementById('freeShopMCUsername').value.trim();

  if (!mcUsername) return showToast('Enter your Minecraft username', 'error');

  if (!confirm('Claim a free shop? You can only have one shop at a time.')) return;

  try {
    const result = await apiCall('/shops/claim-free', 'POST', { minecraft_username: mcUsername });
    showToast(result.message, 'success');
    closeFreeShopModal();
    loadUserDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ── User: Paid Shop Modal ─────────────────────────────────────────
function openPaidShopModal() {
  document.getElementById('paidShopModal').style.display = 'flex';
}
function closePaidShopModal() {
  document.getElementById('paidShopModal').style.display = 'none';
  document.getElementById('minecraftUsername').value = '';
}

async function submitPaidRequest() {
  const minecraft = document.getElementById('minecraftUsername').value.trim();
  const ownership = document.querySelector('input[name="ownershipType"]:checked')?.value;

  if (!minecraft) return showToast('Enter your Minecraft username', 'error');
  if (!ownership) return showToast('Select Buy or Rent', 'error');

  try {
    const result = await apiCall('/shops/request-paid', 'POST', { minecraft_username: minecraft, ownership_type: ownership });
    showToast(result.message, 'success');
    closePaidShopModal();
    loadUserDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ── User: Request Unclaim ─────────────────────────────────────────
async function requestUnclaimShop() {
  if (!confirm('Request to leave your shop? An admin must approve this.')) return;
  try {
    const result = await apiCall('/shops/request-unclaim', 'POST');
    showToast(result.message, 'success');
    loadUserDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════════════
//  ADMIN DASHBOARD
// ══════════════════════════════════════════════════════════════════

async function loadAdminDashboard() {
  try {
    const statsResult = await apiCall('/admin/dashboard-stats');
    const s = statsResult.stats;

    document.getElementById('adminStatUsers').textContent = s.totalUsers;
    document.getElementById('adminStatPending').textContent = s.pendingRequests;
    document.getElementById('adminStatUnclaims').textContent = s.pendingUnclaims || 0;
    document.getElementById('adminStatFreeShops').textContent = `${s.freeShops.claimed}/${s.freeShops.total}`;
    document.getElementById('adminStatPaidShops').textContent = `${s.paidShops.claimed}/${s.paidShops.total}`;

    const settingsResult = await apiCall('/admin/settings');
    document.getElementById('adminTotalFreeShops').value = settingsResult.settings.total_free_shops;
    document.getElementById('adminTotalPaidShops').value = settingsResult.settings.total_paid_shops;
    document.getElementById('adminBuyPrice').value = settingsResult.settings.paid_shop_buy_price;
    document.getElementById('adminRentMonthly').value = settingsResult.settings.paid_shop_rent_monthly;
    document.getElementById('adminDiscordLink').value = settingsResult.settings.discord_link || 'https://discord.gg/yourserver';

    // Show Discord button if link is set
    if (settingsResult.settings.discord_link && settingsResult.settings.discord_link !== 'https://discord.gg/yourserver') {
      localStorage.setItem('discordLink', settingsResult.settings.discord_link);
      document.getElementById('discordBtn').style.display = 'inline-block';
    }

    await loadAdminUsers();
    await loadAdminShops();
    await loadShopRequests();
    await loadUnclaimRequests();
    await loadPasswordResets();
  } catch (error) {
    showToast('Error loading admin dashboard', 'error');
  }
}

async function loadAdminUsers() {
  try {
    const result = await apiCall('/admin/users');
    const tbody = document.getElementById('usersTableBody');

    if (!result.users.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No users</td></tr>';
      return;
    }

    tbody.innerHTML = result.users.map(u => {
      const roleTag = u.role === 'admin' ? '<span class="badge-admin">Admin</span>' : '<span class="status-available">User</span>';
      const statusTag = u.is_banned ? '<span class="status-claimed">Banned</span>' : '<span class="badge-verified">Active</span>';
      const shopInfo = u.shop_number ? `#${u.shop_number} (${u.shop_type})` : '—';
      const mcUsername = u.minecraft_username || '—';
      
      let actions = '—';
      if (u.role !== 'admin') {
        if (u.is_banned) {
          actions = `<button class="btn btn-xs btn-success" onclick="unbanUser(${u.id})">Unban</button>`;
        } else {
          actions = `<button class="btn btn-xs btn-danger" onclick="openBanModal(${u.id}, '${u.username}')">Ban</button>`;
        }
        if (u.shop_number) {
          actions += ` <button class="btn btn-xs btn-warning" onclick="adminUnclaimShop(${u.id})">Unclaim</button>`;
        }
      }

      return `<tr>
        <td><strong>${u.username}</strong></td>
        <td>${roleTag}</td>
        <td>${statusTag}</td>
        <td>${shopInfo}</td>
        <td>${mcUsername}</td>
        <td><div class="action-cell">${actions}</div></td>
      </tr>`;
    }).join('');
  } catch (e) {
    console.error('loadAdminUsers error:', e);
  }
}

async function loadAdminShops() {
  try {
    const result = await apiCall('/shops/all');
    const tbody = document.getElementById('shopsTableBody');

    if (!result.shops.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No shops</td></tr>';
      return;
    }

    tbody.innerHTML = result.shops.map(s => `
      <tr>
        <td><strong>#${s.shop_number}</strong></td>
        <td><span class="badge-${s.shop_type === 'free' ? 'verified' : 'admin'}">${s.shop_type.toUpperCase()}</span></td>
        <td><span class="status-badge ${s.is_claimed ? 'status-claimed' : 'status-available'}">${s.is_claimed ? 'Claimed' : 'Available'}</span></td>
        <td>${s.claimed_by || '—'}</td>
        <td>${s.minecraft_username || '—'}</td>
        <td>${s.ownership_type || '—'}</td>
      </tr>
    `).join('');
  } catch (e) {
    console.error('loadAdminShops error:', e);
  }
}

async function loadShopRequests() {
  try {
    const result = await apiCall('/admin/shop-requests');
    const tbody = document.getElementById('requestsTableBody');

    if (!result.requests.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No requests</td></tr>';
      return;
    }

    tbody.innerHTML = result.requests.map(r => {
      const statusTag = r.status === 'pending' ? '<span class="badge-unverified">Pending</span>' :
                        r.status === 'approved' ? '<span class="badge-verified">Approved</span>' :
                        '<span class="status-claimed">Rejected</span>';
      const actions = r.status === 'pending' ? `
        <button class="btn btn-xs btn-success" onclick="approveRequest(${r.id})">✓ Approve</button>
        <button class="btn btn-xs btn-danger" onclick="rejectRequest(${r.id})">✗ Reject</button>
        <button class="btn btn-xs btn-ghost" onclick="approveCustomShop(${r.id})">Custom Shop</button>
      ` : (r.shop_number ? `Shop #${r.shop_number}` : '—');

      return `<tr>
        <td><strong>${r.username}</strong></td>
        <td>${r.minecraft_username}</td>
        <td><span class="badge-admin">${r.ownership_type.toUpperCase()}</span></td>
        <td>${statusTag}</td>
        <td>${new Date(r.requested_at).toLocaleDateString()}</td>
        <td><div class="action-cell">${actions}</div></td>
      </tr>`;
    }).join('');
  } catch (e) {
    console.error('loadShopRequests error:', e);
  }
}

async function loadUnclaimRequests() {
  try {
    const result = await apiCall('/admin/unclaim-requests');
    const tbody = document.getElementById('unclaimRequestsTableBody');

    if (!result.requests.length) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No unclaim requests</td></tr>';
      return;
    }

    tbody.innerHTML = result.requests.map(r => {
      const statusTag = r.status === 'pending' ? '<span class="badge-unverified">Pending</span>' :
                        r.status === 'approved' ? '<span class="badge-verified">Approved</span>' :
                        '<span class="status-claimed">Rejected</span>';
      const actions = r.status === 'pending' ? `
        <button class="btn btn-xs btn-success" onclick="approveUnclaim(${r.id})">✓ Approve</button>
        <button class="btn btn-xs btn-danger" onclick="rejectUnclaim(${r.id})">✗ Reject</button>
      ` : '—';

      return `<tr>
        <td><strong>${r.username}</strong></td>
        <td>#${r.shop_number} (${r.shop_type})</td>
        <td>${r.minecraft_username}</td>
        <td>${statusTag}</td>
        <td>${new Date(r.requested_at).toLocaleDateString()}</td>
        <td><div class="action-cell">${actions}</div></td>
      </tr>`;
    }).join('');
  } catch (e) {
    console.error('loadUnclaimRequests error:', e);
  }
}

// ── Admin: Approve/Reject Requests ────────────────────────────────
async function approveRequest(requestId) {
  if (!confirm('Approve this request? User will be assigned the lowest available paid shop.')) return;
  try {
    const result = await apiCall(`/admin/approve-request/${requestId}`, 'POST');
    showToast(result.message, 'success');
    loadAdminDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function rejectRequest(requestId) {
  if (!confirm('Reject this request?')) return;
  try {
    const result = await apiCall(`/admin/reject-request/${requestId}`, 'POST');
    showToast(result.message, 'success');
    loadAdminDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function approveCustomShop(requestId) {
  const shopNum = prompt('Enter custom shop number to assign:');
  if (!shopNum) return;
  try {
    const result = await apiCall(`/admin/approve-request/${requestId}`, 'POST', { shop_number: parseInt(shopNum) });
    showToast(result.message, 'success');
    loadAdminDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ── Admin: Approve/Reject Unclaim Requests ────────────────────────
async function approveUnclaim(requestId) {
  if (!confirm('Approve this unclaim request? The user will lose their shop.')) return;
  try {
    const result = await apiCall(`/admin/approve-unclaim/${requestId}`, 'POST');
    showToast(result.message, 'success');
    loadAdminDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function rejectUnclaim(requestId) {
  if (!confirm('Reject this unclaim request?')) return;
  try {
    const result = await apiCall(`/admin/reject-unclaim/${requestId}`, 'POST');
    showToast(result.message, 'success');
    loadAdminDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ── Admin: Ban System ─────────────────────────────────────────────
function openBanModal(userId, username) {
  currentBanUserId = userId;
  document.getElementById('banUsername').textContent = username;
  document.getElementById('banReason').value = '';
  document.getElementById('banUntil').value = '';
  document.getElementById('banModal').style.display = 'flex';
}

function closeBanModal() {
  document.getElementById('banModal').style.display = 'none';
  currentBanUserId = null;
}

async function submitBan() {
  const reason = document.getElementById('banReason').value.trim();
  const until = document.getElementById('banUntil').value;

  if (!reason) return showToast('Ban reason is required', 'error');
  if (!confirm(`Ban this user${until ? ' until ' + until : ' permanently'}?`)) return;

  try {
    const result = await apiCall(`/admin/ban-user/${currentBanUserId}`, 'POST', {
      ban_reason: reason,
      ban_until: until || null
    });
    showToast(result.message, 'success');
    closeBanModal();
    loadAdminDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function unbanUser(userId) {
  if (!confirm('Unban this user?')) return;
  try {
    const result = await apiCall(`/admin/unban-user/${userId}`, 'POST');
    showToast(result.message, 'success');
    loadAdminDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ── Admin: Other Functions ────────────────────────────────────────
async function updateSettings() {
  const freeShops = parseInt(document.getElementById('adminTotalFreeShops').value);
  const paidShops = parseInt(document.getElementById('adminTotalPaidShops').value);
  const buyPrice = parseInt(document.getElementById('adminBuyPrice').value);
  const rentMonthly = parseInt(document.getElementById('adminRentMonthly').value);
  const discordLink = document.getElementById('adminDiscordLink').value.trim();

  if (isNaN(freeShops) || freeShops < 0 || freeShops > 500)
    return showToast('Free shops: 0-500', 'error');
  if (isNaN(paidShops) || paidShops < 0 || paidShops > 500)
    return showToast('Paid shops: 0-500', 'error');
  if (isNaN(buyPrice) || buyPrice < 0)
    return showToast('Buy price cannot be negative', 'error');
  if (isNaN(rentMonthly) || rentMonthly < 0)
    return showToast('Rent cannot be negative', 'error');

  if (!confirm('Save settings?')) return;

  try {
    const result = await apiCall('/admin/settings', 'PUT', {
      total_free_shops: freeShops,
      total_paid_shops: paidShops,
      paid_shop_buy_price: buyPrice,
      paid_shop_rent_monthly: rentMonthly,
      discord_link: discordLink
    });
    showToast(result.message, 'success');
    
    // Update Discord button visibility
    if (discordLink && discordLink !== 'https://discord.gg/yourserver') {
      localStorage.setItem('discordLink', discordLink);
      document.getElementById('discordBtn').style.display = 'inline-block';
    } else {
      document.getElementById('discordBtn').style.display = 'none';
    }
    
    loadAdminDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function createAdmin() {
  const username = document.getElementById('newAdminUsername').value.trim();
  const password = document.getElementById('newAdminPassword').value;

  if (!username || !password)
    return showToast('Enter username and password', 'error');
  if (username.length < 3 || username.length > 20)
    return showToast('Username: 3-20 chars', 'error');
  if (password.length < 6)
    return showToast('Password: 6+ chars', 'error');
  if (!confirm(`Create admin account "${username}"?`)) return;

  try {
    const result = await apiCall('/admin/create-admin', 'POST', { username, password });
    showToast(result.message, 'success');
    document.getElementById('newAdminUsername').value = '';
    document.getElementById('newAdminPassword').value = '';
    loadAdminUsers();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function resetAllShops() {
  if (!confirm('⚠️ Reset ALL shops? This removes all claims and requests!')) return;
  if (!confirm('Last chance — this is irreversible!')) return;
  try {
    const result = await apiCall('/admin/reset-shops', 'POST');
    showToast(result.message, 'success');
    loadAdminDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function adminUnclaimShop(userId) {
  if (!confirm("Force unclaim this user's shop? (Bypasses approval system)")) return;
  try {
    const result = await apiCall(`/admin/unclaim-user-shop/${userId}`, 'POST');
    showToast(result.message, 'success');
    loadAdminDashboard();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════════════
//  RULES MODAL
// ══════════════════════════════════════════════════════════════════

function showRulesModal() {
  // Load rules from rules.js
  const rulesList = document.getElementById('rulesList');
  rulesList.innerHTML = MALL_RULES.map(rule => `
    <div style="background:var(--dark); border:1px solid var(--border); border-radius:var(--radius); padding:20px; margin-bottom:16px;">
      <h3 style="color:var(--gold); font-family:'Cinzel',serif; font-size:1.1rem; margin-bottom:10px;">
        ${rule.id}. ${rule.title}
      </h3>
      <p style="color:var(--text-muted); line-height:1.6; margin:0;">
        ${rule.description}
      </p>
    </div>
  `).join('');
  
  document.getElementById('rulesModal').style.display = 'flex';
}

function closeRulesModal() {
  document.getElementById('rulesModal').style.display = 'none';
}

// ══════════════════════════════════════════════════════════════════
//  FORGOT PASSWORD
// ══════════════════════════════════════════════════════════════════

function showForgotPassword() {
  document.getElementById('loginForm').style.display = 'none';
  document.getElementById('registerForm').style.display = 'none';
  document.getElementById('forgotPasswordForm').style.display = 'block';
}

async function submitPasswordReset() {
  const username = document.getElementById('resetUsername').value.trim();
  const minecraftUsername = document.getElementById('resetMinecraftUsername').value.trim();

  if (!username || !minecraftUsername) {
    return showToast('Please fill in both fields', 'error');
  }

  try {
    const result = await apiCall('/password-reset/request', 'POST', {
      username,
      minecraft_username: minecraftUsername
    });

    showToast(result.message, 'success');
    document.getElementById('resetUsername').value = '';
    document.getElementById('resetMinecraftUsername').value = '';
    
    // Show login form after 3 seconds
    setTimeout(() => {
      showLogin();
    }, 3000);
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════════════
//  ADMIN: PASSWORD RESET MANAGEMENT
// ══════════════════════════════════════════════════════════════════

let currentResetRequestId = null;

async function loadPasswordResets() {
  try {
    const result = await apiCall('/password-reset/all');
    const tbody = document.getElementById('passwordResetsTableBody');

    if (!result.requests || result.requests.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">No password reset requests</td></tr>';
      return;
    }

    tbody.innerHTML = result.requests.map(r => {
      const statusTag = r.status === 'pending' ? '<span class="badge-unverified">Pending</span>' :
                        r.status === 'approved' ? '<span class="badge-verified">Approved</span>' :
                        '<span class="status-claimed">Rejected</span>';
      
      const actions = r.status === 'pending' ? `
        <button class="btn btn-xs btn-success" onclick="openPasswordResetModal(${r.id}, '${r.username}')">✓ Approve</button>
        <button class="btn btn-xs btn-danger" onclick="rejectPasswordReset(${r.id})">✗ Reject</button>
      ` : '—';

      return `<tr>
        <td><strong>${r.username}</strong></td>
        <td>${r.minecraft_username}</td>
        <td>${statusTag}</td>
        <td>${new Date(r.requested_at).toLocaleDateString()}</td>
        <td><div class="action-cell">${actions}</div></td>
      </tr>`;
    }).join('');
  } catch (error) {
    console.error('loadPasswordResets error:', error);
  }
}

function openPasswordResetModal(requestId, username) {
  currentResetRequestId = requestId;
  document.getElementById('resetUserDisplay').textContent = username;
  document.getElementById('newPasswordInput').value = '';
  document.getElementById('passwordResetModal').style.display = 'flex';
}

function closePasswordResetModal() {
  document.getElementById('passwordResetModal').style.display = 'none';
  currentResetRequestId = null;
}

async function approvePasswordReset() {
  const newPassword = document.getElementById('newPasswordInput').value.trim();

  if (!newPassword || newPassword.length < 6) {
    return showToast('Password must be at least 6 characters', 'error');
  }

  if (!confirm(`Set new password for this user?\n\nNew password: ${newPassword}\n\nMake sure to give them this password!`)) return;

  try {
    const result = await apiCall(`/password-reset/approve/${currentResetRequestId}`, 'POST', {
      new_password: newPassword
    });
    
    showToast(result.message, 'success');
    closePasswordResetModal();
    loadPasswordResets();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

async function rejectPasswordReset(requestId) {
  if (!confirm('Reject this password reset request?')) return;

  try {
    const result = await apiCall(`/password-reset/reject/${requestId}`, 'POST');
    showToast(result.message, 'success');
    loadPasswordResets();
  } catch (error) {
    showToast(error.message, 'error');
  }
}

// ══════════════════════════════════════════════════════════════════
//  DISCORD LINK
// ══════════════════════════════════════════════════════════════════

function openDiscord() {
  const discordLink = localStorage.getItem('discordLink');
  if (discordLink) {
    window.open(discordLink, '_blank');
  }
}

// Load Discord link on user dashboard
async function loadDiscordLink() {
  try {
    const result = await apiCall('/public/discord');
    if (result.discord_link && result.discord_link !== 'https://discord.gg/yourserver') {
      localStorage.setItem('discordLink', result.discord_link);
      document.getElementById('discordBtn').style.display = 'inline-block';
    }
  } catch (error) {
    // Discord link not set, that's fine
  }
}
