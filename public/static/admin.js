// Global state
let currentUser = null;
let users = [];
let stats = null;
let logs = [];

// ==================== API Functions ====================

async function checkSession() {
  try {
    const response = await axios.get('/api/admin/session');
    if (response.data.authenticated) {
      currentUser = response.data.user;
      
      await loadAdminData();
      showAdminDashboard();
    } else {
      showLoginScreen();
    }
  } catch (error) {
    console.error('セッションチェックエラー:', error);
    showLoginScreen();
  }
}

async function login(loginId, password) {
  try {
    console.log('管理画面ログイン試行:', loginId);
    const response = await axios.post('/api/admin/login', { login_id: loginId, password });
    console.log('ログインレスポンス:', response.data);
    
    if (response.data.success) {
      currentUser = response.data.user;
      console.log('ログイン成功、データ読み込み中...');
      
      await loadAdminData();
      console.log('データ読み込み完了、ダッシュボード表示');
      showAdminDashboard();
      return { success: true };
    } else {
      console.error('ログイン失敗: success=false');
      return { success: false, error: 'ログインに失敗しました' };
    }
  } catch (error) {
    console.error('ログインエラー:', error);
    console.error('エラー詳細:', error.response?.data);
    return { success: false, error: error.response?.data?.error || 'ログインに失敗しました' };
  }
}

async function logout() {
  try {
    await axios.post('/api/admin/logout');
    currentUser = null;
    users = [];
    stats = null;
    logs = [];
    showLoginScreen();
  } catch (error) {
    console.error('ログアウトエラー:', error);
  }
}

async function loadAdminData() {
  try {
    // Load users
    const usersResponse = await axios.get('/api/admin/users');
    users = usersResponse.data.users;
    
    // Load stats
    const statsResponse = await axios.get('/api/admin/stats');
    stats = statsResponse.data.stats;
    
    // Load logs
    const logsResponse = await axios.get('/api/admin/logs');
    logs = logsResponse.data.logs;
  } catch (error) {
    console.error('データ読み込みエラー:', error);
    if (error.response?.status === 403) {
      alert('管理者権限が必要です');
      await logout();
    }
  }
}

async function createUser(loginId, password, name, role) {
  try {
    const response = await axios.post('/api/admin/users', {
      login_id: loginId,
      password,
      name,
      role
    });
    
    if (response.data.success) {
      await loadAdminData();
      showAdminDashboard();
      return { success: true };
    }
  } catch (error) {
    console.error('ユーザー作成エラー:', error);
    return { success: false, error: error.response?.data?.error || 'ユーザーの作成に失敗しました' };
  }
}

async function deleteUser(userId) {
  try {
    await axios.delete(`/api/admin/users/${userId}`);
    await loadAdminData();
    showAdminDashboard();
    return { success: true };
  } catch (error) {
    console.error('ユーザー削除エラー:', error);
    return { success: false, error: error.response?.data?.error || 'ユーザーの削除に失敗しました' };
  }
}

async function resetPassword(userId, password) {
  try {
    await axios.post(`/api/admin/users/${userId}/reset-password`, { password });
    return { success: true };
  } catch (error) {
    console.error('パスワードリセットエラー:', error);
    return { success: false, error: error.response?.data?.error || 'パスワードリセットに失敗しました' };
  }
}

async function deleteUserCSV(userId) {
  try {
    await axios.delete(`/api/admin/users/${userId}/csv`);
    await loadAdminData();
    showAdminDashboard();
    return { success: true };
  } catch (error) {
    console.error('CSV削除エラー:', error);
    return { success: false, error: error.response?.data?.error || 'CSVデータの削除に失敗しました' };
  }
}

async function viewUserCSV(userId, limit = 50) {
  try {
    const response = await axios.get(`/api/admin/users/${userId}/csv?limit=${limit}`);
    return { 
      success: true, 
      data: response.data.data,
      total: response.data.total,
      showing: response.data.showing
    };
  } catch (error) {
    console.error('CSV表示エラー:', error);
    return { success: false, error: error.response?.data?.error || 'CSVデータの取得に失敗しました' };
  }
}

