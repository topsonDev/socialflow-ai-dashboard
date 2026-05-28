import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../lib/logger';
import { videoConfig } from '../config/video.config';
import { ttsConfig } from '../config/tts.config';

const logger = createLogger('initDirectories');

/**
 * Initialize required directories for the application
 */
export async function initDirectories(): Promise<void> {
  const directories = [
    path.join(process.cwd(), videoConfig.upload.uploadDir),
    path.join(process.cwd(), videoConfig.upload.transcodedDir),
    path.join(process.cwd(), ttsConfig.outputDir),
  ];

  for (const dir of directories) {
    try {
      await fs.mkdir(dir, { recursive: true });
      logger.info(`Directory ensured: ${dir}`);
    } catch (error) {
      logger.error(`Failed to create directory ${dir}`, { error });
      throw new Error(`Failed to initialize directory ${dir}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
