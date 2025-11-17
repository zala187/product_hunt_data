export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        if (url.pathname === "/") {
            return new Response("Worker Running");
        }

        // Manual trigger (optional)
        if (url.pathname === "/fetch-products") {
            await fetchMonthlyData(env);
            return new Response("Monthly Data Fetched & Saved", { status: 200 });
        }
  if (url.pathname === "/products") {
      const { results } = await env.products_db
        .prepare("SELECT * FROM products ORDER BY votes DESC")
        .all();

      return new Response(JSON.stringify(results), {
        headers: { "Content-Type": "application/json" }
      });
    }
        // Get Monthly products (Fix: Using /monthly route and monthly_products table)
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

        
        // Handle OPTIONS request for CORS
        if (request.method === "OPTIONS") {
             return new Response(null, {
                headers: {
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
                    "Access-Control-Allow-Headers": "Content-Type",
                    "Access-Control-Max-Age": "86400"
                }
            });
        }


        return new Response("404 Not Found", { status: 404 });
    },

    async scheduled(event, env, ctx) {
        console.log("📅 Monthly Cron Trigger Fired");
        // Ensure that the fetch operation is waited for or runs in the background
        ctx.waitUntil(fetchMonthlyData(env));
    }
};


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
            posts(first: 50) {
              edges {
                node {
                  name
                  tagline
                  description
                  url
                  votesCount
                  createdAt
                }
              }
            }
          }
        `
      })
    });

    const result = await response.json();

    const posts = result.data.posts.edges.map(edge => ({
      name: edge.node.name,
      description: edge.node.description || edge.node.tagline,
      url: edge.node.url,
      votes: edge.node.votesCount,
      created_at: edge.node.createdAt
    }));

    console.log("🔥 Fetched Posts Count:", posts.length);

    await env.products_db.prepare("DELETE FROM monthly_products").run();

    const insert = env.products_db.prepare(
      "INSERT INTO monthly_products (name, description, url, votes, created_at) VALUES (?, ?, ?, ?, ?)"
    );

    for (const p of posts) {
      await insert.bind(p.name, p.description, p.url, p.votes, p.created_at).run();
    }

    console.log("✅ Monthly data inserted");
  } catch (err) {
    console.error("❌ Error:", err);
  }
}
