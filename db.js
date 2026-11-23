/**
 * Perera & Sons Freezer Monitoring System (PFMS)
 * Database Management Layer using Dexie.js (IndexedDB)
 * Includes User Accounts, Password Management, Multi-Theme Engine & Daily Missed Check Notes
 */

// Initialize Dexie Database
const db = new Dexie('PFMS_PereraSons_DB');

// Define Schema (Version 3 with Daily Notes for Missed Checks & Observations)
db.version(3).stores({
  freezers: '++id, freezerId, name, location, zone, type, targetMin, targetMax, status',
  staff: '++id, staffId, name, phone, role, status',
  timeSlots: '++id, slotId, name, timeWindow, sortOrder, status',
  logs: '++id, date, timestamp, freezerId, staffId, staffName, slotId, slotName, temperature, status, notes, [date+freezerId+slotId], [date+slotId]',
  auditLogs: '++id, timestamp, action, details, user',
  users: '++id, username, fullName, role, password, phone, status, createdAt, lastLogin',
  dailyNotes: '++id, date, freezerId, note, author, timestamp, [date+freezerId]'
});

// Available System Themes
const SYSTEM_THEMES = [
  {
    id: 'blue-yellow',
    name: 'Light Blue & Light Yellow',
    description: 'Clean Sky Blue with Warm Golden Yellow accents (Default)',
    primaryColor: '#0284c7',
    secondaryColor: '#eab308'
  },
  {
    id: 'green-red',
    name: 'Light Green & Light Red',
    description: 'Fresh Emerald Mint with Soft Coral Rose accents',
    primaryColor: '#059669',
    secondaryColor: '#f43f5e'
  },
  {
    id: 'purple-orange',
    name: 'Purple & Light Orange',
    description: 'Royal Purple with Warm Peach Orange accents',
    primaryColor: '#7c3aed',
    secondaryColor: '#f97316'
  }
];

// Default User Accounts
const DEFAULT_USERS = [
  {
    username: 'Admin',
    fullName: 'System Administrator',
    role: 'admin',
    password: 'Summa@1993',
    phone: '+94 11 234 5678',
    status: 'active',
    createdAt: '2026-10-26 08:00:00',
    lastLogin: 'Never'
  },
  {
    username: 'Gayani Shalika',
    fullName: 'Gayani Shalika',
    role: 'staff',
    password: 'Password@1234',
    phone: '+94 77 987 6543',
    status: 'active',
    createdAt: '2026-10-26 08:00:00',
    lastLogin: 'Never'
  }
];

