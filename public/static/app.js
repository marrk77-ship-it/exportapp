// Global state
let currentUser = null;
let csvData = [];
let settings = {
  tax: null,
  invoice: null,
  ledger: null
};

// Configure axios defaults
axios.defaults.withCredentials = true;

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
  console.log('アプリケーション初期化開始');
  await checkSession();
});

// ==================== Authentication ====================

async function checkSession() {
  try {
    const response = await axios.get('/api/session');
    if (response.data.authenticated) {
      currentUser = response.data.user;
      showMainApp();
    } else {
      showLoginScreen();
    }
  } catch (error) {
    console.error('セッションチェックエラー:', error.message || error);
    console.error('エラー詳細:', error.response?.data || error.response);
    showLoginScreen();
  }
}

async function login(loginId, password) {
  try {
    console.log('ログイン試行:', loginId);
    const response = await axios.post('/api/login', {
      login_id: loginId,
      password: password
    });
    
    console.log('ログインレスポンス:', response.data);
    
    if (response.data.success) {
      currentUser = response.data.user;
      showMainApp();
      return { success: true };
    }
  } catch (error) {
    console.error('ログインエラー:', error.message || error);
    console.error('エラー詳細:', error.response?.data || error.response);
    return { 
      success: false, 
      error: error.response?.data?.error || 'ログインに失敗しました' 
    };
  }
}

async function logout() {
  try {
    await axios.post('/api/logout');
    currentUser = null;
    csvData = [];
    showLoginScreen();
  } catch (error) {
    console.error('ログアウトエラー:', error);
  }
}

// ==================== CSV Data Operations ====================

async function uploadCSVData(rows) {
  try {
    const response = await axios.post('/api/csv/upload', { rows });
    return { success: true, count: response.data.count };
  } catch (error) {
    console.error('CSVアップロードエラー:', error);
    return { 
      success: false, 
      error: error.response?.data?.error || 'データのアップロードに失敗しました' 
    };
  }
}

async function fetchCSVData() {
  try {
    const response = await axios.get('/api/csv/data');
    csvData = response.data.rows;
    return { success: true, rows: csvData };
  } catch (error) {
    console.error('CSVデータ取得エラー:', error);
    return { success: false, error: 'データの取得に失敗しました' };
  }
}

async function deleteCSVData() {
  try {
    await axios.delete('/api/csv/data');
    csvData = [];
    return { success: true };
  } catch (error) {
    console.error('CSVデータ削除エラー:', error);
    return { success: false, error: 'データの削除に失敗しました' };
  }
}

// ==================== Settings Operations ====================

async function fetchSettings() {
  try {
    const response = await axios.get('/api/settings');
    settings = response.data.settings;
    return { success: true, settings };
  } catch (error) {
    console.error('設定取得エラー:', error);
    return { success: false, error: '設定の取得に失敗しました' };
  }
}

async function updateSettings(type, settingsData) {
  try {
    await axios.put(`/api/settings/${type}`, settingsData);
    return { success: true };
  } catch (error) {
    console.error('設定更新エラー:', error);
    return { success: false, error: '設定の保存に失敗しました' };
  }
}

// ==================== UI Rendering ====================

