require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("./config/db");
const User = require("./models/User");
const Lead = require("./models/Lead");
const Task = require("./models/Task");
const Activity = require("./models/Activity");
const { ROLES } = require("./constants/Roles");
const { STAGES } = require("./constants/Stages");
const { TASK_TYPES, TASK_PRIORITIES, TASK_STATUSES } = require("./constants/Tasks");
const { getRates, convertToBase } = require("./utils/ExchangeRateService");

async function upsertUser({ name, email, password, role }) {
  let user = await User.findOne({ email });
  if (!user) {
    user = await User.create({ name, email, password, role });
  }
  return user;
}

async function seed() {
  const shouldReset = process.argv.includes("--reset");
  await connectDB();

  if (shouldReset) {
    await Promise.all([
      Activity.deleteMany({}),
      Task.deleteMany({}),
      Lead.deleteMany({}),
    ]);
    console.log("Cleared existing leads, tasks, and activities.");
  }

  const admin = await upsertUser({
    name: "Test Admin",
    email: "testadmin@goatleads.com",
    password: process.env.SEED_ADMIN_PASSWORD || "Admin123!",
    role: ROLES.ADMIN,
  });

  const rep1 = await upsertUser({
    name: "Alex Morgan",
    email: "alex.rep@goatleads.com",
    password: process.env.SEED_REP_PASSWORD || "Rep123!",
    role: ROLES.REP,
  });

  const rep2 = await upsertUser({
    name: "Priya Kapoor",
    email: "priya.rep@goatleads.com",
    password: process.env.SEED_REP_PASSWORD || "Rep123!",
    role: ROLES.REP,
  });

  const existingLeadCount = await Lead.countDocuments();
  if (existingLeadCount > 0 && !shouldReset) {
    console.log(
      `Database already has ${existingLeadCount} lead(s). Pass --reset to re-seed sample leads/tasks.`
    );
    await mongoose.disconnect();
    return;
  }

  const rates = await getRates();

  const sampleLeads = [
    {
      name: "Aarav Sharma",
      company: "FinStack Technologies",
      email: "aarav.sharma@finstack.in",
      phone: "+91-98201-44510",
      country: "India",
      currency: "INR",
      amount: 1250000,
      stage: STAGES.NEW,
      owner: rep2._id,
    },
    {
      name: "Emily Carter",
      company: "NorthStar Cloud Inc",
      email: "emily.carter@northstarcloud.com",
      phone: "+1-415-890-2311",
      country: "USA",
      currency: "USD",
      amount: 45000,
      stage: STAGES.CONTACTED,
      owner: rep1._id,
    },
    {
      name: "Oliver Bennett",
      company: "Thames Analytics Ltd",
      email: "oliver@thamesanalytics.co.uk",
      phone: "+44-20-7946-0912",
      country: "UK",
      currency: "GBP",
      amount: 28000,
      stage: STAGES.QUALIFIED,
      owner: admin._id,
    },
    {
      name: "Liam Tremblay",
      company: "MapleOps Solutions",
      email: "liam.tremblay@mapleops.ca",
      phone: "+1-416-555-0184",
      country: "Canada",
      currency: "CAD",
      amount: 32000,
      stage: STAGES.PROPOSAL_SENT,
      owner: rep1._id,
    },
    {
      name: "Fatima Al Mansoori",
      company: "DesertGrid Systems",
      email: "fatima@desertgrid.ae",
      phone: "+971-50-442-8891",
      country: "UAE",
      currency: "AED",
      amount: 140000,
      stage: STAGES.NEGOTIATION,
      owner: admin._id,
    },
    {
      name: "Priya Nair",
      company: "Kovai Logistics Pvt Ltd",
      email: "priya.nair@kovailogistics.in",
      phone: "+91-98450-77219",
      country: "India",
      currency: "INR",
      amount: 850000,
      stage: STAGES.IN_CONTRACT_REVIEW,
      owner: rep2._id,
    },
    {
      name: "Marcus Vance",
      company: "Apex Retail Group",
      email: "m.vance@apexretail.com",
      phone: "+1-312-555-0147",
      country: "USA",
      currency: "USD",
      amount: 68000,
      stage: STAGES.CLOSED_WON,
      owner: rep1._id,
    },
    {
      name: "Sophia Wright",
      company: "Britannia Health Tech",
      email: "sophia@britanniahealth.co.uk",
      phone: "+44-20-7946-0432",
      country: "UK",
      currency: "GBP",
      amount: 41500,
      stage: STAGES.CLOSED_WON,
      owner: admin._id,
    },
    {
      name: "Noah MacLeod",
      company: "Aurora Mining Corp",
      email: "nmacleod@auroramining.ca",
      phone: "+1-604-555-0192",
      country: "Canada",
      currency: "CAD",
      amount: 54000,
      stage: STAGES.CLOSED_LOST,
      lostReason: "Price too high / Budget constraints",
      owner: rep1._id,
    },
    {
      name: "Zayed Al Nahyan",
      company: "Oasis Ventures LLC",
      email: "zayed@oasisventures.ae",
      phone: "+971-52-910-3345",
      country: "UAE",
      currency: "AED",
      amount: 95000,
      stage: STAGES.CLOSED_LOST,
      lostReason: "Competitor chosen",
      owner: rep2._id,
    },
  ].map((l) => ({
    ...l,
    amountBase: convertToBase(l.amount, l.currency, rates),
  }));

  const createdLeads = await Lead.insertMany(sampleLeads);

  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  const sampleTasks = [
    {
      title: "Follow up on redlined MSA",
      type: TASK_TYPES.CALL,
      lead: createdLeads[5]._id,
      assignedTo: admin._id,
      dueDate: new Date(now - 5 * hour), // overdue
      priority: TASK_PRIORITIES.HIGH,
      status: TASK_STATUSES.PENDING,
      notes: "Legal asked for SLA addendum.",
    },
    {
      title: "Send updated proposal deck",
      type: TASK_TYPES.EMAIL,
      lead: createdLeads[3]._id,
      assignedTo: admin._id,
      dueDate: new Date(now + 4 * hour), // due today
      priority: TASK_PRIORITIES.HIGH,
      status: TASK_STATUSES.PENDING,
      notes: "Include annual enterprise discount.",
    },
    {
      title: "Product walkthrough & security Q&A",
      type: TASK_TYPES.DEMO,
      lead: createdLeads[2]._id,
      assignedTo: admin._id,
      dueDate: new Date(now + 3 * day), // upcoming
      priority: TASK_PRIORITIES.MEDIUM,
      status: TASK_STATUSES.PENDING,
    },
    {
      title: "Introductory discovery call",
      type: TASK_TYPES.CALL,
      lead: createdLeads[1]._id,
      assignedTo: rep1._id,
      dueDate: new Date(now - 1 * day),
      priority: TASK_PRIORITIES.MEDIUM,
      status: TASK_STATUSES.COMPLETED,
      completedAt: new Date(now - 12 * hour),
    },
  ];

  await Task.insertMany(sampleTasks);

  const sampleActivities = createdLeads.flatMap((lead) => [
    {
      lead: lead._id,
      user: lead.owner,
      type: "lead_created",
      content: `Lead created in stage "${lead.stage}"`,
      metadata: { stage: lead.stage },
    },
  ]);

  sampleActivities.push(
    {
      lead: createdLeads[4]._id,
      user: admin._id,
      type: "call",
      content: "Spoke with Fatima about multi-region deployment timeline. Target sign-off next Friday.",
    },
    {
      lead: createdLeads[5]._id,
      user: rep2._id,
      type: "note",
      content: "Procurement requested net-30 payment terms and ISO 27001 certificate.",
    }
  );

  await Activity.insertMany(sampleActivities);

  console.log(
    `Seeded 3 users, ${createdLeads.length} leads, ${sampleTasks.length} tasks, and ${sampleActivities.length} activities.`
  );
  console.log("Demo Admin: testadmin@goatleads.com / Admin123!");
  await mongoose.disconnect();
}

seed().catch(async (err) => {
  console.error("Seed error:", err);
  await mongoose.disconnect();
  process.exit(1);
});