// Default 64 Freezers distributed across Perera & Sons Bakery Zones
const DEFAULT_FREEZERS = [
  // Zone A: Central Pastry & Bakery Production (16 Freezers)
  { freezerId: 'FRZ-01', name: 'Freezer #01', location: 'Pastry Dough Retarder - Pastry Zone', zone: 'Zone A - Pastry & Bakery', type: 'deep_freezer', targetMin: -22, targetMax: -18, status: 'active' },
  { freezerId: 'FRZ-02', name: 'Freezer #02', location: 'Croissant & Puff Pastry Cold Storage', zone: 'Zone A - Pastry & Bakery', type: 'deep_freezer', targetMin: -22, targetMax: -18, status: 'active' },
  { freezerId: 'FRZ-03', name: 'Freezer #03', location: 'Cake Sponge Blast Chiller - Cake Section', zone: 'Zone A - Pastry & Bakery', type: 'chiller', targetMin: 0, targetMax: 4, status: 'active' },
  { freezerId: 'FRZ-04', name: 'Freezer #04', location: 'Fresh Cream & Butter Cold Room - Dairy Prep', zone: 'Zone A - Pastry & Bakery', type: 'chiller', targetMin: 0, targetMax: 4, status: 'active' },
  { freezerId: 'FRZ-05', name: 'Freezer #05', location: 'Chocolate & Ganache Storage - Cake Finishing', zone: 'Zone A - Pastry & Bakery', type: 'chiller', targetMin: 12, targetMax: 16, status: 'active' },
  { freezerId: 'FRZ-06', name: 'Freezer #06', location: 'Fondant & Icing Compound Cold Box', zone: 'Zone A - Pastry & Bakery', type: 'chiller', targetMin: 8, targetMax: 12, status: 'active' },
  { freezerId: 'FRZ-07', name: 'Freezer #07', location: 'Savory Puff Raw Cold Storage - Hot Kitchen', zone: 'Zone A - Pastry & Bakery', type: 'deep_freezer', targetMin: -22, targetMax: -18, status: 'active' },
  { freezerId: 'FRZ-08', name: 'Freezer #08', location: 'Chicken Patty & Roll Prep Chiller', zone: 'Zone A - Pastry & Bakery', type: 'chiller', targetMin: 0, targetMax: 4, status: 'active' },
  { freezerId: 'FRZ-09', name: 'Freezer #09', location: 'Fish & Mutton Filling Chiller - Savory Kitchen', zone: 'Zone A - Pastry & Bakery', type: 'chiller', targetMin: 0, targetMax: 4, status: 'active' },
  { freezerId: 'FRZ-10', name: 'Freezer #10', location: 'Vegetable Filling & Curry Freezer', zone: 'Zone A - Pastry & Bakery', type: 'deep_freezer', targetMin: -22, targetMax: -18, status: 'active' },
  { freezerId: 'FRZ-11', name: 'Freezer #11', location: 'Sausage & Bacon Deep Freezer', zone: 'Zone A - Pastry & Bakery', type: 'deep_freezer', targetMin: -22, targetMax: -18, status: 'active' },
  { freezerId: 'FRZ-12', name: 'Freezer #12', location: 'Egg Wash & Liquid Egg Chiller - Bakehouse A', zone: 'Zone A - Pastry & Bakery', type: 'chiller', targetMin: 0, targetMax: 4, status: 'active' },
  { freezerId: 'FRZ-13', name: 'Freezer #13', location: 'Yeast & Starter Dough Retarder - Bread Line', zone: 'Zone A - Pastry & Bakery', type: 'chiller', targetMin: 2, targetMax: 6, status: 'active' },
  { freezerId: 'FRZ-14', name: 'Freezer #14', location: 'Bun & Roll Blast Chiller - Dispatch Holding', zone: 'Zone A - Pastry & Bakery', type: 'chiller', targetMin: 0, targetMax: 4, status: 'active' },
  { freezerId: 'FRZ-15', name: 'Freezer #15', location: 'Sandwich Spread & Mayo Chiller - Cold Kitchen', zone: 'Zone A - Pastry & Bakery', type: 'chiller', targetMin: 1, targetMax: 4, status: 'active' },
  { freezerId: 'FRZ-16', name: 'Freezer #16', location: 'Danish & Sweet Pastry Deep Freezer', zone: 'Zone A - Pastry & Bakery', type: 'deep_freezer', targetMin: -22, targetMax: -18, status: 'active' },

  // Zone B: Raw Ingredients & Meat Processing Storage (16 Freezers)
  { freezerId: 'FRZ-17', name: 'Freezer #17', location: 'Raw Chicken Bulk Cold Room A - Receiving', zone: 'Zone B - Raw Ingredients', type: 'deep_freezer', targetMin: -24, targetMax: -18, status: 'active' },
  { freezerId: 'FRZ-18', name: 'Freezer #18', location: 'Raw Chicken Bulk Cold Room B - Receiving', zone: 'Zone B - Raw Ingredients', type: 'deep_freezer', targetMin: -24, targetMax: -18, status: 'active' },
  { freezerId: 'FRZ-19', name: 'Freezer #19', location: 'Raw Beef & Mutton Walk-in Freezer', zone: 'Zone B - Raw Ingredients', type: 'deep_freezer', targetMin: -24, targetMax: -18, status: 'active' },
  { freezerId: 'FRZ-20', name: 'Freezer #20', location: 'Seafood & Fish Bulk Deep Freezer', zone: 'Zone B - Raw Ingredients', type: 'deep_freezer', targetMin: -24, targetMax: -18, status: 'active' },
  { freezerId: 'FRZ-21', name: 'Freezer #21', location: 'Processed Meat Curing Freezer - Butchery', zone: 'Zone B - Raw Ingredients', type: 'deep_freezer', targetMin: -20, targetMax: -16, status: 'active' },
  { freezerId: 'FRZ-22', name: 'Freezer #22', location: 'Bulk Butter & Margarine Deep Freezer', zone: 'Zone B - Raw Ingredients', type: 'deep_freezer', targetMin: -20, targetMax: -16, status: 'active' },
  { freezerId: 'FRZ-23', name: 'Freezer #23', location: 'Cheese & Cheddar Block Storage', zone: 'Zone B - Raw Ingredients', type: 'chiller', targetMin: 2, targetMax: 6, status: 'active' },
  { freezerId: 'FRZ-24', name: 'Freezer #24', location: 'Mozzarella & Pizza Topping Chiller', zone: 'Zone B - Raw Ingredients', type: 'chiller', targetMin: 0, targetMax: 4, status: 'active' },
  { freezerId: 'FRZ-25', name: 'Freezer #25', location: 'Liquid Milk & UHT Cream Chiller', zone: 'Zone B - Raw Ingredients', type: 'chiller', targetMin: 1, targetMax: 4, status: 'active' },
  { freezerId: 'FRZ-26', name: 'Freezer #26', location: 'Fruit Fillings & Fruit Pulp Deep Freezer', zone: 'Zone B - Raw Ingredients', type: 'deep_freezer', targetMin: -22, targetMax: -18, status: 'active' },
  { freezerId: 'FRZ-27', name: 'Freezer #27', location: 'Frozen Berries & Fruit Topping Freezer', zone: 'Zone B - Raw Ingredients', type: 'deep_freezer', targetMin: -22, targetMax: -18, status: 'active' },
  { freezerId: 'FRZ-28', name: 'Freezer #28', location: 'Raw Veggie Frozen Bulk Storage', zone: 'Zone B - Raw Ingredients', type: 'deep_freezer', targetMin: -20, targetMax: -16, status: 'active' },
  { freezerId: 'FRZ-29', name: 'Freezer #29', location: 'Peeled Onion & Garlic Cold Room', zone: 'Zone B - Raw Ingredients', type: 'chiller', targetMin: 2, targetMax: 6, status: 'active' },
  { freezerId: 'FRZ-30', name: 'Freezer #30', location: 'Diced Potato & Cut Vegetable Chiller', zone: 'Zone B - Raw Ingredients', type: 'chiller', targetMin: 2, targetMax: 5, status: 'active' },
  { freezerId: 'FRZ-31', name: 'Freezer #31', location: 'Cooking Oil & Margarine Shortening Store', zone: 'Zone B - Raw Ingredients', type: 'chiller', targetMin: 14, targetMax: 18, status: 'active' },
  { freezerId: 'FRZ-32', name: 'Freezer #32', location: 'Bulk Marinade & Spice Paste Cold Box', zone: 'Zone B - Raw Ingredients', type: 'chiller', targetMin: 1, targetMax: 4, status: 'active' },

  // Zone C: Finished Products & Outlets Staging (16 Freezers)
  { freezerId: 'FRZ-33', name: 'Freezer #33', location: 'Finished Cake Holding Chiller A - Dispatch', zone: 'Zone C - Finished Goods', type: 'chiller', targetMin: 2, targetMax: 5, status: 'active' },
  { freezerId: 'FRZ-34', name: 'Freezer #34', location: 'Finished Cake Holding Chiller B - Dispatch', zone: 'Zone C - Finished Goods', type: 'chiller', targetMin: 2, targetMax: 5, status: 'active' },
  { freezerId: 'FRZ-35', name: 'Freezer #35', location: 'Gateau & Ice Cream Cake Deep Freezer', zone: 'Zone C - Finished Goods', type: 'deep_freezer', targetMin: -25, targetMax: -20, status: 'active' },
  { freezerId: 'FRZ-36', name: 'Freezer #36', location: 'Frozen Savory Pastries Box 1 - Colombo Line', zone: 'Zone C - Finished Goods', type: 'deep_freezer', targetMin: -22, targetMax: -18, status: 'active' },
  { freezerId: 'FRZ-37', name: 'Freezer #37', location: 'Frozen Savory Pastries Box 2 - Kandy Line', zone: 'Zone C - Finished Goods', type: 'deep_freezer', targetMin: -22, targetMax: -18, status: 'active' },
  { freezerId: 'FRZ-38', name: 'Freezer #38', location: 'Frozen Savory Pastries Box 3 - Gampaha Line', zone: 'Zone C - Finished Goods', type: 'deep_freezer', targetMin: -22, targetMax: -18, status: 'active' },
  { freezerId: 'FRZ-39', name: 'Freezer #39', location: 'Frozen Unbaked Samosa & Rolls Holding', zone: 'Zone C - Finished Goods', type: 'deep_freezer', targetMin: -22, targetMax: -18, status: 'active' },
  { freezerId: 'FRZ-40', name: 'Freezer #40', location: 'Frozen Pizza Base Cold Storage', zone: 'Zone C - Finished Goods', type: 'deep_freezer', targetMin: -20, targetMax: -16, status: 'active' },
  { freezerId: 'FRZ-41', name: 'Freezer #41', location: 'Frozen Dough Balls Storage Bay 1', zone: 'Zone C - Finished Goods', type: 'deep_freezer', targetMin: -22, targetMax: -18, status: 'active' },
  { freezerId: 'FRZ-42', name: 'Freezer #42', location: 'Frozen Dough Balls Storage Bay 2', zone: 'Zone C - Finished Goods', type: 'deep_freezer', targetMin: -22, targetMax: -18, status: 'active' },
  { freezerId: 'FRZ-43', name: 'Freezer #43', location: 'Ready-to-Bake Pies Deep Freezer', zone: 'Zone C - Finished Goods', type: 'deep_freezer', targetMin: -22, targetMax: -18, status: 'active' },
  { freezerId: 'FRZ-44', name: 'Freezer #44', location: 'Quiche & Tart Shells Cold Box', zone: 'Zone C - Finished Goods', type: 'deep_freezer', targetMin: -20, targetMax: -16, status: 'active' },
  { freezerId: 'FRZ-45', name: 'Freezer #45', location: 'Eclairs & Fresh Cream Buns Chiller', zone: 'Zone C - Finished Goods', type: 'chiller', targetMin: 2, targetMax: 5, status: 'active' },
  { freezerId: 'FRZ-46', name: 'Freezer #46', location: 'Catering Buffet Holding Chiller', zone: 'Zone C - Finished Goods', type: 'chiller', targetMin: 1, targetMax: 4, status: 'active' },
  { freezerId: 'FRZ-47', name: 'Freezer #47', location: 'Packed Sandwiches Cold Counter Unit', zone: 'Zone C - Finished Goods', type: 'chiller', targetMin: 2, targetMax: 5, status: 'active' },
  { freezerId: 'FRZ-48', name: 'Freezer #48', location: 'Dessert Cups & Puddings Chiller', zone: 'Zone C - Finished Goods', type: 'chiller', targetMin: 2, targetMax: 5, status: 'active' },

  // Zone D: Logistics, Coldrooms & Central Facilities (16 Freezers)
  { freezerId: 'FRZ-49', name: 'Freezer #49', location: 'Central Walk-in Blast Freezer 1', zone: 'Zone D - Logistics & Facilities', type: 'blast_freezer', targetMin: -40, targetMax: -35, status: 'active' },
  { freezerId: 'FRZ-50', name: 'Freezer #50', location: 'Central Walk-in Blast Freezer 2', zone: 'Zone D - Logistics & Facilities', type: 'blast_freezer', targetMin: -40, targetMax: -35, status: 'active' },
  { freezerId: 'FRZ-51', name: 'Freezer #51', location: 'Main Warehouse Cold Bay 1 - Storage Bay A', zone: 'Zone D - Logistics & Facilities', type: 'deep_freezer', targetMin: -24, targetMax: -18, status: 'active' },
  { freezerId: 'FRZ-52', name: 'Freezer #52', location: 'Main Warehouse Cold Bay 2 - Storage Bay A', zone: 'Zone D - Logistics & Facilities', type: 'deep_freezer', targetMin: -24, targetMax: -18, status: 'active' },
  { freezerId: 'FRZ-53', name: 'Freezer #53', location: 'Main Warehouse Cold Bay 3 - Storage Bay B', zone: 'Zone D - Logistics & Facilities', type: 'deep_freezer', targetMin: -24, targetMax: -18, status: 'active' },
  { freezerId: 'FRZ-54', name: 'Freezer #54', location: 'Main Warehouse Cold Bay 4 - Storage Bay B', zone: 'Zone D - Logistics & Facilities', type: 'deep_freezer', targetMin: -24, targetMax: -18, status: 'active' },
  { freezerId: 'FRZ-55', name: 'Freezer #55', location: 'Reefer Van Loading Dock Chiller 1', zone: 'Zone D - Logistics & Facilities', type: 'chiller', targetMin: 0, targetMax: 4, status: 'active' },
  { freezerId: 'FRZ-56', name: 'Freezer #56', location: 'Reefer Van Loading Dock Chiller 2', zone: 'Zone D - Logistics & Facilities', type: 'chiller', targetMin: 0, targetMax: 4, status: 'active' },
  { freezerId: 'FRZ-57', name: 'Freezer #57', location: 'Reefer Van Loading Dock Chiller 3', zone: 'Zone D - Logistics & Facilities', type: 'chiller', targetMin: 0, targetMax: 4, status: 'active' },
  { freezerId: 'FRZ-58', name: 'Freezer #58', location: 'Quality Assurance Lab Sample Freezer', zone: 'Zone D - Logistics & Facilities', type: 'deep_freezer', targetMin: -22, targetMax: -18, status: 'active' },
  { freezerId: 'FRZ-59', name: 'Freezer #59', location: 'R&D Test Kitchen Deep Freezer', zone: 'Zone D - Logistics & Facilities', type: 'deep_freezer', targetMin: -22, targetMax: -18, status: 'active' },
  { freezerId: 'FRZ-60', name: 'Freezer #60', location: 'Export Grade Frozen Products Chiller', zone: 'Zone D - Logistics & Facilities', type: 'chiller', targetMin: 0, targetMax: 4, status: 'active' },
  { freezerId: 'FRZ-61', name: 'Freezer #61', location: 'Emergency Backup Deep Freezer 1', zone: 'Zone D - Logistics & Facilities', type: 'deep_freezer', targetMin: -22, targetMax: -18, status: 'active' },
  { freezerId: 'FRZ-62', name: 'Freezer #62', location: 'Emergency Backup Deep Freezer 2', zone: 'Zone D - Logistics & Facilities', type: 'deep_freezer', targetMin: -22, targetMax: -18, status: 'active' },
  { freezerId: 'FRZ-63', name: 'Freezer #63', location: 'Overflow Pastry Storage - Mezzanine Level', zone: 'Zone D - Logistics & Facilities', type: 'deep_freezer', targetMin: -20, targetMax: -16, status: 'active' },
  { freezerId: 'FRZ-64', name: 'Freezer #64', location: 'Overflow Savory Storage - Storage Bay B', zone: 'Zone D - Logistics & Facilities', type: 'deep_freezer', targetMin: -20, targetMax: -16, status: 'active' }
];

