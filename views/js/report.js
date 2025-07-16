async function downloadReport() {
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const startId = document.getElementById('startId').value;
  const endId = document.getElementById('endId').value;

  if (!startDate || !endDate || !startId || !endId) {
    alert("Mohon lengkapi semua filter!");
    return;
  }

  const query = new URLSearchParams({
    startDate,
    endDate,
    startId,
    endId
  }).toString();

  try {
    // Lakukan request dulu tanpa download
    const response = await fetch(`http://localhost:3001/api/generate-report?${query}`);

    if (!response.ok) {
      const errorData = await response.json();
      alert(errorData.message || "Terjadi kesalahan saat mengambil data.");
      return;
    }

    const result = await response.json();

    if (result.final_report.length === 0) {
      alert("Tidak ada data ditemukan berdasarkan filter yang diberikan.");
      return;
    }

    window.open(`http://localhost:3001/api/generate-report?${query}&download=true`, "_blank");
  } catch (error) {
    console.error("Gagal ambil data:", error);
    alert("Terjadi kesalahan pada koneksi atau server.");
  }
}
