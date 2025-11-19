export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Root
    if (url.pathname === "/") {
      return new Response("Worker Running");
    }

    // Manual trigger for monthly data
    if (url.pathname === "/fetch-products") {
      await fetchMonthlyData(env);
      return new Response("Monthly Products Fetched & Saved", { status: 200 });
    }

    // Save monthly data into KV
    if (url.pathname === "/monthly-kv") { 
      try {
        // Fetch latest month from monthly_products
        const results = await env.products_db
          .prepare("SELECT * FROM monthly_products ORDER BY created_at DESC")
          .all();

        // Previous month key
        const now = new Date();
        let year = now.getFullYear();
        let month = now.getMonth(); // 0=Jan
        if (month === 0) {
          month = 12
          year = year - 1;
        }
        const monthKey = `${year}-${String(month).padStart(2, "0")}`;

        await env.KV.put(monthKey, JSON.stringify(results.results));

        return new Response(`Saved ${monthKey} monthly data in KV successfully`, { status: 200 });

      } catch (err) {
        return new Response("Error saving monthly data to KV: " + err.message, {
          status: 500
        });
      }
    }

    // Get monthly data
     if (url.pathname === "/monthly") {
  try {
    const { results } = await env.products_db
      .prepare("SELECT * FROM monthly_products ORDER BY id DESC;")
      .all();

    return new Response(JSON.stringify(results), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (error) {
    return new Response("Error fetching monthly data: " + error.message, {
      status: 500,
      headers: {
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}

    // Get latest data
    if (url.pathname === "/latest") {
      try {
        const { results } = await env.products_db
          .prepare("SELECT * FROM latest_products ORDER BY created_at DESC")
          .all();
        return new Response(JSON.stringify(results), {
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      } catch (err) {
        return new Response("Error fetching latest products: " + err.message, { status: 500, headers: { "Access-Control-Allow-Origin": "*" } });
      }
    }

    // List all months
    if (url.pathname === "/all") {
      try {
        const result = await env.products_db.prepare(
          "SELECT DISTINCT strftime('%Y-%m', created_at) AS month FROM monthly_products ORDER BY month DESC"
        ).all();

        const months = result.results.map(row => row.month);

        return new Response(JSON.stringify(months), {
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });

      } catch (error) {
        return new Response(JSON.stringify({
          error: "Failed to fetch months",
          details: error.message
        }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400"
        }
      });
    }

    return new Response("404 Not Found", { status: 404 });
  },

  // Cron Trigger for automation
  async scheduled(event, env, ctx) {
    console.log("📅 Cron Trigger Fired");
    ctx.waitUntil(fetchMonthlyData(env));
    ctx.waitUntil(fetchLatestData(env));
  }
};

// ---------------- Fetch Previous Month Top 10 ----------------

async function fetchMonthlyData(env) {
  try {
    const response = await fetch("https://api.producthunt.com/v2/api/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer 5a6jRWUyPUg0fCUCmJ7r6Qq66FgnLJupWMMyqhSDdsY"
      },
      body: JSON.stringify({
        query: `
          query {
            posts(first: 100) {
              edges {
                node {
                 id
                  name
                  slug
                  tagline
                  description
                  url
                  votesCount
                  createdAt
                  makers {
                    name
                  }
                }
              }
            }
          }
        `
      })
    });

    const result = await response.json();

    const posts = result.data.posts.edges.map(edge => ({
       id: edge.node.id,
      name: edge.node.name || "",
      slug: edge.node.slug || "",
      tagline: edge.node.tagline || "",
      description: edge.node.description || edge.node.tagline || "",
      url: edge.node.url || "",
      votes: edge.node.votesCount || 0,
      created_at: edge.node.createdAt || new Date().toISOString(),
      makers: edge.node.makers && edge.node.makers.length > 0
        ? edge.node.makers.map(m => m.name).join(", ")
        : ""
    }));

    console.log("🔥 Fetched Posts Count:", posts.length);

    await env.products_db.prepare("DELETE FROM monthly_products").run();

    const insert = env.products_db.prepare(
      "INSERT INTO monthly_products (id,name,slug,tagline,description,url,votes,created_at,makers) VALUES (? , ?, ?, ?, ? , ? , ? , ? , ?)"
    );

    for (const p of posts) {
      await insert.bind(p.id, p.name, p.slug, p.tagline, p.description, p.url, p.votes, p.created_at, p.makers).run();
    }

    console.log("✅ Monthly data inserted");
  } catch (err) {
    console.error("❌ Error:", err);
  }
}


// ---------------- Fetch Latest ----------------
async function fetchLatestData(env) {
  try {
    const response = await fetch("https://api.producthunt.com/v2/api/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer 5a6jRWUyPUg0fCUCmJ7r6Qq66FgnLJupWMMyqhSDdsY"
      },
      body: JSON.stringify({
        query: `
          query {
            posts(first: 100) {
              edges {
                node {
                  id
                  name
                  slug
                  tagline
                  description
                  url
                  votesCount
                  createdAt
                  makers {
                    name
                  }
                }
              }
            }
          }
        `
      })
    });

    const result = await response.json();

    const posts = result.data.posts.edges.map(edge => ({
      id: edge.node.id,
      name: edge.node.name || "",
      slug: edge.node.slug || "",
      tagline: edge.node.tagline || "",
      description: edge.node.description || edge.node.tagline || "",
      url: edge.node.url || "",
      votes: edge.node.votesCount || 0,
      created_at: edge.node.createdAt || new Date().toISOString(),
      makers: edge.node.makers && edge.node.makers.length > 0
        ? edge.node.makers.map(m => m.name).join(", ")
        : ""
    }));

    // Clear latest_products table
    await env.products_db.prepare("DELETE FROM latest_products").run();

    const insert = env.products_db.prepare(
      "INSERT INTO latest_products (id,name,slug,tagline,description,url,votes,created_at,makers) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );

    for (const p of posts) {
      await insert.bind(
        p.id, p.name, p.slug, p.tagline, p.description, p.url, p.votes, p.created_at, p.makers
      ).run();
    }

    console.log("✅ Latest data inserted");
  } catch (err) {
    console.error("❌ Error in fetchLatestData:", err);
  }
}
