// OS社専用システム - フロントエンド

// グローバル変数
let csvData = [];
let currentUser = null;

// ページ読み込み時
window.addEventListener('DOMContentLoaded', async () => {
  await checkSession();
});

// セッション確認
async function checkSession() {
  try {
    const response = await axios.get('/api/os/session', { withCredentials: true });
    if (response.data.authenticated) {
      currentUser = response.data.user;
      showMainScreen();
    } else {
      showLoginScreen();
    }
  } catch (error) {
    console.error('セッション確認エラー:', error);
    showLoginScreen();
  }
}

// ログイン画面表示
function showLoginScreen() {
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div class="text-center mb-8">
          <h1 class="text-3xl font-bold text-gray-800 mb-2">OS社専用システム</h1>
          <p class="text-gray-600">産業廃棄物管理票交付等状況報告書</p>
        </div>
        
        <div id="loginError" class="hidden mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded"></div>
        
        <form onsubmit="handleLogin(event)" class="space-y-6">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">ログインID</label>
            <input 
              type="text" 
              id="loginId" 
              required
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="ログインIDを入力"
            >
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">パスワード</label>
            <input 
              type="password" 
              id="password" 
              required
              class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="パスワードを入力"
            >
          </div>
          
          <button 
            type="submit"
            class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200"
          >
            ログイン
          </button>
        </form>
      </div>
    </div>
  `;
}

// ログイン処理
async function handleLogin(event) {
  event.preventDefault();
  
  const loginId = document.getElementById('loginId').value.trim();
  const password = document.getElementById('password').value.trim();
  
  try {
    const response = await axios.post('/api/os/login', {
      login_id: loginId,
      password: password
    }, { withCredentials: true });
    
    if (response.data.user) {
      currentUser = response.data.user;
      showMainScreen();
    }
  } catch (error) {
    const errorDiv = document.getElementById('loginError');
    errorDiv.textContent = error.response?.data?.error || 'ログインに失敗しました';
    errorDiv.classList.remove('hidden');
  }
}

// メイン画面表示
function showMainScreen() {
  document.getElementById('app').innerHTML = `
    <div class="min-h-screen bg-gray-50">
      <!-- ヘッダー -->
      <header class="bg-white shadow-sm">
        <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 class="text-2xl font-bold text-gray-800">OS社専用システム</h1>
          <div class="flex items-center gap-4">
            <span class="text-gray-600">ようこそ、${currentUser.name}様</span>
            <button 
              onclick="handleLogout()"
              class="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg transition duration-200"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      <!-- メインコンテンツ -->
      <div class="max-w-7xl mx-auto px-4 py-8">
        <!-- ステップ1: ファイルアップロード -->
        <div class="bg-white rounded-lg shadow-lg p-8 mb-8">
          <div class="flex items-center mb-6">
            <div class="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl mr-4">
              1
            </div>
            <h2 class="text-2xl font-bold text-gray-800">CSVファイルをアップロード</h2>
          </div>
          
          <!-- PC: ドラッグ&ドロップゾーン -->
          <div class="hidden md:flex flex-col items-center justify-center border-4 border-dashed border-gray-300 rounded-lg p-12 hover:border-blue-400 transition cursor-pointer" id="dropZone">
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
          
          <!-- スマホ: シンプルボタン -->
          <div class="flex md:hidden flex-col items-center justify-center p-8">
            <button 
              onclick="document.getElementById('fileInput').click()"
              class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-6 px-16 rounded-lg text-2xl transition duration-200 shadow-lg"
            >
              <i class="fas fa-folder-open mr-3"></i>ファイルを選ぶ
            </button>
            <p class="text-sm text-gray-500 mt-4 text-center">CSVファイルを選択してください</p>
          </div>
          
          <!-- プレビューセクション -->
          <div id="previewSection" class="mt-6 hidden">
            <h3 class="text-lg font-bold text-gray-700 mb-3">
              <i class="fas fa-eye mr-2"></i>データプレビュー（最初の5件）
            </h3>
            <div id="previewTable" class="overflow-x-auto"></div>
            <p class="text-sm text-gray-600 mt-3">
              <i class="fas fa-check-circle text-green-600 mr-2"></i>
              <span id="rowCount">0</span>行のデータが読み込まれています
            </p>
          </div>
        </div>

        <!-- ステップ2: 出力フォーマット選択 -->
        <div class="bg-white rounded-lg shadow-lg p-8">
          <div class="flex items-center mb-6">
            <div class="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold text-xl mr-4">
              2
            </div>
            <h2 class="text-2xl font-bold text-gray-800">出力フォーマットを選択</h2>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button 
              id="kumamotoBtn"
              onclick="exportKumamotoReport()"
              disabled
              class="bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-8 px-6 rounded-lg text-2xl transition duration-200 shadow-lg hover:shadow-xl"
            >
              <i class="fas fa-file-excel text-4xl mb-3 block"></i>
              熊本市報告書
            </button>
            
            <button 
              id="format2Btn"
              onclick="exportFormat2()"
              disabled
              class="bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-8 px-6 rounded-lg text-2xl transition duration-200 shadow-lg hover:shadow-xl"
            >
              <i class="fas fa-file-alt text-4xl mb-3 block"></i>
              フォーマット2
            </button>
            
            <button 
              id="format3Btn"
              onclick="exportFormat3()"
              disabled
              class="bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-8 px-6 rounded-lg text-2xl transition duration-200 shadow-lg hover:shadow-xl"
            >
              <i class="fas fa-file-invoice text-4xl mb-3 block"></i>
              フォーマット3
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  setupDragAndDrop();
}