// Default Staff Members (Includes Gayani Shalika)
const DEFAULT_STAFF = [
  { staffId: 'STF-01', name: 'Kamal Perera', phone: '+94 77 123 4567', role: 'Senior Checking Officer', status: 'active' },
  { staffId: 'STF-02', name: 'Nimal Silva', phone: '+94 77 234 5678', role: 'Checking Boy - Bakehouse', status: 'active' },
  { staffId: 'STF-03', name: 'Sunimal Fernando', phone: '+94 77 345 6789', role: 'Checking Boy - Cold Storage', status: 'active' },
  { staffId: 'STF-04', name: 'Kasun Bandara', phone: '+94 77 456 7890', role: 'Checking Boy - Pastry Line', status: 'active' },
  { staffId: 'STF-05', name: 'Dinesh Kumara', phone: '+94 77 567 8901', role: 'Checking Boy - Raw Prep', status: 'active' },
  { staffId: 'STF-06', name: 'Ruwan Jayasinghe', phone: '+94 77 678 9012', role: 'Checking Boy - Savory Kitchen', status: 'active' },
  { staffId: 'STF-07', name: 'Lasantha Wickramasinghe', phone: '+94 77 789 0123', role: 'Checking Boy - Dispatch', status: 'active' },
  { staffId: 'STF-08', name: 'Nuwan Pradeep', phone: '+94 77 890 1234', role: 'Checking Boy - Cake Section', status: 'active' },
  { staffId: 'STF-09', name: 'Chaminda De Silva', phone: '+94 71 234 5678', role: 'Checking Boy - Logistics Bay', status: 'active' },
  { staffId: 'STF-10', name: 'Asanka Jayasuriya', phone: '+94 71 345 6789', role: 'Checking Boy - Night Shift', status: 'active' },
  { staffId: 'STF-11', name: 'Roshan Priyadarshana', phone: '+94 71 456 7890', role: 'Checking Boy - Evening Shift', status: 'active' },
  { staffId: 'STF-12', name: 'Suresh Mendis', phone: '+94 71 567 8901', role: 'Checking Boy - Morning Shift', status: 'active' },
  { staffId: 'STF-13', name: 'Gayani Shalika', phone: '+94 77 987 6543', role: 'Quality Checker & Staff', status: 'active' }
];

