import { Logger } from '@w3f/logger';
import { Client } from '@w3f/polkadot-lab-test-case-common';
import { LabResult } from '@w3f/polkadot-lab-types';
import * as k8s from '@kubernetes/client-node';
import * as net from 'net';

import {
    ResultsManager,
    TestCaseDefinitions,
    HelmManagerConfig,
    Dependency,
    ResultsConfig
} from '../types';
import { HelmClient } from '../helm';
import { TestCaseChart } from './test-case-chart';

const localhost = 'localhost';
const defaultDelay = 40000;


type ServerInstance = {
    server: net.Server;
    port: number;
}

export class Results implements ResultsManager {
    private helm: HelmClient;
    private testCases: TestCaseDefinitions;
    private settlementTime: number;
    private logger: Logger;

    constructor(cfg: ResultsConfig) {
        this.testCases = cfg.testCases;
        this.settlementTime = cfg.settlementTime;
        this.logger = cfg.logger;
    }

    // sequential execution
    async runTestCases(kubeconfig: string): Promise<Array<LabResult>> {
        const helmCfg: HelmManagerConfig = {
            kubeconfig,
            logger: this.logger
        };
        this.helm = new HelmClient(helmCfg);

        if (this.settlementTime) {
            await this.settlement();
        }

        const result: Array<LabResult> = [];
        for (let i = 0; i < this.testCases.length; i++) {
            const testCaseResult = await this.runTestCase(i, kubeconfig);
            result.push(testCaseResult);
        }
        return result;
    }

    private async runTestCase(order: number, kubeconfig: string): Promise<LabResult> {
        // deploy test case chart
        this.logger.debug(`Deploying test case ${order}: ${this.testCases[order].name}`);

        const chart = new TestCaseChart(this.testCases[order], this.logger);

        await this.deployTestCase(chart, this.testCases[order].dependency);

        // port-forward
        const values = await chart.values();
        const serverInstance = await this.portForward(values.port, kubeconfig, this.testCases[order].name);

        // wait for results
        const results = await this.getResults(serverInstance.port, this.testCases[order].delay || defaultDelay);
        this.logger.debug(`Results received: ${JSON.stringify(results)}`);

        serverInstance.server.close();
        serverInstance.server.unref();

        await this.removeTestCase(order);

        return results;
    }

    private async deployTestCase(chart: TestCaseChart, dependency: Dependency): Promise<void> {

        await this.helm.installChart(chart, dependency);
    }

    private async portForward(port: number, kubeconfigPath: string, testCaseName: string): Promise<ServerInstance> {
        const kc = new k8s.KubeConfig();
        kc.loadFromFile(kubeconfigPath);

        const forward = new k8s.PortForward(kc);

        const k8sApi = kc.makeApiClient(k8s.CoreV1Api);
        const targetLabel = `app=${testCaseName}`;
        const pods = await k8sApi.listNamespacedPod('default', undefined, undefined, undefined, undefined, targetLabel);

        const pod = pods.body.items[0].metadata.name;


        const server = net.createServer((socket) => {
            forward.portForward('default', pod, [port], socket, null, socket);
        });

        server.listen(port, localhost);
        this.logger.debug(`Local port ${port} forwarded to pod ${pod} port ${port}`);

        return { server, port };
    }

    private async getResults(port: number, delay: number): Promise<LabResult> {
        const client = new Client(`ws://${localhost}:${port}`, this.logger);
        client.start();
        await client.delay(delay);

        return client.requestStatus();
    }

    private async removeTestCase(order: number): Promise<void> {
        const chart = new TestCaseChart(this.testCases[order], this.logger);

        return this.helm.uninstallChart(chart.name());
    }

    private settlement() {
        return new Promise(resolve => setTimeout(resolve, this.settlementTime));
    }
}
