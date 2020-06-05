import { Logger } from '@w3f/logger';
import { Helm, ChartConfig } from '@w3f/helm';
import path from 'path';

import {
    Topology,
    ApplicationsManager,
    Dependencies
} from '../types';


export class Apps implements ApplicationsManager {
    private helm: Helm;

    constructor(
        private readonly topology: Topology,
        private readonly dependencies: Dependencies,
        private readonly logger: Logger
    ) { }

    async install(kubeconfig: string): Promise<void> {
        await this.init(kubeconfig);

        await this.installDependencies();

        await this.installNodes();
    }

    private async init(kubeconfig: string): Promise<void> {
        if (this.helm) {
            return
        }
        this.helm = await Helm.create(kubeconfig, this.logger);
    }

    private async installDependencies(): Promise<void> {
        await this.installPrometheus();

        // install network-policy
    }

    private async installNodes(): Promise<void> {
        // install polkadot-base-services

        // install polkadot
    }

    private async installPrometheus(): Promise<void> {
        const valuesTemplatePath = path.join(__dirname, 'values', 'prometheus-operator.yaml');
        const valuesTemplate = {
            path: valuesTemplatePath,
            data: {}
        }
        const chartCfg: ChartConfig = {
            name: 'prometheus-operator',
            chart: 'stable/prometheus-operator',
            wait: true,
            valuesTemplate
        };
        if (this.dependencies &&
            this.dependencies['prometheus-operator']) {
            chartCfg.version = this.dependencies['prometheus-operator'];
        }
        await this.helm.install(chartCfg);
    }
}