// Default 4 Daily Monitoring Time Slots
const DEFAULT_TIME_SLOTS = [
  { slotId: 'SLOT-01', name: 'Morning Shift Check', timeWindow: '06:00 - 08:00', startHour: 6, endHour: 8, sortOrder: 1, status: 'active' },
  { slotId: 'SLOT-02', name: 'Mid-Day Check', timeWindow: '11:00 - 13:00', startHour: 11, endHour: 13, sortOrder: 2, status: 'active' },
  { slotId: 'SLOT-03', name: 'Evening Check', timeWindow: '16:00 - 18:00', startHour: 16, endHour: 18, sortOrder: 3, status: 'active' },
  { slotId: 'SLOT-04', name: 'Night Shift Check', timeWindow: '21:00 - 23:00', startHour: 21, endHour: 23, sortOrder: 4, status: 'active' }
];

/**
 * Initialize Database and Seed Default Data if empty
 */
async function initDatabase() {
  try {
    const freezerCount = await db.freezers.count();
    if (freezerCount === 0) {
      console.log('Seeding 64 Freezers...');
      await db.freezers.bulkAdd(DEFAULT_FREEZERS);
    }

    const staffCount = await db.staff.count();
    if (staffCount === 0) {
      console.log('Seeding Staff Members...');
      await db.staff.bulkAdd(DEFAULT_STAFF);
    } else {
      const hasGayani = await db.staff.where('name').equals('Gayani Shalika').first();
      if (!hasGayani) {
        await db.staff.add({ staffId: 'STF-13', name: 'Gayani Shalika', phone: '+94 77 987 6543', role: 'Quality Checker & Staff', status: 'active' });
      }
    }

    const slotCount = await db.timeSlots.count();
    if (slotCount === 0) {
      console.log('Seeding 4 Time Slots...');
      await db.timeSlots.bulkAdd(DEFAULT_TIME_SLOTS);
    }

    const userCount = await db.users.count();
    if (userCount === 0) {
      console.log('Seeding User Accounts (Admin & Gayani Shalika)...');
      await db.users.bulkAdd(DEFAULT_USERS);
    } else {
      const gayaniUser = await db.users.where('username').equalsIgnoreCase('Gayani Shalika').first();
      if (!gayaniUser) {
        await db.users.add({
          username: 'Gayani Shalika',
          fullName: 'Gayani Shalika',
          role: 'staff',
          password: 'Password@1234',
          phone: '+94 77 987 6543',
          status: 'active',
          createdAt: formatTimestamp(),
          lastLogin: 'Never'
        });
      }
    }

    const logCount = await db.logs.count();
    if (logCount === 0) {
      console.log('Generating realistic sample logs...');
      await seedSampleLogs();
    }

    applyStoredTheme();
    console.log('PFMS Database Initialized Successfully.');
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    return false;
  }
}

