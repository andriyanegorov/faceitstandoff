// Инициализация Supabase
const supabaseUrl = "https://zycrvaqqtufgqnbqunvr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Y3J2YXFxdHVmZ3FuYnF1bnZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMTAwOTUsImV4cCI6MjA5Mjg4NjA5NX0.XoxEFdwRb224hHY1TpXUsIDnhpX7xOPHJ6Ukif7BzbY";
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

// Функция расчёта уровня по ELO
function getEloLevel(elo) {
  const e = Number(elo) || 0;
  if (e >= 2000) return 10;
  if (e >= 1750) return 9;
  if (e >= 1500) return 8;
  if (e >= 1350) return 7;
  if (e >= 1201) return 6;
  if (e >= 1051) return 5;
  if (e >= 901) return 4;
  if (e >= 751) return 3;
  if (e >= 501) return 2;
  return 1;
}

// Функция получения информации о текущем уровне и ELO до следующего
function getLevelInfo(elo) {
  const e = Number(elo) || 0;
  const ranges = [
    { level: 1, min: 100, max: 500 },
    { level: 2, min: 501, max: 750 },
    { level: 3, min: 751, max: 900 },
    { level: 4, min: 901, max: 1050 },
    { level: 5, min: 1051, max: 1200 },
    { level: 6, min: 1201, max: 1350 },
    { level: 7, min: 1351, max: 1500 },
    { level: 8, min: 1501, max: 1750 },
    { level: 9, min: 1751, max: 1999 },
    { level: 10, min: 2000, max: Infinity }
  ];
  
  const currentLevel = getEloLevel(e);
  const currentRange = ranges.find(r => r.level === currentLevel);
  
  let eloToNext = 0;
  let nextLevelMin = 0;
  
  if (currentLevel < 10) {
    const nextRange = ranges[currentLevel];
    nextLevelMin = nextRange.min;
    eloToNext = Math.max(0, nextLevelMin - e);
  }
  
  return {
    currentLevel,
    currentElo: e,
    rangeMax: currentRange.max === Infinity ? e : currentRange.max,
    eloToNext,
    nextLevelMin
  };
}

