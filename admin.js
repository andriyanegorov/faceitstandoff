const adminSupabaseUrl = "https://zycrvaqqtufgqnbqunvr.supabase.co";
const adminSupabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Y3J2YXFxdHVmZ3FuYnF1bnZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMTAwOTUsImV4cCI6MjA5Mjg4NjA5NX0.XoxEFdwRb224hHY1TpXUsIDnhpX7xOPHJ6Ukif7BzbY";
const supabaseAdmin = window.supabase.createClient(adminSupabaseUrl, adminSupabaseKey);

const adminState = {
  activeTab: 'dashboard',
  news: [],
  currentNews: null,
  currentProfile: null,
};

const elements = {
  tabs: document.querySelectorAll('[data-admin-tab]'),
  panels: document.querySelectorAll('.admin-panel'),
  notice: document.getElementById('admin-notice'),
  dashboardCards: document.getElementById('dashboard-cards'),
  dashboardLatestNews: document.getElementById('dashboard-latest-news'),
  newsList: document.getElementById('news-list'),
  newsForm: document.getElementById('news-form'),
  newsTitle: document.getElementById('news-title'),
  newsText: document.getElementById('news-text'),
  newsImage: document.getElementById('news-image'),
  newsPinned: document.getElementById('news-pinned'),
  newsId: document.getElementById('news-id'),
  newsReset: document.getElementById('news-reset'),
  profileSearchForm: document.getElementById('profile-search-form'),
  profileSearch: document.getElementById('profile-search'),
  profileSearchResult: document.getElementById('profile-search-result'),
  profileForm: document.getElementById('profile-form'),
  profileUsername: document.getElementById('profile-username'),
  profileAvatar: document.getElementById('profile-avatar'),
  profileBadge: document.getElementById('profile-badge'),
  profileElo: document.getElementById('profile-elo'),
  profileMatches: document.getElementById('profile-matches'),
  profileWins: document.getElementById('profile-wins'),
  profileKills: document.getElementById('profile-kills'),
  profileDeaths: document.getElementById('profile-deaths'),
  profileHeadshots: document.getElementById('profile-headshots'),
  profileClear: document.getElementById('profile-clear'),
  statsCards: document.getElementById('stats-cards'),
  statsTopAccounts: document.getElementById('stats-top-accounts'),
  achievementsList: document.getElementById('achievements-list'),
  achievementForm: document.getElementById('achievement-form'),
  achievementName: document.getElementById('achievement-name'),
  achievementDescription: document.getElementById('achievement-description'),
  achievementIcon: document.getElementById('achievement-icon'),
  achievementRarity: document.getElementById('achievement-rarity'),
  achievementColor: document.getElementById('achievement-color'),
  achievementClear: document.getElementById('achievement-clear'),
  achievementId: document.getElementById('achievement-id'),
  achievementPreview: document.getElementById('achievement-preview'),
  achievementPreviewIcon: document.getElementById('achievement-preview-icon'),
  achievementPreviewName: document.getElementById('achievement-preview-name'),
  achievementPreviewMeta: document.getElementById('achievement-preview-meta'),
  assignUsernameInput: document.getElementById('assign-username'),
  assignAchievementSelect: document.getElementById('assign-achievement-select'),
  assignAchievementForm: document.getElementById('assign-achievement-form'),
};

const showNotice = (text, type = 'info') => {
  if (!elements.notice) return;
  elements.notice.textContent = text;
  elements.notice.hidden = false;
  elements.notice.className = `admin-notice card admin-notice--${type}`;
  window.clearTimeout(adminState.noticeTimeout);
  adminState.noticeTimeout = window.setTimeout(() => {
    if (elements.notice) elements.notice.hidden = true;
  }, 4500);
};

const bindTabs = () => {
  elements.tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const next = tab.dataset.adminTab;
      if (!next) return;
      elements.tabs.forEach((btn) => btn.classList.toggle('admin-tab--active', btn === tab));
      elements.panels.forEach((panel) => {
        panel.hidden = panel.id !== next;
        panel.classList.toggle('admin-panel--active', panel.id === next);
      });
      adminState.activeTab = next;
      if (next === 'dashboard') refreshDashboard();
      if (next === 'news') refreshNews();
      if (next === 'profiles') refreshProfiles();
      if (next === 'stats') refreshStats();
    });
  });
};

