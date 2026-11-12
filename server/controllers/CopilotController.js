const mongoose = require("mongoose");
const Lead = require("../models/Lead");
const Task = require("../models/Task");
const Activity = require("../models/Activity");
const { STAGES } = require("../constants/Stages");
const { TASK_STATUSES } = require("../constants/Tasks");

const STAGE_NEXT_ACTIONS = {
  [STAGES.NEW]: "Verify decision-maker contact info and schedule an introductory discovery call.",
  [STAGES.CONTACTED]: "Run qualification questions (budget, authority, need, timeline) and log call notes.",
  [STAGES.QUALIFIED]: "Prepare a tailored solution scope and send a formal proposal.",
  [STAGES.PROPOSAL_SENT]: "Follow up on proposal feedback and confirm key stakeholder alignment.",
  [STAGES.NEGOTIATION]: "Address pricing/terms questions and align on target close date.",
  [STAGES.IN_CONTRACT_REVIEW]: "Coordinate with legal/procurement to clear final redlines and obtain signature.",
  [STAGES.CLOSED_WON]: "Send onboarding kickoff welcome note and hand off to customer success.",
  [STAGES.CLOSED_LOST]: "Document post-mortem learnings and schedule a future nurture check-in.",
};

function computeDealHealth(lead, tasks, activities) {
  if (lead.stage === STAGES.CLOSED_WON) {
    return {
      score: 100,
      status: "Closed Won",
      signals: [
        { type: "positive", text: "Deal successfully closed and won." },
      ],
      nextBestAction: STAGE_NEXT_ACTIONS[STAGES.CLOSED_WON],
    };
  }

  if (lead.stage === STAGES.CLOSED_LOST) {
    return {
      score: 0,
      status: "Closed Lost",
      signals: [
        {
          type: "risk",
          text: lead.lostReason
            ? `Closed Lost: ${lead.lostReason}`
            : "Deal marked as Closed Lost.",
        },
      ],
      nextBestAction: STAGE_NEXT_ACTIONS[STAGES.CLOSED_LOST],
    };
  }

  let score = 50;
  const signals = [];
  const now = Date.now();

  // 1. Contact completeness
  if (lead.email && lead.phone) {
    score += 10;
    signals.push({ type: "positive", text: "Complete contact details (email & phone)." });
  } else if (!lead.email && !lead.phone) {
    score -= 15;
    signals.push({ type: "risk", text: "Missing both email and phone number." });
  } else {
    signals.push({ type: "neutral", text: "Add missing email or phone for multi-channel outreach." });
  }

  // 2. Stage momentum
  const stageWeights = {
    [STAGES.NEW]: 0,
    [STAGES.CONTACTED]: 5,
    [STAGES.QUALIFIED]: 10,
    [STAGES.PROPOSAL_SENT]: 15,
    [STAGES.NEGOTIATION]: 20,
    [STAGES.IN_CONTRACT_REVIEW]: 25,
  };
  score += stageWeights[lead.stage] || 0;

  // 3. Task discipline
  const pendingTasks = tasks.filter((t) => t.status === TASK_STATUSES.PENDING);
  const overdueTasks = pendingTasks.filter(
    (t) => new Date(t.dueDate).getTime() < now
  );

  if (pendingTasks.length === 0) {
    score -= 15;
    signals.push({ type: "risk", text: "No upcoming follow-up task scheduled." });
  } else {
    score += 10;
    signals.push({
      type: "positive",
      text: `${pendingTasks.length} active follow-up task${pendingTasks.length > 1 ? "s" : ""} scheduled.`,
    });
  }

  if (overdueTasks.length > 0) {
    score -= Math.min(25, overdueTasks.length * 12);
    signals.push({
      type: "risk",
      text: `${overdueTasks.length} overdue task${overdueTasks.length > 1 ? "s" : ""} need immediate action.`,
    });
  }

  // 4. Activity recency & engagement
  const lastActivityAt = activities[0]?.createdAt || lead.updatedAt || lead.createdAt;
  const daysSinceTouch = Math.floor(
    (now - new Date(lastActivityAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysSinceTouch >= 7) {
    score -= 15;
    signals.push({
      type: "risk",
      text: `Stale deal: ${daysSinceTouch} days since last logged update.`,
    });
  } else if (activities.length >= 2) {
    score += 10;
    signals.push({
      type: "positive",
      text: `Active engagement (${activities.length} timeline events).`,
    });
  }

  const clamped = Math.max(5, Math.min(99, score));
  const status =
    clamped >= 75 ? "Healthy" : clamped >= 45 ? "Needs Attention" : "At Risk";

  const nextBestAction =
    overdueTasks.length > 0
      ? `Complete overdue task "${overdueTasks[0].title}" first.`
      : pendingTasks.length === 0
      ? `Schedule a follow-up task and ${STAGE_NEXT_ACTIONS[lead.stage].toLowerCase()}`
      : STAGE_NEXT_ACTIONS[lead.stage] || "Follow up with the prospect.";

  return { score: clamped, status, signals, nextBestAction };
}

function buildTemplateDraft(lead, tasks, activities, mode) {
  const firstName = (lead.name || "there").split(" ")[0];
  const company = lead.company || "your team";
  const formattedValue = `${lead.currency} ${Number(lead.amount || 0).toLocaleString("en-US")}`;
  const recentNote = activities.find((a) =>
    ["note", "call", "email", "meeting"].includes(a.type)
  );
  const nextTask = tasks.find((t) => t.status === TASK_STATUSES.PENDING);

  if (mode === "call") {
    return {
      subject: `Call Agenda — ${lead.name} (${company})`,
      body: [
        `1. Opener & Context: Greet ${firstName} (${lead.country} / ${lead.stage} stage, ${formattedValue}).`,
        recentNote
          ? `2. Recap Last Touchpoint: "${recentNote.content}"`
          : `2. Discovery Check-In: Confirm current priorities and decision timeline at ${company}.`,
        `3. Stage Goal (${lead.stage}): ${STAGE_NEXT_ACTIONS[lead.stage] || "Align on next steps."}`,
        nextTask
          ? `4. Commit Next Step: Confirm "${nextTask.title}" (due ${new Date(nextTask.dueDate).toLocaleDateString()}).`
          : `4. Commit Next Step: Agree on concrete follow-up date and stakeholder review.`,
      ].join("\n"),
      source: "template",
    };
  }

  const stageLineMap = {
    [STAGES.NEW]: `I wanted to briefly introduce myself and learn more about how ${company} is currently approaching your upcoming initiatives.`,
    [STAGES.CONTACTED]: `Thanks for connecting earlier! I'd love to schedule 15 minutes to understand your priorities and see how we can support ${company}.`,
    [STAGES.QUALIFIED]: `Following our qualification conversation, I'm putting together our tailored recommendation (${formattedValue}) for ${company}.`,
    [STAGES.PROPOSAL_SENT]: `Checking in on the proposal we shared for ${company} (${formattedValue}). Happy to walk your team through any questions on scope or pricing.`,
    [STAGES.NEGOTIATION]: `Thank you for the constructive feedback on terms. I've summarized the agreed scope (${formattedValue}) so we can finalize things smoothly.`,
    [STAGES.IN_CONTRACT_REVIEW]: `Touching base to see if your legal or procurement team needs any additional details from our side to complete contract review.`,
  };

  const contextParagraph = recentNote
    ? `Recapping our last note ("${recentNote.content}"), `
    : "";

  return {
    subject: `Next steps for ${company} x GoatLeads`,
    body: `Hi ${firstName},\n\n${contextParagraph}${
      stageLineMap[lead.stage] ||
      `I wanted to follow up regarding our active discussion with ${company}.`
    }\n\nAre you available for a quick 15-minute sync later this week to align on next steps?\n\nBest regards`,
    source: "template",
  };
}

async function generateWithGemini(lead, tasks, activities, mode) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const recentEvents = activities
    .slice(0, 5)
    .map((a) => `- [${a.type}] ${a.content}`)
    .join("\n");
  const pendingTasks = tasks
    .filter((t) => t.status === TASK_STATUSES.PENDING)
    .slice(0, 3)
    .map((t) => `- ${t.title} (due ${new Date(t.dueDate).toISOString()})`)
    .join("\n");

  const prompt = [
    `You are an enterprise B2B sales copilot inside GoatLeads CRM.`,
    `Lead: ${lead.name}, Company: ${lead.company || "N/A"}, Country: ${lead.country}, Deal: ${lead.currency} ${lead.amount} (USD ${lead.amountBase}), Stage: ${lead.stage}.`,
    recentEvents ? `Recent activity:\n${recentEvents}` : "No recent activity logged.",
    pendingTasks ? `Pending tasks:\n${pendingTasks}` : "No pending tasks.",
    mode === "call"
      ? `Write a concise 4-bullet call preparation script/agenda. Return JSON with keys "subject" and "body".`
      : `Write a crisp, personalized follow-up email (under 130 words). Return JSON with keys "subject" and "body".`,
  ].join("\n\n");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    }
  );

  if (!res.ok) return null;
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) return null;

  const parsed = JSON.parse(text);
  if (!parsed?.body) return null;

  return {
    subject: parsed.subject || `Follow up with ${lead.name}`,
    body: parsed.body,
    source: "gemini",
  };
}

