import path from "path";
import fs from "fs-extra";
import matter from "gray-matter";

export interface FunctionInitInterface {
    catalogDirectory: string;
}

class Catalog {
    private services;
    private events;

    constructor(services: any[], events: any[]) {
        this.services = services;
        this.events = events;
    }

    state() {
        let services = this.services.map(s => s.data);
        let events = this.events.map(e => e.data);
        return {services, events};
    }
}

export const readCatalog = (catalogDirectory: string): Catalog => {
    let services = getAllServicesFromCatalog({catalogDirectory})();
    let events = getAllEventsFromCatalog({catalogDirectory})();
    return new Catalog(services, events)
};

const readMarkdownFile = (pathToFile: string) => {
    const file = fs.readFileSync(pathToFile, {
        encoding: 'utf-8',
    });
    return {
        parsed: matter(file),
        raw: file,
    };
};

export const getAllServicesFromCatalog =
    ({catalogDirectory}: FunctionInitInterface) =>
        (): any[] => {
            const servicesDir = path.join(catalogDirectory, 'services');
            const folders = fs.readdirSync(servicesDir);
            return folders.map((folder) => {
                const {raw, ...service}: any = getServiceFromCatalog({catalogDirectory})(folder);
                return service;
            });
        };

export const getServiceFromCatalog =
    ({catalogDirectory}: FunctionInitInterface) =>
        (seriveName: string) => {
            try {
                const {parsed} = readMarkdownFile(path.join(catalogDirectory, 'services', seriveName, 'index.md'));
                return parsed;
            } catch (error) {
                return null;
            }
        };

export const getEventFromCatalog =
    ({catalogDirectory}: FunctionInitInterface) =>
        (eventName: string) => {
            let {parsed} = readMarkdownFile(path.join(catalogDirectory, 'events', eventName, 'index.md'));
            return parsed;
        };

const getAllEventsFromCatalog =
    ({catalogDirectory}: FunctionInitInterface) =>
        () => {
            const eventsDir = path.join(catalogDirectory, 'events');
            const folders = fs.readdirSync(eventsDir);
            const events = folders.map((folder) => getEventFromCatalog({catalogDirectory})(folder));
            return events.filter((event) => event !== null).map(({raw, ...event}: any) => event);
        };
