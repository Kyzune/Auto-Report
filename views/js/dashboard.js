async function fetchSummary() {
  try {
    const res = await fetch('http://localhost:3001/api/summary');
    const data = await res.json();

    document.getElementById("total_cases").innerText = data.total;
    document.getElementById("total_passed").innerText = data.passed;
    document.getElementById("total_failed").innerText = data.failed;
    document.getElementById("total_skipped").innerText = data.skipped;
  } catch (err) {
    console.error('Failed to fetch summary:', err);
  }
}

async function viewDetail() {
  const res = await fetch('http://localhost:3001/api/last-run-summary');
  const data = await res.json();
  window.location.href = `detail.html?test_id=${data.run_id}`;
}

async function fetchLastSummary() {
  try {
    const res = await fetch('http://localhost:3001/api/last-run-summary');
    const data = await res.json();

    document.getElementById("last_run_date").innerText = data.date;
    document.getElementById("last_run_duration").innerText = data.duration;
    document.getElementById("last_run_environment").innerText = data.environment;
    document.getElementById("last_run_id").innerText = `#${data.run_id}`;

    function viewDetail() {
      window.location.href = `detail.html?test_id=${data.run_id}`;
    }
  } catch (err) {
    console.error('Failed to fetch summary:', err);
  }
}

async function fetchChart() {

  // Total cases by module
  try {
    const caseRes = await fetch('http://localhost:3001/api/total-cases-by-module');
    const caseData = await caseRes.json();
    const moduleLabels = caseData.map(item => item.module);
    const caseCounts = caseData.map(item => item.total);

    const pieCtx = document.getElementById("pieChart").getContext("2d");
    new Chart(pieCtx, {
      type: "pie",
      data: {
        labels: moduleLabels,
        datasets: [
          {
            data: caseCounts,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
      },
    });
  } catch (err) {
    console.error('Failed to fetch chart:', err);
  }

  // Cases status by modul
  try {
    const caseRes = await fetch('http://localhost:3001/api/cases-status-by-module');
    const caseData = await caseRes.json();
    const moduleLabels = caseData.map(item => item.module);
    const passedCounts = caseData.map(item => item.passed);
    const failedCounts = caseData.map(item => item.failed);
    const skippedCounts = caseData.map(item => item.skipped);

    const barCtx = document.getElementById("barChart").getContext("2d");
    new Chart(barCtx, {
      type: "bar",
      data: {
        labels: moduleLabels,
        datasets: [
          {
            label: "Passed",
            data: passedCounts,
            backgroundColor: "#55ff7a",
          },
          {
            label: "Failed",
            data: failedCounts,
            backgroundColor: "#ff5555",
          },
          {
            label: "Skipped",
            data: skippedCounts,
            backgroundColor: "#f6ff41",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  } catch (err) {
    console.error('Failed to fetch chart:', err);
  }
  
  // Last 7 Days Summary
  try {
    const res = await fetch('http://localhost:3001/api/summary/last-7-days');
    const { labels, passedData, failedData, skippedData } = await res.json();

    const ctx = document.getElementById("lineChart").getContext("2d");
    new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Passed",
            data: passedData,
            borderColor: "#55ff7a",
            borderWidth: 4,
            pointHitRadius: 10,
            fill: false,
            tension: 0.4
          },
          {
            label: "Failed",
            data: failedData,
            borderColor: "#ff5555",
            borderWidth: 4,
            pointHitRadius: 10,
            fill: false,
            tension: 0.4
          },
          {
            label: "Skipped",
            data: skippedData,
            borderColor: "#f6ff41",
            borderWidth: 4,
            pointHitRadius: 10,
            fill: false,
            tension: 0.4
          }
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
          },
        },
      },
    });
  } catch (err) {
    console.error('Failed to fetch chart:', err);
  }

  // Status Environment Weekly
  try {
    const res = await fetch('http://localhost:3001/api/summary/environment-weekly');
    const { labels, passedData, failedData, skippedData } = await res.json();

    const ctx = document.getElementById("bar1Chart").getContext("2d");
    new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Passed",
            data: passedData,
            backgroundColor: "rgba(85, 255, 122, 0.2)",
            borderColor: "rgb(85, 255, 122)",
            borderWidth: 1
          },
          {
            label: "Failed",
            data: failedData,
            backgroundColor: "rgba(255, 85, 85, 0.2)",
            borderColor: "rgb(255, 85, 85)",
            borderWidth: 1
          },
          {
            label: "Skipped",
            data: skippedData,
            backgroundColor: "rgba(246, 255, 65, 0.2)",
            borderColor: "rgb(246, 255, 65)",
            borderWidth: 1
          },
        ],
      },
      options: {
        indexAxis: "y",
        maintainAspectRatio: false,
        scales: {
          x: {
            beginAtZero: true,
          },
        },
      },
    });
    const subbox = document.querySelector('.subbox');
    subbox.style.height = '275px';
    if(labels.length > 3) {
      const newHeight = 275 + ((labels.length - 3) * 80);
      subbox.style.height = `${newHeight}px`;
    }
  } catch (err) {
    console.error('Failed to fetch chart:', err);
  }
}

window.onload = () => {
    fetchSummary();
    fetchLastSummary();
    fetchChart();
};