const fetchNews = async () => {
  const { data, error } = await supabaseAdmin
    .from('news')
    .select('id,title,text,image,pinned,created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Ошибка загрузки новостей:', error);
    showNotice('Не удалось загрузить новости.', 'error');
    return [];
  }
  return data || [];
};

const fetchAccounts = async () => {
  const { data, error } = await supabaseAdmin
    .from('accounts')
    .select('username,elo,matches,wins,kills,deaths,headshots,avatar')
    .order('elo', { ascending: false })
    .limit(100);

  if (error) {
    console.error('Ошибка загрузки аккаунтов:', error);
    showNotice('Не удалось загрузить аккаунты.', 'error');
    return [];
  }
  return data || [];
};

const refreshDashboard = async () => {
  const [news, accounts] = await Promise.all([fetchNews(), fetchAccounts()]);
  const totalUsers = accounts.length;
  const avgElo = accounts.length ? Math.round(accounts.reduce((sum, acc) => sum + Number(acc.elo || 0), 0) / accounts.length) : 0;
  const totalPinned = news.filter((item) => item.pinned).length;
  const totalNews = news.length;

  if (elements.dashboardCards) {
    elements.dashboardCards.innerHTML = `
      <div class="admin-stat-card card">
        <strong>${totalUsers}</strong>
        <span>Пользователей</span>
      </div>
      <div class="admin-stat-card card">
        <strong>${avgElo}</strong>
        <span>Средний ELO</span>
      </div>
      <div class="admin-stat-card card">
        <strong>${totalNews}</strong>
        <span>Новостей</span>
      </div>
      <div class="admin-stat-card card">
        <strong>${totalPinned}</strong>
        <span>Закреплённых</span>
      </div>
    `;
  }

  if (elements.dashboardLatestNews) {
    elements.dashboardLatestNews.innerHTML = news
      .slice(0, 5)
      .map((item) => `
        <article class="admin-list-item">
          <div>
            <strong>${item.title}</strong>
            <p>${item.text ? item.text.slice(0, 90) : '—'}</p>
          </div>
          <span>${new Date(item.created_at).toLocaleDateString('ru-RU')}</span>
        </article>
      `)
      .join('') || '<p class="admin-muted">Пока нет новостей.</p>';
  }
};

const renderNewsList = (news) => {
  if (!elements.newsList) return;
  if (!news.length) {
    elements.newsList.innerHTML = '<p class="admin-muted">Список новостей пуст.</p>';
    return;
  }

  elements.newsList.innerHTML = news
    .map((item) => `
      <article class="admin-list-item admin-list-item--news">
        <div>
          <strong>${item.title}</strong>
          <p>${item.text ? item.text.slice(0, 110) : 'Пустой текст'}</p>
          <small>Закреплено: ${item.pinned ? 'Да' : 'Нет'}</small>
        </div>
        <div class="admin-list-actions">
          <button type="button" class="glow-btn glow-btn--outline" data-action="edit" data-id="${item.id}">Изменить</button>
          <button type="button" class="glow-btn glow-btn--outline" data-action="delete" data-id="${item.id}">Удалить</button>
        </div>
      </article>
    `)
    .join('');
};

const refreshNews = async () => {
  adminState.news = await fetchNews();
  renderNewsList(adminState.news);
};

const fillNewsForm = (item) => {
  if (!item) {
    elements.newsForm.reset();
    elements.newsId.value = '';
    return;
  }
  elements.newsTitle.value = item.title || '';
  elements.newsText.value = item.text || '';
  elements.newsImage.value = item.image || '';
  elements.newsPinned.checked = Boolean(item.pinned);
  elements.newsId.value = item.id;
};

