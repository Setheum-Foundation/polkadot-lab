import { Logger } from '@w3f/logger';

export enum Topology {
    Line = 'Line',
    Full = 'Full'
}

export enum Metric {
    TimeToFinality = 'TimeToFinality'
}

export type Metrics = Array<Metric>;

export interface EngineManager {
    start(): Promise<void>;
    stop(): Promise<void>;
}

export interface PlatformManager {
    create(): Promise<void>;
    destroy(): Promise<void>;
    getKubeconfig(): Promise<string>;
}

export interface ApplicationsManager {
    install(kubeconfig: string): Promise<void>;
}

export type ResultData = {}

export interface ResultsManager {
    runTests(): Promise<ResultData>;
}

export enum ExecutionMode {
    Local = 'Local',
    Remote = 'Remote'
}

export interface Dependencies {
    [name: string]: string;
}

export interface InputConfig {
    logLevel: string;
    maximumExecutionTime: string;

    mode: ExecutionMode; // platform
    size: number; // platform, apps

    topology: Topology; // apps
    dependencies?: Dependencies; // apps

    targetStd: number; // results
    metrics: Metrics; // results
}

export interface EngineConfig {
    platform: PlatformManager;
    apps: ApplicationsManager;
    results: ResultsManager;
    logger: Logger;
}
