const express = require("express");
const Database = require("better-sqlite3");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const Docxtemplater = require("docxtemplater");
const PizZip = require("pizzip");
const ImageModule = require("docxtemplater-image-module-free");

const db = new Database("../reports/database/test-results.db");
const app = express();
const PORT = 3001;

app.use(cors());

app.get("/api/summary", (req, res) => {
  const total = db
    .prepare("SELECT SUM(total) as total FROM reports_summary")
    .get().total;
  const passed = db
    .prepare("SELECT SUM(passed) as passed FROM reports_summary")
    .get().passed;
  const failed = db
    .prepare("SELECT SUM(failed) as failed FROM reports_summary")
    .get().failed;
  const skipped = db
    .prepare("SELECT SUM(skipped) as skipped FROM reports_summary")
    .get().skipped;

  res.json({
    total,
    passed,
    failed,
    skipped
  });
});

app.get("/api/last-run-summary", (req, res) => {
  const lastRunIdRow = db
    .prepare(`SELECT MAX(run_id) as run_id FROM reports_summary`)
    .get();
  if (!lastRunIdRow || lastRunIdRow.run_id == null) {
    return res.status(404).json({ error: "No test run found" });
  }

  const run_id = lastRunIdRow.run_id;

  const summary = db
    .prepare(
      `
    SELECT
      executedAt as timestamp,
      executionTime as duration,
      environment
    FROM reports_summary
    WHERE run_id = ?
    GROUP BY environment
    LIMIT 1
  `
    )
    .get(run_id);

  res.json({
    run_id,
    environment: summary.environment,
    date: summary.timestamp,
    duration: summary.duration,
  });
});

app.get("/api/total-cases-by-module", (req, res) => {
  const rows = db
    .prepare(
      `
    SELECT module, COUNT(*) as total
    FROM reports
    GROUP BY module
  `
    )
    .all();

  res.json(rows);
});

app.get("/api/cases-status-by-module", (req, res) => {
  const rows = db
    .prepare(
      `
    SELECT module,
      SUM(CASE WHEN status = 'PASSED' THEN 1 ELSE 0 END) AS passed,
      SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) AS failed,
      SUM(CASE WHEN status = 'SKIPPED' THEN 1 ELSE 0 END) AS skipped
    FROM reports
    GROUP BY module
  `
    )
    .all();

  res.json(rows);
});

app.get("/api/summary/last-7-days", (req, res) => {
  const raw = db
    .prepare(
      `
    SELECT executedAt, passed, failed, skipped
    FROM reports_summary
    ORDER BY run_id DESC
    LIMIT 100
  `
    )
    .all();

  const grouped = {};

  raw.forEach((row) => {
    const datePart = row.executedAt.split(",")[0].trim();
    const [day, month, year] = datePart.split("/");
    const label = `${day} ${getMonthName(month)}`;
    grouped[label] = grouped[label] || { passed: 0, failed: 0, skipped: 0 };
    grouped[label].passed += row.passed;
    grouped[label].failed += row.failed;
    grouped[label].skipped += row.skipped;
  });

  const today = new Date();
  const labels = [];
  for (let i = -6; i <= 0; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const label = `${d.getDate().toString().padStart(2, "0")} ${getMonthName(
      (d.getMonth() + 1).toString().padStart(2, "0")
    )}`;
    labels.push(label);
  }

  const passedData = labels.map((l) => grouped[l]?.passed || 0);
  const failedData = labels.map((l) => grouped[l]?.failed || 0);
  const skippedData = labels.map((l) => grouped[l]?.skipped || 0);

  res.json({ labels, passedData, failedData, skippedData });
});

function getMonthName(month) {
  const map = {
    "01": "Jan",
    "02": "Feb",
    "03": "Mar",
    "04": "Apr",
    "05": "May",
    "06": "Jun",
    "07": "Jul",
    "08": "Aug",
    "09": "Sep",
    "10": "Oct",
    "11": "Nov",
    "12": "Dec",
  };
  return map[month] || month;
}

