// import chalk from 'chalk';
import type {LoadContext} from '@eventcatalog/types';
import {AsyncAPIDocument, parse} from '@asyncapi/parser';
import fs from 'fs-extra';

import type {AsyncApiDocument, AsyncApiDomain, AsyncApiEvent, AsyncAPIPluginOptions, AsyncApiService} from './types';
import Application from "./application";

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

function getDomainFromAsyncOptions({domainName = '', domainSummary = ''}: AsyncAPIPluginOptions): AsyncApiDomain | undefined {
    if (domainName) {
        return {
            name: domainName,
            summary: domainSummary,
        };
    }
}

const getServiceFromAsyncDoc = (doc: AsyncAPIDocument): AsyncApiService => {
    return {
        name: doc.info().title(),
        summary: doc.info().description() || '',
    };
};

const getEventsFromAsyncDoc = (doc: AsyncAPIDocument, options: AsyncAPIPluginOptions): AsyncApiEvent[] => {
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

function readAsyncApiDocument(document: AsyncAPIDocument, options: AsyncAPIPluginOptions): AsyncApiDocument {
    const domain = getDomainFromAsyncOptions(options);
    const service = getServiceFromAsyncDoc(document);
    const events = getEventsFromAsyncDoc(document, options);
    return {domain, service, events};
}

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
        .map(async (data) => catalog.apply(await data));

    await Promise.all(parsers);

    await application.writeCatalog(catalog, options);

    console.log(
        `Successfully parsed ${listOfAsyncAPIFilesToParse.length} AsyncAPI file/s.`
    );

};