const saveNewsItem = async (event) => {
  event.preventDefault();
  const payload = {
    title: elements.newsTitle.value.trim(),
    text: elements.newsText.value.trim(),
    image: elements.newsImage.value.trim() || null,
    pinned: elements.newsPinned.checked,
  };
  const id = elements.newsId.value;

  try {
    if (id) {
      const { error } = await supabaseAdmin
        .from('news')
        .update(payload)
        .eq('id', id);
      if (error) throw error;
      showNotice('Новость обновлена.', 'success');
    } else {
      const { error } = await supabaseAdmin
        .from('news')
        .insert([payload]);
      if (error) throw error;
      showNotice('Новость создана.', 'success');
    }
    fillNewsForm(null);
    await refreshNews();
    if (adminState.activeTab === 'dashboard') await refreshDashboard();
  } catch (error) {
    console.error('Ошибка сохранения новости:', error);
    showNotice('Не удалось сохранить новость.', 'error');
  }
};

const deleteNewsItem = async (id) => {
  if (!confirm('Удалить эту новость?')) return;
  const { error } = await supabaseAdmin
    .from('news')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Ошибка удаления новости:', error);
    showNotice('Не удалось удалить новость.', 'error');
    return;
  }
  showNotice('Новость удалена.', 'success');
  await refreshNews();
  if (adminState.activeTab === 'dashboard') await refreshDashboard();
};

const bindNewsActions = () => {
  elements.newsList?.addEventListener('click', async (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action;
    const id = target.dataset.id;
    if (!action || !id) return;

    const item = adminState.news.find((news) => news.id === id);
    if (action === 'edit' && item) {
      fillNewsForm(item);
      showNotice('Редактируйте новость и нажмите Сохранить.', 'info');
    }
    if (action === 'delete') {
      await deleteNewsItem(id);
    }
  });
};

const renderProfileResult = (profile) => {
  if (!elements.profileSearchResult) return;
  if (!profile) {
    elements.profileSearchResult.innerHTML = '<p class="admin-muted">Профиль не найден.</p>';
    return;
  }

  const badgeText = profile.badge === 'verified' ? 'Верифицированный' : profile.badge === 'celebrity' ? 'Знаменитость' : profile.badge === 'admin' ? 'Админ FACEIT' : '';
  const badgeLine = badgeText ? `<p>Бейдж: ${badgeText}</p>` : '';
  elements.profileSearchResult.innerHTML = `
    <article class="admin-list-item admin-list-item--profile">
      <div>
        <strong>${profile.username}</strong>
        <p>ELO: ${profile.elo || 0} • Матчи: ${profile.matches || 0} • Победы: ${profile.wins || 0}</p>
        ${badgeLine}
      </div>
      <img class="admin-avatar-preview" src="${profile.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Player'}" alt="Avatar" />
    </article>
  `;
};

const searchProfile = async (event) => {
  event.preventDefault();
  const username = elements.profileSearch.value.trim();
  if (!username) return;

  const { data, error } = await supabaseAdmin
    .from('accounts')
    .select('username,avatar,badge,elo,matches,wins,kills,deaths,headshots')
    .eq('username', username)
    .maybeSingle();

  if (error) {
    console.error('Ошибка поиска профиля:', error);
    showNotice('Не удалось найти профиль.', 'error');
    return;
  }

  adminState.currentProfile = data;
  if (!data) {
    renderProfileResult(null);
    fillProfileForm(null);
    return;
  }
  renderProfileResult(data);
  fillProfileForm(data);
};

const fillProfileForm = (profile) => {
  if (!profile) {
    elements.profileForm.reset();
    elements.profileUsername.value = '';
    return;
  }
  elements.profileUsername.value = profile.username || '';
  elements.profileAvatar.value = profile.avatar || '';
  elements.profileBadge.value = profile.badge || '';
  elements.profileElo.value = profile.elo ?? '';
  elements.profileMatches.value = profile.matches ?? '';
  elements.profileWins.value = profile.wins ?? '';
  elements.profileKills.value = profile.kills ?? '';
  elements.profileDeaths.value = profile.deaths ?? '';
  elements.profileHeadshots.value = profile.headshots ?? '';
};