function showLoginScreen() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center px-4">
      <div class="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <div class="text-center mb-8">
          <i class="fas fa-file-invoice text-5xl text-blue-600 mb-4"></i>
          <h1 class="text-3xl font-bold text-gray-800 mb-2">データ台帳管理システム</h1>
          <p class="text-gray-600">ログインしてください</p>
        </div>
        
        <form id="loginForm" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">ログインID</label>
            <input 
              type="text" 
              id="loginId" 
              required
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              placeholder="client1"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">パスワード</label>
            <input 
              type="password" 
              id="password" 
              required
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg"
              placeholder="••••••••"
            />
          </div>
          
          <div id="loginError" class="hidden text-red-600 text-sm text-center"></div>
          
          <button 
            type="submit"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg transition duration-200 text-lg"
          >
            <i class="fas fa-sign-in-alt mr-2"></i>ログイン
          </button>
        </form>
        
        <div class="mt-6 text-center text-sm text-gray-600">
          <p class="mb-2">テストアカウント:</p>
          <p>ID: client1 / Password: password123</p>
          <p>ID: client2 / Password: password123</p>
          <button 
            type="button"
            onclick="window.testLogin()"
            class="mt-3 w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition duration-200"
          >
            <i class="fas fa-bolt mr-2"></i>テストログイン（client1で自動ログイン）
          </button>
        </div>
      </div>
    </div>
  `;

  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const loginId = document.getElementById('loginId').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorDiv = document.getElementById('loginError');
    
    console.log('フォームから取得した値:', { loginId, password, loginIdLength: loginId.length, passwordLength: password.length });
    
    errorDiv.classList.add('hidden');
    
    const result = await login(loginId, password);
    
    if (!result.success) {
      errorDiv.textContent = result.error;
      errorDiv.classList.remove('hidden');
    }
  });
}

async function showMainApp() {
  // Fetch settings and data
  await fetchSettings();
  const dataResult = await fetchCSVData();
  
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="min-h-screen">
      <!-- Header -->
      <div class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-bold text-gray-800">
              <i class="fas fa-file-invoice mr-2"></i>データ台帳管理システム
            </h1>
            <p class="text-sm text-gray-600 mt-1">
              <i class="fas fa-user mr-1"></i>${currentUser.name || currentUser.login_id}
            </p>
          </div>
          <div class="flex gap-4">
            ${currentUser.role === 'admin' ? `
              <a 
                href="/admin"
                class="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition"
                title="管理画面"
              >
                <i class="fas fa-shield-alt mr-2"></i>管理画面
              </a>
            ` : ''}
            <button 
              onclick="showSettingsModal()"
              class="text-gray-600 hover:text-gray-800 transition"
              title="設定"
            >
              <i class="fas fa-cog text-2xl"></i>
            </button>
            <button 
              onclick="logout()"
              class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition"
            >
              <i class="fas fa-sign-out-alt mr-2"></i>ログアウト
            </button>
          </div>
        </div>
      </div>

      <!-- Main Content -->
      <div class="max-w-7xl mx-auto px-4 py-8">
        <!-- Step 1: File Upload -->
        <div class="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div class="flex items-center mb-6">
            <div class="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl mr-4">
              1
            </div>
            <h2 class="text-2xl font-bold text-gray-800">ファイルを選ぶ</h2>
          </div>
          
          <div class="flex flex-col items-center justify-center border-4 border-dashed border-gray-300 rounded-lg p-12 hover:border-blue-400 transition cursor-pointer" id="dropZone">
            <i class="fas fa-cloud-upload-alt text-6xl text-gray-400 mb-4"></i>
            <p class="text-xl text-gray-600 mb-4">CSVファイルをドラッグ＆ドロップ</p>
            <p class="text-gray-500 mb-6">または</p>
            <input type="file" id="fileInput" accept=".csv" class="hidden" onchange="handleFileSelect(event)">
            <button 
              onclick="document.getElementById('fileInput').click()"
              class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-12 rounded-lg text-2xl transition duration-200"
            >
              <i class="fas fa-folder-open mr-3"></i>ファイルを選ぶ
            </button>
          </div>
          
          <div id="previewSection" class="mt-6 ${csvData.length > 0 ? '' : 'hidden'}">
            <h3 class="text-lg font-bold text-gray-700 mb-3">
              <i class="fas fa-eye mr-2"></i>データプレビュー（最初の5件）
            </h3>
            <div id="previewTable" class="overflow-x-auto"></div>
            <p class="text-sm text-gray-600 mt-3">
              <i class="fas fa-check-circle text-green-600 mr-2"></i>
              <span id="rowCount">${csvData.length}</span>行のデータが読み込まれています
            </p>
          </div>
        </div>

        <!-- Step 2: Export Buttons -->
        <div class="bg-white rounded-lg shadow-lg p-8">
          <div class="flex items-center mb-6">
            <div class="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl mr-4">
              2
            </div>
            <h2 class="text-2xl font-bold text-gray-800">出力したいスプレッドシートを選ぶ</h2>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button 
              id="taxBtn"
              onclick="exportSpreadsheet('tax')"
              disabled="${csvData.length === 0}"
              class="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-8 px-6 rounded-lg text-2xl transition duration-200 shadow-lg hover:shadow-xl"
            >
              <i class="fas fa-calculator text-4xl mb-3 block"></i>
              <span id="taxBtnText">${settings.tax?.button_name || '税金'}</span>
            </button>
            
            <button 
              id="invoiceBtn"
              onclick="exportSpreadsheet('invoice')"
              disabled="${csvData.length === 0}"
              class="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-8 px-6 rounded-lg text-2xl transition duration-200 shadow-lg hover:shadow-xl"
            >
              <i class="fas fa-file-invoice text-4xl mb-3 block"></i>
              <span id="invoiceBtnText">${settings.invoice?.button_name || '請求書'}</span>
            </button>
            
            <button 
              id="ledgerBtn"
              onclick="exportSpreadsheet('ledger')"
              disabled="${csvData.length === 0}"
              class="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-8 px-6 rounded-lg text-2xl transition duration-200 shadow-lg hover:shadow-xl"
            >
              <i class="fas fa-book text-4xl mb-3 block"></i>
              <span id="ledgerBtnText">${settings.ledger?.button_name || '全体の台帳'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Settings Modal -->
    <div id="settingsModal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
      <div class="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div class="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h2 class="text-2xl font-bold text-gray-800">
            <i class="fas fa-cog mr-2"></i>詳細設定
          </h2>
          <button onclick="closeSettingsModal()" class="text-gray-500 hover:text-gray-700">
            <i class="fas fa-times text-2xl"></i>
          </button>
        </div>
        
        <div class="p-6">
          <div class="mb-4">
            <div class="flex border-b">
              <button onclick="switchSettingsTab('tax')" class="settings-tab px-6 py-3 font-bold text-blue-600 border-b-2 border-blue-600" data-tab="tax">
                税金
              </button>
              <button onclick="switchSettingsTab('invoice')" class="settings-tab px-6 py-3 font-bold text-gray-500" data-tab="invoice">
                請求書
              </button>
              <button onclick="switchSettingsTab('ledger')" class="settings-tab px-6 py-3 font-bold text-gray-500" data-tab="ledger">
                全体の台帳
              </button>
            </div>
          </div>
          
          <form id="settingsForm" class="space-y-4">
            <input type="hidden" id="currentTab" value="tax">
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">ボタン表示名</label>
              <input 
                type="text" 
                id="buttonName" 
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="例: 税金"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">出力ファイル名</label>
              <input 
                type="text" 
                id="filePrefix" 
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="例: 税金スプレッドシート"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">出力する列（カンマ区切り、空欄=全て）</label>
              <input 
                type="text" 
                id="columns" 
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="例: 日付,金額,税区分,税額"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">フィルター対象列</label>
              <input 
                type="text" 
                id="filterColumn" 
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="例: 税区分"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">フィルター値</label>
              <input 
                type="text" 
                id="filterValue" 
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="例: 消費税"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">並び替え列</label>
              <input 
                type="text" 
                id="sortColumn" 
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="例: 日付"
              />
            </div>
            
            <div class="flex gap-4 pt-4">
              <button 
                type="submit"
                class="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition"
              >
                <i class="fas fa-save mr-2"></i>設定を保存
              </button>
              <button 
                type="button"
                onclick="closeSettingsModal()"
                class="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold py-3 px-6 rounded-lg transition"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Notification Toast -->
    <div id="toast" class="hidden fixed bottom-4 right-4 bg-gray-800 text-white px-6 py-4 rounded-lg shadow-lg z-50">
      <p id="toastMessage"></p>
    </div>
  `;

  // Display preview if data exists
  if (csvData.length > 0) {
    displayPreview();
  }

  // Setup drag and drop
  setupDragAndDrop();
}

