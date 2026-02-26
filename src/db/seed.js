import { db, pool } from "./index.js";
import { matches, commentary } from "./schema.js";
import { getMatchStatus } from "../utils/match-status.js";

async function seed() {
  console.log("🌱 Seeding database...");

  try {
    // Clear existing data
    await db.delete(commentary);
    await db.delete(matches);

    const now = new Date();

    const dummyMatches = [
      {
        sport: "Football",
        homeTeam: "Arsenal",
        awayTeam: "Manchester City",
        startTime: new Date(now.getTime() - 1000 * 60 * 120), // 2 hours ago
        endTime: new Date(now.getTime() - 1000 * 60 * 30), // 30 mins ago
        homeScore: 2,
        awayScore: 1,
      },
      {
        sport: "Football",
        homeTeam: "Real Madrid",
        awayTeam: "Barcelona",
        startTime: new Date(now.getTime() - 1000 * 60 * 45), // 45 mins ago
        endTime: new Date(now.getTime() + 1000 * 60 * 60), // 1 hour from now
        homeScore: 0,
        awayScore: 0,
      },
      {
        sport: "Basketball",
        homeTeam: "LA Lakers",
        awayTeam: "Golden State Warriors",
        startTime: new Date(now.getTime() + 1000 * 60 * 60 * 2), // 2 hours from now
        endTime: new Date(now.getTime() + 1000 * 60 * 60 * 4), // 4 hours from now
        homeScore: 0,
        awayScore: 0,
      },
      {
        sport: "Cricket",
        homeTeam: "India",
        awayTeam: "Australia",
        startTime: new Date(now.getTime() - 1000 * 60 * 60 * 5), // 5 hours ago
        endTime: new Date(now.getTime() + 1000 * 60 * 60 * 3), // 3 hours from now
        homeScore: 150,
        awayScore: 120,
      },
    ];

    for (const m of dummyMatches) {
      const [insertedMatch] = await db
        .insert(matches)
        .values({
          ...m,
          status: getMatchStatus(m.startTime, m.endTime),
        })
        .returning();

      console.log(`✅ Seeded match: ${m.homeTeam} vs ${m.awayTeam}`);

      // Seed some commentary for live/finished matches
      if (insertedMatch.status !== "scheduled") {
        await db.insert(commentary).values([
          {
            matchId: insertedMatch.id,
            minute: 10,
            sequence: 1,
            period: "1st Half",
            eventType: "kickoff",
            message: "The match has started!",
            tags: ["start"],
          },
          {
            matchId: insertedMatch.id,
            minute: 25,
            sequence: 2,
            period: "1st Half",
            eventType: "commentary",
            message: `${m.homeTeam} is dominating possession early on.`,
          },
        ]);
        console.log(`💬 Seeded commentary for match ID: ${insertedMatch.id}`);
      }
    }

    console.log("✨ Database seeded successfully!");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  } finally {
    await pool.end();
  }
}

seed();
