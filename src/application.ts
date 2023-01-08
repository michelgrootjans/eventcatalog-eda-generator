import path from "path";
import fs from "fs-extra";
import Catalog from "./domain";
import {AsyncAPIPluginOptions} from "./types";
import utils from "@eventcatalog/utils";
import {Domain, Service} from "@eventcatalog/types";

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


const readServices = (catalogDirectory: string): any[] => {
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


const readEvents = (catalogDirectory: string) => {
    if (!fs.existsSync(path.join(catalogDirectory, 'events'))) return [];
    const {getAllEventsFromCatalog} = utils({catalogDirectory})
    return getAllEventsFromCatalog();
};


export default (catalogDirectory: string) => {

    const readCatalog = (): Catalog => {
        if (!fs.existsSync(catalogDirectory)) return new Catalog({});

        const domains = readDomains(catalogDirectory);
        const services = readServices(catalogDirectory);
        const events = readEvents(catalogDirectory);
        return new Catalog({domains, services, events})
    };

    const writeCatalog = async (catalog: Catalog, options: AsyncAPIPluginOptions) => {
        for (const domain of catalog.state().domains) {
            const domainDirectory = writeDomain(domain, catalogDirectory, options);

            for (const service of (domain.services || [])) {
                const {writeServiceToCatalog} = utils({catalogDirectory: domainDirectory});
                writeServiceToCatalog(service, options);
            }
            const {writeEventToCatalog} = utils({
                catalogDirectory: domainDirectory,
            });
            const eventFiles = (domain.events || []).map(async (event: any) => {
                const {schema, ...eventData} = event;

                await writeEventToCatalog(eventData, {
                    useMarkdownContentFromExistingEvent: true,
                    versionExistingEvent: options.versionEvents,
                    renderMermaidDiagram: options.renderMermaidDiagram,
                    renderNodeGraph: options.renderNodeGraph,
                    frontMatterToCopyToNewVersions: {
                        // only do consumers and producers if it's not the first file.
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

            // write all events to folders
            await Promise.all(eventFiles);

        }

        writeServices(catalog.state().services, catalogDirectory, options);
    };

    return {readCatalog, writeCatalog}
}