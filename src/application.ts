import path from "path";
import fs from "fs-extra";
import Catalog from "./domain";
import {AsyncAPIPluginOptions} from "./types";
import utils from "@eventcatalog/utils";
import {Domain, Service, Event} from "@eventcatalog/types";

const directoriesIn = (domainsDirectory: string) => fs.readdirSync(domainsDirectory);

const readDomains = (catalogDirectory: string): Domain[] => {
    const domainsDirectory = path.join(catalogDirectory, 'domains');
    if (!fs.existsSync(domainsDirectory)) return [];

    const getFullDomainFromCatalog = (domainName: string) => {
        const {getDomainFromCatalog} = utils({catalogDirectory})
        const domain = getDomainFromCatalog(domainName);
        const domainDirectory = path.join(domainsDirectory, domainName);
        return {
            ...domain,
            services: readServices(domainDirectory),
            events: readEvents(domainDirectory),
        };
    };

    return directoriesIn(domainsDirectory)
        .map((domainName) => {
            const {raw, ...domain}: any = getFullDomainFromCatalog(domainName);
            return domain;
        }) as Domain[];
};

const writeDomain = ({name, summary}: Domain, catalogDirectory: string, options: AsyncAPIPluginOptions) => {
    const {writeDomainToCatalog} = utils({catalogDirectory})
    const {path: domainDirectory} = writeDomainToCatalog({name, summary}, options);
    return domainDirectory;
};


const readServices = (catalogDirectory: string): Service[] => {
    if (!fs.existsSync(path.join(catalogDirectory, 'services'))) return [];
    const {getAllServicesFromCatalog} = utils({catalogDirectory})
    return getAllServicesFromCatalog();
};

const writeServices = (services: Service[], catalogDirectory: string, options: AsyncAPIPluginOptions) => {
    const {writeServiceToCatalog} = utils({catalogDirectory})
    for (const service of services) {
        writeServiceToCatalog(service, options)
    }
};


const readEvents = (catalogDirectory: string): Event[] => {
    if (!fs.existsSync(path.join(catalogDirectory, 'events'))) return [];
    const {getAllEventsFromCatalog} = utils({catalogDirectory})
    return getAllEventsFromCatalog();
};

const writeEvents = (events: Event[], catalogDirectory: string, options: AsyncAPIPluginOptions) => {
    const {writeEventToCatalog} = utils({catalogDirectory});

    const eventFiles = (events).map((event: Event) => {
        const {schema, ...eventData} = event;

        writeEventToCatalog(eventData, {
            useMarkdownContentFromExistingEvent: true,
            versionExistingEvent: options.versionEvents,
            renderMermaidDiagram: options.renderMermaidDiagram,
            renderNodeGraph: options.renderNodeGraph,
            frontMatterToCopyToNewVersions: {
                consumers: true,
                producers: true,
                // owners: true,
                // externalLinks: true
            },
            schema: {
                extension: 'json',
                fileContent: schema,
            },
        });
    });
};

export default (catalogDirectory: string) => {
    const readCatalog = (): Catalog => {
        if (!fs.existsSync(catalogDirectory)) return new Catalog();

        return new Catalog({
            domains: readDomains(catalogDirectory),
            services: readServices(catalogDirectory),
            events: readEvents(catalogDirectory)
        })
    };

    const writeCatalog = (catalog: Catalog, options: AsyncAPIPluginOptions) => {
        const {domains, services, events} = catalog.state();
        for (const domain of domains) {
            const domainDirectory = writeDomain(domain, catalogDirectory, options);
            writeServices(domain.services || [], domainDirectory, options);
            writeEvents(domain.events || [], domainDirectory, options);
        }

        writeServices(services, catalogDirectory, options);
    };

    return {readCatalog, writeCatalog}
}