function renderPageState(targetId) {
  const pages = document.querySelectorAll(".page");
  const buttons = document.querySelectorAll(".nav-btn");

  pages.forEach((page) => {
    const isActive = page.id === targetId;
    page.classList.toggle("page--active", isActive);
    page.hidden = !isActive;

    // Инлайн-стиль гарантирует, что одновременно видна только одна страница.
    if (isActive) {
      page.style.display = page.classList.contains("page--stack") ? "grid" : "block";
      
      if (page.id === "leaderboard") {
          renderLeaderboard();
      }

      if (page.id === "matches") {
          renderMatchLobbyBoard();
          renderMatchFlow();
      }
    } else {
      page.style.display = "none";
    }
  });

  buttons.forEach((button) => {
    const isActive = button.dataset.target === targetId;
    button.classList.toggle("nav-btn--active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  window.currentPageTarget = targetId;
}

function setActivePage(targetId) {
  const nextTarget = targetId || "home";

  // Если не авторизован и переходит не на "Главная" - показываем модалку входа.
  if (!window.currentAuthUser && nextTarget !== "home") {
    window.pendingPageTarget = nextTarget;
    renderPageState(window.currentPageTarget || "home");
    window.showLoginModal?.();
    return;
  }

  renderPageState(nextTarget);
  window.pendingPageTarget = null;
}

async function renderLeaderboard() {
  const container = document.getElementById("leaderboard-list");
  if (!container) return;
  container.innerHTML = "<div style='padding: 20px; text-align: center; color: #ff5500;'>Загрузка Leaderboard...</div>";

  try {
    // Получаем реальные аккаунты из Supabase
    const { data: accounts, error } = await supabaseClient
      .from('accounts')
      .select('username, avatar, elo, matches, wins, badge')
      .order('elo', { ascending: false })
      .limit(100);

    if (error) throw error;

    container.innerHTML = "";

    accounts.forEach((player, index) => {
      const isCurrentUser = window.currentAuthUser && window.currentAuthUser.username === player.username;
      const rank = index + 1;
      const level = getEloLevel(player.elo);
      
      let rankClass = "";
      if (rank === 1) rankClass = "rank-gold";
      else if (rank === 2) rankClass = "rank-silver";
      else if (rank === 3) rankClass = "rank-bronze";

      // Для top3 используем специальные изображения, иначе обычный level
      let levelImageSrc = `level/${level}.png`;
      if (rank === 1) levelImageSrc = 'img/top1.png';
      else if (rank === 2) levelImageSrc = 'img/top2.png';
      else if (rank === 3) levelImageSrc = 'img/top3.png';

      const item = document.createElement("div");
      item.className = `leaderboard-item ${rankClass} ${isCurrentUser ? "leaderboard-item--current-user" : ""}`;

      const avatarSrc = player.avatar || "stocks/photo_1.jpg";
      const isTopRank = rank <= 3;
      
      const badgeHtml = (() => {
        if (!player.badge) return "";
        if (player.badge === 'verified') {
          return '<span class="badge-pill badge-pill--verified" title="Верифицированный"><img src="img/Verified.png" alt="Verified"></span>';
        }
        if (player.badge === 'celebrity') {
          return '<span class="badge-pill badge-pill--celebrity" title="Знаменитость"><img src="img/Celebrity.png" alt="Celebrity"></span>';
        }
        if (player.badge === 'admin') {
          return '<span class="badge-pill badge-pill--admin" title="Админ FACEIT"><img src="img/admin.png" alt="Admin"></span>';
        }
        return "";
      })();
      
      item.innerHTML = `
        <div class="lead-col lead-col-rank">
          <span class="rank-badge">${rank}</span>
        </div>
        <div class="lead-col lead-col-player">
          <img src="${avatarSrc}" alt="Avatar" class="lead-player-avatar" onerror="this.src='stocks/photo_1.jpg'">
          <div class="lead-player-name">
            ${player.username}
            ${badgeHtml}
            ${isCurrentUser ? '<span class="lead-badge-you"></span>' : ""}
          </div>
        </div>
        <div class="lead-col lead-col-level">
          <img src="${levelImageSrc}" alt="Level" class="lead-level-icon ${isTopRank ? 'lead-level-icon--top' : ''}" onerror="this.src='level/${level}.png'">
        </div>
        <div class="lead-col lead-col-elo">${player.elo || 0}</div>
      `;
      
      item.style.cursor = "pointer";
      item.addEventListener("click", () => openPlayerModal(player.username));
      
      container.appendChild(item);
    });
  } catch (err) {
    console.error("Ошибка загрузки данных из Supabase:", err);
    container.innerHTML = "<div style='padding: 20px; text-align: center; color: #ff3333;'>Ошибка загрузки Leaderboard. Проверьте подключение.</div>";
  }
}

async function initNewsSlider() {
  const trackEl = document.getElementById("news-track");
  if (!trackEl) return;

  const prevBtn = document.querySelector('[data-news-arrow="prev"]');
  const nextBtn = document.querySelector('[data-news-arrow="next"]');

  let newsItems = [];
  try {
    const { data, error } = await supabaseClient
      .from('news')
      .select('title,text,image,pinned,created_at')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) throw error;
    newsItems = data || [];
  } catch (err) {
    console.error('Ошибка загрузки новостей:', err);
    newsItems = [];
  }

  if (!newsItems.length) {
    newsItems = [
      {
        image: "https://picsum.photos/seed/so2faceit/800/450",
        title: "Старт платформы SO2 FACEIT",
        text: "Запускаем мобильный матчмейкинг по Standoff 2. Следи за обновлениями и готовься к первой очереди.",
      },
      {
        image: "https://picsum.photos/seed/standoff2/800/450",
        title: "Новости теперь листаются влево",
        text: "Добавили автоперелистывание каждые 7 секунд и стрелки для ручного просмотра.",
      },
      {
        image: "",
        title: "Telegram канал",
        text: "Все анонсы и изменения публикуем в Telegram. Иконка — в правом верхнем углу.",
      },
    ];
  }

  trackEl.innerHTML = newsItems
    .map((item) => {
      const img = item.image
        ? `<img class="news-slide__image" src="${item.image}" alt="" loading="lazy" />`
        : "";

      return `
        <article class="news-slide">
          ${img}
          <div class="news-slide__body">
            <h3 class="news-slide__headline">${item.title || item.headline}</h3>
            <p class="news-slide__text">${item.text || ''}</p>
          </div>
        </article>
      `;
    })
    .join("");

  let index = 0;
  let timerId = null;

  const clampIndex = (value) => {
    const len = newsItems.length;
    return ((value % len) + len) % len;
  };

  const render = () => {
    trackEl.style.transform = `translate3d(-${index * 100}%, 0, 0)`;
  };

  const goTo = (nextIndex) => {
    index = clampIndex(nextIndex);
    render();
  };

  const startAuto = () => {
    if (timerId) window.clearInterval(timerId);
    timerId = window.setInterval(() => {
      goTo(index + 1);
    }, 7000);
  };

  const bumpAuto = () => {
    startAuto();
  };

  prevBtn?.addEventListener("click", () => {
    goTo(index - 1);
    bumpAuto();
  });

  nextBtn?.addEventListener("click", () => {
    goTo(index + 1);
    bumpAuto();
  });

  render();
  startAuto();
}

const renderAchievements = (achievements) => {
  const container = document.getElementById("profile-achievements");
  if (!container) return;

  const getAchievementIconClass = (iconUrl) => {
    const cleanUrl = String(iconUrl || "").split("?")[0].toLowerCase();
    if (cleanUrl.endsWith(".gif") || cleanUrl.endsWith(".webp") || cleanUrl.endsWith(".apng")) {
      return "achievement-icon achievement-icon--alive";
    }
    return "achievement-icon";
  };

  const getAchievementPatternStyle = (iconUrl) => {
    const safeUrl = String(iconUrl || "").replace(/"/g, '&quot;');
    return `--achievement-pattern-url: url("${safeUrl}");`;
  };
  
  const unlockedAchievements = Array.isArray(achievements)
    ? achievements.filter((achievement) => achievement && achievement.unlocked)
    : [];

  if (unlockedAchievements.length === 0) {
    container.innerHTML = "<div style='padding: 20px; text-align: center; color: var(--color-text-secondary); grid-column: 1/-1;'>Нет достижений</div>";
    return;
  }

  container.innerHTML = "";
  unlockedAchievements.forEach((achievement) => {
    const badge = document.createElement("div");
    const getRarityClass = (rarity) => {
      const normalized = String(rarity || "").toLowerCase();
      if (normalized.includes("уник")) return "rarity-unique";
      if (normalized.includes("леген")) return "rarity-legendary";
      if (normalized.includes("эпик") || normalized.includes("эпичес")) return "rarity-epic";
      if (normalized.includes("редк")) return "rarity-rare";
      return "rarity-common";
    };

    const rarityClass = getRarityClass(achievement.rarity);
    badge.className = `achievement-badge ${achievement.unlocked ? "" : "locked"} ${rarityClass}`;
    badge.style.cssText = getAchievementPatternStyle(achievement.icon);
    badge.innerHTML = `
      <img src="${achievement.icon}" alt="${achievement.name}" class="${getAchievementIconClass(achievement.icon)}">
    `;
    badge.addEventListener("click", () => openAchievementModal({
      ...achievement,
      ownerUsername: window.currentAuthUser?.username || achievement.ownerUsername,
      ownerBadge: window.currentAuthUser?.badge || achievement.ownerBadge,
    }));
    container.appendChild(badge);
  });
};

const getLobbyEloRange = (elo) => {
  const currentElo = Number(elo) || 0;
  return {
    min: Math.max(0, currentElo - 100),
    max: currentElo + 100,
  };
};

let matchCreateStep = 1;

function toggleCreateForm(show) {
  const createForm = document.getElementById("create-lobby-form");
  if (!createForm) return;
  createForm.hidden = !show;
}

async function renderMatchFlow() {
  const status = document.getElementById("match-flow-status");
  if (!status || !window.currentAuthUser) return;

  status.textContent = "Ищем подходящее 5x5 лобби в твоём диапазоне...";

  try {
    const { lobbies, membersByLobby } = await fetchLobbyBoardData();
    const currentElo = Number(window.currentAuthUser.elo) || 0;
    const candidate = lobbies.find((lobby) => {
      const members = membersByLobby.get(lobby.id) || [];
      const memberCount = members.length;
      const isHost = lobby.host_username === window.currentAuthUser.username;
      const isMember = members.some((member) => member.username === window.currentAuthUser.username);
      const lobbyMin = Number(lobby.min_elo) || 0;
      const lobbyMax = Number(lobby.max_elo) || 0;
      return lobby.status === "open"
        && !isHost
        && !isMember
        && currentElo >= lobbyMin
        && currentElo <= lobbyMax
        && memberCount < Number(lobby.max_players || 10);
    });

    if (candidate) {
      status.textContent = `Найдено подходящее лобби "${candidate.title}". Присоединяюсь...`;
      await lobbyActionById(candidate.id, "join");
      status.textContent = `Вы присоединены к лобби "${candidate.title}".`;
      await renderMatchLobbyBoard();
      return;
    }

    status.textContent = "Подходящего лобби не найдено. Создай своё лобби или обнови список.";
  } catch (error) {
    console.error("Ошибка поиска лобби:", error);
    status.textContent = "Не удалось найти матч. Попробуйте обновить список.";
  }
}

async function fetchLobbyBoardData() {
  const [{ data: lobbies, error: lobbiesError }, { data: members, error: membersError }] = await Promise.all([
    supabaseClient
      .from("lobbies")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(50),
    supabaseClient
      .from("lobby_players")
      .select("lobby_id, username, elo, avatar, team, created_at")
      .order("created_at", { ascending: true }),
  ]);

  if (lobbiesError) throw lobbiesError;
  if (membersError) throw membersError;

  const membersByLobby = new Map();
  (members || []).forEach((member) => {
    if (!membersByLobby.has(member.lobby_id)) membersByLobby.set(member.lobby_id, []);
    membersByLobby.get(member.lobby_id).push(member);
  });

  return {
    lobbies: lobbies || [],
    membersByLobby,
  };
}

async function renderMatchLobbyBoard() {
  const list = document.getElementById("lobby-list");
  const rangeEl = document.getElementById("match-lobby-range");
  if (!list || !rangeEl) return;

  if (!window.currentAuthUser) {
    rangeEl.textContent = "Войдите, чтобы создавать лобби";
    list.innerHTML = "<div class='match-lobby-empty'>Авторизуйся, чтобы видеть и создавать лобби.</div>";
    return;
  }

  const currentElo = Number(window.currentAuthUser.elo) || 0;
  const eloRange = getLobbyEloRange(currentElo);
  rangeEl.textContent = `Твой диапазон для игроков: ${eloRange.min} - ${eloRange.max}`;

  list.innerHTML = "<div class='match-lobby-empty'>Загрузка лобби...</div>";

  try {
    const { lobbies, membersByLobby } = await fetchLobbyBoardData();

    const currentLobby = lobbies.find((lobby) => {
      const members = membersByLobby.get(lobby.id) || [];
      return members.some((member) => member.username === window.currentAuthUser.username);
    });

    renderWaitingLobbyPanel(currentLobby || null, currentLobby ? (membersByLobby.get(currentLobby.id) || []) : []);

    if (!lobbies.length) {
      list.innerHTML = "<div class='match-lobby-empty'>Пока нет открытых лобби. Создай первое.</div>";
      return;
    }

    list.innerHTML = lobbies.map((lobby) => {
      const members = membersByLobby.get(lobby.id) || [];
      const memberCount = members.length;
      const isHost = lobby.host_username === window.currentAuthUser.username;
      const isMember = members.some((member) => member.username === window.currentAuthUser.username);
      const lobbyMin = Number(lobby.min_elo) || 0;
      const lobbyMax = Number(lobby.max_elo) || 0;
      const inRange = currentElo >= lobbyMin && currentElo <= lobbyMax;
      const leaderMember = members.reduce((best, member) => {
        if (!best) return member;
        return Number(member.elo) > Number(best.elo) ? member : best;
      }, null);
      const leaderLabel = leaderMember ? `${leaderMember.username} (${leaderMember.elo} ELO)` : lobby.host_username;
      const isLeader = leaderMember && leaderMember.username === window.currentAuthUser.username;
      const canChangeMap = lobby.status === "open" && isLeader;
      const canJoin = lobby.status === "open" && !isHost && !isMember && inRange && memberCount < Number(lobby.max_players || 10);
      const canLeave = lobby.status === "open" && isMember && !isHost;
      const canStart = lobby.status === "open" && isHost && memberCount >= 2;
      const canClose = isHost;
      const membersPreview = members.slice(0, 5).map((member) => `<span class="match-lobby-member">${member.username}</span>`).join("");

      return `
        <article class="match-lobby-item ${isHost ? 'match-lobby-item--host' : ''}">
          <div class="match-lobby-item__top">
            <div>
              <h3 class="match-lobby-item__title">${lobby.title || 'Кастомное лобби'}</h3>
              <p class="match-lobby-item__meta">${lobby.mode || '5v5'} • ${lobby.map || 'Sandstone'} • ${memberCount}/${lobby.max_players || 10}</p>
              <div class="match-lobby-item__leader">Лидер: ${leaderLabel}</div>
            </div>
            <div class="match-lobby-item__range">${lobbyMin} - ${lobbyMax} ELO</div>
          </div>
          <div class="match-lobby-item__members">${membersPreview || '<span class="match-lobby-empty">Пока никто не зашёл</span>'}</div>
          <div class="match-lobby-item__actions">
            ${canJoin ? `<button type="button" class="glow-btn glow-btn--sm" data-lobby-action="join" data-lobby-id="${lobby.id}">Присоединиться</button>` : ''}
            ${canLeave ? `<button type="button" class="glow-btn glow-btn--outline glow-btn--sm" data-lobby-action="leave" data-lobby-id="${lobby.id}">Выйти</button>` : ''}
            ${canChangeMap ? `<button type="button" class="glow-btn glow-btn--outline glow-btn--sm" data-lobby-action="change-map" data-lobby-id="${lobby.id}">Изменить карту</button>` : ''}
            ${canStart ? `<button type="button" class="glow-btn glow-btn--sm" data-lobby-action="start" data-lobby-id="${lobby.id}">Старт</button>` : ''}
            ${canClose ? `<button type="button" class="glow-btn glow-btn--outline glow-btn--sm" data-lobby-action="close" data-lobby-id="${lobby.id}">Закрыть</button>` : ''}
          </div>
        </article>
      `;
    }).join("");
  } catch (error) {
    console.error("Ошибка загрузки лобби:", error);
    list.innerHTML = "<div class='match-lobby-empty'>Не удалось загрузить лобби.</div>";
  }
}

function renderWaitingLobbyPanel(lobby, members = []) {
  const panel = document.getElementById("match-waiting-panel");
  if (!panel) return;

  if (!lobby || !members.length) {
    panel.hidden = true;
    return;
  }

  const currentUser = window.currentAuthUser?.username;
  const isHost = lobby.host_username === currentUser;
  const teamA = members.slice(0, 5);
  const teamB = members.slice(5, 10);
  const actionButtons = [];

  if (isHost) {
    actionButtons.push(`<button type="button" class="glow-btn" data-lobby-action="start" data-lobby-id="${lobby.id}">Старт</button>`);
  } else {
    actionButtons.push(`<button type="button" class="glow-btn glow-btn--outline" data-lobby-action="leave" data-lobby-id="${lobby.id}">Выйти из лобби</button>`);
  }

  panel.hidden = false;
  panel.innerHTML = `
    <div class="match-waiting-header">
      <div>
        <div class="match-waiting-status">Ожидание матча</div>
        <h3 class="match-waiting-map">${lobby.map || 'Sandstone'}</h3>
        <div class="match-waiting-info">${lobby.title || 'Без названия'} · ${lobby.mode || '5v5'}</div>
      </div>
      <div class="match-waiting-meta">
        <div class="match-waiting-score">0</div>
        <div class="match-waiting-vs">VS</div>
        <div class="match-waiting-score">0</div>
      </div>
    </div>
    <div class="match-waiting-body">
      <div class="match-waiting-column">
        <div class="match-waiting-column__title">Ваша команда</div>
        <div class="match-waiting-players">${teamA.map((member) => `
          <div class="match-waiting-player${member.username === currentUser ? ' match-waiting-player--self' : ''}">
            <img class="match-waiting-player__avatar" src="${member.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Player'}" alt="${member.username}" />
            <div class="match-waiting-player__info">
              <div class="match-waiting-player__name">${member.username}</div>
              <div class="match-waiting-player__meta">ELO ${member.elo || 0}</div>
            </div>
          </div>
        `).join('')}</div>
      </div>
      <div class="match-waiting-column">
        <div class="match-waiting-column__title">Противники</div>
        <div class="match-waiting-players">${teamB.map((member) => `
          <div class="match-waiting-player${member.username === currentUser ? ' match-waiting-player--self' : ''}">
            <img class="match-waiting-player__avatar" src="${member.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=Player'}" alt="${member.username}" />
            <div class="match-waiting-player__info">
              <div class="match-waiting-player__name">${member.username}</div>
              <div class="match-waiting-player__meta">ELO ${member.elo || 0}</div>
            </div>
          </div>
        `).join('')}</div>
      </div>
    </div>
    <div class="match-waiting-footer">
      <p class="match-flow-text">Вы подключены к лобби. Ждём, пока лидер соберёт команду и нажмёт «Старт».</p>
      <div class="match-waiting-action-area">${actionButtons.join('')}</div>
    </div>
  `;
}

async function createMatchLobby(form) {
  if (!window.currentAuthUser) return;

  const title = String(form.querySelector("#lobby-title")?.value || "").trim();
  const map = String(form.querySelector("#lobby-map")?.value || "Sandstone");
  const password = String(form.querySelector("#lobby-password")?.value || "").trim() || null;
  const hostElo = Number(window.currentAuthUser.elo) || 0;
  const eloRange = getLobbyEloRange(hostElo);

  const lobbyPayload = {
    title,
    host_username: window.currentAuthUser.username,
    host_elo: hostElo,
    min_elo: eloRange.min,
    max_elo: eloRange.max,
    mode: "5v5",
    map,
    max_players: 10,
    status: "open",
    password,
  };

  const { data: lobby, error } = await supabaseClient
    .from("lobbies")
    .insert([lobbyPayload])
    .select()
    .single();

  if (error) throw error;

  const memberPayload = {
    lobby_id: lobby.id,
    username: window.currentAuthUser.username,
    elo: hostElo,
    avatar: window.currentAuthUser.avatar || null,
    team: "host",
  };

  const { error: memberError } = await supabaseClient
    .from("lobby_players")
    .insert([memberPayload]);

  if (memberError) throw memberError;

  form.reset();
  toggleCreateForm(false);
  const status = document.getElementById("match-flow-status");
  if (status) {
    status.textContent = `Лобби "${title || '5x5'}" создано. Жди игроков или обнови список.`;
  }
  await renderMatchLobbyBoard();
}

async function lobbyActionById(lobbyId, action) {
  if (!window.currentAuthUser || !lobbyId || !action) return;

  if (action === "change-map") {
    const mapOptions = ["Sandstone", "Rust", "Province", "Zone 9", "Sakura", "Breeze", "Dune"];
    const choice = prompt(
      `Выберите карту для лобби (введите номер или название):\n${mapOptions.map((map, index) => `${index + 1}. ${map}`).join("\n")}`
    );
    if (!choice) return;

    const selected = mapOptions.find((map, index) => 
      String(index + 1) === choice.trim() || map.toLowerCase() === choice.trim().toLowerCase()
    );
    if (!selected) {
      alert("Неверная карта. Попробуй ещё раз.");
      return;
    }

    const { error } = await supabaseClient
      .from("lobbies")
      .update({ map: selected })
      .eq("id", lobbyId);

    if (error) throw error;
    await renderMatchLobbyBoard();
    return;
  }

  if (action === "join") {
    const { data: lobby, error } = await supabaseClient
      .from("lobbies")
      .select("*")
      .eq("id", lobbyId)
      .maybeSingle();

    if (error || !lobby) return;

    const currentElo = Number(window.currentAuthUser.elo) || 0;
    if (currentElo < Number(lobby.min_elo) || currentElo > Number(lobby.max_elo)) {
      alert("Твой ELO не попадает в диапазон этого лобби.");
      return;
    }

    const { data: members, error: membersError } = await supabaseClient
      .from("lobby_players")
      .select("id, username")
      .eq("lobby_id", lobbyId);

    if (membersError) throw membersError;

    if ((members || []).some((member) => member.username === window.currentAuthUser.username)) {
      return;
    }

    if ((members || []).length >= Number(lobby.max_players || 10)) {
      alert("Лобби уже заполнено.");
      return;
    }

    const { error: insertError } = await supabaseClient
      .from("lobby_players")
      .insert([{
        lobby_id: lobbyId,
        username: window.currentAuthUser.username,
        elo: currentElo,
        avatar: window.currentAuthUser.avatar || null,
        team: "auto",
      }]);

    if (insertError) throw insertError;
  }

  if (action === "leave") {
    const { error } = await supabaseClient
      .from("lobby_players")
      .delete()
      .eq("lobby_id", lobbyId)
      .eq("username", window.currentAuthUser.username);

    if (error) throw error;
  }

  if (action === "start") {
    const { error } = await supabaseClient
      .from("lobbies")
      .update({ status: "in_progress" })
      .eq("id", lobbyId)
      .eq("host_username", window.currentAuthUser.username);

    if (error) throw error;
  }

  if (action === "close") {
    const { error: membersDeleteError } = await supabaseClient
      .from("lobby_players")
      .delete()
      .eq("lobby_id", lobbyId);

    if (membersDeleteError) throw membersDeleteError;

    const { error: lobbyDeleteError } = await supabaseClient
      .from("lobbies")
      .delete()
      .eq("id", lobbyId)
      .eq("host_username", window.currentAuthUser.username);

    if (lobbyDeleteError) throw lobbyDeleteError;
  }

  await renderMatchLobbyBoard();
}

function initMatchLobbyBoard() {
  const createLobbyForm = document.getElementById("create-lobby-form");
  const refreshBtn = document.getElementById("refresh-lobbies-btn");
  const lobbyList = document.getElementById("lobby-list");

  if (createLobbyForm && !createLobbyForm.dataset.bound) {
    createLobbyForm.dataset.bound = "true";
    createLobbyForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      try {
        await createMatchLobby(createLobbyForm);
      } catch (error) {
        console.error("Ошибка создания лобби:", error);
        alert(error?.message || "Не удалось создать лобби.");
      }
    });
  }

  if (refreshBtn && !refreshBtn.dataset.bound) {
    refreshBtn.dataset.bound = "true";
    refreshBtn.addEventListener("click", () => {
      renderMatchLobbyBoard();
      renderMatchFlow();
    });
  }

  const matchSearchStartBtn = document.getElementById("match-search-start-btn");
  const matchCreateToggleBtn = document.getElementById("match-create-toggle-btn");
  const matchRefreshBtn = document.getElementById("match-refresh-btn");
  const matchCreateFromWaitBtn = document.getElementById("match-create-from-wait-btn");

  if (matchSearchStartBtn && !matchSearchStartBtn.dataset.bound) {
    matchSearchStartBtn.dataset.bound = "true";
    matchSearchStartBtn.addEventListener("click", () => {
      toggleCreateForm(false);
      renderMatchFlow();
    });
  }

  if (matchCreateToggleBtn && !matchCreateToggleBtn.dataset.bound) {
    matchCreateToggleBtn.dataset.bound = "true";
    matchCreateToggleBtn.addEventListener("click", () => toggleCreateForm(true));
  }

  if (matchRefreshBtn && !matchRefreshBtn.dataset.bound) {
    matchRefreshBtn.dataset.bound = "true";
    matchRefreshBtn.addEventListener("click", () => renderMatchFlow());
  }

  if (matchCreateFromWaitBtn && !matchCreateFromWaitBtn.dataset.bound) {
    matchCreateFromWaitBtn.dataset.bound = "true";
    matchCreateFromWaitBtn.addEventListener("click", () => toggleCreateForm(true));
  }

  if (lobbyList && !lobbyList.dataset.bound) {
    lobbyList.dataset.bound = "true";
    lobbyList.addEventListener("click", async (event) => {
      const target = event.target.closest("button[data-lobby-action]");
      if (!target) return;

      const lobbyId = target.dataset.lobbyId;
      const action = target.dataset.lobbyAction;

      try {
        await lobbyActionById(lobbyId, action);
      } catch (error) {
        console.error("Ошибка действия лобби:", error);
        alert(error?.message || "Не удалось выполнить действие.");
      }
    });
  }

  const waitingPanel = document.getElementById("match-waiting-panel");
  if (waitingPanel && !waitingPanel.dataset.bound) {
    waitingPanel.dataset.bound = "true";
    waitingPanel.addEventListener("click", async (event) => {
      const target = event.target.closest("button[data-lobby-action]");
      if (!target) return;

      const lobbyId = target.dataset.lobbyId;
      const action = target.dataset.lobbyAction;

      try {
        await lobbyActionById(lobbyId, action);
        await renderMatchLobbyBoard();
      } catch (error) {
        console.error("Ошибка действия лобби:", error);
        alert(error?.message || "Не удалось выполнить действие.");
      }
    });
  }
}

async function openAchievementModal(achievement) {
  const modal = document.getElementById("achievement-modal");
  const content = document.getElementById("achievement-modal-content");
  if (!modal || !content) return;

  const cleanIconUrl = String(achievement.icon || "").split("?")[0].toLowerCase();
  const isAnimatedIcon = /\.(gif|webp|apng)$/.test(cleanIconUrl);
  const rarityLabel = achievement.rarity || "Обычное";
  const ownerUsername = achievement.ownerUsername || "-";
  const ownerBadge = achievement.ownerBadge || null;
  const ownerBadgeHtml = (() => {
    if (!ownerBadge) return "";
    if (ownerBadge === "verified") {
      return '<span class="badge-pill badge-pill--verified" title="Верифицированный"><img src="img/Verified.png" alt="Verified"></span>';
    }
    if (ownerBadge === "celebrity") {
      return '<span class="badge-pill badge-pill--celebrity" title="Знаменитость"><img src="img/Celebrity.png" alt="Celebrity"></span>';
    }
    if (ownerBadge === "admin") {
      return '<span class="badge-pill badge-pill--admin" title="Админ FACEIT"><img src="img/admin.png" alt="Admin"></span>';
    }
    return "";
  })();
  const detailRows = [
    ["Владелец", `${ownerUsername} ${ownerBadgeHtml}`.trim()],
    ["Редкость", rarityLabel],
    ["Цвет", achievement.color || "-"],
    ["Описание", achievement.description || "Особое достижение"],
  ];
  
  modal.hidden = false;
  content.innerHTML = `
    <div class="achievement-modal-content">
      <div class="achievement-modal-hero ${achievement.color ? "" : "achievement-modal-hero--default"}" style="${achievement.color ? `--achievement-accent: ${achievement.color};` : ""} --achievement-pattern-url: url(\"${String(achievement.icon || "").replace(/\"/g, '&quot;')}\");">
        <div class="achievement-modal-hero__pattern"></div>
        <div class="achievement-modal-hero__icon-wrap">
          <img src="${achievement.icon}" alt="${achievement.name}" class="achievement-modal-icon ${isAnimatedIcon ? "achievement-modal-icon--alive" : ""}">
        </div>
        <h2 class="achievement-modal-title">${achievement.name}</h2>
        <p class="achievement-modal-subtitle">${rarityLabel}</p>
      </div>

      <div class="achievement-modal-panel">
        <div class="achievement-modal-table">
          ${detailRows
            .map(([label, value]) => `
              <div class="achievement-modal-row">
                <div class="achievement-modal-row__label">${label}</div>
                <div class="achievement-modal-row__value">${value}</div>
              </div>
            `)
            .join("")}
        </div>

        <div class="achievement-modal-note">
          <span>Достижение отображается в профиле и в топе лидеров.</span>
        </div>

        <button type="button" class="glow-btn achievement-modal-btn" id="achievement-modal-ok">OK</button>
      </div>
    </div>
  `;

  const okButton = document.getElementById("achievement-modal-ok");
  okButton?.addEventListener("click", () => {
    modal.hidden = true;
  });
}

// Инициализация кадрирования шапки профиля
function initHeaderCropping() {
  const cropModal = document.getElementById("crop-modal");
  const cropCanvas = document.getElementById("crop-canvas");
  const cropReset = document.getElementById("crop-reset");
  const cropSave = document.getElementById("crop-save");
  const closeCropModal = document.getElementById("close-crop-modal");
  const editBgBtn = document.getElementById("edit-bg-btn");
  const bgUpload = document.getElementById("bg-upload");

  if (!cropModal || !cropCanvas || !cropReset || !cropSave || !closeCropModal || !editBgBtn || !bgUpload) return;

  let currentImage = null;
  let offsetX = 0;
  let offsetY = 0;
  let scale = 1;
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  const ctx = cropCanvas.getContext("2d");

  const drawCanvas = () => {
    if (!currentImage) return;
    const container = cropCanvas.parentElement;
    cropCanvas.width = container.offsetWidth;
    cropCanvas.height = container.offsetHeight;

    ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
    ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
    ctx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);

    const imgWidth = currentImage.width * scale;
    const imgHeight = currentImage.height * scale;
    ctx.drawImage(currentImage, offsetX, offsetY, imgWidth, imgHeight);

    ctx.strokeStyle = "rgba(0, 217, 255, 0.6)";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, cropCanvas.width, cropCanvas.height);
  };

  const resetCrop = () => {
    scale = 1;
    offsetX = 0;
    offsetY = 0;
    drawCanvas();
  };

  editBgBtn.addEventListener("click", () => bgUpload.click());
  bgUpload.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const img = new Image();
      img.onload = () => {
        currentImage = img;
        scale = 1;
        offsetX = 0;
        offsetY = 0;
        cropModal.hidden = false;
        setTimeout(() => drawCanvas(), 50);
      };
      img.src = evt.target.result;
    };
    reader.readAsDataURL(file);
  });

  cropCanvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging || cropModal.hidden) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    offsetX += dx;
    offsetY += dy;
    startX = e.clientX;
    startY = e.clientY;
    drawCanvas();
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
  });

  cropCanvas.addEventListener("wheel", (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    scale *= zoomFactor;
    scale = Math.max(0.5, Math.min(scale, 5));
    drawCanvas();
  });

  closeCropModal.addEventListener("click", () => {
    cropModal.hidden = true;
    currentImage = null;
  });

  cropModal.addEventListener("click", (e) => {
    if (e.target === cropModal) {
      cropModal.hidden = true;
      currentImage = null;
    }
  });

  cropReset.addEventListener("click", resetCrop);

  cropSave.addEventListener("click", async () => {
    if (!currentImage) return;

    const container = cropCanvas.parentElement;
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = container.offsetWidth;
    tempCanvas.height = container.offsetHeight;
    const tempCtx = tempCanvas.getContext("2d");

    const imgWidth = currentImage.width * scale;
    const imgHeight = currentImage.height * scale;
    tempCtx.drawImage(currentImage, offsetX, offsetY, imgWidth, imgHeight);

    const base64 = tempCanvas.toDataURL("image/jpeg", 0.9);

    if (window.currentAuthUser) {
      window.currentAuthUser.headerBg = base64;
      saveData();
      await updateUI();
    }

    cropModal.hidden = true;
    currentImage = null;
  });
}