// ==================== UI Functions ====================

function showLoginScreen() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div class="max-w-md w-full">
        <div class="text-center mb-8">
          <i class="fas fa-shield-alt text-6xl text-indigo-600 mb-4"></i>
          <h1 class="text-3xl font-bold text-gray-800 mb-2">管理画面</h1>
          <p class="text-gray-600">データ台帳管理システム</p>
        </div>
        
        <div class="bg-white rounded-lg shadow-xl p-8">
          <form id="loginForm" class="space-y-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                <i class="fas fa-user mr-2"></i>ログインID
              </label>
              <input type="text" id="loginId" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="admin" required>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                <i class="fas fa-lock mr-2"></i>パスワード
              </label>
              <input type="password" id="password" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" placeholder="パスワード" required autocomplete="current-password">
            </div>
            
            <div id="loginError" class="text-red-600 text-sm hidden"></div>
            
            <button type="submit" class="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition-colors font-medium">
              <i class="fas fa-sign-in-alt mr-2"></i>ログイン
            </button>
          </form>
          
          <div class="mt-4 text-center">
            <a href="/" class="text-sm text-indigo-600 hover:text-indigo-800">
              <i class="fas fa-arrow-left mr-1"></i>通常画面に戻る
            </a>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const loginId = document.getElementById('loginId').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorDiv = document.getElementById('loginError');
    
    const result = await login(loginId, password);
    if (!result.success) {
      errorDiv.textContent = result.error;
      errorDiv.classList.remove('hidden');
    }
  });
}