/**
 * ========================================================
 * DAILY NOTES & MISSED CHECK REASONS MANAGEMENT
 * ========================================================
 */

/**
 * Save or update daily observation note / reason for missed check
 */
async function saveDailyNote(dateStr, freezerId, noteText, authorName) {
  const existing = await db.dailyNotes
    .where('[date+freezerId]')
    .equals([dateStr, freezerId])
    .first();

  const timestamp = formatTimestamp();

  if (existing) {
    await db.dailyNotes.update(existing.id, {
      note: noteText.trim(),
      author: authorName || 'Staff',
      timestamp: timestamp
    });
    await db.auditLogs.add({
      timestamp: timestamp,
      action: 'UPDATE_DAILY_NOTE',
      details: `Updated note/reason for ${freezerId} on ${dateStr}: "${noteText.trim()}"`,
      user: authorName || 'Staff'
    });
    return { success: true, updated: true, id: existing.id };
  } else {
    const id = await db.dailyNotes.add({
      date: dateStr,
      freezerId: freezerId,
      note: noteText.trim(),
      author: authorName || 'Staff',
      timestamp: timestamp
    });
    await db.auditLogs.add({
      timestamp: timestamp,
      action: 'ADD_DAILY_NOTE',
      details: `Added note/reason for ${freezerId} on ${dateStr}: "${noteText.trim()}"`,
      user: authorName || 'Staff'
    });
    return { success: true, id };
  }
}

/**
 * Delete a daily note
 */
async function deleteDailyNote(dateStr, freezerId) {
  const existing = await db.dailyNotes
    .where('[date+freezerId]')
    .equals([dateStr, freezerId])
    .first();

  if (existing) {
    await db.dailyNotes.delete(existing.id);
    await db.auditLogs.add({
      timestamp: formatTimestamp(),
      action: 'DELETE_DAILY_NOTE',
      details: `Deleted note/reason for ${freezerId} on ${dateStr}`,
      user: 'Staff/Admin'
    });
    return { success: true };
  }
  return { success: false };
}

/**
 * Get daily note for specific freezer and date
 */
async function getDailyNote(dateStr, freezerId) {
  return await db.dailyNotes
    .where('[date+freezerId]')
    .equals([dateStr, freezerId])
    .first();
}

/**
 * ========================================================
 * USER AUTHENTICATION & PASSWORD MANAGEMENT
 * ========================================================
 */

