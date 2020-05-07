import { Logger } from '@w3f/logger';

export class Engine {
    constructor(private readonly logger: Logger) { }

    async start(): Promise<void> {
        this.logger.info('Execution engine started');
    }

    async stop(): Promise<void> {
        this.logger.info('Execution engine stopped');
    }
}