/**
 * GET /api/leads/:id/health
 */
const getLeadHealth = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid lead ID." });
    }

    const lead = await Lead.findById(id).lean();
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found." });
    }

    const [tasks, activities] = await Promise.all([
      Task.find({ lead: id }).sort({ dueDate: 1 }).lean(),
      Activity.find({ lead: id }).sort({ createdAt: -1 }).limit(20).lean(),
    ]);

    const health = computeDealHealth(lead, tasks, activities);
    res.json({ success: true, health });
  } catch (err) {
    console.error("getLeadHealth error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

/**
 * POST /api/leads/:id/copilot
 */
const generateCopilotDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const mode = req.body?.mode === "call" ? "call" : "email";

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, message: "Invalid lead ID." });
    }

    const lead = await Lead.findById(id).lean();
    if (!lead) {
      return res.status(404).json({ success: false, message: "Lead not found." });
    }

    const [tasks, activities] = await Promise.all([
      Task.find({ lead: id }).sort({ dueDate: 1 }).lean(),
      Activity.find({ lead: id }).sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    let draft = null;
    try {
      draft = await generateWithGemini(lead, tasks, activities, mode);
    } catch {
      draft = null;
    }

    if (!draft) {
      draft = buildTemplateDraft(lead, tasks, activities, mode);
    }

    res.json({ success: true, draft });
  } catch (err) {
    console.error("generateCopilotDraft error:", err);
    res.status(500).json({ success: false, message: "Server error." });
  }
};

module.exports = {
  getLeadHealth,
  generateCopilotDraft,
};