async function authenticateUser(username, password, roleRequired = null) {
  if (!username || !password) {
    return { success: false, message: 'Username and password are required.' };
  }

  const cleanUser = username.trim();
  const user = await db.users
    .filter(u => u.username.toLowerCase() === cleanUser.toLowerCase())
    .first();

  if (!user) {
    return { success: false, message: 'Account not found. Please check username.' };
  }

  if (user.status !== 'active') {
    return { success: false, message: 'This account has been deactivated. Please contact Admin.' };
  }

  if (user.password !== password) {
    return { success: false, message: 'Incorrect password entered.' };
  }

  if (roleRequired && user.role !== roleRequired && user.role !== 'admin') {
    return { success: false, message: `Access denied. Requires ${roleRequired} privileges.` };
  }

  await db.users.update(user.id, { lastLogin: formatTimestamp() });

  return {
    success: true,
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName || user.username,
      role: user.role,
      phone: user.phone
    }
  };
}

async function createUserAccount({ username, fullName, password, role = 'staff', phone = '' }) {
  const cleanUsername = username.trim();
  if (!cleanUsername) return { success: false, message: 'Username is required.' };
  if (!password || password.length < 4) return { success: false, message: 'Password must be at least 4 characters.' };

  const existing = await db.users
    .filter(u => u.username.toLowerCase() === cleanUsername.toLowerCase())
    .first();

  if (existing) {
    return { success: false, message: `Account with username "${cleanUsername}" already exists.` };
  }

  const userId = await db.users.add({
    username: cleanUsername,
    fullName: fullName ? fullName.trim() : cleanUsername,
    role: role || 'staff',
    password: password.trim(),
    phone: phone ? phone.trim() : '',
    status: 'active',
    createdAt: formatTimestamp(),
    lastLogin: 'Never'
  });

  if (role === 'staff') {
    const existingStaff = await db.staff.where('name').equalsIgnoreCase(cleanUsername).first();
    if (!existingStaff) {
      const staffCount = await db.staff.count();
      const nextId = `STF-${String(staffCount + 1).padStart(2, '0')}`;
      await db.staff.add({
        staffId: nextId,
        name: fullName || cleanUsername,
        phone: phone || '',
        role: 'Staff Quality Checker',
        status: 'active'
      });
    }
  }

  await db.auditLogs.add({
    timestamp: formatTimestamp(),
    action: 'CREATE_USER_ACCOUNT',
    details: `Created new ${role} account: ${cleanUsername}`,
    user: 'System/Admin'
  });

  return { success: true, userId, message: `Account created successfully for ${cleanUsername}!` };
}

async function resetUserPassword(usernameOrId, newPassword) {
  if (!newPassword || newPassword.length < 4) {
    return { success: false, message: 'New password must be at least 4 characters.' };
  }

  let user = null;
  if (typeof usernameOrId === 'number') {
    user = await db.users.get(usernameOrId);
  } else {
    user = await db.users
      .filter(u => u.username.toLowerCase() === String(usernameOrId).trim().toLowerCase())
      .first();
  }

  if (!user) {
    return { success: false, message: 'User account not found.' };
  }

  await db.users.update(user.id, { password: newPassword.trim(), updatedAt: formatTimestamp() });
  await db.auditLogs.add({
    timestamp: formatTimestamp(),
    action: 'RESET_PASSWORD',
    details: `Password reset successfully for user: ${user.username}`,
    user: 'Admin/Self'
  });

  return { success: true, message: `Password for ${user.username} has been reset successfully!` };
}

/**
 * ========================================================
 * THEME SYSTEM ENGINE
 * ========================================================
 */

function getActiveTheme() {
  return localStorage.getItem('pfms_theme') || 'blue-yellow';
}

function setActiveTheme(themeId) {
  const validTheme = SYSTEM_THEMES.find(t => t.id === themeId);
  const selected = validTheme ? validTheme.id : 'blue-yellow';

  localStorage.setItem('pfms_theme', selected);
  document.documentElement.setAttribute('data-theme', selected);
  document.body.setAttribute('data-theme', selected);

  window.dispatchEvent(new CustomEvent('pfms-theme-changed', { detail: { theme: selected } }));
  return selected;
}

function applyStoredTheme() {
  const current = getActiveTheme();
  document.documentElement.setAttribute('data-theme', current);
  if (document.body) {
    document.body.setAttribute('data-theme', current);
  }
}

applyStoredTheme();

/**
 * ========================================================
 * UTILITY & DATA FUNCTIONS
 * ========================================================
 */

function evaluateTemperatureStatus(temperature, freezer) {
  const temp = parseFloat(temperature);
  if (isNaN(temp)) return 'warning';

  const min = freezer && typeof freezer.targetMin === 'number' ? freezer.targetMin : -22;
  const max = freezer && typeof freezer.targetMax === 'number' ? freezer.targetMax : -18;

  if (temp >= min && temp <= max) {
    return 'normal';
  }

  const warningTolerance = freezer?.type === 'chiller' ? 2.5 : 3.0;
  if (temp < min && temp >= (min - warningTolerance)) {
    return 'warning';
  }
  if (temp > max && temp <= (max + warningTolerance)) {
    return 'warning';
  }

  return 'critical';
}

function getCurrentTimeSlot(slots) {
  if (!slots || slots.length === 0) return 'SLOT-01';
  const now = new Date();
  const currentHour = now.getHours();

  if (currentHour >= 5 && currentHour < 10) return 'SLOT-01';
  if (currentHour >= 10 && currentHour < 15) return 'SLOT-02';
  if (currentHour >= 15 && currentHour < 20) return 'SLOT-03';
  return 'SLOT-04';
}