const saveProfile = async (event) => {
  event.preventDefault();
  if (!adminState.currentProfile || !adminState.currentProfile.username) {
    showNotice('Сначала найдите профиль.', 'error');
    return;
  }

  const payload = {
    avatar: elements.profileAvatar.value.trim() || null,
    badge: elements.profileBadge.value || null,
    elo: Number(elements.profileElo.value) || 0,
    matches: Number(elements.profileMatches.value) || 0,
    wins: Number(elements.profileWins.value) || 0,
    kills: Number(elements.profileKills.value) || 0,
    deaths: Number(elements.profileDeaths.value) || 0,
    headshots: Number(elements.profileHeadshots.value) || 0,
  };

  const { data, error } = await supabaseAdmin
    .from('accounts')
    .update(payload)
    .eq('username', adminState.currentProfile.username)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Ошибка сохранения профиля:', error);
    showNotice('Не удалось сохранить профиль.', 'error');
    return;
  }

  adminState.currentProfile = data;
  renderProfileResult(data);
  showNotice('Профиль обновлён.', 'success');
};

const clearProfileForm = () => {
  adminState.currentProfile = null;
  elements.profileForm.reset();
  elements.profileUsername.value = '';
  elements.profileSearchResult.innerHTML = '<p class="admin-muted">Найдите профиль по username.</p>';
};

const refreshProfiles = async () => {
  // Ничего лишнего не грузим, поиск выполняется по запросу.
  elements.profileSearchResult.innerHTML = '<p class="admin-muted">Введите username и нажмите «Найти».</p>';
  fillProfileForm(null);
};

const refreshStats = async () => {
  const accounts = await fetchAccounts();
  const totalUsers = accounts.length;
  const avgElo = totalUsers ? Math.round(accounts.reduce((sum, acc) => sum + Number(acc.elo || 0), 0) / totalUsers) : 0;
  const totalKills = accounts.reduce((sum, acc) => sum + Number(acc.kills || 0), 0);
  const totalMatches = accounts.reduce((sum, acc) => sum + Number(acc.matches || 0), 0);
  const avgWinrate = totalMatches ? Math.round((accounts.reduce((sum, acc) => sum + Number(acc.wins || 0), 0) / totalMatches) * 100) : 0;

  if (elements.statsCards) {
    elements.statsCards.innerHTML = `
      <div class="admin-stat-card card">
        <strong>${totalUsers}</strong>
        <span>Аккаунтов</span>
      </div>
      <div class="admin-stat-card card">
        <strong>${avgElo}</strong>
        <span>Средний ELO</span>
      </div>
      <div class="admin-stat-card card">
        <strong>${totalKills}</strong>
        <span>Убийств</span>
      </div>
      <div class="admin-stat-card card">
        <strong>${avgWinrate}%</strong>
        <span>Процент побед</span>
      </div>
    `;
  }

  if (elements.statsTopAccounts) {
    const topFive = accounts.slice(0, 5);
    elements.statsTopAccounts.innerHTML = topFive
      .map((account, index) => `
        <article class="admin-list-item admin-list-item--profile">
          <div>
            <strong>${index + 1}. ${account.username}</strong>
            <p>ELO ${account.elo || 0} • M ${account.matches || 0} • W ${account.wins || 0}</p>
          </div>
          <img class="admin-avatar-preview" src="${account.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Player'}" alt="Avatar" />
        </article>
      `)
      .join('') || '<p class="admin-muted">Нет ни одного игрока.</p>';
  }
};

const fetchAchievements = async () => {
  const { data, error } = await supabaseAdmin.from('achievements').select('*');
  if (error) {
    console.error('Error fetching achievements:', error);
    return [];
  }
  return data || [];
};

const saveAchievement = async (event) => {
  event.preventDefault();
  const name = elements.achievementName.value.trim();
  const description = elements.achievementDescription.value.trim();
  const icon = elements.achievementIcon.value.trim();
  const rarity = elements.achievementRarity.value;
  const color = elements.achievementColor.value.trim();
  const id = elements.achievementId?.value;

  if (!name || !icon) {
    showNotice('Заполните название и URL иконки.', 'error');
    return;
  }

  const payload = {
    name,
    description,
    icon,
    rarity,
    color: color || null,
  };

  try {
    if (id) {
      const { error } = await supabaseAdmin
        .from('achievements')
        .update(payload)
        .eq('id', id);
      if (error) throw error;
      showNotice('Достижение обновлено.', 'success');
    } else {
      const { error } = await supabaseAdmin
        .from('achievements')
        .insert([payload]);
      if (error) throw error;
      showNotice('Достижение создано успешно!', 'success');
    }
  } catch (error) {
    console.error('Error saving achievement:', error);
    showNotice('Не удалось сохранить достижение.', 'error');
    return;
  }
  elements.achievementForm.reset();
  if (elements.achievementId) elements.achievementId.value = '';
  refreshAchievements();
  populateAchievementSelect();
};

