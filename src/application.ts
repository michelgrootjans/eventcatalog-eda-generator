import path from "path";
import fs from "fs-extra";
import matter from "gray-matter";
import Catalog from "./domain";
import {writeServiceToCatalog} from "@eventcatalog/utils/lib/services";
import {AsyncAPIPluginOptions} from "./types";

const readMarkdownFile = (pathToFile: string) => {
    const file = fs.readFileSync(pathToFile, {encoding: 'utf-8'});
    return matter(file);
};

const directoriesIn = (domainsDirectory: string) => fs.readdirSync(domainsDirectory);

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
                    events: getAllEventsFromCatalog(domainDirectory),
                };
            } catch (error) {
                return null;
            }
        };

        return directoriesIn(domainsDirectory)
            .map((domainName) => {
            const {raw, ...domain}: any = getDomainFromCatalog(domainName);
            return domain;
        });
    };

    const getAllServicesFromCatalog = (catalogDirectory: string): any[] => {
        const servicesDirectory = path.join(catalogDirectory, 'services');

        const getServiceFromCatalog = (sericeName: string) => readMarkdownFile(path.join(servicesDirectory, sericeName, 'index.md'));

        if (!fs.existsSync(servicesDirectory)) {
            return [];
        }
        const serviceNames = directoriesIn(servicesDirectory);
        return serviceNames.map((serviceName) => {
            const {raw, ...service}: any = getServiceFromCatalog(serviceName);
            return service;
        });
    };

    const getAllEventsFromCatalog = (catalogDirectory: string) => {
        const eventsDirectory = path.join(catalogDirectory, 'events');
        if (!fs.existsSync(eventsDirectory)) {
            return [];
        }
        const getEventFromCatalog = (eventName: string) => readMarkdownFile(path.join(eventsDirectory, eventName, 'index.md'));

        const eventNames = directoriesIn(eventsDirectory);
        const events = eventNames.map((eventName) => getEventFromCatalog(eventName));
        return events.filter((event) => event !== null).map(({raw, ...event}: any) => event);
    };


    const readCatalog = (): Catalog => {
        if (!fs.existsSync(catalogDirectory)) {
            return new Catalog({});
        }
        const domains = getAllDomainsFromCatalog();
        const services = getAllServicesFromCatalog(catalogDirectory);
        const events = getAllEventsFromCatalog(catalogDirectory);
        return new Catalog({domains, services, events})
    };

    const writeCatalog = (catalog: Catalog, options: AsyncAPIPluginOptions) => {
        const writeService = writeServiceToCatalog({catalogDirectory});

        catalog.state().services.forEach(service => {
            writeService(service, options)
        })
    };

    return {readCatalog, writeCatalog}
}