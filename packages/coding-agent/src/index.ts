import sshSync from "./modules/sshSync.js";

await sshSync.syncKeys();

export { default as sshSync } from "./modules/sshSync.js";
