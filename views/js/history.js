let currentPage = 1;

document.getElementById("search").addEventListener("click", () => {
  loadHistory(1);
});

async function loadHistory(page = 1) {
  const searchInput = document.getElementById("search_input").value;
  const fieldSelect = document.querySelector("select").value;
  const limit = 10;
  currentPage = page;

  const loadingIndicator = document.getElementById("loading-indicator");
  loadingIndicator.classList.remove("hidden");

  try {
    const res = await fetch(
      `http://localhost:3001/api/history?search=${searchInput}&field=${fieldSelect}&page=${page}&limit=${limit}`
    );
    const result = await res.json();
    const { data, total, totalPages } = result;

    setTimeout(() => {
      const tbody = document.querySelector("tbody");
      tbody.innerHTML = "";

      data.forEach((entry, index) => {
        const row = document.createElement("tr");
        row.className = "border-b hover:bg-gray-100";
        row.innerHTML = `
          <td class="py-3 px-4">${(page - 1) * limit + index + 1}</td>
          <td class="py-3 px-4">#${entry.run_id}</td>
          <td class="py-3 px-4">${entry.executedAt}</td>
          <td class="py-3 px-4">${entry.environment}</td>
          <td class="py-3 px-4 text-green-600 font-semibold">${
            entry.passed
          }</td>
          <td class="py-3 px-4 text-red-600 font-semibold">${entry.failed}</td>
          <td class="py-3 px-4">${entry.executionTime}</td>
          <td class="py-3 px-4">
            <button onclick="viewDetail(${
              entry.run_id
            })" class="bg-sky-blue-500 hover:bg-sky-blue-600 text-white py-1 px-3 rounded text-sm">Detail</button>
            <button onclick="deleteRun(${
              entry.run_id
            })" class="bg-red-500 hover:bg-red-600 text-white py-1 px-3 rounded text-sm">Delete</button>
          </td>
        `;
        tbody.appendChild(row);
      });

      const data_info = document.getElementById("data_info");
      if (total <= 0) {
        data_info.innerText = 'No test found.';
      } else {
        const startEntry = (page - 1) * limit + 1;
        const endEntry = Math.min(startEntry + limit - 1, total);
        data_info.innerText = `Showing ${startEntry} to ${endEntry} of ${total} entries`;
      }
      if (totalPages > 1){
        renderPagination(totalPages);
      }
      loadingIndicator.classList.add("hidden");
    }, 400);
  } catch (err) {
    const data_info = document.getElementById("data_info");
    data_info.innerText = 'No test found.';

    loadingIndicator.classList.add("hidden");
    console.error("Gagal memuat history:", err);
  }
}

function renderPagination(totalPages) {
  const container = document.querySelector(".pagination");
  container.innerHTML = "";

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "< previous";
  prevBtn.className =
    "bg-blue-500 text-white hover:bg-blue-700 text-sm p-2 rounded-md";
  prevBtn.onclick = () => loadHistory(currentPage - 1);
  prevBtn.disabled = currentPage === 1;
  container.appendChild(prevBtn);

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = `py-2 px-4 border border-blue-500 text-sm rounded-md ${
      i === currentPage
        ? "bg-blue-500 text-white"
        : "bg-white text-blue-500 hover:bg-gray-100"
    }`;
    btn.onclick = () => loadHistory(i);
    container.appendChild(btn);
  }

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "next >";
  nextBtn.className =
    "bg-blue-500 text-white hover:bg-blue-700 text-sm p-2 rounded-md";
  nextBtn.onclick = () => loadHistory(currentPage + 1);
  nextBtn.disabled = currentPage === totalPages;
  container.appendChild(nextBtn);
}

function viewDetail(run_id) {
  window.location.href = `detail.html?test_id=${run_id}`;
}

async function deleteRun(run_id) {
  if (!confirm("Yakin ingin menghapus test ini?")) return;

  try {
    const res = await fetch(`http://localhost:3001/api/history/delete/${run_id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      alert("Berhasil dihapus.");
      loadHistory();
    } else {
      alert("Gagal menghapus.");
    }
  } catch (err) {
    console.error("Error saat menghapus:", err);
    alert("Terjadi kesalahan.");
  }
}

window.onload = loadHistory();
