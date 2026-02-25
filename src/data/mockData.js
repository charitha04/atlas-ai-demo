// --- Account Configuration ---
export const ACCOUNTS = [
  {
    id: 'audi-grapevine',
    name: 'Audi Grapevine',
    location: 'Grapevine, TX',
    center: [32.9346, -97.0781], // [lat, lng]
  },
  {
    id: 'bmw-dallas',
    name: 'BMW Dallas',
    location: 'Dallas, TX',
    center: [32.7767, -96.7970],
  },
  {
    id: 'mercedes-fort-worth',
    name: 'Mercedes Fort Worth',
    location: 'Fort Worth, TX',
    center: [32.7555, -97.3308],
  }
];

// --- Seeded Random Number Generator ---
// Simple seeded PRNG for account-specific randomization
const seededRandom = (seed) => {
  let value = seed;
  return () => {
    value = (value * 9301 + 49297) % 233280;
    return value / 233280;
  };
};

// Get account-specific random function
const getAccountRandom = (accountId) => {
  // Create seed from accountId string
  let seed = 0;
  for (let i = 0; i < accountId.length; i++) {
    seed = ((seed << 5) - seed) + accountId.charCodeAt(i);
    seed = seed & seed; // Convert to 32-bit integer
  }
  seed = Math.abs(seed);
  return seededRandom(seed);
};

// --- Mock Data Generators ---