// ==================== File Handling ====================

function setupDragAndDrop() {
  const dropZone = document.getElementById('dropZone');
  
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-blue-500', 'bg-blue-50');
  });
  
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-blue-500', 'bg-blue-50');
  });
  
  dropZone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-blue-500', 'bg-blue-50');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFile(files[0]);
    }
  });
}

async function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    await processFile(file);
  }
}

// Check if text contains garbled characters (mojibake)
function hasGarbledText(text) {
  // Check for common mojibake patterns
  const garbledPatterns = [
    /[\u00C0-\u00FF]{2,}/,  // Multiple accented characters in a row
    /\uFFFD/,               // Replacement character
  ];
  
  return garbledPatterns.some(pattern => pattern.test(text));
}

// Check if data looks garbled
function isDataGarbled(data) {
  if (!data || data.length === 0) return false;
  
  // Check headers and first few rows
  const firstRow = data[0];
  const keysToCheck = Object.keys(firstRow).slice(0, 5);
  const valuesToCheck = keysToCheck.map(key => firstRow[key]).filter(v => v);
  
  const textToCheck = [...keysToCheck, ...valuesToCheck].join(' ');
  return hasGarbledText(textToCheck);
}

async function processFile(file) {
  if (!file.name.endsWith('.csv')) {
    showToast('CSVファイルを選択してください', 'error');
    return;
  }

  showToast('ファイルを読み込み中...', 'info');

  // First try with UTF-8
  parseFileWithEncoding(file, 'UTF-8');
}

