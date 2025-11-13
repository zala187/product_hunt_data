export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ✅ Test route
    if (url.pathname === "/") {
      return new Response("✅ Cloudflare D1 connected successfully!");
    }

    // 🧠 Fetch top products from Product Hunt & store in D1
    if (url.pathname === "/fetch-products") {
      const API_URL = "https://api.producthunt.com/v2/api/graphql";
      const API_TOKEN = "pPq3w1NTKZ4bQ2n4A1uukortnOlQNXdZjETcC7qf1Sk"; // 🔁 Replace this with your real token

      const query = `
        {
          posts(order: VOTES, first: 5) {
            edges {
              node {
                name
                tagline
                votesCount
                url
              }
            }
          }
        }
      `;

      try {
        const response = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${API_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ query }),
        });

        const data = await response.json();

        // 🧾 Extract top products
        const posts = data?.data?.posts?.edges || [];

        if (!posts.length) {
          return new Response("⚠️ No products found from Product Hunt", { status: 404 });
        }

        // 💾 Save each product in D1 database
        for (const { node } of posts) {
          await env.products_db
            .prepare(
              "INSERT INTO products (name, tagline, votes, url) VALUES (?, ?, ?, ?)"
            )
            .bind(node.name, node.tagline, node.votesCount, node.url)
            .run();
        }

        return new Response(
          JSON.stringify(
            { message: "Products added successfully", count: posts.length },
            null,
            2
          ),
          { headers: { "Content-Type": "application/json" } }
        );
      } catch (err) {
        return new Response("❌ Error fetching Product Hunt data: " + err.message, {
          status: 500,
        });
      }
    }

    // 📦 View products stored in D1
    if (url.pathname === "/products") {
      const { results } = await env.products_db
        .prepare("SELECT * FROM products ORDER BY votes DESC;")
        .all();

      return new Response(JSON.stringify(results, null, 2), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 🚫 Fallback
    return new Response("404 Not Found", { status: 404 });
  },
};
