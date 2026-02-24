function transform(input) {
  const rawGames = input.IDX_1?.data ?? [];
  const summary = input.IDX_0 ?? {};

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
  };
}