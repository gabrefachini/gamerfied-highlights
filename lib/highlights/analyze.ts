import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { parseCs2Source2Demo } from "./cs2Source2Parser";
import { selectHighlightCandidates } from "./detector";

export async function analyzeHighlightJob(jobId: string) {
  console.info("[upload-debug] analysis START", { jobId });
  const job = await prisma.highlightJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`Highlight job ${jobId} not found`);
  console.info("[upload-debug] analysis job-load SUCCESS", {
    jobId,
    status: job.status,
    hasDemoFilePath: Boolean(job.demoFilePath)
  });

  if (!job.demoFilePath) {
    console.warn("[upload-debug] analysis FAILURE", { jobId, error: "Demo file is required for analysis" });
    await prisma.highlightJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        diagnostics: {
          error: "Demo file is required for analysis"
        }
      }
    });
    return;
  }

  await prisma.highlightJob.update({
    where: { id: jobId },
    data: { status: "ANALYZING", diagnostics: { startedAt: new Date().toISOString() } }
  });

  try {
    console.info("[upload-debug] parser START", { jobId, filePath: job.demoFilePath });
    const parsedDemo = parseCs2Source2Demo(job.demoFilePath);
    console.info("[upload-debug] parser SUCCESS", {
      jobId,
      players: parsedDemo.players.length,
      rounds: parsedDemo.rounds.length,
      kills: parsedDemo.kills.length
    });
    console.info("[upload-debug] detection START", { jobId, kills: parsedDemo.kills.length });
    const candidates = selectHighlightCandidates(parsedDemo);
    console.info("[upload-debug] detection SUCCESS", { jobId, candidates: candidates.length });

    await prisma.$transaction([
      prisma.highlightCandidate.deleteMany({ where: { jobId } }),
      prisma.highlightCandidate.createMany({
        data: candidates.map((candidate) => ({
          jobId,
          type: candidate.type,
          playerName: candidate.playerName,
          playerSteamId: candidate.playerSteamId,
          roundNumber: candidate.roundNumber,
          startTick: candidate.startTick,
          endTick: candidate.endTick,
          startTimeSeconds: candidate.startTimeSeconds,
          endTimeSeconds: candidate.endTimeSeconds,
          kills: candidate.kills,
          headshots: candidate.headshots,
          score: candidate.score,
          confidence: candidate.confidence,
          metadata: candidate.metadata as Prisma.InputJsonValue
        }))
      }),
      prisma.highlightJob.update({
        where: { id: jobId },
        data: {
          status: "READY_TO_PICK",
          diagnostics: {
            parser: parsedDemo.metadata?.parser || "demoparser2",
            players: parsedDemo.players.length,
            rounds: parsedDemo.rounds.length,
            kills: parsedDemo.kills.length,
            candidates: candidates.length,
            analyzedAt: new Date().toISOString()
          }
        }
      })
    ]);
    console.info("[upload-debug] analysis SUCCESS", { jobId, status: "READY_TO_PICK", candidates: candidates.length });
  } catch (error) {
    console.error("[upload-debug] analysis FAILURE", {
      jobId,
      message: error instanceof Error ? error.message : "Unknown parser error",
      stack: error instanceof Error ? error.stack : null
    });
    await prisma.highlightJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        diagnostics: {
          error: error instanceof Error ? error.message : "Unknown parser error",
          failedAt: new Date().toISOString()
        }
      }
    });
  }
}