// ドラッグ&ドロップのセットアップ
function setupDragAndDrop() {
  const dropZone = document.getElementById('dropZone');
  if (!dropZone) return;
  
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-blue-400', 'bg-blue-50');
  });
  
  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-blue-400', 'bg-blue-50');
  });
  
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-blue-400', 'bg-blue-50');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      processFile(files[0]);
    }
  });
}

// ファイル選択処理
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    processFile(file);
  }
}

// ファイル処理
function processFile(file) {
  if (!file.name.endsWith('.csv')) {
    alert('CSVファイルを選択してください');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const parsed = Papa.parse(text, {
      header: true,
      skipEmptyLines: true
    });
    
    if (parsed.errors.length > 0) {
      console.error('CSV解析エラー:', parsed.errors);
      alert('CSVファイルの読み込みに失敗しました');
      return;
    }
    
    csvData = parsed.data;
    showPreview(csvData, file.name);
    enableExportButtons();
    uploadCSVData(csvData, file.name);
  };
  
  reader.readAsText(file, 'UTF-8');
}

// プレビュー表示
function showPreview(data, fileName) {
  if (data.length === 0) return;
  
  const previewSection = document.getElementById('previewSection');
  const previewTable = document.getElementById('previewTable');
  const rowCount = document.getElementById('rowCount');
  
  const headers = Object.keys(data[0]);
  const previewData = data.slice(0, 5);
  
  let tableHTML = `
    <div class="mb-3 text-sm text-gray-600">
      <i class="fas fa-file-csv mr-2"></i>ファイル名: ${fileName}
    </div>
    <table class="min-w-full bg-white border border-gray-300">
      <thead class="bg-gray-100">
        <tr>
          ${headers.map(h => `<th class="px-4 py-2 border text-left text-sm font-semibold">${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
        ${previewData.map(row => `
          <tr class="hover:bg-gray-50">
            ${headers.map(h => `<td class="px-4 py-2 border text-sm">${row[h] || ''}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  previewTable.innerHTML = tableHTML;
  rowCount.textContent = data.length;
  previewSection.classList.remove('hidden');
}

// 出力ボタンを有効化
function enableExportButtons() {
  document.getElementById('kumamotoBtn').disabled = false;
  document.getElementById('format2Btn').disabled = false;
  document.getElementById('format3Btn').disabled = false;
}

// CSVデータをサーバーにアップロード
async function uploadCSVData(rows, fileName) {
  try {
    const response = await axios.post('/api/os/csv/upload', {
      rows: rows,
      fileName: fileName
    }, { withCredentials: true });
    
    console.log('CSV アップロード成功:', response.data);
  } catch (error) {
    console.error('CSV アップロードエラー:', error);
    alert('データの保存に失敗しました');
  }
}

// 熊本市報告書出力
async function exportKumamotoReport() {
  const button = document.getElementById('kumamotoBtn');
  const originalText = button.innerHTML;
  button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>処理中...';
  button.disabled = true;
  
  try {
    const response = await axios.post('/api/os/export/kumamoto', {}, {
      responseType: 'blob',
      withCredentials: true
    });
    
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `熊本市報告書_${new Date().toISOString().split('T')[0]}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    alert('熊本市報告書を出力しました');
  } catch (error) {
    console.error('出力エラー:', error);
    alert('出力に失敗しました');
  } finally {
    button.innerHTML = originalText;
    button.disabled = false;
  }
}

// フォーマット2出力（将来の拡張用）
async function exportFormat2() {
  alert('フォーマット2は準備中です');
}

// フォーマット3出力（将来の拡張用）
async function exportFormat3() {
  alert('フォーマット3は準備中です');
}

// ログアウト
async function handleLogout() {
  try {
    await axios.post('/api/os/logout', {}, { withCredentials: true });
    currentUser = null;
    csvData = [];
    showLoginScreen();
  } catch (error) {
    console.error('ログアウトエラー:', error);
  }
}
