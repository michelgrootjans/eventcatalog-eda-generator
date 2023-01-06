// import chalk from 'chalk';
import type {Domain, Event, LoadContext, Service} from '@eventcatalog/types';
import {AsyncAPIDocument, parse} from '@asyncapi/parser';
import fs from 'fs-extra';
import path from 'path';
import utils from '@eventcatalog/utils';

import type {AsyncAPIPluginOptions} from './types';
import Catalog from "./domain";
import Application from "./application";

const getServiceFromAsyncDoc = (doc: AsyncAPIDocument, {domainName}: AsyncAPIPluginOptions): Service => {
    return {
        name: doc.info().title(),
        summary: doc.info().description() || '',
    };
};

const getAllEventsFromAsyncDoc = (doc: AsyncAPIDocument, options: AsyncAPIPluginOptions): Event[] => {
    const {externalAsyncAPIUrl} = options;

    const channels = doc.channels();
    return Object.keys(channels).reduce((data: any, channelName) => {
        const service = doc.info().title();

        const channel = channels[channelName];
        const operation = channel.hasSubscribe() ? 'subscribe' : 'publish';

        const messages = channel[operation]().messages();

        const eventsFromMessages = messages.map((message) => {
            const messageName = message.name() || message.extension('x-parser-message-name');
            const schema = message.originalPayload();
            const externalLink = {
                label: `View event in AsyncAPI`,
                url: `${externalAsyncAPIUrl}#message-${messageName}`,
            };

            return {
                name: messageName,
                summary: message.summary(),
                version: doc.info().version(),
                producers: operation === 'subscribe' ? [service] : [],
                consumers: operation === 'publish' ? [service] : [],
                externalLinks: externalAsyncAPIUrl ? [externalLink] : [],
                schema: schema ? JSON.stringify(schema, null, 4) : '',
                badges: [],
            };
        });

        return data.concat(eventsFromMessages);
    }, []);
};

async function writeService(catalogDirectory: string, service: Service, options: AsyncAPIPluginOptions) {
    const {writeServiceToCatalog} = utils({catalogDirectory});
    await writeServiceToCatalog(service, {
        useMarkdownContentFromExistingService: true,
        renderMermaidDiagram: options.renderMermaidDiagram,
        renderNodeGraph: options.renderNodeGraph,
    });
}

async function writeDomain(catalogDirectory: string, domain: Domain | undefined, options: AsyncAPIPluginOptions) {
    if (domain) {
        const {writeDomainToCatalog} = utils({catalogDirectory});
        await writeDomainToCatalog(domain, {
            useMarkdownContentFromExistingDomain: true,
            renderMermaidDiagram: options.renderMermaidDiagram,
            renderNodeGraph: options.renderNodeGraph,
        });
    }
}

async function writeEvents(domainDirectory: string, events: Event[], options: AsyncAPIPluginOptions, copyFrontMatter: boolean) {
    const {writeEventToCatalog} = utils({
        catalogDirectory: domainDirectory,
    });
    const eventFiles = events.map(async (event: any) => {
        const {schema, ...eventData} = event;

        await writeEventToCatalog(eventData, {
            useMarkdownContentFromExistingEvent: true,
            versionExistingEvent: options.versionEvents,
            renderMermaidDiagram: options.renderMermaidDiagram,
            renderNodeGraph: options.renderNodeGraph,
            frontMatterToCopyToNewVersions: {
                // only do consumers and producers if it's not the first file.
                consumers: copyFrontMatter,
                producers: copyFrontMatter,
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

const write = async (data: { domain: Domain | undefined; service: Service; events: Event[] }, options: AsyncAPIPluginOptions, copyFrontMatter: boolean, catalog: Catalog) => {
    const {catalogDirectory = ''} = options;
    const {domain, service, events} = data

    catalog.apply(data)

    if (domain) {
        const domainDirectory: string = path.join(catalogDirectory, 'domains', domain.name);
        await writeDomain(catalogDirectory, domain, options);
        await writeService(domainDirectory, service, options);
        await writeEvents(domainDirectory, events, options, copyFrontMatter);
    } else {
        // await writeService(catalogDirectory, service, options);
        await writeEvents(catalogDirectory, events, options, copyFrontMatter);
    }


    return {service, domain, events};
};

export default async (context: LoadContext, options: AsyncAPIPluginOptions) => {
    options = {
        catalogDirectory: process.env.PROJECT_DIR,
        ...options
    }

    const {pathToSpec, catalogDirectory} = options;

    if (!catalogDirectory) {
        throw new Error('Please provide catalog url (env variable PROJECT_DIR)');
    }

    const listOfAsyncAPIFilesToParse = Array.isArray(pathToSpec) ? pathToSpec : [pathToSpec];

    if (listOfAsyncAPIFilesToParse.length === 0 || !pathToSpec) {
        throw new Error('No file provided in plugin.');
    }

    let application = Application(catalogDirectory);
    const catalog = application.readCatalog();

    const parsers = listOfAsyncAPIFilesToParse
        .map(readAsyncApiFile)
        .map(async document => readAsyncApiDocument(await document, options))
        .map(async (data, index) => write(await data, options, index !== 0, catalog));

    const data = await Promise.all(parsers);

    application.writeCatalog(catalog, options);

    const totalEvents = data.reduce((sum, {events}) => sum + events.length, 0);
    console.log(
        // chalk.green(`Successfully parsed ${listOfAsyncAPIFilesToParse.length} AsyncAPI file/s. Generated ${totalEvents} events`)
        `Successfully parsed ${listOfAsyncAPIFilesToParse.length} AsyncAPI file/s. Generated ${totalEvents} events`
    );

};

async function readAsyncApiDocument(document: AsyncAPIDocument, options: AsyncAPIPluginOptions): Promise<{ domain: Domain | undefined; service: Service; events: Event[] }> {
    const domain = getDomainFromAsyncOptions(options);
    const service = getServiceFromAsyncDoc(document, options);
    const events = getAllEventsFromAsyncDoc(document, options);
    return {domain, service, events};
}

function getDomainFromAsyncOptions({domainName = '', domainSummary = ''}: AsyncAPIPluginOptions): Domain | undefined {
    if (domainName) {
        return {
            name: domainName,
            summary: domainSummary,
        };
    }
}

async function readAsyncApiFile(path: string): Promise<AsyncAPIDocument> {
    let rawFile: string;
    try {
        rawFile = fs.readFileSync(path, 'utf-8');
    } catch (error: any) {
        console.error(error);
        throw new Error(`Failed to read file with provided path`);
    }
    return await parse(rawFile);
}
