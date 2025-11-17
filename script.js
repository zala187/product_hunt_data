async function loadProducts() {
  try {
    const response = await fetch("https://product-api.manishzala1718.workers.dev/monthly");
    const data = await response.json();

    console.log("DATA LOADED:", data);

    const tableBody = document.getElementById("productTable");
    tableBody.innerHTML = "";

    data.forEach((item,index) => {
      const row = `
        <tr>
        <td>${index+1}</td>
          <td>${item.name}</td>
          <td>${item.description}</td>
          <td>${item.votes}</td>
          <td>${item.created_at}</td>
          <td><a href="${item.url}" target="_blank">Visit</a></td>
        </tr>
      `;
      tableBody.innerHTML += row;
    });
  } catch (error) {
    console.error("Error fetching products:", error);
  }
}

document.addEventListener("DOMContentLoaded", loadProducts);
