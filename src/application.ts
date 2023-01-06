import path from "path";
import fs from "fs-extra";
import Catalog from "./domain";
import {AsyncAPIPluginOptions} from "./types";
import utils from "@eventcatalog/utils";

const directoriesIn = (domainsDirectory: string) => fs.readdirSync(domainsDirectory);

export default (catalogDirectory: string) => {
    const domainsDirectory = path.join(catalogDirectory, 'domains');

    const getAllDomainsFromCatalog = (): any[] => {
        if (!fs.existsSync(domainsDirectory)) return [];

        const getFullDomainFromCatalog = (domainName: string) => {
            try {
                const domainDirectory = path.join(domainsDirectory, domainName);
                const {getDomainFromCatalog} = utils({catalogDirectory})
                const domain = getDomainFromCatalog(domainName);
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
            const {raw, ...domain}: any = getFullDomainFromCatalog(domainName);
            return domain;
        });
    };

    const getAllServicesFromCatalog = (catalogDirectory: string): any[] => {
        if (!fs.existsSync(path.join(catalogDirectory, 'services'))) return [];
        const {getAllServicesFromCatalog} = utils({catalogDirectory})
        return getAllServicesFromCatalog();
    };

    const getAllEventsFromCatalog = (catalogDirectory: string) => {
        if (!fs.existsSync(path.join(catalogDirectory, 'events'))) return [];
        const {getAllEventsFromCatalog} = utils({catalogDirectory})
        return getAllEventsFromCatalog();
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
        const {
            writeDomainToCatalog,
            writeServiceToCatalog,
        } = utils({catalogDirectory})

        for (const {name, summary} of catalog.state().domains) {
            writeDomainToCatalog({name, summary}, options)
        }
        for (const service of catalog.state().services) {
            writeServiceToCatalog(service, options)
        }
    };

    return {readCatalog, writeCatalog}
}