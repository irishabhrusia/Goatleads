const assert = require("node:assert/strict");

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000/api";

async function request(path, { method = "GET", token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runTests() {
  console.log(`Running GoatLeads API smoke tests against ${BASE_URL}...\n`);
  let passed = 0;
  let createdLeadId = null;
  let token = null;

  async function test(name, fn) {
    try {
      await fn();
      passed++;
      console.log(`PASS  ${name}`);
    } catch (err) {
      console.error(`FAIL  ${name}: ${err.message}`);
      throw err;
    }
  }

  try {
    await test("GET /api/health", async () => {
      const { status, data } = await request("/health");
      assert.equal(status, 200);
      assert.equal(data.success, true);
    });

    const uniqueEmail = `apitest_${Date.now()}@goatleads.com`;
    await test("POST /api/auth/register & GET /api/auth/me", async () => {
      const reg = await request("/auth/register", {
        method: "POST",
        body: {
          name: "API Test User",
          email: uniqueEmail,
          password: "TestPassword123!",
        },
      });
      assert.equal(reg.status, 201);
      assert.ok(reg.data.token);
      token = reg.data.token;

      const me = await request("/auth/me", { token });
      assert.equal(me.status, 200);
      assert.equal(me.data.user.email, uniqueEmail);
    });

    await test("POST /api/leads & GET /api/leads/:id", async () => {
      const created = await request("/leads", {
        method: "POST",
        token,
        body: {
          name: "Smoke Test Prospect",
          company: "TestCorp",
          email: "prospect@testcorp.com",
          phone: "+91-9876543210",
          country: "India",
          currency: "INR",
          amount: 100000,
          stage: "New",
        },
      });
      assert.equal(created.status, 201);
      assert.ok(created.data.lead?._id);
      assert.ok(created.data.lead.amountBase > 0);
      createdLeadId = created.data.lead._id;

      const fetched = await request(`/leads/${createdLeadId}`, { token });
      assert.equal(fetched.status, 200);
      assert.equal(fetched.data.lead.name, "Smoke Test Prospect");
    });

    await test("PATCH /api/leads/:id/stage (Closed Lost validation & move)", async () => {
      const bad = await request(`/leads/${createdLeadId}/stage`, {
        method: "PATCH",
        token,
        body: { stage: "Closed Lost", lostReason: "" },
      });
      assert.equal(bad.status, 400);

      const good = await request(`/leads/${createdLeadId}/stage`, {
        method: "PATCH",
        token,
        body: { stage: "Qualified" },
      });
      assert.equal(good.status, 200);
      assert.equal(good.data.lead.stage, "Qualified");
    });

    await test("POST & GET /api/leads/:id/activities", async () => {
      const addNote = await request(`/leads/${createdLeadId}/activities`, {
        method: "POST",
        token,
        body: { type: "note", content: "Confirmed Q4 budget on discovery call." },
      });
      assert.equal(addNote.status, 201);

      const list = await request(`/leads/${createdLeadId}/activities`, { token });
      assert.equal(list.status, 200);
      assert.ok(list.data.activities.length >= 2);
    });

    await test("GET /api/leads/:id/health & POST /api/leads/:id/copilot", async () => {
      const health = await request(`/leads/${createdLeadId}/health`, { token });
      assert.equal(health.status, 200);
      assert.equal(typeof health.data.health?.score, "number");

      const copilot = await request(`/leads/${createdLeadId}/copilot`, {
        method: "POST",
        token,
        body: { mode: "email" },
      });
      assert.equal(copilot.status, 200);
      assert.ok(copilot.data.draft?.body);
    });

    await test("Tasks CRUD & Status Toggle", async () => {
      const created = await request("/tasks", {
        method: "POST",
        token,
        body: {
          title: "Send API smoke test proposal",
          lead: createdLeadId,
          dueDate: new Date(Date.now() + 86400000).toISOString(),
          type: "email",
          priority: "high",
        },
      });
      assert.equal(created.status, 201);
      const taskId = created.data.task._id;

      const toggled = await request(`/tasks/${taskId}/status`, {
        method: "PATCH",
        token,
        body: { status: "completed" },
      });
      assert.equal(toggled.status, 200);
      assert.equal(toggled.data.task.status, "completed");

      const deleted = await request(`/tasks/${taskId}`, {
        method: "DELETE",
        token,
      });
      assert.equal(deleted.status, 200);
    });

    await test("Dashboard endpoints & live rates", async () => {
      const endpoints = [
        "/dashboard/summary",
        "/dashboard/by-stage",
        "/dashboard/by-country",
        "/dashboard/lost-reasons",
        "/dashboard/rep-performance",
        "/dashboard/rates",
      ];
      for (const ep of endpoints) {
        const { status, data } = await request(ep, { token });
        assert.equal(status, 200, `${ep} failed`);
        assert.equal(data.success, true);
      }
    });

    console.log(`\nAll ${passed} API test suites passed.`);
  } finally {
    if (createdLeadId && token) {
      await request(`/leads/${createdLeadId}`, { method: "DELETE", token }).catch(
        () => {}
      );
    }
  }
}

runTests().catch((err) => {
  if (err?.cause?.code === "ECONNREFUSED") {
    console.error(
      `\nCould not connect to ${BASE_URL}. Start the backend server first (npm run dev).`
    );
  }
  process.exit(1);
});

