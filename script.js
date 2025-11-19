async function loadProducts() {
  try {
    const response = await fetch("https://product-api.manishzala1718.workers.dev/latest");
    const data = await response.json();

    const tableBody = document.getElementById("productTable");
    if (!data || data.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="6" class="text-center">No products found</td></tr>`;
      return;
    }

    let rows = "";
    data.forEach((item, index) => {
      rows += `
        <tr>
          <td>${index + 1}</td>
          <td>${item.name}</td>
          <td>${item.description}</td>
          <td>${item.votes}</td>
          <td>${new Date(item.created_at).toLocaleString()}</td>
          <td><a href="${item.url}" target="_blank">Visit</a></td>
        </tr>
      `;
    });
    tableBody.innerHTML = rows;
  } catch (error) {
    console.error("Error fetching products:", error);
    document.getElementById("productTable").innerHTML = `<tr><td colspan="6" class="text-center">Error loading products</td></tr>`;
  }
}

document.addEventListener("DOMContentLoaded", loadProducts);
