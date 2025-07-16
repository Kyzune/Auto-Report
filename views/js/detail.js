document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const runId = urlParams.get("test_id");
    if (!runId) return;

    try {
      const res = await fetch(`http://localhost:3001/api/history/detail/${runId}`);
      const data = await res.json();
      const { summary, rows } = data;

      document.getElementById("test_id").innerText = `#${runId}`;
      document.getElementById("total_indicator").innerText = `Total: ${summary.total}`;
      document.getElementById("passed_indicator").innerText = `Passed: ${summary.passed}`;
      document.getElementById("failed_indicator").innerText = `Failed: ${summary.failed}`;
      document.getElementById("skipped_indicator").innerText = `Skipped: ${summary.skipped}`;

      const card_row = document.getElementById("card_row");

      rows.forEach((row, i) => {
        const rowId = `row-${i + 1}`;
        const videoName = row.video?.split("/").pop() || "-";

        const rowHtml = `
          <div class="bg-white shadow-lg shadow-alice-blue-400/30 transition-all duration-500 ease-in-out rounded-lg overflow-hidden mb-4">
            <div onclick="toggleExpand('${rowId}')" class="flex justify-between items-center bg-alice-blue-200 transition-all duration-300 hover:bg-alice-blue-300 hover:cursor-pointer px-4 py-2">
              <h2 class="font-semibold">Row - ${row.row}</h2>
              <div class="flex items-center gap-4">
                <span class="text-sm text-gray-600">${videoName}</span>
                <button onclick="event.stopPropagation(); previewVideo('${row.video}');" class="px-3 py-1 bg-blue-500 text-white rounded text-sm transition-all duration-300 hover:bg-blue-700 watch-video">Watch</button>
                <button onclick="event.stopPropagation(); toggleExpand('${rowId}')" class="text-lg p-2 rounded-full transition-all duration-300 hover:bg-white/30">
                  <img src="../../assets/caret-down_icon.png" alt="caret-down_icon" id="dropdown_icon_${rowId}" class="h-5 transition-transform duration-300">
                </button>
              </div>
            </div>
            <div id="${rowId}" class="max-h-0 overflow-hidden transition-all duration-500 ease-in-out">
              ${row.cases.map((c, index) => `
                <div class="bg-alice-blue-50 mx-4 p-4 my-4 space-y-1 rounded-lg shadow-md">
                  <p><strong>${c.code} - ${c.name}</strong></p>
                  <p>Status: <span class="${c.status === 'PASSED' ? 'text-green-600' : c.status === 'FAILED' ? 'text-red-600' : 'text-yellow-600'}">${c.status}</span></p>
                  <p>Error: <span class="${c.status === 'FAILED' ? 'underline decoration-4 decoration-red-500' : ''}">${c.error}</span></p>
                  <p>Param: <span id="toggleExpandParam_id_${row.row}_${index}" onclick="toggleExpandParam('id_${row.row}_${index}')" class="underline text-black hover:font-bold hover:cursor-pointer">Show</span></p>
                  <div id="id_${row.row}_${index}" class="bg-white hidden w-fit p-3 border-2 border-black rounded-lg">
                    ${Object.entries(c.param).map(([k, v]) => {
                      if (typeof v === 'object') {
                        return `<li>${k}: ${JSON.stringify(v)}</li>`;
                      }
                      return `<li>${k}: ${v}</li>`
                    }).join('')}
                  </div>
                  <div class="flex items-center gap-2 pt-2 border-t border-t-gray-300">
                    <p>Screenshot:</p>
                    <button onclick="previewImage('${c.screenshot}');" class="px-3 py-1 bg-blue-500 text-white rounded text-sm transition-all duration-300 hover:bg-blue-700">Preview</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        `;

        card_row.insertAdjacentHTML('beforeend', rowHtml);
      });
    } catch (e) {
      console.error("Gagal load detail:", e);
    }
  });

function previewVideo(src) {
  const player = document.getElementById("videoPlayer");
  const source = document.getElementById("videoSource");
  const fileName = document.getElementById("videoFileName");

  const videoPath = `../../reports/${src}`;
  source.src = videoPath;
  player.load();
  player.play();

  fileName.innerText = src.split("/").pop() || "-";
  document.getElementById("videoModal").classList.remove("hidden");
}

function previewImage(src) {
  const previewImage = document.getElementById('previewImg');
  previewImage.src = `../../reports/${src}`;
  document.getElementById('imageFileName').innerText = src.split("/").pop();
  document.getElementById('imageModal').classList.remove('hidden');
}
    
      function closeModal() {
        document.getElementById('imageModal').classList.add('hidden');
      }
    
      function closeVideo() {
        const video = document.getElementById('videoPlayer');
        video.pause();
        document.getElementById('videoModal').classList.add('hidden');
      }
    

      function toggleExpand(id) {
        const el = document.getElementById(id);
        const icon = document.getElementById(`dropdown_icon_${id}`);
        const isExpanded = el.classList.contains('expanded');

        if (isExpanded) {
          el.style.maxHeight = el.scrollHeight + 'px';
          requestAnimationFrame(() => {
            el.style.maxHeight = '0px';
            
            el.classList.remove('expanded');
          });
          if (icon) icon.classList.remove('rotate-180');
        } else {
          el.classList.add('expanded');
          el.style.maxHeight = el.scrollHeight + 'px';
          if (icon) icon.classList.add('rotate-180');
        }
      }

      function toggleExpandParam(id) {
        const el = document.getElementById(id);
        const toggleButton = document.getElementById(`toggleExpandParam_${id}`);
      
        const isHidden = el.classList.toggle('hidden');
        toggleButton.innerText = isHidden ? 'Show' : 'Hide';
      
        // Update max-height parent row
        const parentRow = el.closest("[id^='row-']");
        if (parentRow && parentRow.classList.contains('expanded')) {
          parentRow.style.maxHeight = parentRow.scrollHeight + 'px';
        }
      }

      function handleExpandAll() {
        const isChecked = document.getElementById('expandAll').checked;

        const paramToggles = document.querySelectorAll("[id^='id_']");
        const toggleText = document.querySelectorAll("[id^='toggleExpandParam_']");

        // Expand/collapse all parameters first
        paramToggles.forEach(param => {
          if (isChecked) {
            param.classList.remove('hidden');
          } else {
            param.classList.add('hidden');
          }
        });
      
        toggleText.forEach(span => {
          span.innerText = isChecked ? "Hide" : "Show";
        });
      
        // Delay maxHeight update to allow DOM to reflect visibility change
        requestAnimationFrame(() => {
          document.querySelectorAll("[id^='row-']").forEach(row => {
            const rowId = row.id;
            const icon = document.getElementById(`dropdown_icon_${rowId}`);
          
            if (isChecked) {
              row.style.maxHeight = row.scrollHeight + 'px';
              row.classList.add('expanded');
              if (icon) icon.classList.add('rotate-180');
            } else {
              row.style.maxHeight = row.scrollHeight + 'px';
              requestAnimationFrame(() => {
                row.style.maxHeight = '0px';
                row.classList.remove('expanded');
              });
              if (icon) icon.classList.remove('rotate-180');
            }
          });
        });
      
        if (isChecked) document.getElementById('expandAllRow').checked = false;
      }


      function handleExpandAllRow() {
        const isChecked = document.getElementById('expandAllRow').checked;
      
        requestAnimationFrame(() => {
          document.querySelectorAll("[id^='row-']").forEach(row => {
            const rowId = row.id;
            const icon = document.getElementById(`dropdown_icon_${rowId}`);
            
            if (isChecked) {
              row.style.maxHeight = row.scrollHeight + 'px';
              row.classList.add('expanded');
              if (icon) icon.classList.add('rotate-180');
            } else {
              row.style.maxHeight = row.scrollHeight + 'px';
              requestAnimationFrame(() => {
                row.style.maxHeight = '0px';
                row.classList.remove('expanded');
              });
              if (icon) icon.classList.remove('rotate-180');
            }
          });
        });
      
        // Uncheck the other checkbox
        if (isChecked) document.getElementById('expandAll').checked = false;
      }