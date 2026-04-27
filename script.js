// Инициализация Supabase
const supabaseUrl = "https://zycrvaqqtufgqnbqunvr.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Y3J2YXFxdHVmZ3FuYnF1bnZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzczMTAwOTUsImV4cCI6MjA5Mjg4NjA5NX0.XoxEFdwRb224hHY1TpXUsIDnhpX7xOPHJ6Ukif7BzbY";
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

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
      
      const avatarSrc = player.avatar || "stocks/photo_1.jpg";
      const winrate = player.matches > 0 ? Math.round((player.wins / player.matches) * 100) : 0;
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
      
      const rank = index + 1;
      let rankClass = "";
      if (rank === 1) rankClass = "rank-gold";
      else if (rank === 2) rankClass = "rank-silver";
      else if (rank === 3) rankClass = "rank-bronze";

      const item = document.createElement("div");
      item.className = `leaderboard-item ${rankClass} ${isCurrentUser ? "leaderboard-item--current-user" : ""}`;

      item.innerHTML = `
        <div class="lead-col lead-col-rank">
          <span class="rank-badge">${rank}</span>
        </div>
        <div class="lead-col lead-col-player">
          <img src="${avatarSrc}" alt="Avatar" class="lead-player-avatar" onerror="this.src='stocks/photo_1.jpg'">
          <div class="lead-player-name">
            ${player.username}
            ${badgeHtml}
            ${isCurrentUser ? '<span class="lead-badge-you">ВЫ</span>' : ""}
          </div>
        </div>
        <div class="lead-col lead-col-matches">${player.matches || 0}</div>
        <div class="lead-col lead-col-elo">${player.elo || 0}</div>
      `;
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
  const profileLevel = document.getElementById("profile-level");
  const profileElo = document.getElementById("profile-elo");
  const profileAvatar = document.getElementById("profile-avatar");
  const profileLevelIcon = document.getElementById("profile-level-icon");
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

  const readState = () => {
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
  };

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
          window.currentAuthUser = fresh || parsed;
        } else {
          window.currentAuthUser = parsed;
        }
        updateUI();
        return;
      }
    } catch (error) {
      console.error('Ошибка загрузки текущего пользователя:', error);
    }

    window.currentAuthUser = null;
    updateUI();
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

  const createAccount = async (username, password) => {
    const matchHistory = generateMatchHistory(1200, 10);
    const totals = getTotalsFromHistory(matchHistory);
    const randomAvatarIndex = Math.floor(Math.random() * 7) + 1; // stocks/photo_1.jpg to photo_7.jpg

    const newAccountData = {
      username,
      password,
      avatar: `stocks/photo_${randomAvatarIndex}.jpg`,
      elo: totals.currentElo,
      matches: matchHistory.length,
      wins: totals.wins,
      kills: totals.kills,
      deaths: totals.deaths,
      headshots: Math.round(totals.kills * (totals.headshotRate / 100))
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
      level: 1,
      losses: totals.losses,
      headshotRate: totals.headshotRate,
      avgKills: totals.avgKills,
      matchHistory,
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

    if (!Array.isArray(profile.matchHistory) || profile.matchHistory.length < 10) {
      const seedElo = Number(profile.elo) || 1200;
      profile.matchHistory = generateMatchHistory(seedElo, 10);
    } else {
      profile.matchHistory = profile.matchHistory.slice(-10);
    }

    const totals = getTotalsFromHistory(profile.matchHistory);
    profile.matches = Number(profile.matches) || totals.matches;
    profile.wins = Number(profile.wins) || totals.wins;
    profile.losses = Number(profile.losses) || totals.losses;
    profile.kills = Number(profile.kills) || totals.kills;
    profile.deaths = Number(profile.deaths) || totals.deaths;
    profile.avgKills = Number(profile.avgKills) || totals.avgKills;
    profile.headshotRate = Number(profile.headshotRate) || totals.headshotRate;
    profile.elo = Number(profile.elo) || totals.currentElo;

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

  const updateUI = () => {
    if (window.currentAuthUser) {
      window.currentAuthUser = ensureUserStats(window.currentAuthUser);

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
      profileStatus.textContent = "Онлайн";
      if (profileAvatar) profileAvatar.src = window.currentAuthUser.avatar;
      
      const level = window.currentAuthUser.level || 1;
      const validLevel = level > 10 ? 10 : (level < 1 ? 1 : level);
      if (profileLevelIcon) profileLevelIcon.src = `level/${validLevel}.png`;
      if (profileLevel) profileLevel.hidden = true;

      profileElo.textContent = window.currentAuthUser.elo || 1200;
      profileMatches.textContent = matches;
      profileWins.textContent = wins;
      profileLosses.textContent = losses;
      profileWinrate.textContent = `${Math.round(winrate)}%`;
      profileKd.textContent = kd.toFixed(2);
      profileAvgKills.textContent = (window.currentAuthUser.avgKills || 0).toFixed(1);
      profileHs.textContent = `${window.currentAuthUser.headshotRate || 0}%`;
      renderEloChart(window.currentAuthUser.matchHistory);
      renderMatchHistory(window.currentAuthUser.matchHistory);
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
      profileStatus.textContent = "Не авторизован";
      
      const homeUserElo = document.getElementById("home-user-elo");
      if (homeUserElo) homeUserElo.textContent = "N/A";
      
      if (profileAvatar) profileAvatar.src = "https://api.dicebear.com/7.x/avataaars/svg?seed=Player";
      if (profileLevelIcon) profileLevelIcon.src = "level/1.png";
      if (profileLevel) profileLevel.hidden = true;
      profileElo.textContent = "0";
      profileMatches.textContent = "0";
      profileWins.textContent = "0";
      profileLosses.textContent = "0";
      profileWinrate.textContent = "0%";
      profileKd.textContent = "0.00";
      profileAvgKills.textContent = "0.0";
      profileHs.textContent = "0%";
      renderEloChart([]);
      renderMatchHistory([]);
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
    const password = registerPasswordInput.value;
    const confirm = registerConfirmInput.value;

    if (!username || !password || !confirm) {
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

      window.currentAuthUser = await createAccount(username, password);
      saveData();
      updateUI();
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
      updateUI();
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
  logoutBtn.addEventListener("click", () => {
    window.currentAuthUser = null;
    saveData();
    updateUI();
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

  if (editBgBtn && bgUpload) {
    editBgBtn.addEventListener("click", () => bgUpload.click());
    bgUpload.addEventListener("change", (e) => {
      processImageUpload(e.target.files[0], async (base64) => {
        if (window.currentAuthUser) {
          window.currentAuthUser.headerBg = base64;
          saveData();
          updateUI();
        }
      });
    });
  }

  if (editAvatarBtn && avatarUpload) {
    editAvatarBtn.addEventListener("click", () => avatarUpload.click());
    avatarUpload.addEventListener("change", (e) => {
      processImageUpload(e.target.files[0], async (base64) => {
        if (!window.currentAuthUser) return;
        window.currentAuthUser.avatar = base64;
        await updateAccountProfile({ avatar: base64 });
        saveData();
        updateUI();
      });
    });
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

  initNewsSlider();
  initAuth();

  // Всегда стартуем с отдельной главной страницей.
  setActivePage("home");
});