function showAdminDashboard() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="min-h-screen bg-gray-50">
      <!-- Header -->
      <header class="bg-white shadow">
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 class="text-2xl font-bold text-gray-800">
              <i class="fas fa-shield-alt mr-2 text-indigo-600"></i>管理画面
            </h1>
            <p class="text-sm text-gray-600 mt-1">ログイン中: ${currentUser.name} (${currentUser.login_id})</p>
          </div>
          <div class="flex gap-2">
            <a href="/" class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
              <i class="fas fa-home mr-2"></i>通常画面
            </a>
            <button onclick="logout()" class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              <i class="fas fa-sign-out-alt mr-2"></i>ログアウト
            </button>
          </div>
        </div>
      </header>
      
      <!-- Main Content -->
      <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <!-- Stats Cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
              <div class="p-3 rounded-full bg-blue-100 text-blue-600">
                <i class="fas fa-users text-2xl"></i>
              </div>
              <div class="ml-4">
                <p class="text-sm text-gray-600">総ユーザー数</p>
                <p class="text-2xl font-bold text-gray-800">${stats.userCount}</p>
              </div>
            </div>
          </div>
          
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
              <div class="p-3 rounded-full bg-green-100 text-green-600">
                <i class="fas fa-file-csv text-2xl"></i>
              </div>
              <div class="ml-4">
                <p class="text-sm text-gray-600">総CSV件数</p>
                <p class="text-2xl font-bold text-gray-800">${stats.csvCount}</p>
              </div>
            </div>
          </div>
          
          <div class="bg-white rounded-lg shadow p-6">
            <div class="flex items-center">
              <div class="p-3 rounded-full bg-purple-100 text-purple-600">
                <i class="fas fa-database text-2xl"></i>
              </div>
              <div class="ml-4">
                <p class="text-sm text-gray-600">DB サイズ</p>
                <p class="text-2xl font-bold text-gray-800">${formatBytes(stats.dbSize)}</p>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Users Table -->
        <div class="bg-white rounded-lg shadow mb-8">
          <div class="p-6 border-b border-gray-200 flex justify-between items-center">
            <h2 class="text-xl font-bold text-gray-800">
              <i class="fas fa-users mr-2"></i>ユーザー管理
            </h2>
            <button onclick="showCreateUserModal()" class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
              <i class="fas fa-plus mr-2"></i>新規ユーザー
            </button>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ログインID</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">名前</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ロール</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CSV件数</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">作成日</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                ${users.map(user => `
                  <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.id}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.login_id}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.name || '-'}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span class="px-2 py-1 text-xs font-medium rounded-full ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}">
                        ${user.role === 'admin' ? '管理者' : '一般'}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${user.csv_count || 0}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(user.created_at).toLocaleDateString('ja-JP')}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      ${user.csv_count > 0 ? `
                        <button onclick="showCSVPreview(${user.id}, '${user.login_id}')" class="text-blue-600 hover:text-blue-800" title="CSV表示">
                          <i class="fas fa-eye"></i>
                        </button>
                        <button onclick="confirmDeleteCSV(${user.id}, '${user.login_id}')" class="text-orange-600 hover:text-orange-800" title="CSV削除">
                          <i class="fas fa-trash-alt"></i>
                        </button>
                      ` : ''}
                      <button onclick="showResetPasswordModal(${user.id}, '${user.login_id}')" class="text-green-600 hover:text-green-800" title="パスワードリセット">
                        <i class="fas fa-key"></i>
                      </button>
                      ${user.id !== currentUser.id ? `
                        <button onclick="confirmDeleteUser(${user.id}, '${user.login_id}')" class="text-red-600 hover:text-red-800" title="ユーザー削除">
                          <i class="fas fa-user-times"></i>
                        </button>
                      ` : ''}
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        
        <!-- Activity Logs -->
        <div class="bg-white rounded-lg shadow">
          <div class="p-6 border-b border-gray-200">
            <h2 class="text-xl font-bold text-gray-800">
              <i class="fas fa-history mr-2"></i>操作ログ
            </h2>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日時</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">管理者</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">詳細</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IPアドレス</th>
                </tr>
              </thead>
              <tbody class="bg-white divide-y divide-gray-200">
                ${logs.slice(0, 20).map(log => `
                  <tr>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${new Date(log.created_at).toLocaleString('ja-JP')}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${log.admin_name} (${log.admin_login_id})</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${formatAction(log.action)}</td>
                    <td class="px-6 py-4 text-sm text-gray-500">${log.details || '-'}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${log.ip_address || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
    
    <!-- Modals -->
    <div id="modalContainer"></div>
  `;
}

function showCreateUserModal() {
  const modal = document.createElement('div');
  modal.className = 'modal show';
  modal.innerHTML = `
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
      <div class="p-6 border-b border-gray-200">
        <h3 class="text-xl font-bold text-gray-800">
          <i class="fas fa-user-plus mr-2"></i>新規ユーザー作成
        </h3>
      </div>
      <form id="createUserForm" class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">ログインID</label>
          <input type="text" id="newLoginId" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" required>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">パスワード</label>
          <input type="password" id="newPassword" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" required autocomplete="new-password">
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">名前</label>
          <input type="text" id="newName" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" required>
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">ロール</label>
          <select id="newRole" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
            <option value="user">一般ユーザー</option>
            <option value="admin">管理者</option>
          </select>
        </div>
        
        <div id="createError" class="text-red-600 text-sm hidden"></div>
        
        <div class="flex gap-2">
          <button type="submit" class="flex-1 bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700">
            <i class="fas fa-check mr-2"></i>作成
          </button>
          <button type="button" onclick="closeModal()" class="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400">
            <i class="fas fa-times mr-2"></i>キャンセル
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.getElementById('modalContainer').appendChild(modal);
  
  document.getElementById('createUserForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const loginId = document.getElementById('newLoginId').value.trim();
    const password = document.getElementById('newPassword').value.trim();
    const name = document.getElementById('newName').value.trim();
    const role = document.getElementById('newRole').value;
    const errorDiv = document.getElementById('createError');
    
    const result = await createUser(loginId, password, name, role);
    if (result.success) {
      closeModal();
    } else {
      errorDiv.textContent = result.error;
      errorDiv.classList.remove('hidden');
    }
  });
}

function showResetPasswordModal(userId, loginId) {
  const modal = document.createElement('div');
  modal.className = 'modal show';
  modal.innerHTML = `
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
      <div class="p-6 border-b border-gray-200">
        <h3 class="text-xl font-bold text-gray-800">
          <i class="fas fa-key mr-2"></i>パスワードリセット
        </h3>
        <p class="text-sm text-gray-600 mt-2">ユーザー: ${loginId}</p>
      </div>
      <form id="resetPasswordForm" class="p-6 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">新しいパスワード</label>
          <input type="password" id="resetPassword" class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500" required autocomplete="new-password">
        </div>
        
        <div id="resetError" class="text-red-600 text-sm hidden"></div>
        
        <div class="flex gap-2">
          <button type="submit" class="flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700">
            <i class="fas fa-check mr-2"></i>リセット
          </button>
          <button type="button" onclick="closeModal()" class="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400">
            <i class="fas fa-times mr-2"></i>キャンセル
          </button>
        </div>
      </form>
    </div>
  `;
  
  document.getElementById('modalContainer').appendChild(modal);
  
  document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('resetPassword').value.trim();
    const errorDiv = document.getElementById('resetError');
    
    const result = await resetPassword(userId, password);
    if (result.success) {
      alert('パスワードをリセットしました');
      closeModal();
    } else {
      errorDiv.textContent = result.error;
      errorDiv.classList.remove('hidden');
    }
  });
}