function readState() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return {
      accounts: normalizeAccounts(raw.accounts),
      currentUser: raw.currentUser || null,
    };
  } catch {
    return {
      accounts: [],
      currentUser: null,
    };
  }
}

// Авторизация
function initAuth() {
  const registerModal = document.getElementById("register-modal");
  const loginModal = document.getElementById("login-modal");
  const matchModal = document.getElementById("match-modal");
  const matchModalContent = document.getElementById("match-modal-content");
  const closeMatchModalBtn = document.getElementById("close-match-modal");

  const registerForm = document.getElementById("register-form");
  const loginForm = document.getElementById("login-form");

  const registerUsernameInput = document.getElementById("register-username");
  const registerStandoff2IdInput = document.getElementById("register-standoff2-id");
  const registerPasswordInput = document.getElementById("register-password");
  const registerConfirmInput = document.getElementById("register-confirm");

  const loginUsernameInput = document.getElementById("login-username");
  const loginPasswordInput = document.getElementById("login-password");

  const toLoginLink = document.getElementById("to-login-from-register");
  const toRegisterLink = document.getElementById("to-register-from-login");

  const loginBtn = document.getElementById("login-btn");
  const logoutBtn = document.getElementById("logout-btn");
  const toggleMatchHistory = document.getElementById("toggle-match-history");

  const profileName = document.getElementById("profile-name");
  const profileStatus = document.getElementById("profile-status");
  const profileStandoff2Id = document.getElementById("profile-standoff2-id");
  const profileLevel = document.getElementById("profile-level");
  const profileElo = document.getElementById("profile-elo");
  const eloLevelIcon = document.getElementById("elo-level-icon");
  const eloLevelCurrent = document.getElementById("elo-level-current");
  const eloLevelNext = document.getElementById("elo-level-next");
  const profileAvatar = document.getElementById("profile-avatar");
  const profileMatches = document.getElementById("profile-matches");
  const profileWins = document.getElementById("profile-wins");
  const profileLosses = document.getElementById("profile-losses");
  const profileWinrate = document.getElementById("profile-winrate");
  const profileKd = document.getElementById("profile-kd");
  const profileAvgKills = document.getElementById("profile-avg-kills");
  const profileHs = document.getElementById("profile-hs");
  const profileMatchHistory = document.getElementById("profile-match-history");
  const eloChart = document.getElementById("elo-chart");

  const editBgBtn = document.getElementById("edit-bg-btn");
  const editAvatarBtn = document.getElementById("edit-avatar-btn");
  const bgUpload = document.getElementById("bg-upload");
  const avatarUpload = document.getElementById("avatar-upload");
  const profileBg = document.getElementById("profile-bg");

  const STORAGE_KEY = "so2_faceit_state_v1";

  window.currentAuthUser = null;

  const normalizeAccounts = (value) => {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      return Object.values(value).filter((item) => item && typeof item === "object");
    }
    return [];
  };

  // Инициализация кадрирования шапки профиля
  function initHeaderCropping() {
    const cropModal = document.getElementById("crop-modal");
    const cropCanvas = document.getElementById("crop-canvas");
    const cropReset = document.getElementById("crop-reset");
    const cropSave = document.getElementById("crop-save");
    const closeCropModal = document.getElementById("close-crop-modal");
    const editBgBtn = document.getElementById("edit-bg-btn");
    const bgUpload = document.getElementById("bg-upload");

    if (!cropModal || !cropCanvas || !cropReset || !cropSave || !closeCropModal || !editBgBtn || !bgUpload) return;

    let currentImage = null;
    let offsetX = 0;
    let offsetY = 0;
    let scale = 1;
    let isDragging = false;
    let startX = 0;
    let startY = 0;

    const ctx = cropCanvas.getContext("2d");

    const drawCanvas = () => {
      if (!currentImage) return;
      const container = cropCanvas.parentElement;
      cropCanvas.width = container.offsetWidth;
      cropCanvas.height = container.offsetHeight;

      ctx.clearRect(0, 0, cropCanvas.width, cropCanvas.height);
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, cropCanvas.width, cropCanvas.height);

      const imgWidth = currentImage.width * scale;
      const imgHeight = currentImage.height * scale;
      ctx.drawImage(currentImage, offsetX, offsetY, imgWidth, imgHeight);

      ctx.strokeStyle = "rgba(0, 217, 255, 0.6)";
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, cropCanvas.width, cropCanvas.height);
    };

    const resetCrop = () => {
      scale = 1;
      offsetX = 0;
      offsetY = 0;
      drawCanvas();
    };

    editBgBtn.addEventListener("click", () => bgUpload.click());
    bgUpload.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = new Image();
        img.onload = () => {
          currentImage = img;
          scale = 1;
          offsetX = 0;
          offsetY = 0;
          cropModal.hidden = false;
          setTimeout(() => drawCanvas(), 50);
        };
        img.src = evt.target.result;
      };
      reader.readAsDataURL(file);
    });

    cropCanvas.addEventListener("mousedown", (e) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
    });

    window.addEventListener("mousemove", (e) => {
      if (!isDragging || cropModal.hidden) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      offsetX += dx;
      offsetY += dy;
      startX = e.clientX;
      startY = e.clientY;
      drawCanvas();
    });

    window.addEventListener("mouseup", () => {
      isDragging = false;
    });

    cropCanvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      scale *= zoomFactor;
      scale = Math.max(0.5, Math.min(scale, 5));
      drawCanvas();
    });

    closeCropModal.addEventListener("click", () => {
      cropModal.hidden = true;
      currentImage = null;
    });

    cropModal.addEventListener("click", (e) => {
      if (e.target === cropModal) {
        cropModal.hidden = true;
        currentImage = null;
      }
    });

    cropReset.addEventListener("click", resetCrop);

    cropSave.addEventListener("click", async () => {
      if (!currentImage) return;

      const container = cropCanvas.parentElement;
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = container.offsetWidth;
      tempCanvas.height = container.offsetHeight;
      const tempCtx = tempCanvas.getContext("2d");

      const imgWidth = currentImage.width * scale;
      const imgHeight = currentImage.height * scale;
      tempCtx.drawImage(currentImage, offsetX, offsetY, imgWidth, imgHeight);

      const base64 = tempCanvas.toDataURL("image/jpeg", 0.9);

      if (window.currentAuthUser) {
        window.currentAuthUser.headerBg = base64;
        saveData();
        await updateUI();
      }

      cropModal.hidden = true;
      currentImage = null;
    });
  }

  const writeState = (state) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  };

  const loadUser = async () => {
    try {
      const userStr = localStorage.getItem(STORAGE_KEY + '_user');
      if (userStr) {
        let parsed = JSON.parse(userStr);
        if (parsed && parsed.username) {
          const fresh = await getAccountByUsername(parsed.username);
          if (fresh) {
            // Merge server data with local parsed fallback for missing numeric stats
            const merged = {
              ...fresh,
              // fallback to parsed for specific numeric/stat fields if server missing them
              matches: (fresh.matches ?? parsed.matches ?? 0),
              wins: (fresh.wins ?? parsed.wins ?? 0),
              kills: (fresh.kills ?? parsed.kills ?? 0),
              deaths: (fresh.deaths ?? parsed.deaths ?? 0),
              headshots: (fresh.headshots ?? parsed.headshots ?? 0),
              // preserve locally-cached matchHistory/achievements if server doesn't provide
              matchHistory: (fresh.matchHistory ?? parsed.matchHistory ?? []),
              achievements: (fresh.achievements ?? parsed.achievements ?? []),
            };
            window.currentAuthUser = merged;
          } else {
            // If server fetch failed, keep parsed version
            window.currentAuthUser = parsed;
          }
        } else {
          window.currentAuthUser = parsed;
        }
        await updateUI();
        return;
      }
    } catch (error) {
      console.error('Ошибка загрузки текущего пользователя:', error);
    }

    window.currentAuthUser = null;
    await updateUI();
  };

  const saveData = () => {
    localStorage.setItem(STORAGE_KEY + '_user', JSON.stringify(window.currentAuthUser));
  };

  const getAccountByUsername = async (username) => {
    const { data, error } = await supabaseClient
      .from('accounts')
      .select('*')
      .eq('username', username)
      .maybeSingle(); // Используем maybeSingle вместо single, чтобы избежать 406 ошибки (PGRST116), если аккаунт не найден
    
    if (error) {
      console.error(error);
      return null;
    }
    return data;
  };

  const createAccount = async (username, password, standoff2Id) => {
    const randomAvatarIndex = Math.floor(Math.random() * 7) + 1; // stocks/photo_1.jpg to photo_7.jpg

    const newAccountData = {
      username,
      password,
      standoff2_id: String(standoff2Id || "").trim(),
      avatar: `stocks/photo_${randomAvatarIndex}.jpg`,
      elo: 1000,
      matches: 0,
      wins: 0,
      kills: 0,
      deaths: 0,
      headshots: 0
    };

    const { data, error } = await supabaseClient
      .from('accounts')
      .insert([newAccountData])
      .select()
      .single();

    if (error) {
      console.error("Ошибка при создании аккаунта:", error);
      throw error;
    }

    const accountForClient = {
      ...data,
      level: getEloLevel(1000),
      losses: 0,
      headshotRate: 0,
      avgKills: 0,
      matchHistory: [],
      achievements: [],
    };

    return accountForClient;
  };

  const updateAccountProfile = async (changes) => {
    if (!window.currentAuthUser || !window.currentAuthUser.username) return null;

    const { data, error } = await supabaseClient
      .from('accounts')
      .update(changes)
      .eq('username', window.currentAuthUser.username)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Ошибка обновления профиля:', error);
      return null;
    }

    window.currentAuthUser = {
      ...window.currentAuthUser,
      ...data,
    };
    saveData();
    return window.currentAuthUser;
  };

  const generateMatchHistory = (startElo, count) => {
    const history = [];
    let currentElo = Number(startElo) || 1200;
    const maps = ["Sandstone", "Rust", "Province", "Zone 9", "Sakura", "Breeze", "Dune"];

    for (let i = 0; i < count; i += 1) {
      const delta = Math.floor(Math.random() * 55) - 25;
      const normalizedDelta = delta === 0 ? 8 : delta;
      currentElo += normalizedDelta;

      const kills = 10 + Math.floor(Math.random() * 16);
      const deaths = 7 + Math.floor(Math.random() * 13);
      const assists = 2 + Math.floor(Math.random() * 8);

      history.push({
        match: i + 1,
        map: maps[Math.floor(Math.random() * maps.length)],
        result: normalizedDelta > 0 ? "Победа" : "Поражение",
        eloChange: normalizedDelta,
        eloAfter: currentElo,
        kills,
        deaths,
        assists,
      });
    }

    return history;
  };

  const getTotalsFromHistory = (history) => {
    const safeHistory = Array.isArray(history) ? history.slice(-10) : [];

    if (!safeHistory.length) {
      return {
        matches: 0,
        wins: 0,
        losses: 0,
        kills: 0,
        deaths: 0,
        avgKills: 0,
        headshotRate: 0,
        currentElo: 1200,
      };
    }

    let wins = 0;
    let losses = 0;
    let kills = 0;
    let deaths = 0;

    safeHistory.forEach((match) => {
      const delta = Number(match.eloChange) || 0;
      if (delta >= 0) wins += 1;
      else losses += 1;

      kills += Number(match.kills) || 0;
      deaths += Number(match.deaths) || 0;
    });

    const avgKills = kills / safeHistory.length;
    const headshotRate = Math.max(18, Math.min(75, Math.round(22 + (wins / safeHistory.length) * 28)));
    const currentElo = Number(safeHistory[safeHistory.length - 1].eloAfter) || 1200;

    return {
      matches: safeHistory.length,
      wins,
      losses,
      kills,
      deaths,
      avgKills,
      headshotRate,
      currentElo,
    };
  };

  const ensureUserStats = (user) => {
    if (!user) return null;

    const profile = { ...user };
    if (!profile.avatar) {
      profile.avatar = `stocks/photo_${Math.floor(Math.random() * 7) + 1}.jpg`;
    }

    profile.matches = Number(profile.matches) || 0;
    profile.wins = Number(profile.wins) || 0;
    profile.losses = Number(profile.losses || (profile.matches - profile.wins)) || 0;
    profile.kills = Number(profile.kills) || 0;
    profile.deaths = Number(profile.deaths) || 0;
    profile.headshots = Number(profile.headshots) || 0;
    profile.headshotRate = typeof profile.headshotRate === 'number'
      ? profile.headshotRate
      : profile.headshots && profile.kills
        ? Math.round((profile.headshots / profile.kills) * 100)
        : 0;
    profile.avgKills = typeof profile.avgKills === 'number'
      ? profile.avgKills
      : profile.matches > 0
        ? Number((profile.kills / profile.matches).toFixed(1))
        : 0;

    if (Array.isArray(profile.matchHistory)) {
      profile.matchHistory = profile.matchHistory.slice(-10);
    } else {
      profile.matchHistory = [];
    }

    const totals = profile.matchHistory.length > 0 ? getTotalsFromHistory(profile.matchHistory) : null;
    profile.matches = Number(profile.matches) || (totals ? totals.matches : 0);
    profile.wins = Number(profile.wins) || (totals ? totals.wins : 0);
    profile.losses = Number(profile.losses) || (totals ? totals.losses : 0);
    profile.kills = Number(profile.kills) || (totals ? totals.kills : 0);
    profile.deaths = Number(profile.deaths) || (totals ? totals.deaths : 0);
    profile.avgKills = Number(profile.avgKills) || (totals ? totals.avgKills : 0);
    profile.headshotRate = Number(profile.headshotRate) || (totals ? totals.headshotRate : 0);
    profile.elo = Number(profile.elo) || (totals ? totals.currentElo : 1200);

    if (!Array.isArray(profile.achievements)) {
      profile.achievements = [];
    }

    // Auto-calculate level based on ELO
    profile.level = getEloLevel(profile.elo);

    return profile;
  };

  const renderEloChart = (history) => {
    if (!eloChart) return;
    const safeHistory = Array.isArray(history) ? history.slice(-10) : [];

    if (!safeHistory.length) {
      eloChart.innerHTML = "";
      return;
    }

    const width = 330;
    const height = 158;
    const paddingX = 26;
    const paddingTop = 12;
    const paddingBottom = 24;

    const eloValues = safeHistory.map((item) => Number(item.eloAfter) || 0);
    const minElo = Math.min(...eloValues);
    const maxElo = Math.max(...eloValues);
    const span = Math.max(1, maxElo - minElo);

    const points = safeHistory
      .map((item, index) => {
        const x = paddingX + (index * (width - paddingX * 2)) / (safeHistory.length - 1 || 1);
        const y = paddingTop + ((maxElo - (Number(item.eloAfter) || minElo)) * (height - paddingTop - paddingBottom)) / span;
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      })
      .join(" ");

    const yTop = maxElo;
    const yBottom = minElo;

    eloChart.innerHTML = `
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
        <line class="elo-chart__grid" x1="${paddingX}" y1="${paddingTop}" x2="${width - paddingX}" y2="${paddingTop}" />
        <line class="elo-chart__grid" x1="${paddingX}" y1="${height - paddingBottom}" x2="${width - paddingX}" y2="${height - paddingBottom}" />
        <polyline class="elo-chart__line" points="${points}" />
        ${safeHistory
          .map((item, index) => {
            const x = paddingX + (index * (width - paddingX * 2)) / (safeHistory.length - 1 || 1);
            const y = paddingTop + ((maxElo - (Number(item.eloAfter) || minElo)) * (height - paddingTop - paddingBottom)) / span;
            return `<circle class="elo-chart__point" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="2.8" />`;
          })
          .join("")}
        <text class="elo-chart__label" x="${paddingX}" y="${height - 6}">1</text>
        <text class="elo-chart__label" x="${width - paddingX - 8}" y="${height - 6}">10</text>
        <text class="elo-chart__label" x="${paddingX}" y="${paddingTop - 2}">${yTop}</text>
        <text class="elo-chart__label" x="${paddingX}" y="${height - paddingBottom - 4}">${yBottom}</text>
      </svg>
      <div id="elo-tooltip" class="elo-chart__tooltip"></div>
    `;

    const tooltip = document.getElementById("elo-tooltip");
    const circles = eloChart.querySelectorAll(".elo-chart__point");

    circles.forEach((circle, index) => {
      circle.addEventListener("click", (e) => {
        e.stopPropagation();
        
        circles.forEach(c => c.classList.remove("active"));
        circle.classList.add("active");

        const targetMatch = safeHistory[index];
        if (!targetMatch) return;

        const isWin = targetMatch.eloChange > 0;
        const sign = isWin ? '+' : '';
        const colorClass = isWin ? 'win' : 'loss';
        const mapName = targetMatch.map || "Разное";

        tooltip.innerHTML = `
          <div class="tooltip-title">
            <span>${mapName}</span>
            <span class="${colorClass}">${sign}${targetMatch.eloChange} ELO</span>
          </div>
          <div class="tooltip-stats">
            <span>ELO: <strong>${targetMatch.eloAfter}</strong></span>
            <span>K/D/A: <strong>${targetMatch.kills}/${targetMatch.deaths}/${targetMatch.assists}</strong></span>
          </div>
        `;

        const chartRect = eloChart.getBoundingClientRect();
        const svgRect = circle.closest("svg").getBoundingClientRect();
        
        const cx = parseFloat(circle.getAttribute("cx"));
        const cy = parseFloat(circle.getAttribute("cy"));
        
        // Масштабирование SVG-координат к реальным пикселям экрана (поскольку viewBox тянется)
        const scaleX = svgRect.width / width;
        const scaleY = svgRect.height / height;
        
        const realX = cx * scaleX;
        const realY = cy * scaleY;

        tooltip.style.left = `${realX}px`;
        tooltip.style.top = `${realY}px`;
        tooltip.classList.add("show");
      });
    });

    document.addEventListener("click", () => {
      if (tooltip) {
        tooltip.classList.remove("show");
        circles.forEach(c => c.classList.remove("active"));
      }
    });

    tooltip.addEventListener("click", (e) => e.stopPropagation());
  };

  const renderMatchHistory = (history) => {
    if (!profileMatchHistory) return;
    const safeHistory = Array.isArray(history) ? [...history].reverse().slice(0, 10) : [];

    profileMatchHistory.innerHTML = safeHistory
      .map((match, idx) => {
        const delta = Number(match.eloChange) || 0;
        const isWin = delta > 0;
        const deltaSign = isWin ? `+${delta}` : `${delta}`;
        const deltaClass = isWin ? "match-row__delta match-row__delta--up" : "match-row__delta match-row__delta--down";
        const resultClass = isWin ? "match-row__result match-row__result--win" : "match-row__result match-row__result--loss";
        
        const k = match.kills || 0;
        const d = match.deaths || 0;
        const a = match.assists || 0;
        const kd = d > 0 ? (k / d).toFixed(2) : k.toFixed(2);
        const mapName = match.map || "Sandstone";
        const kdColor = (k / (d || 1)) >= 1 ? '#31f19c' : '#ff7b6f';

        return `
          <div class="match-row" style="cursor:pointer;" data-match-id="${idx}">
            <div class="match-row__main">
              <div class="match-row__title">
                <span class="match-row__map">${mapName}</span>
                <span class="${resultClass}">${match.result || "Матч"}</span>
              </div>
              <div class="match-row__stats">
                <span class="match-row__stat-item">K/D/A: <strong>${k}/${d}/${a}</strong></span>
                <span class="match-row__stat-item">K/D: <strong style="color: ${kdColor}; text-shadow: 0 0 5px ${kdColor}40;">${kd}</strong></span>
              </div>
            </div>
            <div class="match-row__right">
              <span class="${deltaClass}">${deltaSign}</span>
              <span class="match-row__elo">ELO ${Number(match.eloAfter) || 0}</span>
            </div>
          </div>
        `;
      })
      .join("");

    const rows = profileMatchHistory.querySelectorAll(".match-row");
    rows.forEach(row => {
      row.addEventListener("click", () => {
        const idx = row.getAttribute("data-match-id");
        if (safeHistory[idx]) {
          openMatchDetails(safeHistory[idx]);
        }
      });
    });
  };

  const openMatchDetails = (matchData) => {
    const isWin = (matchData.eloChange || 0) > 0;
    
    // Генерируем случайных игроков для матча
    const generateTeam = (count, teamIsWin, includeMe) => {
      const players = [];
      const user = window.currentAuthUser;
      
      for(let i=0; i<count; i++) {
        if (includeMe && i === 0) {
          players.push({
            name: user.username,
            avatar: user.avatar,
            level: user.level || 1,
            elo: matchData.eloAfter,
            kills: matchData.kills,
            deaths: matchData.deaths,
            assists: matchData.assists,
            isMe: true
          });
        } else {
          const names = ["Killer", "ProGamer", "Sniper", "Noob", "Ninja", "Destroyer", "Ghost", "Vampire", "Phantom"];
          players.push({
            name: names[Math.floor(Math.random() * names.length)] + Math.floor(Math.random() * 1000),
            avatar: `stocks/photo_${Math.floor(Math.random() * 7) + 1}.jpg`,
            level: Math.floor(Math.random() * 10) + 1,
            elo: (Number(matchData.eloAfter) || 1200) + Math.floor(Math.random() * 100) - 50,
            kills: Math.floor(Math.random() * 25),
            deaths: Math.floor(Math.random() * 20),
            assists: Math.floor(Math.random() * 10),
            isMe: false
          });
        }
      }
      
      // Сортировка по киллам
      players.sort((a,b) => b.kills - a.kills);
      return players;
    };

    const team1 = generateTeam(5, isWin, true); // My team
    const team2 = generateTeam(5, !isWin, false); // Enemy team

    const team1Score = isWin ? 10 : Math.floor(Math.random() * 9);
    const team2Score = isWin ? Math.floor(Math.random() * 9) : 10;
    const minutes = 15 + Math.floor(Math.random() * 20);

    const renderPlayer = (p) => `
      <div class="player-row ${p.isMe ? 'is-current' : ''}">
        <div class="player-row__top">
          <div class="player-row__avatar">
            <img class="avatar" src="${p.avatar}" alt="${p.name}">
            <img class="level" src="level/${p.level}.png" alt="Уровень">
          </div>
          <div class="player-row__info">
            <div class="player-row__name">${p.name}</div>
            <div class="player-row__elo">ELO ${p.elo}</div>
          </div>
        </div>
        <div class="player-row__stats">
          <span class="stat-val k" title="Kills">${p.kills}K</span>
          <span class="stat-val d" title="Deaths">${p.deaths}D</span>
          <span class="stat-val a" title="Assists">${p.assists}A</span>
        </div>
      </div>
    `;

    matchModalContent.innerHTML = `
      <div class="match-score-board" style="background-image: linear-gradient(rgba(11, 16, 32, 0.65), rgba(11, 16, 32, 0.65)), url('maps/${matchData.map}.jpg'); background-size: cover; background-position: center;">
        <div class="match-score-board__team ${isWin ? 'win' : 'loss'}">${team1Score}</div>
        <div class="match-score-board__center">
          <div class="match-score-board__map">${matchData.map}</div>
          <div class="match-score-board__time">Длительность: ${minutes} мин</div>
        </div>
        <div class="match-score-board__team ${!isWin ? 'win' : 'loss'}">${team2Score}</div>
      </div>
      
      <div class="match-teams-container">
        <div class="team-list">
          <div class="team-list__title ${isWin ? 'win' : 'loss'}">Ваша команда</div>
          ${team1.map(renderPlayer).join("")}
        </div>

        <div class="team-list">
          <div class="team-list__title ${!isWin ? 'win' : 'loss'}">Противники</div>
          ${team2.map(renderPlayer).join("")}
        </div>
      </div>
    `;

    matchModal.hidden = false;
  };

  const updateUI = async () => {
    if (window.currentAuthUser) {
      window.currentAuthUser = ensureUserStats(window.currentAuthUser);

      // Enrich achievements with full data
      if (Array.isArray(window.currentAuthUser.achievements)) {
        window.currentAuthUser.achievements = await enrichAchievements(window.currentAuthUser.achievements);
      }

      const matches = Number(window.currentAuthUser.matches) || 0;
      const wins = Number(window.currentAuthUser.wins) || 0;
      const losses = Number(window.currentAuthUser.losses) || 0;
      const kills = Number(window.currentAuthUser.kills) || 0;
      const deaths = Number(window.currentAuthUser.deaths) || 0;
      const kd = deaths > 0 ? kills / deaths : kills;
      const winrate = matches > 0 ? (wins / matches) * 100 : 0;

      const badge = window.currentAuthUser.badge || null;
      let badgeHtml = '';
      if (badge === 'verified') {
        badgeHtml = '<span class="profile-badge profile-badge--verified" title="Верифицированный"><img src="img/Verified.png" alt="Verified"></span>';
      } else if (badge === 'celebrity') {
        badgeHtml = '<span class="profile-badge profile-badge--celebrity" title="Знаменитость"><img src="img/Celebrity.png" alt="Celebrity"></span>';
      } else if (badge === 'admin') {
        badgeHtml = '<span class="profile-badge profile-badge--admin" title="Админ FACEIT"><img src="img/admin.png" alt="Admin"></span>';
      }
      profileName.innerHTML = `${window.currentAuthUser.username} ${badgeHtml}`;
      if (profileStandoff2Id) {
        profileStandoff2Id.textContent = `Standoff 2 ID: ${window.currentAuthUser.standoff2_id || "не указан"}`;
      }
      
      const level = getEloLevel(window.currentAuthUser.elo);
      const validLevel = level > 10 ? 10 : (level < 1 ? 1 : level);
      
      // Show level instead of "Online"
      profileStatus.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px;">
          <img src="level/${validLevel}.png" alt="Level" style="width: 20px; height: 20px; object-fit: contain;">
          <span>Уровень ${validLevel}</span>
        </div>
      `;
      
      if (profileAvatar) profileAvatar.src = window.currentAuthUser.avatar;
      if (profileLevel) profileLevel.hidden = true;

      profileElo.textContent = window.currentAuthUser.elo || 1200;
      
      // Update level box with level icon and ELO to next level
      const levelInfo = getLevelInfo(window.currentAuthUser.elo);
      if (eloLevelIcon) eloLevelIcon.src = `level/${levelInfo.currentLevel}.png`;
      if (eloLevelCurrent) eloLevelCurrent.textContent = `${levelInfo.currentElo}/${levelInfo.rangeMax}`;
      if (eloLevelNext) eloLevelNext.textContent = `+${levelInfo.eloToNext}`;
      
      profileMatches.textContent = matches;
      profileWins.textContent = wins;
      profileLosses.textContent = losses;
      profileWinrate.textContent = `${Math.round(winrate)}%`;
      profileKd.textContent = kd.toFixed(2);
      profileAvgKills.textContent = (window.currentAuthUser.avgKills || 0).toFixed(1);
      profileHs.textContent = `${window.currentAuthUser.headshotRate || 0}%`;
      renderEloChart(window.currentAuthUser.matchHistory);
      renderMatchHistory(window.currentAuthUser.matchHistory);
      renderAchievements(window.currentAuthUser.achievements || []);
      loginBtn.hidden = true;
      logoutBtn.hidden = false;

      if (editBgBtn) editBgBtn.hidden = false;
      if (editAvatarBtn) editAvatarBtn.hidden = false;

      const homeUserElo = document.getElementById("home-user-elo");
      if (homeUserElo) homeUserElo.textContent = window.currentAuthUser.elo || 1200;
      
      if (profileBg) {
        if (window.currentAuthUser.headerBg) {
          profileBg.style.backgroundImage = `url(${window.currentAuthUser.headerBg})`;
        } else {
          profileBg.style.backgroundImage = 'linear-gradient(135deg, rgba(0, 217, 255, 0.3), rgba(0, 255, 136, 0.15))';
        }
      }
    } else {
      profileName.textContent = "Гость";
      profileStatus.innerHTML = 'Не авторизован';
      if (profileStandoff2Id) profileStandoff2Id.textContent = "Standoff 2 ID: не указан";
      
      const homeUserElo = document.getElementById("home-user-elo");
      if (homeUserElo) homeUserElo.textContent = "N/A";
      
      if (profileAvatar) profileAvatar.src = "https://api.dicebear.com/7.x/avataaars/svg?seed=Player";
      if (profileLevel) profileLevel.hidden = true;
      profileElo.textContent = "0";
      
      // Reset level box
      if (eloLevelIcon) eloLevelIcon.src = "level/1.png";
      if (eloLevelCurrent) eloLevelCurrent.textContent = "0/500";
      if (eloLevelNext) eloLevelNext.textContent = "+0";
      
      profileMatches.textContent = "0";
      profileWins.textContent = "0";
      profileLosses.textContent = "0";
      profileWinrate.textContent = "0%";
      profileKd.textContent = "0.00";
      profileAvgKills.textContent = "0.0";
      profileHs.textContent = "0%";
      renderEloChart([]);
      renderMatchHistory([]);
      renderAchievements([]);
      loginBtn.hidden = false;
      logoutBtn.hidden = true;

      if (editBgBtn) editBgBtn.hidden = true;
      if (editAvatarBtn) editAvatarBtn.hidden = true;
      if (profileBg) {
        profileBg.style.backgroundImage = 'linear-gradient(135deg, rgba(0, 217, 255, 0.3), rgba(0, 255, 136, 0.15))';
      }
    }
  };

  const showRegisterModal = () => {
    loginModal.hidden = true;
    registerModal.hidden = false;
    clearForms();
  };

  const showLoginModal = () => {
    registerModal.hidden = true;
    loginModal.hidden = false;
    clearForms();
  };

  const closeModals = () => {
    registerModal.hidden = true;
    loginModal.hidden = true;
  };

  const clearForms = () => {
    registerForm.reset();
    loginForm.reset();
  };

  // Экспортируем функции
  window.showLoginModal = showLoginModal;
  window.showRegisterModal = showRegisterModal;

  // Закрытие модалок при инициализации
  closeModals();

  // Регистрация
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = registerUsernameInput.value.trim();
    const standoff2Id = registerStandoff2IdInput.value.trim();
    const password = registerPasswordInput.value;
    const confirm = registerConfirmInput.value;

    if (!username || !standoff2Id || !password || !confirm) {
      alert("Заполните все поля!");
      return;
    }

    if (password !== confirm) {
      alert("Пароли не совпадают!");
      return;
    }

    if (password.length < 4) {
      alert("Пароль должен быть минимум 4 символа!");
      return;
    }

    try {
      const existingAcc = await getAccountByUsername(username);
      if (existingAcc) {
        alert("Такой никнейм уже зарегистрирован!");
        return;
      }

      window.currentAuthUser = await createAccount(username, password, standoff2Id);
      saveData();
      await updateUI();
      closeModals();

      // Переходим на сохранённую страницу, если была
      if (window.pendingPageTarget) {
        setActivePage(window.pendingPageTarget);
      }
    } catch (err) {
      alert("Ошибка при регистрации, проверьте подключение!");
      console.error(err);
    }
  });

  // Вход
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = loginUsernameInput.value.trim();
    const password = loginPasswordInput.value;

    if (!username || !password) {
      alert("Заполните все поля!");
      return;
    }

    try {
      const account = await getAccountByUsername(username);
      if (!account) {
        alert("Аккаунт не найден!");
        return;
      }

      if (account.password !== password) {
        alert("Неверный пароль!");
        return;
      }

      window.currentAuthUser = account;
      saveData();
      await updateUI();
      closeModals();

      // Переходим на сохранённую страницу, если была
      if (window.pendingPageTarget) {
        setActivePage(window.pendingPageTarget);
      }
    } catch (err) {
      alert("Ошибка при входе!");
      console.error(err);
    }
  });

  // Переключение между модальками
  toLoginLink.addEventListener("click", (e) => {
    e.preventDefault();
    showLoginModal();
  });

  toRegisterLink.addEventListener("click", (e) => {
    e.preventDefault();
    showRegisterModal();
  });

  if (closeMatchModalBtn) {
    closeMatchModalBtn.addEventListener("click", () => {
      matchModal.hidden = true;
    });
  }

  // Кнопка "Войти" в профиле
  loginBtn.addEventListener("click", () => {
    showLoginModal();
  });

  // Кнопка "Выйти"
  logoutBtn.addEventListener("click", async () => {
    window.currentAuthUser = null;
    saveData();
    await updateUI();
  });

  // Кнопка показа истории матчей
  if (toggleMatchHistory) {
    toggleMatchHistory.addEventListener("click", () => {
      const isHidden = profileMatchHistory.hidden;
      profileMatchHistory.hidden = !isHidden;
      toggleMatchHistory.textContent = isHidden ? "Скрыть историю матчей" : "Посмотреть историю матчей";
    });
  }

  // Закрытие модалки по клику вне
  registerModal.addEventListener("click", (e) => {
    if (e.target === registerModal) closeModals();
  });

  loginModal.addEventListener("click", (e) => {
    if (e.target === loginModal) closeModals();
  });

  if (matchModal) {
    matchModal.addEventListener("click", (e) => {
      if (e.target === matchModal) matchModal.hidden = true;
    });
  }

  loadUser();
  // Загрузка аватарки и фона шапки профиля
  const processImageUpload = (file, callback) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => callback(e.target.result);
    reader.readAsDataURL(file);
  };

  if (editAvatarBtn && avatarUpload) {
    editAvatarBtn.addEventListener("click", () => avatarUpload.click());
    avatarUpload.addEventListener("change", (e) => {
      processImageUpload(e.target.files[0], async (base64) => {
        if (!window.currentAuthUser) return;
        window.currentAuthUser.avatar = base64;
        await updateAccountProfile({ avatar: base64 });
        saveData();
        await updateUI();
      });
    });
  }
}

async function openPlayerModal(username) {
  const modal = document.getElementById("player-modal");
  const content = document.getElementById("player-modal-content");
  if (!modal || !content) return;
  
  modal.hidden = false;
  content.innerHTML = "<div style='text-align:center; padding: 20px;'>Загрузка данных...</div>";

  try {
    const { data: player, error } = await supabaseClient
      .from('accounts')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (error || !player) {
      content.innerHTML = "<div style='text-align:center; padding: 20px;'>Игрок не найден</div>";
      return;
    }

    // Enrich achievements with full data
    if (Array.isArray(player.achievements)) {
      player.achievements = await enrichAchievements(player.achievements);
    }

    // Try to use client-side cached account values as a fallback
    const cachedState = readState();
    const cachedAccount = Array.isArray(cachedState.accounts)
      ? cachedState.accounts.find(a => a.username === username)
      : null;

    const avatarSrc = player.avatar || "https://api.dicebear.com/7.x/avataaars/svg?seed=Player";
    // also consider currently logged-in user as fallback
    const localCurrent = (window.currentAuthUser && window.currentAuthUser.username === username) ? window.currentAuthUser : null;
    const wins = (player.wins ?? cachedAccount?.wins ?? localCurrent?.wins) || 0;
    const matches = (player.matches ?? cachedAccount?.matches ?? localCurrent?.matches) || 0;
    const kills = (player.kills ?? cachedAccount?.kills ?? localCurrent?.kills) || 0;
    const deaths = (player.deaths ?? cachedAccount?.deaths ?? localCurrent?.deaths) || 0;
    const headshots = (player.headshots ?? cachedAccount?.headshots ?? localCurrent?.headshots) || 0;

    const winrate = matches > 0 ? Math.round((wins / matches) * 100) : 0;
    const kd = deaths > 0 ? (kills / deaths).toFixed(2) : kills.toFixed(2);
    const hs = kills > 0 ? Math.round((headshots / kills) * 100) : 0;
    const losses = matches - wins;
    const avgKills = matches > 0 ? (kills / matches).toFixed(1) : 0;
    const avgDeaths = matches > 0 ? (deaths / matches).toFixed(1) : 0;
    const level = getEloLevel(player.elo);
    const levelImageSrc = level > 10 ? 'level/10.png' : `level/${level}.png`;

    const badgeHtml = (() => {
        if (!player.badge) return "";
        if (player.badge === 'verified') return '<span class="badge-pill badge-pill--verified"><img src="img/Verified.png" alt="Verified"></span>';
        if (player.badge === 'celebrity') return '<span class="badge-pill badge-pill--celebrity"><img src="img/Celebrity.png" alt="Celebrity"></span>';
        if (player.badge === 'admin') return '<span class="badge-pill badge-pill--admin"><img src="img/admin.png" alt="Admin"></span>';
        return "";
    })();

    content.innerHTML = `
      <div class="modal-player-overview">
        <div class="modal-player-hero" style="${player.headerBg ? `background-image: url('${player.headerBg}');` : ''}">
          <div class="modal-player-avatar-wrap">
            <img src="${avatarSrc}" class="modal-player-avatar" alt="Avatar">
          </div>
          <h2 class="modal-player-name">${player.username} ${badgeHtml}</h2>
          <div class="modal-player-elo-badge">
            <img src="img/faceit.png" alt="FACEIT">
            <div class="elo-val">${player.elo || 0} <span>ELO</span></div>
          </div>
          <div class="modal-player-id">Standoff 2 ID: <span>${player.standoff2_id || "не указан"}</span></div>
          <div class="modal-player-level" style="margin-top: 8px; text-align: center;">
            <img src="${levelImageSrc}" alt="Level" style="width: 48px; height: 48px; object-fit: contain; opacity: 1;">
            <div style="font-size: 12px; color: rgba(255,255,255,1); margin-top: 4px; font-weight: 600;">Уровень ${level}</div>
          </div>
        </div>
        
        <div class="profile-quick-stats modal-player-q-stats">
          <div class="q-stat">
            <span class="q-stat__val">${matches}</span>
            <span class="q-stat__lbl">Матчи</span>
          </div>
          <div class="q-stat">
            <span class="q-stat__val">${winrate}%</span>
            <span class="q-stat__lbl">Winrate</span>
          </div>
          <div class="q-stat">
            <span class="q-stat__val">${kd}</span>
            <span class="q-stat__lbl">K/D</span>
          </div>
          <div class="q-stat">
            <span class="q-stat__val">${hs}%</span>
            <span class="q-stat__lbl">HS%</span>
          </div>
        </div>

        <div class="ext-stats-grid modal-player-ext-stats">
          <div class="ext-stat">
            <span class="ext-stat__lbl">Победы</span>
            <strong class="ext-stat__val" style="color: var(--color-win);">${wins}</strong>
          </div>
          <div class="ext-stat">
            <span class="ext-stat__lbl">Поражения</span>
            <strong class="ext-stat__val" style="color: var(--color-loss);">${losses}</strong>
          </div>
          <div class="ext-stat">
            <span class="ext-stat__lbl">Всего убийств</span>
            <strong class="ext-stat__val" style="color: #31f19c;">${kills}</strong>
          </div>
          <div class="ext-stat">
            <span class="ext-stat__lbl">Всего смертей</span>
            <strong class="ext-stat__val" style="color: #ff7b6f;">${deaths}</strong>
          </div>
          <div class="ext-stat">
            <span class="ext-stat__lbl">Средние убийства</span>
            <strong class="ext-stat__val">${avgKills}</strong>
          </div>
          <div class="ext-stat">
            <span class="ext-stat__lbl">Средние смерти</span>
            <strong class="ext-stat__val">${avgDeaths}</strong>
          </div>
          <div class="ext-stat">
            <span class="ext-stat__lbl">Хедшоты</span>
            <strong class="ext-stat__val" style="color: #ffd257;">${headshots}</strong>
          </div>
        </div>
      </div>
    `;

    const safeHistory = Array.isArray(player.matchHistory) ? player.matchHistory.slice(-10) : [];
    if (safeHistory.length > 0) {
      const width = 330;
      const height = 158;
      const paddingX = 26;
      const paddingTop = 12;
      const paddingBottom = 24;

      const eloValues = safeHistory.map((item) => Number(item.eloAfter) || 0);
      const minElo = Math.min(...eloValues);
      const maxElo = Math.max(...eloValues);
      const span = Math.max(1, maxElo - minElo);

      const points = safeHistory
        .map((item, index) => {
          const x = paddingX + (index * (width - paddingX * 2)) / (safeHistory.length - 1 || 1);
          const y = paddingTop + ((maxElo - (Number(item.eloAfter) || minElo)) * (height - paddingTop - paddingBottom)) / span;
          return `${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(" ");

      const yTop = maxElo;
      const yBottom = minElo;

      const chartSection = document.createElement('div');
      chartSection.className = 'card profile-history';
      chartSection.style.margin = '0 20px 20px';
      chartSection.style.boxShadow = 'none';
      chartSection.innerHTML = `
        <h2 class="profile-title" style="margin-bottom:12px;">Последние 10 матчей</h2>
        <div class="elo-chart" id="modal-elo-chart">
          <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true">
            <line class="elo-chart__grid" x1="${paddingX}" y1="${paddingTop}" x2="${width - paddingX}" y2="${paddingTop}" />
            <line class="elo-chart__grid" x1="${paddingX}" y1="${height - paddingBottom}" x2="${width - paddingX}" y2="${height - paddingBottom}" />
            <polyline class="elo-chart__line" points="${points}" />
            ${safeHistory
              .map((item, index) => {
                const x = paddingX + (index * (width - paddingX * 2)) / (safeHistory.length - 1 || 1);
                const y = paddingTop + ((maxElo - (Number(item.eloAfter) || minElo)) * (height - paddingTop - paddingBottom)) / span;
                return `<circle class="elo-chart__point" cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="2.8" />`;
              })
              .join("")}
            <text class="elo-chart__label" x="${paddingX}" y="${height - 6}">1</text>
            <text class="elo-chart__label" x="${width - paddingX - 8}" y="${height - 6}">${safeHistory.length}</text>
            <text class="elo-chart__label" x="${paddingX}" y="${paddingTop - 2}">${yTop}</text>
            <text class="elo-chart__label" x="${paddingX}" y="${height - paddingBottom - 4}">${yBottom}</text>
          </svg>
          <div id="modal-elo-tooltip" class="elo-chart__tooltip"></div>
        </div>
      `;
      content.querySelector('.modal-player-overview').appendChild(chartSection);

      const modalEloChart = document.getElementById('modal-elo-chart');
      const tooltip = document.getElementById('modal-elo-tooltip');
      const circles = modalEloChart.querySelectorAll('.elo-chart__point');

      circles.forEach((circle, index) => {
        circle.addEventListener("click", (e) => {
          e.stopPropagation();
          circles.forEach(c => c.classList.remove("active"));
          circle.classList.add("active");

          const targetMatch = safeHistory[index];
          if (!targetMatch) return;

          const isWin = targetMatch.eloChange > 0;
          const sign = isWin ? '+' : '';
          const colorClass = isWin ? 'win' : 'loss';
          const mapName = targetMatch.map || "Разное";

          tooltip.innerHTML = `
            <div class="tooltip-title">
              <span>${mapName}</span>
              <span class="${colorClass}">${sign}${targetMatch.eloChange} ELO</span>
            </div>
            <div class="tooltip-stats">
              <span>ELO: <strong>${targetMatch.eloAfter}</strong></span>
              <span>K/D/A: <strong>${targetMatch.kills}/${targetMatch.deaths}/${targetMatch.assists}</strong></span>
            </div>
          `;

          const svgRect = circle.closest("svg").getBoundingClientRect();
          const cx = parseFloat(circle.getAttribute("cx"));
          const cy = parseFloat(circle.getAttribute("cy"));
          
          const scaleX = svgRect.width / width;
          const scaleY = svgRect.height / height;
          
          const realX = cx * scaleX;
          const realY = cy * scaleY;

          tooltip.style.left = `${realX}px`;
          tooltip.style.top = `${realY}px`;
          tooltip.classList.add("show");
        });
      });

      document.addEventListener("click", () => {
        if (tooltip) {
          tooltip.classList.remove("show");
          circles.forEach(c => c.classList.remove("active"));
        }
      }, { once: true });
      
      tooltip.addEventListener("click", (e) => e.stopPropagation());
    }

    // Render achievements in player modal
    if (Array.isArray(player.achievements) && player.achievements.length > 0) {
      const achievementsSection = document.createElement('div');
      achievementsSection.className = 'card profile-history';
      achievementsSection.style.margin = '0 20px 20px';
      achievementsSection.style.boxShadow = 'none';
      achievementsSection.innerHTML = `<h2 class="profile-title" style="margin-bottom:12px;">Достижения</h2>`;
      
      const achievementsGrid = document.createElement('div');
      achievementsGrid.className = 'achievements-grid';
      
      player.achievements.forEach((ach) => {
        const badge = document.createElement('div');
        const normalized = String(ach.rarity || '').toLowerCase();
        const rarityClass = normalized.includes('уник')
          ? 'rarity-unique'
          : normalized.includes('леген')
            ? 'rarity-legendary'
            : normalized.includes('эпик') || normalized.includes('эпичес')
              ? 'rarity-epic'
              : normalized.includes('редк')
                ? 'rarity-rare'
                : 'rarity-common';
        badge.className = `achievement-badge ${!ach.unlocked ? 'locked' : ''} ${rarityClass}`;
        badge.style.cssText = `--achievement-pattern-url: url("${String(ach.icon || '').replace(/"/g, '&quot;')}");`;
        const cleanIconUrl = String(ach.icon || '').split('?')[0].toLowerCase();
        const iconClass = cleanIconUrl.endsWith('.gif') || cleanIconUrl.endsWith('.webp') || cleanIconUrl.endsWith('.apng')
          ? 'achievement-icon achievement-icon--alive'
          : 'achievement-icon';
        badge.innerHTML = `
          <img src="${ach.icon}" alt="${ach.name}" class="${iconClass}">
        `;
        badge.addEventListener('click', () => openAchievementModal({
          ...ach,
          ownerUsername: player.username,
          ownerBadge: player.badge || null,
        }));
        achievementsGrid.appendChild(badge);
      });
      
      achievementsSection.appendChild(achievementsGrid);
      content.querySelector('.modal-player-overview').appendChild(achievementsSection);
    }

  } catch (err) {
    console.error(err);
    content.innerHTML = "<div style='text-align:center; padding: 20px;'>Произошла ошибка</div>";
  }
}

