const cron = require("node-cron");
const Task = require("../models/Task");
const sendEmail = require("../utils/SendEmail");
const { TASK_STATUSES } = require("../constants/Tasks");

/**
 * Checks for upcoming or overdue pending tasks and sends reminder emails
 * to the assigned sales reps.
 */
const sendDueReminders = async () => {
  try {
    // Look ahead 24 hours: remind for tasks due now or within the next 24 hours
    const windowEnd = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const pendingTasks = await Task.find({
      status: TASK_STATUSES.PENDING,
      reminderSent: false,
      dueDate: { $lte: windowEnd },
    })
      .populate("lead", "name company email phone")
      .populate("assignedTo", "name email");

    if (pendingTasks.length === 0) {
      return { sentCount: 0 };
    }

    let sentCount = 0;

    for (const task of pendingTasks) {
      if (!task.assignedTo || !task.assignedTo.email) {
        continue;
      }

      const repEmail = task.assignedTo.email;
      const repName = task.assignedTo.name || "Sales Rep";
      const leadName = task.lead ? task.lead.name : "N/A";
      const company = task.lead && task.lead.company ? task.lead.company : "N/A";
      const formattedDue = new Date(task.dueDate).toLocaleString();

      const subject = `[GoatLeads Reminder] Task Due: "${task.title}"`;

      const text = `Hi ${repName},

This is a reminder that you have a follow-up task due on GoatLeads:

Task: ${task.title}
Type: ${task.type.toUpperCase()}
Priority: ${task.priority.toUpperCase()}
Due Date: ${formattedDue}
Lead: ${leadName} (${company})
${task.notes ? `Notes: ${task.notes}\n` : ""}

Please make sure to follow up and update the task status in GoatLeads.

Best regards,
GoatLeads CRM System`;

      const html = `
        <div style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px;">
          <h2 style="color: #2563eb;">Task Follow-up Reminder</h2>
          <p>Hi <strong>${repName}</strong>,</p>
          <p>You have an upcoming or due task on GoatLeads:</p>
          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 0; font-weight: bold; width: 120px;">Task:</td>
              <td style="padding: 8px 0;">${task.title}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 0; font-weight: bold;">Lead:</td>
              <td style="padding: 8px 0;">${leadName} (${company})</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 0; font-weight: bold;">Type:</td>
              <td style="padding: 8px 0;">${task.type.toUpperCase()}</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 0; font-weight: bold;">Priority:</td>
              <td style="padding: 8px 0;"><span style="color: ${task.priority === "high" ? "#dc2626" : "#2563eb"}; font-weight: bold;">${task.priority.toUpperCase()}</span></td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 0; font-weight: bold;">Due Date:</td>
              <td style="padding: 8px 0;">${formattedDue}</td>
            </tr>
            ${task.notes ? `
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 8px 0; font-weight: bold;">Notes:</td>
              <td style="padding: 8px 0;">${task.notes}</td>
            </tr>` : ""}
          </table>
          <p style="margin-top: 20px; font-size: 13px; color: #6b7280;">
            This is an automated notification from your GoatLeads CRM.
          </p>
        </div>
      `;

      try {
        await sendEmail({
          to: repEmail,
          subject,
          text,
          html,
        });

        // Mark reminder as sent so the rep is only notified once
        task.reminderSent = true;
        await task.save();
        sentCount++;
      } catch (emailErr) {
        console.error(`Failed to send reminder email for task ${task._id}:`, emailErr);
      }
    }

    return { sentCount };
  } catch (err) {
    console.error("sendDueReminders cron job error:", err);
    return { error: err.message };
  }
};

/**
 * Initializes the cron schedule (runs every 15 minutes)
 */
const initTaskReminderJob = () => {
  // Cron syntax: "*/15 * * * *" = every 15 minutes
  cron.schedule("*/15 * * * *", async () => {
    console.log("[CRON] Running task reminder job...");
    const result = await sendDueReminders();
    if (result.sentCount > 0) {
      console.log(`[CRON] Sent ${result.sentCount} task reminder email(s).`);
    }
  });

  console.log("Task reminder background cron job scheduled (every 15 mins).");
};

module.exports = {
  initTaskReminderJob,
  sendDueReminders,
};
