// import chalk from 'chalk';
import type {Domain, Event, LoadContext, Service} from '@eventcatalog/types';
import {AsyncAPIDocument, parse} from '@asyncapi/parser';
import fs from 'fs-extra';
import path from 'path';
import utils from '@eventcatalog/utils';

import type {AsyncAPIPluginOptions} from './types';

const getServiceFromAsyncDoc = (doc: AsyncAPIDocument): Service => ({
  name: doc.info().title(),
  summary: doc.info().description() || '',
});

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

const parseAsyncAPIFile = async (data: Promise<{ service: Service; events: Event[] }>, options: AsyncAPIPluginOptions, copyFrontMatter: boolean) => {
  const {
    versionEvents = true,
    renderMermaidDiagram = true,
    renderNodeGraph = false,
    domainName = '',
    domainSummary = '',
    catalogDirectory = '',
  } = options;

  const {service, events} = await data

  if (domainName) {
    const { writeDomainToCatalog } = utils({ catalogDirectory });

    const domain: Domain = {
      name: domainName,
      summary: domainSummary,
    };

    await writeDomainToCatalog(domain, {
      useMarkdownContentFromExistingDomain: true,
      renderMermaidDiagram,
      renderNodeGraph,
    });
  }

  const { writeServiceToCatalog } = utils({
    catalogDirectory: domainName ? path.join(catalogDirectory, 'domains', domainName) : catalogDirectory,
  });

  const { getEventFromCatalog, writeEventToCatalog } = utils({
    catalogDirectory: domainName ? path.join(catalogDirectory, 'domains', domainName) : catalogDirectory,
  });

  await writeServiceToCatalog(service, {
    useMarkdownContentFromExistingService: true,
    renderMermaidDiagram,
    renderNodeGraph,
  });

  const eventFiles = events.map(async (event: any) => {
    const { schema, ...eventData } = event;

    await writeEventToCatalog(eventData, {
      useMarkdownContentFromExistingEvent: true,
      versionExistingEvent: versionEvents,
      renderMermaidDiagram,
      renderNodeGraph,
      frontMatterToCopyToNewVersions: {
        // only do consumers and producers if its not the first file.
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
  Promise.all(eventFiles);

  return {
    generatedEvents: events,
  };
};

export default async (context: LoadContext, options: AsyncAPIPluginOptions) => {
  options.catalogDirectory = options.catalogDirectory || process.env.PROJECT_DIR;

  if (!options.catalogDirectory) {
    throw new Error('Please provide catalog url (env variable PROJECT_DIR)');
  }

  const {pathToSpec} = options;

  const listOfAsyncAPIFilesToParse = Array.isArray(pathToSpec) ? pathToSpec : [pathToSpec];

  if (listOfAsyncAPIFilesToParse.length === 0 || !pathToSpec) {
    throw new Error('No file provided in plugin.');
  }

  listOfAsyncAPIFilesToParse.map(readFile)


// on first parse of files don't copy any frontmatter over.
  const parsers = listOfAsyncAPIFilesToParse
      .map(readFile)
      .map(async (asyncAPIFile: string) => await parse(asyncAPIFile))
      .map(a => read(a, options))
      .map((specFile, index) => parseAsyncAPIFile(specFile, options, index !== 0));

  const data = await Promise.all(parsers);


  const totalEvents = data.reduce((sum, { generatedEvents }) => sum + generatedEvents.length, 0);
  console.log(
    // chalk.green(`Successfully parsed ${listOfAsyncAPIFilesToParse.length} AsyncAPI file/s. Generated ${totalEvents} events`)
    `Successfully parsed ${listOfAsyncAPIFilesToParse.length} AsyncAPI file/s. Generated ${totalEvents} events`
  );

};

async function read(docPromise: Promise<AsyncAPIDocument>, options: AsyncAPIPluginOptions): Promise<{ service: Service, events: Event[] }> {
  const doc: AsyncAPIDocument = await docPromise;
  const service = getServiceFromAsyncDoc(doc);
  const events = getAllEventsFromAsyncDoc(doc, options);

  return {service, events};
}

function readFile(path: string) {
  try {
    return fs.readFileSync(path, 'utf-8');
  } catch (error: any) {
    console.error(error);
    throw new Error(`Failed to read file with provided path`);
  }
}
