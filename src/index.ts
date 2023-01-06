// import chalk from 'chalk';
import type {Domain, Event, LoadContext, Service} from '@eventcatalog/types';
import {AsyncAPIDocument, parse} from '@asyncapi/parser';
import fs from 'fs-extra';
import path from 'path';
import utils from '@eventcatalog/utils';

import type {AsyncAPIPluginOptions} from './types';

const getServiceFromAsyncDoc = (doc: AsyncAPIDocument, {domainName}: AsyncAPIPluginOptions): Service => {
  let service: Service = {
    name: doc.info().title(),
    summary: doc.info().description() || '',
  };
  return service;
};

const getAllEventsFromAsyncDoc = (doc: AsyncAPIDocument, options: AsyncAPIPluginOptions): Event[] => {
  const { externalAsyncAPIUrl } = options;

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
  const {writeServiceToCatalog} = utils({
    catalogDirectory: options.domainName ? path.join(catalogDirectory, 'domains', options.domainName) : catalogDirectory,
  });
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

const write = async (data: Promise<{ service: Service, domain: Domain | undefined, events: Event[] }>, options: AsyncAPIPluginOptions, copyFrontMatter: boolean) => {
  const {
    versionEvents = true,
    renderMermaidDiagram = true,
    renderNodeGraph = false,
    domainName = '',
    catalogDirectory = '',
  } = options;

  const {service, domain, events} = await data

  await writeDomain(catalogDirectory, domain, options);
  await writeService(catalogDirectory, service, options);

  const {writeEventToCatalog } = utils({
    catalogDirectory: domainName ? path.join(catalogDirectory, 'domains', domainName) : catalogDirectory,
  });
  const eventFiles = events.map(async (event: any) => {
    const { schema, ...eventData } = event;

    await writeEventToCatalog(eventData, {
      useMarkdownContentFromExistingEvent: true,
      versionExistingEvent: versionEvents,
      renderMermaidDiagram,
      renderNodeGraph,
      frontMatterToCopyToNewVersions: {
        // only do consumers and producers if it's not the first file.
        consumers: copyFrontMatter,
        producers: copyFrontMatter,
      },
      schema: {
        extension: 'json',
        fileContent: schema,
      },
    });
  });

  // write all events to folders
  await Promise.all(eventFiles);

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

  const parsers = listOfAsyncAPIFilesToParse
      .map(readFile)
      .map(async (asyncAPIFile: string) => await parse(asyncAPIFile))
      .map(document => read(document, options))
      .map((data, index) => write(data, options, index !== 0));

  const data = await Promise.all(parsers);


  const totalEvents = data.reduce((sum, { events }) => sum + events.length, 0);
  console.log(
    // chalk.green(`Successfully parsed ${listOfAsyncAPIFilesToParse.length} AsyncAPI file/s. Generated ${totalEvents} events`)
    `Successfully parsed ${listOfAsyncAPIFilesToParse.length} AsyncAPI file/s. Generated ${totalEvents} events`
  );

};

async function read(docPromise: Promise<AsyncAPIDocument>, options: AsyncAPIPluginOptions): Promise<{ service: Service, domain: Domain | undefined, events: Event[] }> {
  const document: AsyncAPIDocument = await docPromise;
  const domain = getDomainFromAsyncOptions(options);
  const service = getServiceFromAsyncDoc(document, options);
  const events = getAllEventsFromAsyncDoc(document, options);
  return {service, domain, events};
}

function getDomainFromAsyncOptions({domainName = '', domainSummary = ''}: AsyncAPIPluginOptions): Domain | undefined {
  if (domainName) {
    return {
      name: domainName,
      summary: domainSummary,
    };
  }
}

function readFile(path: string) {
  try {
    return fs.readFileSync(path, 'utf-8');
  } catch (error: any) {
    console.error(error);
    throw new Error(`Failed to read file with provided path`);
  }
}