const deleteAchievement = async (id) => {
  if (!confirm('Удалить это достижение?')) return;
  const { error } = await supabaseAdmin
    .from('achievements')
    .delete()
    .eq('id', id);
  if (error) {
    console.error('Error deleting achievement:', error);
    showNotice('Не удалось удалить достижение.', 'error');
    return;
  }
  showNotice('Достижение удалено.', 'success');
  refreshAchievements();
};

const revokeAchievementFromUser = async (username, achievementId) => {
  const { data: account, error: fetchError } = await supabaseAdmin
    .from('accounts')
    .select('achievements')
    .eq('username', username)
    .maybeSingle();

  if (fetchError || !account) {
    showNotice('Пользователь не найден.', 'error');
    return;
  }

  let achievements = Array.isArray(account.achievements) ? account.achievements : [];
  achievements = achievements.filter(a => String(a.id) !== String(achievementId));

  const { error: updateError } = await supabaseAdmin
    .from('accounts')
    .update({ achievements })
    .eq('username', username);

  if (updateError) {
    showNotice('Не удалось отобрать достижение.', 'error');
    return;
  }

  showNotice('Достижение отобрано.', 'success');
};

const renderAchievementsList = async () => {
  const achievements = await fetchAchievements();
  if (!elements.achievementsList) return;

  if (!achievements.length) {
    elements.achievementsList.innerHTML = '<p class="admin-muted">Нет достижений</p>';
    return;
  }

  elements.achievementsList.innerHTML = achievements
    .map((ach) => `
      <article class="admin-list-item">
        <div style="display: flex; align-items: center; gap: 12px;">
          <img src="${ach.icon}" alt="${ach.name}" style="width: 40px; height: 40px; object-fit: contain;" />
          <div>
            <strong>${ach.name}</strong>
            <p>${ach.rarity || 'Обычное'}</p>
          </div>
        </div>
        <div class="admin-list-actions">
          <button type="button" class="glow-btn glow-btn--outline" data-action="edit-achievement" data-id="${ach.id}">Изменить</button>
          <button type="button" class="glow-btn glow-btn--outline" data-action="delete-achievement" data-id="${ach.id}" style="color: #ff7b6f;">Удалить</button>
          <button type="button" class="glow-btn glow-btn--outline" data-action="grant-achievement" data-id="${ach.id}">Выдать</button>
          <button type="button" class="glow-btn glow-btn--outline" data-action="revoke-achievement" data-id="${ach.id}">Отобрать</button>
        </div>
      </article>
    `)
    .join('');

  elements.achievementsList.addEventListener('click', async (e) => {
    const target = e.target;
    if (!(target instanceof HTMLElement)) return;
    const action = target.dataset.action;
    const id = target.dataset.id;
    if (!action || !id) return;

    if (action === 'delete-achievement') {
      await deleteAchievement(id);
      return;
    }

    if (action === 'edit-achievement') {
      // load achievement and fill form
      const { data, error } = await supabaseAdmin.from('achievements').select('*').eq('id', id).maybeSingle();
      if (error || !data) {
        showNotice('Не удалось загрузить достижение.', 'error');
        return;
      }
      elements.achievementName.value = data.name || '';
      elements.achievementDescription.value = data.description || '';
      elements.achievementIcon.value = data.icon || '';
      elements.achievementRarity.value = data.rarity || 'Обычный';
      elements.achievementColor.value = data.color || '';
      if (elements.achievementId) elements.achievementId.value = data.id;
      updateAchievementPreview();
      showNotice('Редактируйте достижение и нажмите Сохранить.', 'info');
      return;
    }

    if (action === 'grant-achievement') {
      const username = prompt('Введите ник игрока, которому выдать достижение:');
      if (username) await assignAchievementToUser(username.trim(), id);
      return;
    }

    if (action === 'revoke-achievement') {
      const username = prompt('Введите ник игрока, у которого отобрать достижение:');
      if (username) await revokeAchievementFromUser(username.trim(), id);
      return;
    }
  });
};

