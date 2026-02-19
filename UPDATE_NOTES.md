# Golden Beacon Mall - Update Notes

## 🆕 NEW FEATURES ADDED

### 1. BAN SYSTEM ✅
**Admin can ban users with:**
- Ban reason (required text field)
- Ban duration (optional - select date OR permanent ban)
- Banned users see message on login: "You are banned until [date]. Reason: [reason]"
- Admin can unban users anytime

**Admin Panel:**
- New "Ban User" button next to each user
- Shows ban status in users table
- One-click unban for banned users

---

### 2. MINECRAFT USERNAME FOR FREE SHOPS ✅
**Users must provide Minecraft username when claiming FREE shops**
- Modal opens when clicking "Claim Free Shop"
- Input field: "Minecraft Username" (required)
- Stored in database and visible to admin

**No verification needed** - instant claim after entering username

---

### 3. UNCLAIM APPROVAL SYSTEM ✅
**Both free AND paid shop users need admin approval to leave**
- User clicks "Leave Shop" → creates unclaim request
- Admin sees request in new "Unclaim Requests" section
- Admin approves or rejects
- User sees "Request Pending" status while waiting

---

### 4. ADMIN SEES ALL MINECRAFT USERNAMES ✅
**In Admin Panel:**
- Users table shows Minecraft username column
- Shop Requests table shows Minecraft username
- Unclaim Requests table shows Minecraft username
- All Shops table shows Minecraft username for claimed shops

---

### 5. BACK BUTTON POSITION FIXED ✅
**CSS updated:**
- No longer overlaps logo
- Proper z-index and spacing
- Responsive on mobile

---

## 📊 DATABASE CHANGES

**New columns added:**
- `users.is_banned` (0 or 1)
- `users.ban_reason` (text)
- `users.ban_until` (datetime or NULL for permanent)
- `shops.minecraft_username` (text)

**New table:**
- `unclaim_requests` (tracks leave shop requests)

---

## 🔄 SETUP INSTRUCTIONS

**IMPORTANT: Delete your old database first!**

```bash
cd backend
rm -rf database/
npm install
npm run init-db
npm start
```

Then visit http://localhost:5000

---

## 🎯 HOW TO USE NEW FEATURES

### As Admin:

**Ban a user:**
1. Go to Admin Panel → Users section
2. Click "Ban User" next to any user
3. Enter ban reason (required)
4. Choose ban end date (optional - leave blank for permanent)
5. Click "Ban User"

**Approve unclaim request:**
1. Go to Admin Panel → Unclaim Requests section
2. See pending requests
3. Click "✓ Approve" or "✗ Reject"

**View Minecraft usernames:**
- All visible in Users table, Shop Requests, Unclaim Requests, All Shops

### As User:

**Claim free shop:**
1. Click "Claim Free Shop"
2. Enter your Minecraft username
3. Instant claim!

**Leave shop:**
1. Click "Leave Shop"
2. Request submitted
3. Wait for admin approval
4. See "Request Pending" status

**If banned:**
- Login shows ban message with reason and expiry date
- Cannot access the system until unbanned

---

## ⚠️ NOTES

- Minecraft username is **required** for both free AND paid shops now
- All unclaims (free + paid) require admin approval
- Ban expiry is checked on login - expired bans auto-unban
- Permanent bans have no expiry date (ban_until = NULL)
