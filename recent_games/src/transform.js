const STUB_SUMMARY_URL = 'https://raw.githubusercontent.com/ExcuseMi/trmnl-retroachievements-plugins/refs/heads/main/stub_data/IDX_0.json';
const STUB_GAMES_URL = 'https://raw.githubusercontent.com/ExcuseMi/trmnl-retroachievements-plugins/refs/heads/main/stub_data/IDX_1.json';

async function fetchJson(url, deadline) {
  const budget = Math.max(0, deadline - Date.now());
  if (budget <= 0) return { ok: false, status: 0, json: null };
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(budget, 4000));
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return { ok: false, status: res.status, json: null };
    return { ok: true, status: res.status, json: await res.json() };
  } catch (err) {
    return { ok: false, status: 0, json: null };
  }
}

function reshape(summary, rawGames) {
  const recentAchievements = {};
  for (const [gameId, achievements] of Object.entries(summary.RecentAchievements ?? {})) {
    recentAchievements[gameId] = Object.fromEntries(
      Object.entries(achievements).map(([k, ach]) => [
        k,
        {
          Title: ach.Title,
          BadgeName: ach.BadgeName,
          DateAwarded: ach.DateAwarded,
          HardcoreAchieved: ach.HardcoreAchieved,
        },
      ])
    );
  }

  const games = rawGames.map((game) => ({
    GameID: game.GameID,
    Title: game.Title,
    ConsoleName: game.ConsoleName,
    LastPlayed: game.LastPlayed,
    ImageIcon: game.ImageIcon,
    ImageTitle: game.ImageTitle,
    ImageIngame: game.ImageIngame,
    ImageBoxArt: game.ImageBoxArt,
    NumAchieved: game.NumAchieved,
    NumAchievedHardcore: game.NumAchievedHardcore,
    ScoreAchieved: game.ScoreAchieved,
    ScoreAchievedHardcore: game.ScoreAchievedHardcore,
    NumPossibleAchievements: game.NumPossibleAchievements,
    PossibleScore: game.PossibleScore,
  }));

  return {
    IDX_0: {
      User: summary.User,
      UserPic: summary.UserPic,
      RecentAchievements: recentAchievements,
    },
    IDX_1: {
      data: games,
    },
    error: null,
  };
}

async function run(input) {
  const deadline = Date.now() + 4500; // headroom under the 5s serverless hard cap
  const settings = (input && input.trmnl && input.trmnl.plugin_settings && input.trmnl.plugin_settings.custom_fields_values) || {};
  const apiKey = (settings.api_key || '').trim();
  const username = (settings.username || '').trim();

  if (!apiKey) {
    const [summary, games] = await Promise.all([
      fetchJson(STUB_SUMMARY_URL, deadline),
      fetchJson(STUB_GAMES_URL, deadline),
    ]);
    return reshape(summary.json || {}, (games.json && games.json.data) || []);
  }

  if (!username) {
    return { IDX_0: null, IDX_1: null, error: 'Enter a RetroAchievements username in the plugin settings.' };
  }

  const summaryUrl = 'https://retroachievements.org/API/API_GetUserSummary.php?y=' + encodeURIComponent(apiKey) + '&g=50&a=20&u=' + encodeURIComponent(username);
  const gamesUrl = 'https://retroachievements.org/API/API_GetUserRecentlyPlayedGames.php?y=' + encodeURIComponent(apiKey) + '&c=50&u=' + encodeURIComponent(username);

  const [summary, games] = await Promise.all([
    fetchJson(summaryUrl, deadline),
    fetchJson(gamesUrl, deadline),
  ]);

  // RetroAchievements returns a clean 401 for a bad/expired API key.
  if (!summary.ok || !games.ok) {
    const status = !summary.ok ? summary.status : games.status;
    const message = (status === 401 || status === 403)
      ? 'Invalid API key. Check your Web API Key in the plugin settings.'
      : 'Could not reach RetroAchievements right now. Will retry on the next refresh.';
    return { IDX_0: null, IDX_1: null, error: message };
  }

  // Unlike a bad key, an unknown username still comes back HTTP 200 — RA just omits
  // the user fields, so check for that explicitly instead of trusting the status code.
  if (!summary.json || !summary.json.User) {
    return { IDX_0: null, IDX_1: null, error: 'Couldn\'t find RetroAchievements user "' + username + '". Check the username in the plugin settings.' };
  }

  const rawGames = Array.isArray(games.json) ? games.json : ((games.json && games.json.data) || []);
  return reshape(summary.json, rawGames);
}
