import fs from "node:fs";
import os from "node:os";
import path from "node:path";

interface SshKeyConfig {
  publicKey: string | undefined;
  privateKey: string | undefined;
}

const DEFAULT_SSH_DIR = path.join(os.homedir(), ".ssh");

class SshSyncModule {
  getConfig(): SshKeyConfig {
    return {
      publicKey: process.env["SSH_PUBLIC_KEY"],
      privateKey: process.env["SSH_PRIVATE_KEY"],
    };
  }

  async syncKeys(): Promise<void> {
    const config = this.getConfig();

    if (!config.publicKey || !config.privateKey) {
      console.warn("SSH_PUBLIC_KEY or SSH_PRIVATE_KEY not set, skipping SSH key sync");
      return;
    }

    try {
      if (!fs.existsSync(DEFAULT_SSH_DIR)) {
        await fs.promises.mkdir(DEFAULT_SSH_DIR, { mode: 0o700 });
      }

      const privateKeyPath = path.join(DEFAULT_SSH_DIR, "id_ed25519");
      const publicKeyPath = path.join(DEFAULT_SSH_DIR, "id_ed25519.pub");

      await fs.promises.writeFile(privateKeyPath, config.privateKey, { mode: 0o600 });
      await fs.promises.writeFile(publicKeyPath, config.publicKey, { mode: 0o644 });

      console.log("SSH keys synced successfully");
    } catch (error) {
      throw new Error(`Failed to sync SSH keys: ${error}`);
    }
  }
}

export default new SshSyncModule();