function formatDateKey(dateObj = new Date()) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatTimestamp(dateObj = new Date()) {
  const datePart = formatDateKey(dateObj);
  const h = String(dateObj.getHours()).padStart(2, '0');
  const min = String(dateObj.getMinutes()).padStart(2, '0');
  const s = String(dateObj.getSeconds()).padStart(2, '0');
  return `${datePart} ${h}:${min}:${s}`;
}

async function seedSampleLogs() {
  const freezers = await db.freezers.toArray();
  const staffList = await db.staff.toArray();
  const slots = await db.timeSlots.orderBy('sortOrder').toArray();

  if (!freezers.length || !staffList.length || !slots.length) return;

  const sampleLogs = [];
  const today = new Date();

  for (let d = 3; d >= 0; d--) {
    const targetDate = new Date();
    targetDate.setDate(today.getDate() - d);
    const dateStr = formatDateKey(targetDate);
    const isToday = (d === 0);

    for (const freezer of freezers) {
      for (let sIdx = 0; sIdx < slots.length; sIdx++) {
        const slot = slots[sIdx];
        if (isToday && sIdx >= 2) continue;

        const staff = staffList[(parseInt(freezer.freezerId.replace('FRZ-', ''), 10) + sIdx + d) % staffList.length];
        const mid = (freezer.targetMin + freezer.targetMax) / 2;
        let randomVariation = (Math.random() * 2.8) - 1.4;
        
        if (Math.random() < 0.05) {
          randomVariation += (Math.random() > 0.5 ? 4.5 : -3.5);
        }

        const temp = parseFloat((mid + randomVariation).toFixed(1));
        const status = evaluateTemperatureStatus(temp, freezer);

        const hour = slot.startHour || 8;
        const minute = Math.floor(Math.random() * 50);
        const timestampStr = `${dateStr} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`;

        sampleLogs.push({
          date: dateStr,
          timestamp: timestampStr,
          freezerId: freezer.freezerId,
          freezerName: freezer.name,
          location: freezer.location,
          staffId: staff.staffId,
          staffName: staff.name,
          slotId: slot.slotId,
          slotName: slot.name,
          temperature: temp,
          status: status,
          notes: status === 'critical' ? 'Temperature alert triggered; compressor inspected' : (status === 'warning' ? 'Door seal checked' : 'Routine check verified')
        });
      }
    }
  }

  await db.logs.bulkAdd(sampleLogs);
  await db.auditLogs.add({
    timestamp: formatTimestamp(),
    action: 'SYSTEM_INITIAL_SEED',
    details: `Generated ${sampleLogs.length} historical logs for demonstration.`,
    user: 'System'
  });
}

async function recordTemperatureCheck(entry, forceOverwrite = false) {
  const existing = await db.logs
    .where('[date+freezerId+slotId]')
    .equals([entry.date, entry.freezerId, entry.slotId])
    .first();

  if (existing && !forceOverwrite) {
    return {
      success: false,
      isDuplicate: true,
      existingRecord: existing,
      message: `A check for ${entry.freezerId} during ${entry.slotName} on ${entry.date} already exists (${existing.temperature}°C by ${existing.staffName}).`
    };
  }

  if (existing && forceOverwrite) {
    await db.logs.update(existing.id, {
      ...entry,
      updatedAt: formatTimestamp()
    });
    await db.auditLogs.add({
      timestamp: formatTimestamp(),
      action: 'UPDATE_LOG',
      details: `Updated check for ${entry.freezerId} on ${entry.date} [${entry.slotName}]: ${entry.temperature}°C by ${entry.staffName}`,
      user: entry.staffName
    });
    return { success: true, updated: true, id: existing.id };
  }

  const id = await db.logs.add(entry);
  await db.auditLogs.add({
    timestamp: formatTimestamp(),
    action: 'ADD_LOG',
    details: `Logged ${entry.freezerId} on ${entry.date} [${entry.slotName}]: ${entry.temperature}°C by ${entry.staffName}`,
    user: entry.staffName
  });

  return { success: true, id };
}

/**
 * Get Status Matrix with Daily Notes / Missed Reasons
 */
async function getStatusMatrix(dateStr = formatDateKey()) {
  const freezers = await db.freezers.orderBy('freezerId').toArray();
  const slots = await db.timeSlots.orderBy('sortOrder').toArray();
  const logsForDate = await db.logs.where('date').equals(dateStr).toArray();
  const notesForDate = await db.dailyNotes.where('date').equals(dateStr).toArray();

  const logMap = new Map();
  for (const log of logsForDate) {
    logMap.set(`${log.freezerId}:${log.slotId}`, log);
  }

  const noteMap = new Map();
  for (const n of notesForDate) {
    noteMap.set(n.freezerId, n);
  }

  const matrix = freezers.map(freezer => {
    const slotStatus = slots.map(slot => {
      const log = logMap.get(`${freezer.freezerId}:${slot.slotId}`);
      return {
        slotId: slot.slotId,
        slotName: slot.name,
        timeWindow: slot.timeWindow,
        isCompleted: !!log,
        log: log || null
      };
    });

    const completedCount = slotStatus.filter(s => s.isCompleted).length;
    return {
      freezer,
      slots: slotStatus,
      completedCount,
      totalSlots: slots.length,
      isFullCompleted: completedCount === slots.length,
      dailyNote: noteMap.get(freezer.freezerId) || null
    };
  });

  const totalPossibleChecks = freezers.length * slots.length;
  const totalCompletedChecks = logsForDate.length;
  const criticalCount = logsForDate.filter(l => l.status === 'critical').length;
  const warningCount = logsForDate.filter(l => l.status === 'warning').length;
  const normalCount = logsForDate.filter(l => l.status === 'normal').length;

  return {
    date: dateStr,
    matrix,
    freezers,
    slots,
    stats: {
      totalFreezers: freezers.length,
      totalSlots: slots.length,
      totalPossibleChecks,
      totalCompletedChecks,
      completionRate: totalPossibleChecks > 0 ? ((totalCompletedChecks / totalPossibleChecks) * 100).toFixed(1) : 0,
      normalCount,
      warningCount,
      criticalCount
    }
  };
}

