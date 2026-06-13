import { runAll } from "../pipeline.js";
import { closeBrowser } from "../fetchers/html.js";

runAll()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => closeBrowser());
