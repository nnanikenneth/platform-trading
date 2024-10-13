import { Injectable, LoggerService } from "@nestjs/common";
import * as fs from "fs";
import * as path from "path";
import { promisify } from "util";

const appendFileAsync = promisify(fs.appendFile);
const mkdirAsync = promisify(fs.mkdir);

@Injectable()
export class CustomLoggerService implements LoggerService {
  private readonly logFilePath: string;
  private readonly logLevels: { [key: string]: number } = {
    log: 0,
    error: 1,
    warn: 2,
    debug: 3,
    verbose: 4,
  };

  private readonly currentLogLevel: number;

  constructor() {
    this.logFilePath = path.join(__dirname, "../../logs/app.log");
    this.currentLogLevel = this.logLevels["debug"];
    this.initializeLogFile();
  }

  private async initializeLogFile() {
    try {
      await mkdirAsync(path.dirname(this.logFilePath), { recursive: true });
      if (!fs.existsSync(this.logFilePath)) {
        await appendFileAsync(this.logFilePath, "");
      }
    } catch (error) {
      console.error("Failed to initialize log file:", error);
    }
  }

  log(message: string) {
    this.writeLog("log", message);
  }

  error(message: string, trace?: unknown) {
    const errorMessage =
      trace instanceof Error ? trace.stack || trace.message : String(trace);
    this.writeLog("error", message);
    if (errorMessage) {
      this.writeLog("error", errorMessage);
    }
  }

  warn(message: string) {
    this.writeLog("warn", message);
  }

  debug(message: string) {
    this.writeLog("debug", message);
  }

  verbose(message: string) {
    this.writeLog("verbose", message);
  }

  private async writeLog(level: string, message: string) {
    if (this.logLevels[level] <= this.currentLogLevel) {
      const logMessage = this.formatLogMessage(level, message);
      this.consoleLog(level, message);
      await this.writeToFile(logMessage);
    }
  }

  private formatLogMessage(level: string, message: string): string {
    return `[${level.toUpperCase()}] ${new Date().toISOString()}: ${message}`;
  }

  private consoleLog(level: string, message: string) {
    console.log(this.formatLogMessage(level, message));
  }

  private async writeToFile(logMessage: string) {
    try {
      await appendFileAsync(this.logFilePath, logMessage + "\n", {
        encoding: "utf8",
      });
    } catch (error) {
      console.error("Failed to write log to file:", error);
    }
  }
}

export { LoggerService };
