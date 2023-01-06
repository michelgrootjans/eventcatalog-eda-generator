import path from "path";
import fs from "fs-extra";
import matter from "gray-matter";
import Catalog from "./domain";

interface FunctionInitInterface {
    catalogDirectory: string;
}

const readMarkdownFile = (pathToFile: string) => {
    const file = fs.readFileSync(pathToFile, {
        encoding: 'utf-8',
    });
    return {
        parsed: matter(file),
        raw: file,
    };
};


const getAllServicesFromCatalog =
    ({catalogDirectory}: FunctionInitInterface) =>
        (): any[] => {
            const servicesDir = path.join(catalogDirectory, 'services');
            if (!fs.existsSync(servicesDir)) {
                return [];
            }
            const folders = fs.readdirSync(servicesDir);
            return folders.map((folder) => {
                const {raw, ...service}: any = getServiceFromCatalog({catalogDirectory})(folder);
                return service;
            });
        };

const getServiceFromCatalog =
    ({catalogDirectory}: FunctionInitInterface) =>
        (seriveName: string) => {
            try {
                const {parsed} = readMarkdownFile(path.join(catalogDirectory, 'services', seriveName, 'index.md'));
                return parsed;
            } catch (error) {
                return null;
            }
        };

const getEventFromCatalog =
    ({catalogDirectory}: FunctionInitInterface) =>
        (eventName: string) => {
            let {parsed} = readMarkdownFile(path.join(catalogDirectory, 'events', eventName, 'index.md'));
            return parsed;
        };

const getAllEventsFromCatalog =
    ({catalogDirectory}: FunctionInitInterface) =>
        () => {
            const eventsDir = path.join(catalogDirectory, 'events');
            if (!fs.existsSync(eventsDir)) {
                return [];
            }
            const folders = fs.readdirSync(eventsDir);
            const events = folders.map((folder) => getEventFromCatalog({catalogDirectory})(folder));
            return events.filter((event) => event !== null).map(({raw, ...event}: any) => event);
        };

export default (catalogDirectory: string) => {
    const domainsDirectory = path.join(catalogDirectory, 'domains');

    const getAllDomainsFromCatalog = (): any[] => {
        if (!fs.existsSync(domainsDirectory)) return [];

        const domainNames = fs.readdirSync(domainsDirectory);
        return domainNames.map((domainName) => {
            const {raw, ...service}: any = getDomainFromCatalog(domainName);
            return service;
        });
    };

    const getDomainFromCatalog = (domainName: string) => {
        try {
            let domainDirectory = path.join(domainsDirectory, domainName);
            let pathToFile = path.join(domainDirectory, 'index.md');
            const {parsed} = readMarkdownFile(pathToFile);
            return {
                ...parsed,
                services: getAllServicesFromCatalog({catalogDirectory: domainDirectory})(),
                events: getAllEventsFromCatalog({catalogDirectory: domainDirectory})(),
            };
        } catch (error) {
            return null;
        }
    };


    const readCatalog = (): Catalog => {
        if (!fs.existsSync(catalogDirectory)) {
            return new Catalog({domains: [], services: [], events: []});
        }

        const domains = getAllDomainsFromCatalog();
        const services = getAllServicesFromCatalog({catalogDirectory})();
        const events = getAllEventsFromCatalog({catalogDirectory})();
        return new Catalog({domains, services, events})
    };

    return {readCatalog}
}