function parseFileWithEncoding(file, encoding) {
  const reader = new FileReader();
  
  reader.onload = async (e) => {
    const text = e.target.result;
    
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (results.errors.length > 0) {
          console.error('CSV解析エラー:', results.errors);
          showToast('CSVファイルの解析に失敗しました', 'error');
          return;
        }

        if (results.data.length === 0) {
          showToast('データが含まれていません', 'error');
          return;
        }

        // Check if data is garbled and retry with Shift-JIS
        if (encoding === 'UTF-8' && isDataGarbled(results.data)) {
          console.log('文字化けを検出しました。Shift-JISで再試行します...');
          parseFileWithEncoding(file, 'Shift-JIS');
          return;
        }

        // Upload to server
        const uploadResult = await uploadCSVData(results.data);
        
        if (uploadResult.success) {
          csvData = results.data;
          displayPreview();
          enableExportButtons();
          showToast(`${uploadResult.count}行のデータを読み込みました (${encoding})`, 'success');
        } else {
          showToast(uploadResult.error, 'error');
        }
      },
      error: (error) => {
        console.error('CSV読み込みエラー:', error);
        
        // If UTF-8 failed, try Shift-JIS
        if (encoding === 'UTF-8') {
          console.log('UTF-8での読み込みに失敗しました。Shift-JISで再試行します...');
          parseFileWithEncoding(file, 'Shift-JIS');
        } else {
          showToast('ファイルの読み込みに失敗しました', 'error');
        }
      }
    });
  };
  
  reader.onerror = () => {
    showToast('ファイルの読み込みに失敗しました', 'error');
  };
  
  // Read file with specified encoding
  if (encoding === 'Shift-JIS') {
    reader.readAsText(file, 'Shift_JIS');
  } else {
    reader.readAsText(file, 'UTF-8');
  }
}

function displayPreview() {
  const previewSection = document.getElementById('previewSection');
  const previewTable = document.getElementById('previewTable');
  const rowCount = document.getElementById('rowCount');
  
  previewSection.classList.remove('hidden');
  rowCount.textContent = csvData.length;
  
  if (csvData.length === 0) return;
  
  const previewData = csvData.slice(0, 5);
  const headers = Object.keys(csvData[0]);
  
  let tableHtml = '<table class="min-w-full divide-y divide-gray-200 text-sm">';
  tableHtml += '<thead class="bg-gray-50"><tr>';
  
  headers.forEach(header => {
    tableHtml += `<th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">${header}</th>`;
  });
  
  tableHtml += '</tr></thead><tbody class="bg-white divide-y divide-gray-200">';
  
  previewData.forEach(row => {
    tableHtml += '<tr>';
    headers.forEach(header => {
      tableHtml += `<td class="px-4 py-2 whitespace-nowrap text-gray-900">${row[header] || ''}</td>`;
    });
    tableHtml += '</tr>';
  });
  
  tableHtml += '</tbody></table>';
  previewTable.innerHTML = tableHtml;
}

function enableExportButtons() {
  ['taxBtn', 'invoiceBtn', 'ledgerBtn'].forEach(id => {
    const btn = document.getElementById(id);
    if (btn) {
      btn.disabled = false;
    }
  });
}

// ==================== Export Functionality ====================

