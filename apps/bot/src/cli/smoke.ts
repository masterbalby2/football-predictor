import { loadEnv } from "@soccer/config";
import {
  cmdHelp,
  cmdWelcome,
  cmdToday,
  cmdLeague,
  cmdMatch,
  cmdTeam,
  cmdAccuracy,
  cmdSubscribe,
  cmdUnsubscribe,
} from "../commands.js";

async function main() {
  const env = loadEnv();
  const tests: Array<[string, Promise<string>]> = [
    ["/start", cmdWelcome("Test")],
    ["/help", cmdHelp()],
    ["/today", cmdToday(env)],
    ["/league epl", cmdLeague(env, "epl")],
    ["/league laliga", cmdLeague(env, "laliga")],
    ["/league bundesliga", cmdLeague(env, "bundesliga")],
    ["/league INVALID", cmdLeague(env, "INVALID")],
    ["/match Arsenal", cmdMatch(env, "Arsenal")],
    ["/match Real Madrid", cmdMatch(env, "Real Madrid")],
    ["/match Nonexistent", cmdMatch(env, "Nonexistent")],
    ["/team Bayern", cmdTeam(env, "Bayern")],
    ["/accuracy", cmdAccuracy(env)],
  ];
  let pass = 0;
  let fail = 0;
  for (const [name, promise] of tests) {
    try {
      const result = await promise;
      if (result && result.length > 0) {
        console.log(`PASS: ${name} (${result.length} chars)`);
        pass++;
      } else {
        console.log(`FAIL: ${name} — empty result`);
        fail++;
      }
    } catch (err) {
      console.log(`FAIL: ${name} — ${err instanceof Error ? err.message : String(err)}`);
      fail++;
    }
  }
  console.log(`\n${pass}/${pass + fail} commands passed.`);
  if (fail > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
