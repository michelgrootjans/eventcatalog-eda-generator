import path from "path";
import fs from "fs-extra";
import matter from "gray-matter";
import Catalog from "./domain";

interface FunctionInitInterface {
    catalogDirectory: string;
}

function readMarkdownFile(pathToFile: string) {
    const file = fs.readFileSync(pathToFile, {
        encoding: 'utf-8',
    });
    return matter(file);
}

const getEventFromCatalog =
    ({catalogDirectory}: FunctionInitInterface) =>
        (eventName: string) => {
            return readMarkdownFile(path.join(catalogDirectory, 'events', eventName, 'index.md'));
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

        const getDomainFromCatalog = (domainName: string) => {
            try {
                let domainDirectory = path.join(domainsDirectory, domainName);
                const domain = readMarkdownFile(path.join(domainDirectory, 'index.md'));
                return {
                    ...domain,
                    services: getAllServicesFromCatalog(domainDirectory),
                    events: getAllEventsFromCatalog({catalogDirectory: domainDirectory})(),
                };
            } catch (error) {
                return null;
            }
        };

        const domainNames = fs.readdirSync(domainsDirectory);
        return domainNames.map((domainName) => {
            const {raw, ...service}: any = getDomainFromCatalog(domainName);
            return service;
        });
    };

    const getAllServicesFromCatalog = (catalogDirectory: string): any[] => {
        const servicesDir = path.join(catalogDirectory, 'services');

        const getServiceFromCatalog = (sericeName: string) => readMarkdownFile(path.join(servicesDir, sericeName, 'index.md'));

        if (!fs.existsSync(servicesDir)) {
            return [];
        }
        const serviceNames = fs.readdirSync(servicesDir);
        return serviceNames.map((serviceName) => {
            const {raw, ...service}: any = getServiceFromCatalog(serviceName);
            return service;
        });
    };


    const readCatalog = (): Catalog => {
        if (!fs.existsSync(catalogDirectory)) {
            return new Catalog({domains: [], services: [], events: []});
        }

        const domains = getAllDomainsFromCatalog();
        const services = getAllServicesFromCatalog(catalogDirectory);
        const events = getAllEventsFromCatalog({catalogDirectory})();
        return new Catalog({domains, services, events})
    };

    return {readCatalog}
}