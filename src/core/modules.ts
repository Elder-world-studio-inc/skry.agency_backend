import { Router } from 'express';
import adCamRoutes from '../modules/ad-cam/routes';

export interface ModuleMetadata {
    id: string;
    name: string;
    description: string;
    version: string;
}

export interface SkryModule {
    metadata: ModuleMetadata;
    router: Router;
}

const modules: SkryModule[] = [
    {
        metadata: {
            id: 'ad-cam',
            name: 'Skry Ad Cam',
            description: 'Capture and analyze ads across platforms',
            version: '1.0.0'
        },
        router: adCamRoutes
    }
];

export const loadModules = (appRouter: Router) => {
    modules.forEach(module => {
        console.log(`📦 Loading Module: ${module.metadata.name} (${module.metadata.id})`);
        appRouter.use(`/m/${module.metadata.id}`, module.router);
        
        // Backward compatibility alias for single-module implementation
        if (module.metadata.id === 'ad-cam') {
            appRouter.use('/ads', module.router);
        }
    });
};

export const getModulesMetadata = () => {
    return modules.map(m => m.metadata);
};