app.get("/api/summary/environment-weekly", (req, res) => {
  const raw = db
    .prepare(
      `
    SELECT environment, status
    FROM reports
  `
    )
    .all();

  const data = {};

  raw.forEach((row) => {
    const env = row.environment || "Unknown";
    const status = row.status;

    if (!data[env]) {
      data[env] = { PASSED: 0, FAILED: 0, SKIPPED: 0 };
    }

    if (status === "PASSED") data[env].PASSED += 1;
    else if (status === "FAILED") data[env].FAILED += 1;
    else if (status === "SKIPPED") data[env].SKIPPED += 1;
  });

  const sortedEnv = Object.entries(data).sort((a, b) => {
    const totalA = a[1].PASSED + a[1].FAILED + a[1].SKIPPED;
    const totalB = b[1].PASSED + b[1].FAILED + b[1].SKIPPED;
    return totalB - totalA;
  });

  const labels = sortedEnv.map(([env]) => env);
  const passedData = sortedEnv.map(([_, data]) => data.PASSED);
  const failedData = sortedEnv.map(([_, data]) => data.FAILED);
  const skippedData = sortedEnv.map(([_, data]) => data.SKIPPED);

  res.json({ labels, passedData, failedData, skippedData });
});

app.get("/api/history", (req, res) => {
  const { search = "", field = "run_id", page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  let where = "";
  const params = [];

  if (search.trim()) {
    where = `WHERE ${field} LIKE ?`;
    params.push(`%${search}%`);
  }

  const data = db
    .prepare(
      `
    SELECT * FROM reports_summary
    ${where}
    ORDER BY run_id DESC
    LIMIT ? OFFSET ?
  `
    )
    .all(...params, limit, offset);

  const total = db
    .prepare(
      `
    SELECT COUNT(*) as count FROM reports_summary
    ${where}
  `
    )
    .get(...params).count;

  res.json({
    data,
    total,
    page: parseInt(page),
    totalPages: Math.ceil(total / limit),
  });
});

app.delete("/api/history/delete/:run_id", (req, res) => {
  const id = req.params.run_id;

  try {
    const reportsDir = path.resolve(__dirname, "../reports");

    const mediaRows = db
      .prepare(`SELECT screenshot, video FROM reports WHERE run_id = ?`)
      .all(id);

    const JSONpath = path.join(reportsDir, `json/report_${id}.json`);
    
    if (fs.existsSync(JSONpath)) {
      fs.unlinkSync(JSONpath);
    }

    const screenshotParentFolder = path.join(reportsDir, `screenshots/report_${id}`);

    if (fs.existsSync(screenshotParentFolder)) {
      fs.rmSync(screenshotParentFolder, { recursive: true });
    }

    for (const row of mediaRows) {
      if (row.screenshot) {
        const screenshotPath = path.join(reportsDir, row.screenshot);
        if (fs.existsSync(screenshotPath)) {
          fs.unlinkSync(screenshotPath);
        }

        const folderPath = path.dirname(screenshotPath);
        if (fs.existsSync(folderPath)) {
          fs.rmSync(folderPath, { recursive: true });
        }
      }

      if (row.video) {
        const videoPath = path.join(reportsDir, row.video);
        if (fs.existsSync(videoPath)) {
          fs.unlinkSync(videoPath);
        }

        const videoFolder = path.dirname(videoPath);
        if (fs.existsSync(videoFolder)) {
          fs.rmSync(videoFolder, { recursive: true });
        }
      }
    }

    db.prepare(`DELETE FROM reports WHERE run_id = ?`).run(id);
    db.prepare(`DELETE FROM reports_summary WHERE run_id = ?`).run(id);

    res.status(200).json({ message: `Test ID : ${id} and related files have been deleted.` });
  } catch (error) {
    console.error("❌ Gagal menghapus data atau file:", error);
    res.status(500).json({ error: "Gagal menghapus data atau file." });
  }
});

function getTestDetailByRunID(run_id) {
  const summary = db.prepare(`
      SELECT passed, failed, skipped, total, environment, executedAt, executionTime, app
      FROM reports_summary
      WHERE run_id = ?
    `).get(run_id);

    const rowsRaw = db.prepare(`
      SELECT row, case_name, param, status, error, screenshot, video, module, environment, duration
      FROM reports
      WHERE run_id = ?
      ORDER BY row ASC
    `).all(run_id);

    const rowsMap = new Map();
    const colorMap = {
      PASSED: '#1ad94d',
      FAILED: '#c9181e',
      SKIPPED: '#dccb14ff'
    };

    for (const row of rowsRaw) {
      const rowIndex = row.row;
      row.error = row.error.replace('Error: ', '');

      if (!rowsMap.has(rowIndex)) {
        rowsMap.set(rowIndex, {
          row: rowIndex,
          video: row.video || null,
          cases: [],
          environment: row.environment
        });
      }

      rowsMap.get(rowIndex).cases.push({
        code: extractCodeFromParam(row.param),
        name: row.case_name,
        status: row.status,
        error: row.error || '-',
        param: parseSafeJSON(row.param),
        duration: row.duration,
        screenshot: row.screenshot || null,
        isPassed: row.status === 'PASSED',
        isFailed: row.status === 'FAILED',
        isSkipped: row.status === 'SKIPPED',
        isError: row.error || null
      });
    }

    const rows = Array.from(rowsMap.values());

    return { summary, rows };
}

app.get('/api/history/detail/:run_id', (req, res) => {
  const run_id = req.params.run_id;

  try {
    const result = getTestDetailByRunID(run_id);
    res.json(result);
  } catch (error) {
    console.error("❌ Gagal mengambil detail:", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Helper
function parseSafeJSON(jsonStr) {
  try {
    return typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
  } catch {
    return {};
  }
}

function extractCodeFromParam(paramStr) {
  const param = parseSafeJSON(paramStr);
  return param?.code || '-';
}

app.get('/api/generate-report', (req, res) => {
  const { startDate, endDate, startId, endId, download } = req.query;

  let data = db.prepare(`SELECT * FROM reports_summary`).all();

  // Filter
  data = data.filter(row => {
    const [day, month, year] = row.executedAt.split(',')[0].split('/');
    const rowDate = new Date(`${year}-${month}-${day}`); // ubah ke format ISO

    const isAfterStart = startDate ? rowDate >= new Date(startDate) : true;
    const isBeforeEnd = endDate ? rowDate <= new Date(endDate) : true;

    const isAfterId = startId ? row.run_id >= parseInt(startId) : true;
    const isBeforeId = endId ? row.run_id <= parseInt(endId) : true;

    return isAfterStart && isBeforeEnd && isAfterId && isBeforeId;
  });

  data.sort((a, b) => a.run_id - b.run_id);

  if (data.length === 0) {
    return res.status(404).json({
      message: 'Tidak ada data ditemukan berdasarkan filter yang diberikan.',
      all_summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      },
      final_report: []
    });
  }

  // Generate Report
  const templatePath = path.resolve(__dirname, "../reports/templates/template_temp.docx");
  const content = fs.readFileSync(templatePath, "binary");
  const zip = new PizZip(content);
  const imageOptions = {
    centered: false,
    getImage: function (tagValue, tagName) {
      const imgPath = path.resolve(__dirname, "../reports", tagValue); // tagValue = relative path
      return fs.readFileSync(imgPath);
    },
    getSize: function (imgBuffer, tagValue, tagName) {
      return [480, 270]; // [width, height] in pixels
    },
  };
  const imageModule = new ImageModule(imageOptions);
  const doc = new Docxtemplater(zip, {
    paragraphLoop: true,
    linebreaks: true,
    modules: [imageModule]
  });

  let totals = 0;
  let total_passed = 0;
  let total_failed = 0;
  let total_skipped = 0;

  const final_report = [];
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    const jsonData = getTestDetailByRunID(item.run_id);

    const { total, passed, failed, skipped } = item;

    const report =
    {
      test_ID: item.run_id,
      ...jsonData
    };

    totals += total;
    total_passed += passed;
    total_failed += failed;
    total_skipped += skipped;

    final_report.push(report);
  }

  const all_summary = {
    total: totals,
    passed: total_passed,
    failed: total_failed,
    skipped: total_skipped
  };

  if (download == 'true') {
    doc.render(
      { 
        all_summary,
        reports: final_report
      });

    const buf = doc.getZip().generate({
      type: "nodebuffer",
    });

    const outputPath = path.resolve(__dirname, "../exports", "report.docx");
    fs.writeFileSync(outputPath, buf);

    res.download(outputPath, "automation-report.docx");
  } else {
    res.json(
      {
      all_summary,
      final_report
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
