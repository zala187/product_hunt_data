async function loadProducts() {
  try {
    const response = await fetch("https://producthunt-tracker.manishzala1718.workers.dev/products");
    const data = await response.json();

    const tableBody = document.querySelector("#productTable tbody");
    tableBody.innerHTML = "";

    data.forEach((item,index) => {
      const row = `
        <tr>
        <td>${index+1}</td>
          <td>${item.name}</td>
          <td>${item.description}</td>
          <td>${item.votes}</td>
          <td><a href="${item.url}" id="url" target="_blank">Visit</a></td>
        </tr>
      `;
      tableBody.innerHTML += row;
    });
  } catch (error) {
    console.error("Error fetching products:", error);
  }
}

loadProducts();