const firstNames = [
  'James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda',
  'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Christopher', 'Karen', 'Daniel', 'Nancy', 'Matthew', 'Lisa',
  'Anthony', 'Betty', 'Mark', 'Margaret', 'Donald', 'Sandra', 'Steven', 'Ashley',
  'Paul', 'Kimberly', 'Andrew', 'Emily', 'Joshua', 'Donna', 'Kenneth', 'Michelle',
  'Kevin', 'Carol', 'Brian', 'Amanda', 'George', 'Dorothy', 'Timothy', 'Melissa',
  'Ronald', 'Deborah', 'Jason', 'Stephanie', 'Edward', 'Rebecca', 'Jeffrey', 'Sharon',
  'Ryan', 'Laura', 'Jacob', 'Cynthia', 'Gary', 'Kathleen', 'Nicholas', 'Amy',
  'Eric', 'Angela', 'Jonathan', 'Shirley', 'Stephen', 'Anna', 'Larry', 'Brenda',
  'Justin', 'Pamela', 'Scott', 'Emma', 'Brandon', 'Nicole', 'Benjamin', 'Helen',
  'Samuel', 'Samantha', 'Frank', 'Katherine', 'Gregory', 'Christine', 'Raymond', 'Debra',
  'Alexander', 'Rachel', 'Patrick', 'Carolyn', 'Jack', 'Janet', 'Dennis', 'Virginia',
  'Jerry', 'Maria', 'Tyler', 'Heather', 'Aaron', 'Diane', 'Jose', 'Julie',
  'Adam', 'Joyce', 'Nathan', 'Victoria', 'Henry', 'Olivia', 'Douglas', 'Kelly',
  'Zachary', 'Christina', 'Peter', 'Joan', 'Kyle', 'Evelyn', 'Noah', 'Lauren',
  'Ethan', 'Judith', 'Jeremy', 'Megan', 'Walter', 'Cheryl', 'Christian', 'Andrea',
  'Keith', 'Hannah', 'Roger', 'Jacqueline', 'Terry', 'Martha', 'Gerald', 'Gloria',
  'Harold', 'Teresa', 'Sean', 'Sara', 'Austin', 'Janice', 'Carl', 'Marie',
  'Arthur', 'Julia', 'Lawrence', 'Grace', 'Dylan', 'Judy', 'Jesse', 'Theresa',
  'Jordan', 'Madison', 'Bryan', 'Beverly', 'Billy', 'Denise', 'Joe', 'Marilyn',
  'Bruce', 'Amber', 'Gabriel', 'Danielle', 'Logan', 'Rose', 'Alan', 'Brittany',
  'Juan', 'Diana', 'Wayne', 'Abigail', 'Roy', 'Jane', 'Ralph', 'Lori',
  'Randy', 'Alexis', 'Eugene', 'Marie', 'Louis', 'Irene', 'Philip', 'Kathryn',
  'Johnny', 'Emma', 'Howard', 'Catherine', 'Vincent', 'Frances', 'Bobby', 'Christine',
  'Willie', 'Samantha', 'Russell', 'Debra', 'Albert', 'Rachel', 'Willie', 'Carolyn'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson', 'Thomas', 'Taylor',
  'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Sanchez',
  'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker', 'Young', 'Allen', 'King',
  'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores', 'Green', 'Adams',
  'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts',
  'Gomez', 'Phillips', 'Evans', 'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards',
  'Collins', 'Reyes', 'Stewart', 'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers',
  'Gutierrez', 'Ortiz', 'Morgan', 'Cooper', 'Peterson', 'Bailey', 'Reed', 'Kelly',
  'Howard', 'Ramos', 'Kim', 'Cox', 'Ward', 'Richardson', 'Watson', 'Brooks',
  'Chavez', 'Wood', 'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes',
  'Price', 'Alvarez', 'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross',
  'Foster', 'Jimenez', 'Powell', 'Jenkins', 'Perry', 'Russell', 'Sullivan', 'Bell',
  'Coleman', 'Butler', 'Henderson', 'Simmons', 'Foster', 'Gonzales', 'Bryant', 'Alexander',
  'Russell', 'Griffin', 'Diaz', 'Hayes', 'Myers', 'Ford', 'Hamilton', 'Graham',
  'Sullivan', 'Wallace', 'Woods', 'Cole', 'West', 'Jordan', 'Owens', 'Reynolds',
  'Fisher', 'Ellis', 'Harrison', 'Gibson', 'Mcdonald', 'Cruz', 'Marshall', 'Ortiz',
  'Gomez', 'Murray', 'Freeman', 'Wells', 'Webb', 'Simpson', 'Stevens', 'Tucker',
  'Porter', 'Hunter', 'Hicks', 'Crawford', 'Henry', 'Boyd', 'Mason', 'Morales',
  'Kennedy', 'Warren', 'Dixon', 'Ramos', 'Reyes', 'Burns', 'Gordon', 'Shaw',
  'Wagner', 'Hunter', 'Romero', 'Hunt', 'Daniels', 'Palmer', 'Robertson', 'Mills',
  'Nichols', 'Grant', 'Knight', 'Ferguson', 'Rose', 'Stone', 'Hawkins', 'Dunn',
  'Perkins', 'Hudson', 'Spencer', 'Gardner', 'Stephens', 'Payne', 'Pierce', 'Berry',
  'Patterson', 'Ball', 'Lane', 'Barker', 'Ballard', 'Craig', 'Baldwin', 'Holland',
  'Sharp', 'Bush', 'Horton', 'Thornton', 'Wolfe', 'Warner', 'Dennis', 'Hanson',
  'Fuller', 'Mcdaniel', 'Meyer', 'Fowler', 'Brewer', 'Hoffman', 'Carlson', 'Silva',
  'Pearson', 'Holland', 'Douglas', 'Fleming', 'Jensen', 'Vargas', 'Byrd', 'Davidson',
  'Hopkins', 'May', 'Terry', 'Herrera', 'Wade', 'Soto', 'Walters', 'Curtis',
  'Neal', 'Black', 'Bowman', 'Francis', 'Fox', 'Boyd', 'Johnston', 'Harvey',
  'Hudson', 'Carr', 'Mcdonald', 'Armstrong', 'Watkins', 'Lawson', 'Gutierrez', 'Fields',
  'Ryan', 'Chavez', 'Riley', 'Schmidt', 'Carr', 'Vasquez', 'Castillo', 'Wheeler',
  'Chapman', 'Oliver', 'Montgomery', 'Richards', 'Williamson', 'Johnston', 'Banks', 'Meyer',
  'Bishop', 'Mccoy', 'Howell', 'Alvarez', 'Morrison', 'Hansen', 'Fernandez', 'Garza',
  'Harvey', 'Little', 'Burton', 'Stanley', 'Nguyen', 'George', 'Jacobs', 'Reid',
  'Kim', 'Fuller', 'Lynch', 'Dean', 'Gilbert', 'Garrett', 'Romero', 'Welch',
  'Larson', 'Frazier', 'Burke', 'Hanson', 'Day', 'Mendoza', 'Moreno', 'Bowman',
  'Medina', 'Fowler', 'Brewer', 'Moffett', 'Stanley', 'Bates', 'Schoen', 'Goodwin',
  'Mccarthy', 'Fitzgerald', 'Pierce', 'Brennan', 'Briggs', 'Casey', 'Roy', 'Lucas',
  'Snyder', 'Henderson', 'Ross', 'Arnold', 'Todd', 'Schneider', 'Schultz', 'Manning',
  'Todd', 'Schneider', 'Schultz', 'Manning', 'Todd', 'Schneider', 'Schultz', 'Manning'
];