const refreshAchievements = () => {
  renderAchievementsList();
};

const assignAchievementToUser = async (username, achievementId) => {
  const { data: account, error: fetchError } = await supabaseAdmin
    .from('accounts')
    .select('achievements')
    .eq('username', username)
    .maybeSingle();

  if (fetchError || !account) {
    showNotice('Пользователь не найден.', 'error');
    return;
  }

  let achievements = Array.isArray(account.achievements) ? account.achievements : [];
  const exists = achievements.some(a => a.id === achievementId && a.unlocked);
  if (!exists) {
    achievements.push({
      id: achievementId,
      unlocked: true,
      unlockedDate: new Date().toISOString()
    });
  }

  const { error: updateError } = await supabaseAdmin
    .from('accounts')
    .update({ achievements })
    .eq('username', username);

  if (updateError) {
    showNotice('Не удалось выдать достижение.', 'error');
    return;
  }

  showNotice('Достижение выдано!', 'success');
};

const populateAchievementSelect = async () => {
  const achievements = await fetchAchievements();
  if (!elements.assignAchievementSelect) return;
  
  elements.assignAchievementSelect.innerHTML = achievements
    .map(ach => `<option value="${ach.id}">${ach.name}</option>`)
    .join('');
};

const updateAchievementPreview = () => {
  if (!elements.achievementPreview) return;
  const name = elements.achievementName.value.trim() || 'Название';
  const icon = elements.achievementIcon.value.trim();
  const rarity = elements.achievementRarity.value || 'Обычное';
  const color = elements.achievementColor.value.trim() || '';

  elements.achievementPreviewName.textContent = name;
  elements.achievementPreviewMeta.textContent = `${rarity}${color ? ' • ' + color : ''}`;
  elements.achievementPreviewIcon.innerHTML = icon ? `<img src="${icon}" alt="icon" style="width:48px;height:48px;object-fit:contain;">` : '';
  if (color) elements.achievementPreviewIcon.style.borderColor = color;
};

const handleAssignAchievement = async (event) => {
  event.preventDefault();
  const username = elements.assignUsernameInput.value.trim();
  const achievementId = elements.assignAchievementSelect.value;
  
  if (!username || !achievementId) {
    showNotice('Заполните все поля.', 'error');
    return;
  }
  
  await assignAchievementToUser(username, achievementId);
  elements.assignUsernameInput.value = '';
  elements.assignAchievementSelect.value = '';
};

const initAdmin = () => {
  bindTabs();
  elements.newsForm?.addEventListener('submit', saveNewsItem);
  elements.newsReset?.addEventListener('click', () => fillNewsForm(null));
  elements.newsList && bindNewsActions();
  elements.profileSearchForm?.addEventListener('submit', searchProfile);
  elements.profileForm?.addEventListener('submit', saveProfile);
  elements.profileClear?.addEventListener('click', clearProfileForm);
  elements.achievementForm?.addEventListener('submit', saveAchievement);
  elements.achievementClear?.addEventListener('click', () => {
    elements.achievementForm.reset();
    if (elements.achievementId) elements.achievementId.value = '';
    updateAchievementPreview();
  });
  // live preview listeners
  elements.achievementName?.addEventListener('input', updateAchievementPreview);
  elements.achievementIcon?.addEventListener('input', updateAchievementPreview);
  elements.achievementRarity?.addEventListener('change', updateAchievementPreview);
  elements.achievementColor?.addEventListener('input', updateAchievementPreview);
  elements.assignAchievementForm?.addEventListener('submit', handleAssignAchievement);
  refreshDashboard();
  refreshAchievements();
  populateAchievementSelect();
};

window.addEventListener('DOMContentLoaded', initAdmin);