function confirmDeleteUser(userId, loginId) {
  if (confirm(`ユーザー「${loginId}」を削除しますか？\n\nこの操作は取り消せません。ユーザーに関連するすべてのデータ（CSV、設定）も削除されます。`)) {
    deleteUser(userId);
  }
}

function confirmDeleteCSV(userId, loginId) {
  if (confirm(`ユーザー「${loginId}」のCSVデータをすべて削除しますか？\n\nこの操作は取り消せません。`)) {
    deleteUserCSV(userId);
  }
}

async function showCSVPreview(userId, loginId) {
  const result = await viewUserCSV(userId, 100); // Show up to 100 rows
  
  if (!result.success) {
    alert(result.error);
    return;
  }
  
  const modal = document.createElement('div');
  modal.className = 'modal show';
  modal.innerHTML = `
    <div class="bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-auto">
      <div class="p-6 border-b border-gray-200 sticky top-0 bg-white">
        <h3 class="text-xl font-bold text-gray-800">
          <i class="fas fa-file-csv mr-2"></i>CSVデータプレビュー
        </h3>
        <p class="text-sm text-gray-600 mt-2">
          ユーザー: ${loginId} 
          <span class="ml-4">
            <i class="fas fa-database mr-1"></i>
            総件数: <strong>${result.total}</strong>件 / 
            表示: <strong>${result.showing}</strong>件
          </span>
        </p>
      </div>
      <div class="p-6">
        ${result.data.length > 0 ? `
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-gray-50">
                <tr>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">行番号</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">データ</th>
                  <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">登録日時</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-200">
                ${result.data.map(row => `
                  <tr>
                    <td class="px-4 py-2 whitespace-nowrap">${row.row_number + 1}</td>
                    <td class="px-4 py-2">
                      <pre class="text-xs bg-gray-50 p-2 rounded overflow-x-auto max-w-2xl">${JSON.stringify(JSON.parse(row.row_data), null, 2)}</pre>
                    </td>
                    <td class="px-4 py-2 whitespace-nowrap text-gray-500">${new Date(row.created_at).toLocaleString('ja-JP')}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : '<p class="text-gray-500 text-center py-8">データがありません</p>'}
      </div>
      <div class="p-6 border-t border-gray-200 sticky bottom-0 bg-white">
        <button onclick="closeModal()" class="w-full bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400">
          <i class="fas fa-times mr-2"></i>閉じる
        </button>
      </div>
    </div>
  `;
  
  document.getElementById('modalContainer').appendChild(modal);
}

function closeModal() {
  const container = document.getElementById('modalContainer');
  if (container) {
    container.innerHTML = '';
  }
}

// ==================== Utility Functions ====================

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatAction(action) {
  const actions = {
    'create_user': 'ユーザー作成',
    'delete_user': 'ユーザー削除',
    'reset_password': 'パスワードリセット',
    'delete_csv': 'CSV削除'
  };
  return actions[action] || action;
}

// ==================== Initialize ====================

console.log('Admin app initialized');
checkSession();
