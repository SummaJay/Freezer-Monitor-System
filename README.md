# Perera & Sons Freezer Monitoring System (PFMS)
### Bakery Cold Chain & Food Safety Compliance Digital Log (v2.0)

[![Perera & Sons](https://img.shields.io/badge/Perera%20%26%20Sons-Since%201902-0284c7.svg)](https://pereraandsons.com)
[![Theme](https://img.shields.io/badge/Theme-Light%20Blue%20%26%20Light%20Yellow%20(Default)-eab308.svg)](#)
[![Storage](https://img.shields.io/badge/Database-Dexie.js%20(IndexedDB)-blue.svg)](https://dexie.org)
[![Zero Node.js](https://img.shields.io/badge/Environment-100%25%20CDN%20%2F%20No%20Node.js-success.svg)](#)

---

## 1. Project Overview

The **Perera & Sons Freezer Monitoring System (PFMS)** is a high-performance web application engineered to digitize, monitor, and audit temperature records across **64 bakery freezers and cold rooms** in Perera & Sons production facilities.

In strict adherence to ISO 22000 and HACCP food safety compliance standards, floor staff ("Checking Boys" & Quality Checkers) record temperature readings **4 times daily**. All logs are persisted directly inside the browser using **Dexie.js (IndexedDB)**, guaranteeing offline reliability, fast querying across thousands of entries, and zero server or Node.js dependencies.

---

## 2. Authentication & User Credentials

### 2.1 Staff Portal Authentication (`index.html`)
- **Default Account Name / Username:** `Gayani Shalika`
- **Default Password:** `Password@1234`
- **Staff Self-Service Features:**
  - **Create Account:** Staff members can register their own accounts with username and password.
  - **Reset Password:** Forgotten password can be reset instantly by entering the username and new password.
  - **Automatic Attribution:** When logged in as Gayani Shalika, all logged freezer checks are automatically attributed to her name.
  - **Daily Notes & Missed Check Reasons (New):** Located right next to the *Analytics* column in the 64-Freezer Matrix. Allows staff to state why any freezer check was missed or add operational observations (e.g. *Defrost Cycle, Servicing, Kitchen Closed Early, Standby*).

### 2.2 Admin Portal Authentication (`admin.html`)
- **Username:** `Admin`
- **Password:** `Summa@1993`
- **Admin User Management Features:**
  - Create new accounts for Staff or Administrators.
  - Reset the password of any user account with one click.
  - View user accounts, roles, phone numbers, and last login timestamps.
  - Deactivate or delete accounts.

---

## 3. Dynamic Color Themes Engine

The system features a **live multi-theme engine** with 3 selectable palettes:

| Theme | Colors | Palette Details |
| :--- | :--- | :--- |
| **Theme 1 (Default)** | **Light Blue & Light Yellow** | Clean Ocean/Sky Blue (`#0284c7`) with Warm Golden Yellow accents (`#eab308` / `#fef9c3`) |
| **Theme 2** | **Light Green & Light Red** | Fresh Mint/Emerald Green (`#059669`) with Soft Coral Rose accents (`#f43f5e` / `#ffe4e6`) |
| **Theme 3** | **Purple & Light Orange** | Royal Violet/Purple (`#7c3aed`) with Warm Peach Orange accents (`#f97316` / `#ffedd5`) |

### How to Switch Themes:
- **In Admin Portal (`admin.html`):** Use the Theme Selector in the top navigation or the visual Theme Choice Cards in the Overview Dashboard. Selecting a theme automatically updates the system-wide palette across both Admin and Staff portals!
- **In Staff Portal (`index.html`):** Quick theme dropdown in the header allows staff to toggle themes on the fly.

---

## 4. Default System Entities

### 4.1 Freezers (64 Units)
Systematically organized into 4 bakery zones:
1. **Zone A: Pastry & Bakehouse Production (`FRZ-01` to `FRZ-16`)**
   - Pastry dough retarders, cake sponge blast chillers, fresh cream/butter cold rooms, ganache storage, savory filling chillers, bun & roll holding.
2. **Zone B: Raw Ingredients & Meat Storage (`FRZ-17` to `FRZ-32`)**
   - Raw receiving bulk rooms, walk-in meat freezers, bulk seafood, butter blocks, cheese storage, fruit pulp, sliced vegetables.
3. **Zone C: Finished Goods & Outlets Dispatch (`FRZ-33` to `FRZ-48`)**
   - Finished cake dispatch chillers, gateau deep freezers, Colombo/Kandy/Gampaha frozen savory boxes, unbaked rolls, dessert cups.
4. **Zone D: Coldrooms, Logistics & Facilities (`FRZ-49` to `FRZ-64`)**
   - Walk-in blast freezers (-40°C), warehouse cold bays, reefer van docks, QA lab sample freezer, R&D test freezer, backup units.

### 4.2 Checking Staff (13 Members)
- `STF-01` to `STF-12`: Kamal Perera, Nimal Silva, Sunimal Fernando, Kasun Bandara, Dinesh Kumara, Ruwan Jayasinghe, Lasantha Wickramasinghe, Nuwan Pradeep, Chaminda De Silva, Asanka Jayasuriya, Roshan Priyadarshana, Suresh Mendis.
- `STF-13`: **Gayani Shalika** (Quality Checker & Staff)

### 4.3 Monitoring Schedule (4 Daily Time Slots)
- **Slot 1 - Morning Shift:** 06:00 – 08:00
- **Slot 2 - Mid-Day Check:** 11:00 – 13:00
- **Slot 3 - Evening Check:** 16:00 – 18:00
- **Slot 4 - Night Shift:** 21:00 – 23:00

---

## 5. Architecture & File Structure

```text
Freezer Monitor System/
│
├── index.html            # Staff Portal (Login, Register, Password Reset, 64-Freezer Matrix, Log Modal)
├── admin.html            # Admin Portal (Auth, User Accounts & Passwords, Theme Customizer, QA Print)
│
├── assets/
│   ├── css/
│   │   └── style.css     # Dynamic Theme Variables (Blue-Yellow, Green-Red, Purple-Orange), Print Layouts
│   │
│   └── js/
│       ├── db.js         # Dexie.js v2 Database Schema, User Auth, Password Reset & Theme Engine
│       ├── app.js        # Staff UI Logic, Auth flow, Account creation, 64-Freezer Matrix, Chart.js
│       └── admin.js      # Admin Management, User Accounts CRUD, Password Reset, Theme Controller
│
└── README.md             # System documentation & usage instructions
```

---

## 6. Technology Stack (100% CDN Based - Zero Node.js)

| Technology | Implementation | Purpose |
| :--- | :--- | :--- |
| **HTML5** | Semantic standard | Responsive viewport and accessibility |
| **Tailwind CSS** | CDN (`cdn.tailwindcss.com`) | Dynamic styling powered by CSS variables |
| **Dexie.js** | CDN (`unpkg.com/dexie`) | IndexedDB client-side database with User Accounts & Audit logs |
| **Chart.js** | CDN (`cdn.jsdelivr.net`) | Interactive temperature stability charts |
| **FontAwesome** | CDN (`cdnjs.cloudflare.com`) | Comprehensive bakery and refrigeration iconography |
| **Web Audio API** | Native Browser API | Audio feedback chimes upon recording temperatures |

---

## 7. How to Run & Use (භාවිතා කරන ආකාරය)

### English:
1. **Zero Setup:** No Node.js, `npm`, or web server is required.
2. Open **`index.html`** in any web browser (Chrome, Edge, Firefox, Safari).
3. Log in to the Staff Portal using:
   - **Username:** `Gayani Shalika`
   - **Password:** `Password@1234`
4. To access Admin Portal, open **`admin.html`** (or click *Admin Portal* from the header) and log in with:
   - **Username:** `Admin`
   - **Password:** `Summa@1993`
5. Switch color themes anytime from the Admin Portal or Staff header!

---

### සිංහලෙන් උපදෙස් (Sinhala Guide):

1. **Staff Portal එක භාවිතා කිරීම:**
   - **`index.html`** file එක double-click කර Browser එකෙන් Open කරන්න.
   - Screen එකේ දිස්වන Login එකට පහත විස්තර ලබා දෙන්න:
     - **Username:** `Gayani Shalika`
     - **Password:** `Password@1234`
   - Staff අයට අලුතින් Account එකක් හදන්න අවශ්‍ය නම් **Create Account** tab එකෙන් හදන්න පුළුවන්.
   - Password අමතක වුවහොත් **Reset Password** tab එකෙන් ක්ෂණිකව Password එක Change කරන්න පුළුවන්.

2. **Admin Portal එක සහ User Accounts / Password Management:**
   - **`admin.html`** open කරන්න (හෝ Header එකේ ඇති **Admin Portal** button එක click කරන්න).
   - **Username:** `Admin`
   - **Password:** `Summa@1993`
   - Admin Portal එකේ **"User Accounts & Passwords"** tab එකට ගොස් ඕනෑම Staff Account එකක් create කිරීමට, ඕනෑම කෙනෙකුගේ Password Reset කිරීමට හෝ Delete කිරීමට පුළුවන්.

3. **Color Themes මාරු කිරීම (Themes 3):**
   - **Default Theme:** **Light Blue & Light Yellow** (මුහුදු නිල් සහ ලා කහ)
   - **Theme 2:** **Light Green & Light Red** (ලා කොළ සහ ලා රතු)
   - **Theme 3:** **Purple & Light Orange** (දම් සහ ලා තැඹිලි)
   - Admin Portal එකේ Header එකෙන් හෝ Overview Dashboard එකේ ඇති Theme Cards වලින් කැමති Theme එකක් Click කළ සැණින් Admin Portal එකත් Staff Portal එකත් දෙකම එම වර්ණයට මාරු වේ!

4. **Daily Notes & Missed Check Reasons (Missed Checks වලට හේතු සටහන් කිරීම):**
   - 64-Freezer Matrix එකේ **Analytics** column එකට දකුණු පසින් අලුතින් **"Notes / Missed Reason"** column එකක් එකතු කර ඇත.
   - යම් Freezer එකක් Check කර නොමැති නම් (Pending/Missed checks පවතී නම්), **"+ Reason for Missed"** button එක click කර අදාළ හේතුව (උදා: Defrost Cycle, Compressor Servicing, Kitchen Closed Early, Standby ආදී) සහ විස්තරය Save කළ හැක.
   - එම හේතු Admin Portal එකේ Missed Checks Inspector එකේද සටහන්ව දිස්වේ.