async function getMissedChecks(dateStr = formatDateKey()) {
  const freezers = await db.freezers.where('status').equals('active').toArray();
  const slots = await db.timeSlots.where('status').equals('active').sortBy('sortOrder');
  const logsForDate = await db.logs.where('date').equals(dateStr).toArray();
  const notesForDate = await db.dailyNotes.where('date').equals(dateStr).toArray();

  const logSet = new Set(logsForDate.map(l => `${l.freezerId}:${l.slotId}`));
  const noteMap = new Map(notesForDate.map(n => [n.freezerId, n]));
  const missedList = [];

  for (const freezer of freezers) {
    for (const slot of slots) {
      if (!logSet.has(`${freezer.freezerId}:${slot.slotId}`)) {
        missedList.push({
          date: dateStr,
          freezerId: freezer.freezerId,
          freezerName: freezer.name,
          location: freezer.location,
          zone: freezer.zone,
          slotId: slot.slotId,
          slotName: slot.name,
          timeWindow: slot.timeWindow,
          reasonNote: noteMap.get(freezer.freezerId) || null
        });
      }
    }
  }

  return missedList;
}

async function exportDatabaseJSON() {
  const freezers = await db.freezers.toArray();
  const staff = await db.staff.toArray();
  const timeSlots = await db.timeSlots.toArray();
  const logs = await db.logs.toArray();
  const auditLogs = await db.auditLogs.toArray();
  const users = await db.users.toArray();
  const dailyNotes = await db.dailyNotes.toArray();

  const backupData = {
    pfmsVersion: '3.0',
    exportTimestamp: formatTimestamp(),
    system: 'Perera & Sons Freezer Monitoring System',
    theme: getActiveTheme(),
    counts: {
      freezers: freezers.length,
      staff: staff.length,
      timeSlots: timeSlots.length,
      logs: logs.length,
      users: users.length,
      dailyNotes: dailyNotes.length
    },
    data: {
      freezers,
      staff,
      timeSlots,
      logs,
      auditLogs,
      users,
      dailyNotes
    }
  };

  return JSON.stringify(backupData, null, 2);
}

async function importDatabaseJSON(jsonString) {
  try {
    const backup = JSON.parse(jsonString);
    if (!backup.data || !backup.data.freezers || !backup.data.staff || !backup.data.logs) {
      throw new Error('Invalid backup file format.');
    }

    await db.transaction('rw', db.freezers, db.staff, db.timeSlots, db.logs, db.auditLogs, db.users, db.dailyNotes, async () => {
      await db.freezers.clear();
      await db.staff.clear();
      await db.timeSlots.clear();
      await db.logs.clear();
      await db.auditLogs.clear();
      await db.users.clear();
      await db.dailyNotes.clear();

      await db.freezers.bulkAdd(backup.data.freezers);
      await db.staff.bulkAdd(backup.data.staff);
      await db.timeSlots.bulkAdd(backup.data.timeSlots || DEFAULT_TIME_SLOTS);
      await db.logs.bulkAdd(backup.data.logs);
      if (backup.data.auditLogs && backup.data.auditLogs.length) {
        await db.auditLogs.bulkAdd(backup.data.auditLogs);
      }
      if (backup.data.users && backup.data.users.length) {
        await db.users.bulkAdd(backup.data.users);
      } else {
        await db.users.bulkAdd(DEFAULT_USERS);
      }
      if (backup.data.dailyNotes && backup.data.dailyNotes.length) {
        await db.dailyNotes.bulkAdd(backup.data.dailyNotes);
      }
      if (backup.theme) {
        setActiveTheme(backup.theme);
      }
      await db.auditLogs.add({
        timestamp: formatTimestamp(),
        action: 'DATABASE_RESTORE',
        details: `Restored database from backup (${backup.data.logs.length} logs).`,
        user: 'Admin'
      });
    });

    return { success: true };
  } catch (error) {
    console.error('Import database error:', error);
    return { success: false, error: error.message };
  }
}

async function resetSystemDefaults() {
  await db.transaction('rw', db.freezers, db.staff, db.timeSlots, db.logs, db.auditLogs, db.users, db.dailyNotes, async () => {
    await db.freezers.clear();
    await db.staff.clear();
    await db.timeSlots.clear();
    await db.logs.clear();
    await db.auditLogs.clear();
    await db.users.clear();
    await db.dailyNotes.clear();

    await db.freezers.bulkAdd(DEFAULT_FREEZERS);
    await db.staff.bulkAdd(DEFAULT_STAFF);
    await db.timeSlots.bulkAdd(DEFAULT_TIME_SLOTS);
    await db.users.bulkAdd(DEFAULT_USERS);
    await seedSampleLogs();
  });
}