function exportSpreadsheet(type) {
  if (csvData.length === 0) {
    showToast('CSVデータを読み込んでください', 'error');
    return;
  }

  const typeSetting = settings[type];
  if (!typeSetting) {
    showToast('設定が見つかりません', 'error');
    return;
  }

  // Filter data
  let filteredData = [...csvData];
  
  if (typeSetting.filter_column && typeSetting.filter_value) {
    filteredData = filteredData.filter(row => {
      const value = row[typeSetting.filter_column];
      return value && value.includes(typeSetting.filter_value);
    });
  }

  // Sort data
  if (typeSetting.sort_column) {
    filteredData.sort((a, b) => {
      const aVal = a[typeSetting.sort_column] || '';
      const bVal = b[typeSetting.sort_column] || '';
      return aVal.localeCompare(bVal, 'ja');
    });
  }

  // Select columns
  let outputData = filteredData;
  if (typeSetting.columns) {
    const selectedColumns = typeSetting.columns.split(',').map(c => c.trim());
    outputData = filteredData.map(row => {
      const newRow = {};
      selectedColumns.forEach(col => {
        if (col in row) {
          newRow[col] = row[col];
        }
      });
      return newRow;
    });
  }

  if (outputData.length === 0) {
    showToast('出力するデータがありません', 'error');
    return;
  }

  // Generate CSV
  const csv = Papa.unparse(outputData);
  
  // Convert to Shift-JIS for Excel compatibility
  const sjisArray = Encoding.convert(Encoding.stringToCode(csv), {
    to: 'SJIS',
    from: 'UNICODE'
  });
  const uint8Array = new Uint8Array(sjisArray);
  const blob = new Blob([uint8Array], { type: 'text/csv;charset=Shift_JIS;' });
  
  // Download
  const filename = `${typeSetting.file_prefix}_${new Date().toISOString().split('T')[0]}.csv`;
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  
  showToast(`${outputData.length}行のデータを出力しました`, 'success');
}

// ==================== Settings Modal ====================

function showSettingsModal() {
  const modal = document.getElementById('settingsModal');
  modal.classList.remove('hidden');
  switchSettingsTab('tax');
}

function closeSettingsModal() {
  const modal = document.getElementById('settingsModal');
  modal.classList.add('hidden');
}

function switchSettingsTab(type) {
  // Update tab UI
  document.querySelectorAll('.settings-tab').forEach(tab => {
    if (tab.dataset.tab === type) {
      tab.classList.add('text-blue-600', 'border-b-2', 'border-blue-600');
      tab.classList.remove('text-gray-500');
    } else {
      tab.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600');
      tab.classList.add('text-gray-500');
    }
  });

  // Update form
  const currentTab = document.getElementById('currentTab');
  currentTab.value = type;

  const typeSetting = settings[type];
  if (typeSetting) {
    document.getElementById('buttonName').value = typeSetting.button_name || '';
    document.getElementById('filePrefix').value = typeSetting.file_prefix || '';
    document.getElementById('columns').value = typeSetting.columns || '';
    document.getElementById('filterColumn').value = typeSetting.filter_column || '';
    document.getElementById('filterValue').value = typeSetting.filter_value || '';
    document.getElementById('sortColumn').value = typeSetting.sort_column || '';
  }
}

// Handle settings form submission
document.addEventListener('submit', async (e) => {
  if (e.target.id === 'settingsForm') {
    e.preventDefault();
    
    const type = document.getElementById('currentTab').value;
    const settingsData = {
      button_name: document.getElementById('buttonName').value,
      file_prefix: document.getElementById('filePrefix').value,
      columns: document.getElementById('columns').value,
      filter_column: document.getElementById('filterColumn').value,
      filter_value: document.getElementById('filterValue').value,
      sort_column: document.getElementById('sortColumn').value,
    };

    const result = await updateSettings(type, settingsData);
    
    if (result.success) {
      showToast('設定を保存しました', 'success');
      
      // Refresh settings
      await fetchSettings();
      
      // Update button text
      document.getElementById(`${type}BtnText`).textContent = settingsData.button_name;
      
      closeSettingsModal();
    } else {
      showToast(result.error, 'error');
    }
  }
});

// ==================== Toast Notifications ====================

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toastMessage');
  
  if (!toast || !toastMessage) {
    console.log(message);
    return;
  }
  
  toastMessage.textContent = message;
  
  // Set color based on type
  toast.classList.remove('bg-gray-800', 'bg-green-600', 'bg-red-600', 'bg-blue-600');
  switch (type) {
    case 'success':
      toast.classList.add('bg-green-600');
      break;
    case 'error':
      toast.classList.add('bg-red-600');
      break;
    case 'info':
      toast.classList.add('bg-blue-600');
      break;
    default:
      toast.classList.add('bg-gray-800');
  }
  
  toast.classList.remove('hidden');
  
  setTimeout(() => {
    toast.classList.add('hidden');
  }, 3000);
}

// Make functions global
window.login = login;
window.logout = logout;
window.handleFileSelect = handleFileSelect;
window.exportSpreadsheet = exportSpreadsheet;
window.showSettingsModal = showSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.switchSettingsTab = switchSettingsTab;
window.testLogin = async function() {
  const result = await login('client1', 'password123');
  if (!result.success) {
    alert('テストログインに失敗しました: ' + result.error);
  }
};