const serviceTypes = [
  'Oil Change & Tire Rotation', 'Brake Inspection', '30k Mile Service', '60k Mile Service',
  '90k Mile Service', 'Battery Replacement', 'Tire Replacement', 'Transmission Service',
  'Coolant Flush', 'Air Filter Replacement', 'Spark Plug Replacement', 'Wheel Alignment',
  'AC Service', 'Brake Pad Replacement', 'Engine Diagnostic', 'Timing Belt Replacement',
  'Fuel System Cleaning', 'Exhaust System Repair', 'Suspension Repair', 'Windshield Replacement'
];

const generateVIN = () => {
  const chars = 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789';
  let vin = '';
  for (let i = 0; i < 17; i++) {
    vin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return vin;
};

const getRandomElement = (array, randomFn = Math.random) => array[Math.floor(randomFn() * array.length)];

const competitorDealerships = [
  'ABC Motors', 'XYZ Auto Group', 'City Auto Center', 'Metro Dealership', 'Premier Auto Sales',
  'Elite Motors', 'Sunset Auto Group', 'Riverside Dealership', 'Coastal Auto Center', 'Valley Motors',
  'Summit Auto Sales', 'Peak Dealership', 'Horizon Auto Group', 'Apex Motors', 'Crown Auto Center'
];

const generateServiceHistory = (currentMileage, randomFn = Math.random) => {
  const history = [];
  const serviceCount = Math.floor(randomFn() * 5) + 2; // 2-6 services
  const now = new Date();
  
  for (let i = 0; i < serviceCount; i++) {
    const monthsAgo = Math.floor(randomFn() * 36) + 1; // 1-36 months ago
    const serviceDate = new Date(now);
    serviceDate.setMonth(serviceDate.getMonth() - monthsAgo);
    
    const mileageAtService = Math.max(0, currentMileage - Math.floor(randomFn() * 20000) - (i * 5000));
    const serviceType = getRandomElement(serviceTypes, randomFn);
    const cost = serviceType.includes('Inspection') || serviceType.includes('Diagnostic') 
      ? randomFn() < 0.3 ? 0 : Math.floor(randomFn() * 150) 
      : Math.floor(randomFn() * 800) + 50;
    
    history.push({
      id: i + 1,
      date: serviceDate.toISOString().split('T')[0],
      type: serviceType,
      mileage: mileageAtService,
      cost: parseFloat(cost.toFixed(2))
    });
  }
  
  // Sort by date descending
  return history.sort((a, b) => new Date(b.date) - new Date(a.date));
};

// Helper function to generate behavioral signals for a customer
const generateBehavioralSignals = (status, getRandom) => {
  const signals = [];
  
  // Status-based signals
  if (status === 'Open Recall') {
    signals.push({ type: 'warning', text: 'Open recall present', icon: 'alert-triangle' });
  }
  
  if (status === 'Active Defector') {
    signals.push({ type: 'danger', text: 'Visited competitor recently', icon: 'alert-circle' });
  }
  
  // Service-based signals
  if (getRandom() > 0.6) {
    signals.push({ type: 'warning', text: 'Skipped last recommended service', icon: 'x-circle' });
  }
  
  // Campaign engagement signals
  if (getRandom() > 0.5) {
    const daysAgo = Math.floor(getRandom() * 21) + 1;
    signals.push({ type: 'info', text: `Responded to campaign ${daysAgo} ${daysAgo === 1 ? 'day' : 'days'} ago`, icon: 'mail' });
  }
  
  // Appointment signals
  if (getRandom() > 0.7) {
    signals.push({ type: 'neutral', text: 'No appointment booked', icon: 'calendar-x' });
  }
  
  // Email/SMS engagement
  if (getRandom() > 0.6) {
    signals.push({ type: 'success', text: 'Opened last 2 email campaigns', icon: 'mail-check' });
  }
  
  // Website activity
  if (getRandom() > 0.75) {
    signals.push({ type: 'info', text: 'Viewed service specials online', icon: 'eye' });
  }
  
  return signals.slice(0, 4); // Limit to 4 signals
};

// Helper function to generate score explanations
const generateScoreExplanations = (distanceVal, mileageVal, monthsSinceLastService, competitorDistance, ltvTier) => {
  const explanations = [];
  
  // Distance explanation
  if (competitorDistance && competitorDistance < distanceVal) {
    explanations.push(`Customer is closer to a competitor (${competitorDistance.toFixed(1)} mi) than your dealership (${distanceVal.toFixed(1)} mi)`);
  } else if (distanceVal > 25) {
    explanations.push(`Customer lives ${distanceVal.toFixed(1)} miles away — farther than average`);
  } else if (distanceVal < 10) {
    explanations.push(`Customer lives nearby (${distanceVal.toFixed(1)} mi) — convenient for service`);
  }
  
  // Service cadence explanation
  if (monthsSinceLastService > 6) {
    explanations.push(`Last service ${monthsSinceLastService} months ago (historical average: 3 months)`);
  } else if (monthsSinceLastService <= 3) {
    explanations.push(`Recently serviced (${monthsSinceLastService} months ago) — good engagement`);
  }
  
  // Usage explanation
  if (mileageVal < 30000) {
    explanations.push('Low mileage usage compared to similar vehicles');
  } else if (mileageVal > 80000) {
    explanations.push('Higher-than-average mileage — likely needs more frequent service');
  }
  
  // LTV explanation
  if (ltvTier === 'High') {
    explanations.push('High projected service value over next 24 months');
  } else if (ltvTier === 'Low') {
    explanations.push('Lower projected service value based on history');
  }
  
  return explanations;
};

export const generateCustomers = (count, accountId = null, accountCenter = null) => {
  const statuses = ['Service Due', 'Active Defector', 'Open Recall', 'Loyal', 'Service declined'];
  const segments = ['High Value', 'Standard', 'At Risk'];
  const carModels = [
    'Ford F-150', 'Toyota Camry', 'Honda CR-V', 'BMW X5', 'Chevy Silverado', 'Tesla Model Y',
    'Ford Explorer', 'Toyota RAV4', 'Honda Accord', 'BMW 3 Series', 'Chevy Equinox', 'Tesla Model 3',
    'Ford Mustang', 'Toyota Highlander', 'Honda Civic', 'BMW X3', 'Chevy Tahoe', 'Jeep Grand Cherokee',
    'Ram 1500', 'Toyota Tacoma', 'Honda Pilot', 'Mercedes-Benz C-Class', 'GMC Sierra', 'Nissan Rogue',
    'Ford Escape', 'Toyota Corolla', 'Honda Odyssey', 'Audi A4', 'Chevy Malibu', 'Subaru Outback'
  ];
  const modelYears = [2018, 2019, 2020, 2021, 2022, 2023, 2024];

  // Use seeded random if accountId provided
  const randomFn = accountId ? getAccountRandom(`${accountId}-${count}`) : Math.random;
  const getRandom = () => randomFn();
  const getRandomElementAccount = (array) => getRandomElement(array, getRandom);

  // Use account center or default to Grapevine
  const center = accountCenter || [32.9346, -97.0781];

  return Array.from({ length: count }, (_, i) => {
    // Randomize customer data
    const firstName = getRandomElementAccount(firstNames);
    const lastName = getRandomElementAccount(lastNames);
    const fullName = `${firstName} ${lastName}`;
    
    // Generate phone number (Texas area codes: 214, 469, 972, 817, 682)
    const areaCodes = ['214', '469', '972', '817', '682'];
    const areaCode = getRandomElementAccount(areaCodes);
    const phoneMiddle = String(Math.floor(getRandom() * 900) + 100);
    const phoneLast = String(Math.floor(getRandom() * 9000) + 1000);
    const phone = `(${areaCode}) ${phoneMiddle}-${phoneLast}`;
    
    // Logic for Gamified Score
    const distanceVal = getRandom() * 40; // 0-40 miles
    const mileageVal = Math.floor(getRandom() * 120000) + 5000; // 5k - 125k miles
    
    // Random status and segment (not using modulo for more variety)
    const status = getRandomElementAccount(statuses);
    const segment = getRandomElementAccount(segments);
    
    // Random vehicle
    const vehicleModel = getRandomElementAccount(carModels);
    const vehicleYear = getRandomElementAccount(modelYears);
    
    // Random dates
    const monthsSinceLastService = Math.floor(getRandom() * 18) + 1; // 1-18 months
    
    // Generate competitor distance (often closer than dealership for defectors)
    const isDefector = status === 'Active Defector';
    const competitorDistance = isDefector 
      ? Math.max(1, distanceVal - (getRandom() * 15)) // Competitor is closer for defectors
      : distanceVal + (getRandom() * 10); // Competitor is farther for others
    
    // Generate Lifetime Value (projected 24-month service revenue)
    const vehicleAge = 2025 - vehicleYear;
    const baseServiceValue = 150 + (vehicleAge * 50); // Older vehicles need more service
    const mileageMultiplier = 1 + (mileageVal / 100000) * 0.5;
    const segmentMultiplier = segment === 'High Value' ? 1.5 : segment === 'At Risk' ? 0.7 : 1;
    const lifetimeValue = Math.round(baseServiceValue * mileageMultiplier * segmentMultiplier * (3 + getRandom() * 3));
    
    // Determine LTV tier
    let ltvTier = 'Low';
    if (lifetimeValue >= 3000) ltvTier = 'High';
    else if (lifetimeValue >= 1500) ltvTier = 'Medium';
    
    // Score Calculation - Distribution based approach
    // Distribution: 30% score < 30, 30% score 31-60, 40% score 61-100
    const scoreDistributionRoll = getRandom();
    let retentionScore;
    if (scoreDistributionRoll < 0.30) {
      // 30% of customers: score 5-29
      retentionScore = Math.round(5 + getRandom() * 24);
    } else if (scoreDistributionRoll < 0.60) {
      // 30% of customers: score 31-60
      retentionScore = Math.round(31 + getRandom() * 29);
    } else {
      // 40% of customers: score 61-100
      retentionScore = Math.round(61 + getRandom() * 39);
    }
    
    // Hot lead is independent - 50% of customers randomly
    const isHotLead = getRandom() < 0.50;
    
    // Legacy calculations for factor impacts display (kept for UI compatibility)
    const proxScore = Math.max(0, 100 - (distanceVal * 2.5));
    const usageScore = Math.min(100, (mileageVal / 100000) * 100);
    const serviceCadencePenalty = Math.min(20, Math.max(0, (monthsSinceLastService - 3) * 3));
    const behaviorBaseScore = Math.max(0, Math.round((proxScore * 0.5) + (usageScore * 0.3) - serviceCadencePenalty));
    const ltvUplift = ltvTier === 'High' ? Math.round(6 + getRandom() * 4) 
                    : ltvTier === 'Medium' ? Math.round(2 + getRandom() * 3)
                    : 0;
    
    // Factor impacts (how much each factor contributes)
    const distanceImpact = Math.round((proxScore * 0.5 / 100) * 50 - 25); // Range: -25 to +25
    const serviceGapImpact = -Math.round(serviceCadencePenalty * 0.7); // Negative impact
    const usageImpact = Math.round((usageScore * 0.3 / 100) * 20 - 10); // Range: -10 to +10
    
    const factorImpacts = {
      distance: { 
        impact: distanceImpact, 
        label: 'Distance to competitor',
        description: distanceImpact < 0 ? 'Closer to competitor' : 'Closer to dealership'
      },
      serviceGap: { 
        impact: serviceGapImpact, 
        label: 'Service inactivity',
        description: monthsSinceLastService > 6 ? 'Longer service gap' : 'Recent service'
      },
      usage: { 
        impact: usageImpact, 
        label: 'Usage pattern',
        description: mileageVal > 60000 ? 'Higher mileage' : 'Lower mileage'
      },
      ltv: { 
        impact: ltvUplift, 
        label: 'Lifetime value',
        description: ltvTier === 'High' ? 'High value customer' : ltvTier === 'Medium' ? 'Medium value' : 'Standard value'
      }
    };
    
    // Generate score explanations
    const scoreExplanations = generateScoreExplanations(distanceVal, mileageVal, monthsSinceLastService, competitorDistance, ltvTier);
    
    // Generate behavioral signals
    const behavioralSignals = generateBehavioralSignals(status, getRandom);
    
    const activeCampaignsCount = Math.floor(getRandom() * 4); // 0 to 3 active campaigns
    const lastServiceDate = `${monthsSinceLastService} ${monthsSinceLastService === 1 ? 'month' : 'months'} ago`;
    
    const daysUntilNextService = Math.floor(getRandom() * 90) - 30; // -30 to 60 days
    const nextServiceDate = new Date();
    nextServiceDate.setDate(nextServiceDate.getDate() + daysUntilNextService);
    const nextServiceDue = nextServiceDate.toLocaleDateString();
    
    // More realistic revenue based on segment and mileage
    let baseRevenue = 200;
    if (segment === 'High Value') baseRevenue = 400;
    else if (segment === 'At Risk') baseRevenue = 150;
    const revenue = Math.floor(getRandom() * (baseRevenue * 2)) + baseRevenue;
    
    // Generate service history
    const serviceHistory = generateServiceHistory(mileageVal, getRandom);

    // Calculate miles until next service for Service Due customers
    // Service intervals are typically at 5k, 10k, 15k, etc.
    let milesUntilService = null;
    if (status === 'Service Due') {
      const serviceInterval = 5000; // 5k mile intervals
      const nextServiceMileage = Math.ceil(mileageVal / serviceInterval) * serviceInterval;
      milesUntilService = Math.max(0, nextServiceMileage - mileageVal);
    }

    // Assign defector dealership for Active Defector customers
    const defectorDealership = status === 'Active Defector' 
      ? getRandomElementAccount(competitorDealerships) 
      : null;

    // Assign recall urgency for Open Recall customers
    const recallUrgency = status === 'Open Recall' 
      ? (getRandom() > 0.5 ? 'Urgent' : 'Open')
      : null;

    // Generate date sold for Service declined customers
    let dateSold = null;
    if (status === 'Service declined') {
      const daysAgo = Math.floor(getRandom() * 365) + 1; // 1-365 days ago
      const soldDate = new Date();
      soldDate.setDate(soldDate.getDate() - daysAgo);
      dateSold = soldDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    // Generate Goodwill data based on paid service history
    const paidServices = serviceHistory.filter(s => s.cost > 0);
    const paidServicesLast12Months = paidServices.filter(s => {
      const serviceDate = new Date(s.date);
      const twelveMonthsAgo = new Date();
      twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
      return serviceDate >= twelveMonthsAgo;
    }).length;

    const lastPaidService = paidServices.length > 0 
      ? paidServices[0] // Already sorted by date descending
      : null;

    let goodwillStatus = 'UNKNOWN';
    let goodwillScore = null;
    const goodwillReasons = [];

    if (paidServices.length === 0) {
      goodwillStatus = 'UNKNOWN';
    } else {
      // Calculate goodwill based on paid service history
      const monthsSinceLastPaid = lastPaidService 
        ? Math.floor((new Date() - new Date(lastPaidService.date)) / (1000 * 60 * 60 * 24 * 30))
        : 999;

      // Determine status based on paid services and recency
      if (paidServicesLast12Months >= 3 && monthsSinceLastPaid <= 6) {
        goodwillStatus = 'HIGH';
        goodwillScore = Math.floor(getRandom() * 20) + 80; // 80-100
        goodwillReasons.push(`Paid services: ${paidServicesLast12Months} in last 12 months`);
        if (lastPaidService) {
          goodwillReasons.push(`Last paid visit: ${monthsSinceLastPaid === 0 ? 'This month' : monthsSinceLastPaid === 1 ? '1 month ago' : `${monthsSinceLastPaid} months ago`}`);
        }
        const freeOnlyVisits = serviceHistory.filter(s => s.cost === 0).length;
        if (freeOnlyVisits <= paidServices.length * 0.5) {
          goodwillReasons.push('Free-only visits are minimal');
        }
        goodwillReasons.push('Spend trend: consistent');
      } else if (paidServicesLast12Months >= 1 && monthsSinceLastPaid <= 12) {
        goodwillStatus = 'MEDIUM';
        goodwillScore = Math.floor(getRandom() * 30) + 50; // 50-80
        goodwillReasons.push(`Paid services: ${paidServicesLast12Months} in last 12 months`);
        if (lastPaidService) {
          goodwillReasons.push(`Last paid visit: ${monthsSinceLastPaid === 0 ? 'This month' : monthsSinceLastPaid === 1 ? '1 month ago' : `${monthsSinceLastPaid} months ago`}`);
        }
        const freeOnlyRatio = serviceHistory.filter(s => s.cost === 0).length / serviceHistory.length;
        if (freeOnlyRatio > 0.7) {
          goodwillReasons.push('Mostly free services');
        }
      } else {
        goodwillStatus = 'LOW';
        goodwillScore = Math.floor(getRandom() * 30) + 0; // 0-30
        if (paidServicesLast12Months === 0) {
          goodwillReasons.push('No paid services in last 12 months');
        } else {
          goodwillReasons.push(`Paid services: ${paidServicesLast12Months} in last 12 months`);
        }
        if (lastPaidService && monthsSinceLastPaid > 12) {
          goodwillReasons.push(`Last paid visit: ${monthsSinceLastPaid} months ago`);
        }
        const freeOnlyRatio = serviceHistory.filter(s => s.cost === 0).length / serviceHistory.length;
        if (freeOnlyRatio > 0.8) {
          goodwillReasons.push('Limited paid history');
        }
      }
    }

    const goodwill = {
      status: goodwillStatus,
      score: goodwillScore,
      reasons: goodwillReasons,
      lastCalculatedAt: new Date().toISOString()
    };

    return {
      id: `CUST-${1000 + i}`,
      name: fullName,
      owner: `${firstName} ${lastName}`,
      phone: phone,
      vehicle: `${vehicleYear} ${vehicleModel}`,
      vin: generateVIN(),
      status: status,
      segment: segment,
      lastServiceDate: lastServiceDate,
      nextServiceDue: nextServiceDue,
      distanceRaw: distanceVal,
      distance: `${distanceVal.toFixed(1)} mi`,
      mileage: mileageVal,
      revenue: revenue,
      retentionScore: retentionScore,
      isHotLead: isHotLead,
      activeCampaigns: activeCampaignsCount,
      coordinates: {
        x: getRandom() * 100, // % position
        y: getRandom() * 100  // % position
      },
      serviceHistory: serviceHistory,
      // Dynamic fields based on status
      milesUntilService: milesUntilService,
      defectorDealership: defectorDealership,
      recallUrgency: recallUrgency,
      dateSold: dateSold,
      // Goodwill data
      goodwill: goodwill,
      // Enhanced retention score data
      lifetimeValue: lifetimeValue,
      ltvTier: ltvTier,
      behaviorBaseScore: behaviorBaseScore,
      ltvUplift: ltvUplift,
      factorImpacts: factorImpacts,
      scoreExplanations: scoreExplanations,
      behavioralSignals: behavioralSignals,
      competitorDistance: competitorDistance,
      monthsSinceLastService: monthsSinceLastService
    };
  });
};

// Generate customers and migrate old status values to new ones
const generatedCustomers = generateCustomers(50);
export const INITIAL_CUSTOMERS = generatedCustomers.map(customer => ({
  ...customer,
  status: customer.status === 'Ownership Change' ? 'Service declined' : customer.status
}));

const campaignNames = [
  'Winter Tire Special', 'Defector Win-back', 'Safety Recall Alpha', '100k Club Service',
  'Spring Maintenance', 'Summer Service Special', 'Fall Check-up', 'Holiday Service',
  'Loyalty Rewards', 'New Customer Welcome', 'Service Reminder', 'Recall Notification',
  'High Mileage Service', 'Pre-Winter Inspection', 'Brake Special', 'Oil Change Deal',
  'Tire Rotation Special', 'AC Service Special', 'Battery Check', 'Transmission Service'
];

const campaignAudiences = ['Service Due', 'Active Defector', 'Open Recall', 'Loyal', 'Service declined'];
const channels = ['Email', 'SMS', 'Call List', 'Direct Mail', 'Push Notification'];
const campaignStatuses = ['Active', 'Running', 'Completed', 'Paused', 'Draft'];

const generateCampaigns = (count, accountId = null) => {
  const randomFn = accountId ? getAccountRandom(`${accountId}-campaigns-${count}`) : Math.random;
  const getRandom = () => randomFn();
  const getRandomElementAccount = (array) => getRandomElement(array, getRandom);

  return Array.from({ length: count }, (_, i) => {
    const audience = getRandomElementAccount(campaignAudiences);
    const channel = getRandomElementAccount(channels);
    const status = getRandomElementAccount(campaignStatuses);
    const name = getRandomElementAccount(campaignNames);
    
    // Generate realistic metrics
    const sent = Math.floor(getRandom() * 2000) + 50;
    const openRate = Math.floor(getRandom() * 60) + 30; // 30-90%
    
    // Potential revenue based on audience size and type
    let baseRevenue = sent * 10;
    if (audience === 'Loyal') baseRevenue *= 1.5;
    else if (audience === 'Active Defector') baseRevenue *= 0.8;
    else if (audience === 'Open Recall') baseRevenue = 0; // Recalls don't generate revenue
    
    const potentialRevenue = Math.floor(baseRevenue * (openRate / 100) * (0.7 + getRandom() * 0.6));
    
    // Random date
    const daysAgo = Math.floor(getRandom() * 90) + 1;
    let dateStr;
    if (daysAgo === 1) dateStr = '1 day ago';
    else if (daysAgo < 7) dateStr = `${daysAgo} days ago`;
    else if (daysAgo < 14) dateStr = '1 week ago';
    else if (daysAgo < 30) dateStr = `${Math.floor(daysAgo / 7)} weeks ago`;
    else if (daysAgo < 60) dateStr = '1 month ago';
    else dateStr = `${Math.floor(daysAgo / 30)} months ago`;
    
    return {
      id: 100 + i,
      name: name,
      audience: audience,
      channel: channel,
      status: status,
      sent: sent,
      openRate: `${openRate}%`,
      potentialRevenue: potentialRevenue,
      date: dateStr
    };
  });
};

export const INITIAL_CAMPAIGNS = generateCampaigns(4);

// Export the generator for creating account-specific campaigns
export { generateCampaigns };

const activityTypes = ['alert', 'success', 'info', 'warning', 'error'];
const activityMessages = [
  'Defector Alert: Customer #{id} detected at Competitor {name}',
  'Appt Booked: {name} ({campaign})',
  'New Recall Issued: {component} for {year} Models',
  'Service declined detected for VIN ending {vin}',
  'Campaign "{campaign}" generated {count} leads',
  'Service Appointment Completed: {name}',
  'Customer {name} responded to {campaign}',
  'High-value customer {name} scheduled service',
  'Recall campaign reached {count} customers',
  'Defector win-back successful for {name}',
  'New customer acquisition: {name}',
  'Service reminder sent to {count} customers',
  'Campaign "{campaign}" exceeded revenue target',
  'Customer {name} upgraded service package',
  'Bulk service appointment scheduled for {count} vehicles'
];

const competitorNames = ['Competitor A', 'Competitor B', 'Rival Dealer', 'Local Competitor', 'Nearby Service'];
const components = ['ABS Module', 'Airbag System', 'Brake System', 'Engine Control', 'Transmission', 'Steering Column'];
const years = ['2019', '2020', '2021', '2022', '2023'];

const generateActivityFeed = (count, accountId = null) => {
  const randomFn = accountId ? getAccountRandom(`${accountId}-activity-${count}`) : Math.random;
  const getRandom = () => randomFn();
  const getRandomElementAccount = (array) => getRandomElement(array, getRandom);

  return Array.from({ length: count }, (_, i) => {
    const type = getRandomElementAccount(activityTypes);
    let message = getRandomElementAccount(activityMessages);
    
    // Replace placeholders - order matters to avoid conflicts
    const customerName = `${getRandomElementAccount(firstNames)} ${getRandomElementAccount(lastNames)}`;
    const competitorName = getRandomElementAccount(competitorNames);
    
    message = message.replace('{id}', Math.floor(getRandom() * 9000) + 1000);
    message = message.replace('{campaign}', getRandomElementAccount(campaignNames));
    message = message.replace('{count}', Math.floor(getRandom() * 50) + 5);
    message = message.replace('{component}', getRandomElementAccount(components));
    message = message.replace('{year}', getRandomElementAccount(years));
    message = message.replace('{vin}', Math.floor(getRandom() * 9000) + 1000);
    
    // Replace {name} - check if it's a competitor context first
    // Use replaceAll to handle multiple instances, but each template should only have one
    if (message.includes('Competitor') || message.includes('detected at')) {
      message = message.replace(/{name}/g, competitorName);
    } else {
      message = message.replace(/{name}/g, customerName);
    }
    
    // Generate time
    const minutesAgo = Math.floor(getRandom() * 1440) + 1; // 1-1440 minutes (24 hours)
    let timeStr;
    if (minutesAgo === 1) timeStr = '1 min ago';
    else if (minutesAgo < 60) timeStr = `${minutesAgo} min ago`;
    else if (minutesAgo < 120) timeStr = '1 hour ago';
    else if (minutesAgo < 1440) timeStr = `${Math.floor(minutesAgo / 60)} hours ago`;
    else timeStr = '1 day ago';
    
    const urgent = type === 'alert' || (type === 'info' && getRandom() > 0.5);
    
    return {
      id: i + 1,
      type: type,
      message: message,
      time: timeStr,
      urgent: urgent
    };
  });
};

export const ACTIVITY_FEED = generateActivityFeed(5);

// Export the generator for creating account-specific activity feeds
export { generateActivityFeed };

// Account-specific data with different customer counts and characteristics
export const ACCOUNT_DATA = {
  'prestige-toyota': {
    name: 'Prestige Toyota',
    customers: generateCustomers(50).map(customer => ({
      ...customer,
      status: customer.status === 'Ownership Change' ? 'Service declined' : customer.status
    })),
    campaigns: generateCampaigns(4),
    activityFeed: generateActivityFeed(5)
  },
  'luxury-honda': {
    name: 'Luxury Honda',
    customers: generateCustomers(35).map(customer => ({
      ...customer,
      status: customer.status === 'Ownership Change' ? 'Service declined' : customer.status
    })),
    campaigns: generateCampaigns(6),
    activityFeed: generateActivityFeed(5)
  },
  'elite-ford': {
    name: 'Elite Ford',
    customers: generateCustomers(62).map(customer => ({
      ...customer,
      status: customer.status === 'Ownership Change' ? 'Service declined' : customer.status
    })),
    campaigns: generateCampaigns(3),
    activityFeed: generateActivityFeed(5)
  },
  'stephen-wade-group': {
    name: 'Stephen Wade Nissan',
    // Real DMS data is loaded via the backend API; customers array is empty for this account.
    customers: [],
    campaigns: generateCampaigns(4),
    activityFeed: generateActivityFeed(5)
  }
};