async function loadDefaultAchievements() {
  try {
    const { data, error } = await supabaseClient
      .from('achievements')
      .select('*')
      .limit(6);

    if (error || !data) return [];
    
    return data.map(ach => ({
      ...ach,
      unlocked: false
    }));
  } catch (err) {
    console.error('Error loading achievements:', err);
    return [];
  }
}

async function enrichAchievements(achievementsData) {
  if (!Array.isArray(achievementsData) || achievementsData.length === 0) return [];
  
  try {
    const { data: allAchievements, error } = await supabaseClient
      .from('achievements')
      .select('*');
    
    if (error || !allAchievements) return achievementsData;
    
    const achievementMap = new Map(allAchievements.map(a => [a.id, a]));
    
    return achievementsData.map(userAch => ({
      ...achievementMap.get(userAch.id),
      unlocked: userAch.unlocked,
      unlockedDate: userAch.unlockedDate
    })).filter(ach => ach.id);
  } catch (err) {
    console.error('Error enriching achievements:', err);
    return achievementsData;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".nav-btn");

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const targetId = button.dataset.target;
      if (!targetId) return;
      setActivePage(targetId);
    });
  });

  const mainPlayBtn = document.getElementById("main-play-btn");
  if (mainPlayBtn) {
    mainPlayBtn.addEventListener("click", () => setActivePage("matches"));
  }
  
  const playerModal = document.getElementById("player-modal");
  const closePlayerModal = document.getElementById("close-player-modal");
  
  if (closePlayerModal) {
    closePlayerModal.addEventListener("click", () => {
      if (playerModal) playerModal.hidden = true;
    });
  }
  if (playerModal) {
    playerModal.addEventListener("click", (e) => {
      if (e.target === playerModal) playerModal.hidden = true;
    });
  }
  
  const achievementModal = document.getElementById("achievement-modal");
  const closeAchievementModal = document.getElementById("close-achievement-modal");
  
  if (closeAchievementModal) {
    closeAchievementModal.addEventListener("click", () => {
      if (achievementModal) achievementModal.hidden = true;
    });
  }
  if (achievementModal) {
    achievementModal.addEventListener("click", (e) => {
      if (e.target === achievementModal) achievementModal.hidden = true;
    });
  }

  const cropModal = document.getElementById("crop-modal");
  if (cropModal) {
    cropModal.addEventListener("click", (e) => {
      if (e.target === cropModal) cropModal.hidden = true;
    });
  }

  initNewsSlider();
  initAuth();
  initHeaderCropping();
  initMatchLobbyBoard();

  // Всегда стартуем с отдельной главной страницей.
  setActivePage("home");
});
