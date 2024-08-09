import winston from 'winston';
import { Logtail } from '@logtail/node';
import { LogtailTransport } from '@logtail/winston';

export interface CustomLogLevels extends winston.config.AbstractConfigSetLevels {
  fatal: number;
  error: number;
  warn: number;
  info: number;
  debug: number;
  [key: string]: number;
}

export const logLevels: CustomLogLevels = {
  fatal: 0,
  error: 1,
  warn: 2,
  info: 3,
  debug: 4,
};

export enum LogLevel {
  Fatal = 'fatal',
  Error = 'error',
  Warn = 'warn',
  Info = 'info',
  Debug = 'debug',
}

export enum AvailableTransports {
  BetterStack = 'BetterStack',
}

export interface LoggerTransports {
  name: string,
  token?: string,
}

export interface LoggerMetadata {
  [key: string]: any;
}

export interface LoggerOptions {
 transports?: LoggerTransports[];
}

export class Logger {
  private logger: winston.Logger;
  private logtail?: Logtail;
  private metadata: LoggerMetadata;
  private transports: winston.transport[] = [];

  constructor(metadata: LoggerMetadata, options: LoggerOptions) {
    this.metadata = metadata;
    this.transports = [
      ...this.getNonProductionTransforms(),
      ...this.getThirdPartyTransforms(options?.transports),
    ];

    this.logger = winston.createLogger({
      levels: logLevels,
      level: LogLevel.Debug,
      format: winston.format.json(),
      transports: this.transports,
    });
  }

  private getNonProductionTransforms(): winston.transport[] {
    return [
      new winston.transports.Console(),
    ];
  }

  private getThirdPartyTransforms(loggerTransports?: LoggerTransports[]): winston.transport[] {
    const transports: winston.transport[] = [];

    if (!loggerTransports) {
      return transports;
    }

    for (const transport of loggerTransports) {
      if (transport.name === AvailableTransports.BetterStack) {
        if (!transport.token) {
          throw new Error('The token is require for the BetterStack transform');
        }

        this.logtail = new Logtail(transport.token);
        transports.push(new LogtailTransport(this.logtail));
      }
    }

    return transports;
  }

  private log(level: LogLevel, message: string, metadata?: LoggerMetadata): void {
    this.logger.log(level, message, {
      ...this.metadata,
    });
  }

  fatal(message: string, metadata: LoggerMetadata): void {
    this.log(LogLevel.Fatal, message, metadata);
  }

  error(message: string, metadata: LoggerMetadata): void {
    this.log(LogLevel.Error, message, metadata);
  }

  warn(message: string, metadata: LoggerMetadata): void {
    this.log(LogLevel.Warn, message, metadata);
  }

  info(message: string, metadata: LoggerMetadata): void {
    this.log(LogLevel.Info, message, metadata);
  }

  debug(message: string, metadata: LoggerMetadata): void {
    this.log(LogLevel.Debug, message, metadata);
  }

  flush(): void {
    if (this.logtail) {
      this.logtail.flush();
    }
  }
}
