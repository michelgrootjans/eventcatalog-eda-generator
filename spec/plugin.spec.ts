/* eslint-disable no-unused-vars */
/* eslint-disable no-promise-executor-return */
// @ts-nocheck
import type { LoadContext } from '@eventcatalog/types';
import utils from '@eventcatalog/utils';

import path from 'path';
import fs from 'fs-extra';
import {v4 as uuid} from 'uuid';
import plugin from '../src';

import type { AsyncAPIPluginOptions } from '../src/types';

const pluginContext: LoadContext = {
  eventCatalogConfig: {},
};

describe('eventcatalog-plugin-generator-asyncapi', () => {
  const tempDirectory = path.join(__dirname, '..', 'tmp', 'pluginspec')
  let catalogDirectory: string;

  beforeAll(async () => {
    try {
      await fs.rm(tempDirectory, {recursive: true, force: true})
    } catch {}
  });

  beforeEach(() => {
    catalogDirectory = path.join(tempDirectory, uuid())
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('plugin', () => {
    it('throws an error when no file has been provided to load within the plugin', async () => {
      const options: AsyncAPIPluginOptions = {
        catalogDirectory,
        pathToSpec: undefined,
      };

      await expect(plugin(pluginContext, options)).rejects.toThrow('No file provided in plugin.');
    });

    it('throws an error when file has been provided but the file cannot be found', async () => {
      const options: AsyncAPIPluginOptions = {
        catalogDirectory,
        pathToSpec: path.join(__dirname, 'random-location'),
      };

      await expect(plugin(pluginContext, options)).rejects.toThrow('Failed to read file with provided path');
    });

    it('throws an error when failing to parse AsyncAPI file', async () => {
      const options: AsyncAPIPluginOptions = {
        catalogDirectory,
        pathToSpec: path.join(__dirname, './assets/invalid-asyncapi.yml'),
      };
      await expect(plugin(pluginContext, options)).rejects.toThrow('There were errors validating the AsyncAPI document.');
    });

    it('successfully takes a valid asyncapi file and creates the expected services and events markdown files from it', async () => {
      const options: AsyncAPIPluginOptions = {
        catalogDirectory,
        pathToSpec: path.join(__dirname, './assets/account-service-1.0.0.yml'),
      };

      await plugin(pluginContext, options);

      const { getEventFromCatalog, getServiceFromCatalog } = utils({ catalogDirectory });

      const { raw: eventFile } = getEventFromCatalog('UserSignedUp');
      const { raw: serviceFile } = getServiceFromCatalog('AccountService');

      expect(eventFile).toMatchMarkdown(`
        ---
          name: UserSignedUp
          summary: null
          version: 1.0.0
          producers: []
          consumers:
              - AccountService
          externalLinks: []
          badges: []
        ---

        <Mermaid />
        <Schema />
        `);

      expect(serviceFile).toMatchMarkdown(
        `---
          name: AccountService
          summary: 'This service is in charge of processing user signups'
          ---

          <Mermaid />`
      );
    });

    describe('multiple asyncapi files', () => {
      it('successfully takes multiple valid asyncapi files and creates the expected services and events markdown files from it', async () => {
        const options: AsyncAPIPluginOptions = {
          catalogDirectory,
          pathToSpec: [
            path.join(__dirname, './assets/account-service-1.0.0.yml'),
            path.join(__dirname, './assets/users-service-1.0.0.yml'),
          ],
        };

        await plugin(pluginContext, options);

        const { getEventFromCatalog, getServiceFromCatalog } = utils({ catalogDirectory });

        const { raw: eventFile } = getEventFromCatalog('UserSignedUp');
        const { raw: serviceFile } = getServiceFromCatalog('AccountService');
        const { raw: userServiceFile } = getServiceFromCatalog('UsersService');

        expect(eventFile).toMatchMarkdown(`
          ---
            name: UserSignedUp
            summary: null
            version: 1.0.0
            producers:
              - UsersService
            consumers:
              - AccountService
            externalLinks: []
            badges: []
          ---
  
          <Mermaid />
          <Schema />
          `);

        expect(serviceFile).toMatchMarkdown(
          `---
            name: AccountService
            summary: 'This service is in charge of processing user signups'
            ---
  
            <Mermaid />`
        );
        expect(userServiceFile).toMatchMarkdown(
          `---
            name: UsersService
            summary: 'This service is in charge of users'
            ---
  
            <Mermaid />`
        );
      });
    });

    describe('plugin options', () => {
      describe('versionEvents', () => {
        it('when versionEvents is true, all previous matching events will be versioned before writing the event to the catalog', async () => {
          const options: AsyncAPIPluginOptions = {
            catalogDirectory,
            pathToSpec: path.join(__dirname, './assets/account-service-1.0.0.yml'),
            versionEvents: true,
          };

          const oldEvent = {
            name: 'UserSignedUp',
            version: '0.0.1',
            summary: 'Old example of an event that should be versioned',
            producers: ['Service A'],
            consumers: ['Service B'],
            owners: ['dBoyne'],
          };

          const { writeEventToCatalog } = utils({ catalogDirectory });
          const { path: eventPath } = await writeEventToCatalog(oldEvent, {
            schema: { extension: 'json', fileContent: 'hello' },
          });

          // run plugin
          await plugin(pluginContext, options);

          const { getEventFromCatalog } = utils({ catalogDirectory });
          const { raw: eventFile } = getEventFromCatalog('UserSignedUp');

          // Check the version has been set
          expect(fs.existsSync(path.join(eventPath, 'versioned', '0.0.1', 'index.md'))).toEqual(true);
          expect(fs.existsSync(path.join(eventPath, 'versioned', '0.0.1', 'schema.json'))).toEqual(true);

          expect(fs.existsSync(path.join(eventPath, 'index.md'))).toEqual(true);
          expect(fs.existsSync(path.join(eventPath, 'schema.json'))).toEqual(true);

          expect(eventFile).toMatchMarkdown(`
            ---
              name: UserSignedUp
              summary: null
              version: 1.0.0
              producers: []
              consumers:
                  - AccountService
              externalLinks: []
              badges: []
            ---

            <Mermaid />
            <Schema />
            `);
        });

        it('when versionEvents is true and the events and services already have markdown content, that content is used for the new events and services being created', async () => {
          const options: AsyncAPIPluginOptions = {
            catalogDirectory,
            pathToSpec: path.join(__dirname, './assets/account-service-1.0.0.yml'),
            versionEvents: true,
          };

          const oldEvent = {
            name: 'UserSignedUp',
            version: '0.0.1',
            summary: 'Old example of an event that should be versioned',
            producers: ['Service A'],
            consumers: ['Service B'],
            owners: ['dBoyne'],
          };

          const { writeEventToCatalog } = utils({ catalogDirectory });
          await writeEventToCatalog(oldEvent, {
            schema: { extension: 'json', fileContent: 'hello' },
            markdownContent: '# Content that already exists',
          });

          // run plugin
          await plugin(pluginContext, options);

          const { getEventFromCatalog } = utils({ catalogDirectory });
          const { raw: eventFile } = getEventFromCatalog('UserSignedUp');

          expect(eventFile).toMatchMarkdown(`
            ---
              name: UserSignedUp
              summary: null
              version: 1.0.0
              producers: []
              consumers:
                  - AccountService
              externalLinks: []
              badges: []
            ---
            # Content that already exists
            `);
        });

        it('when versionEvents is false, all previous matching events will be overriden', async () => {
          const options: AsyncAPIPluginOptions = {
            catalogDirectory,
            pathToSpec: path.join(__dirname, './assets/account-service-1.0.0.yml'),
            versionEvents: false,
          };

          const oldEvent = {
            name: 'UserSignedUp',
            version: '0.0.1',
            summary: 'Old example of an event that should be versioned',
            producers: ['Service A'],
            consumers: ['Service B'],
            owners: ['dBoyne'],
          };

          const { writeEventToCatalog } = utils({ catalogDirectory });
          const { path: eventPath } = await writeEventToCatalog(oldEvent, {
            schema: { extension: 'json', fileContent: 'hello' },
          });

          // run plugin
          await plugin(pluginContext, options);

          const { getEventFromCatalog } = utils({ catalogDirectory });
          const { raw: eventFile } = getEventFromCatalog('UserSignedUp');

          // Check the version has been set
          expect(fs.existsSync(path.join(eventPath, 'versioned', '0.0.1', 'index.md'))).toEqual(false);
          expect(fs.existsSync(path.join(eventPath, 'versioned', '0.0.1', 'schema.json'))).toEqual(false);

          expect(fs.existsSync(path.join(eventPath, 'index.md'))).toEqual(true);
          expect(fs.existsSync(path.join(eventPath, 'schema.json'))).toEqual(true);

          expect(eventFile).toMatchMarkdown(`
            ---
              name: UserSignedUp
              summary: null
              version: 1.0.0
              producers: []
              consumers:
                  - AccountService
              externalLinks: []
              badges: []
            ---

            <Mermaid />
            <Schema />
            `);
        });
      });

      describe('includeLinkToAsyncAPIDoc', () => {
        it('when includeLinkToAsyncAPIDoc is set, an external link will be added in the event', async () => {
          const options: AsyncAPIPluginOptions = {
            catalogDirectory,
            pathToSpec: path.join(__dirname, './assets/account-service-1.0.0.yml'),
            externalAsyncAPIUrl: 'https://eventcatalog.dev/events',
          };

          const oldEvent = {
            name: 'UserSignedUp',
            version: '0.0.1',
            summary: 'Old example of an event that should be versioned',
            producers: ['Service A'],
            consumers: ['Service B'],
            owners: ['dBoyne'],
          };

          const { writeEventToCatalog } = utils({ catalogDirectory });
          const { path: eventPath } = await writeEventToCatalog(oldEvent, {
            schema: { extension: 'json', fileContent: 'hello' },
          });

          // run plugin
          await plugin(pluginContext, options);

          const { getEventFromCatalog } = utils({ catalogDirectory });
          const { raw: eventFile } = getEventFromCatalog('UserSignedUp');

          // Check the file has been created
          expect(fs.existsSync(path.join(eventPath, 'index.md'))).toEqual(true);
          expect(fs.existsSync(path.join(eventPath, 'schema.json'))).toEqual(true);

          expect(eventFile).toMatchMarkdown(`
            ---
              name: UserSignedUp
              summary: null
              version: 1.0.0
              producers: []
              consumers:
                  - AccountService
              externalLinks:
                  - {label: 'View event in AsyncAPI', url: 'https://eventcatalog.dev/events#message-UserSignedUp'}
              badges: []
            ---

            <Mermaid />
            <Schema />
            `);
        });
      });

      describe('Custom graph templating', () => {
        it('when options are set Mermaid is ignored and Node Graphs are templated', async () => {
          const options: AsyncAPIPluginOptions = {
            catalogDirectory,
            pathToSpec: path.join(__dirname, './assets/account-service-1.0.0.yml'),
            renderMermaidDiagram: false,
            renderNodeGraph: true,
          };

          await plugin(pluginContext, options);

          const { getEventFromCatalog, getServiceFromCatalog } = utils({ catalogDirectory });

          const { raw: eventFile } = getEventFromCatalog('UserSignedUp');
          const { raw: serviceFile } = getServiceFromCatalog('AccountService');

          expect(eventFile).toMatchMarkdown(`
            ---
              name: UserSignedUp
              summary: null
              version: 1.0.0
              producers: []
              consumers:
                  - AccountService
              externalLinks: []
              badges: []
            ---

            <NodeGraph />
            <Schema />
            `);

          expect(serviceFile).toMatchMarkdown(
            `---
            name: AccountService
            summary: 'This service is in charge of processing user signups'
            ---

            <NodeGraph />`
          );
        });
      });

      describe('In domain AsyncAPI parsing', () => {
        it('Creates a domain with contained services and events when domain options are set', async () => {
          const options: AsyncAPIPluginOptions = {
            catalogDirectory,
            pathToSpec: path.join(__dirname, './assets/account-service-1.0.0.yml'),
            renderMermaidDiagram: false,
            renderNodeGraph: true,
            domainName: 'My Domain',
            domainSummary: 'A summary of my domain.',
          };

          await plugin(pluginContext, options);

          const { getDomainFromCatalog } = utils({ catalogDirectory });
          const { getEventFromCatalog, getServiceFromCatalog } = utils({
            catalogDirectory: path.join(catalogDirectory, 'domains', options.domainName),
          });

          const { raw: eventFile } = getEventFromCatalog('UserSignedUp');
          const { raw: serviceFile } = getServiceFromCatalog('AccountService');
          const { raw: domainFile } = getDomainFromCatalog('My Domain');

          expect(eventFile).toMatchMarkdown(`
            ---
              name: UserSignedUp
              summary: null
              version: 1.0.0
              producers: []
              consumers:
                  - AccountService
              externalLinks: []
              badges: []
            ---

            <NodeGraph />
            <Schema />
            `);

          expect(serviceFile).toMatchMarkdown(
            `---
            name: AccountService
            summary: 'This service is in charge of processing user signups'
            ---

            <NodeGraph />`
          );

          expect(domainFile).toMatchMarkdown(`
            ---
            name: 'My Domain'
            summary: 'A summary of my domain.'
            ---

            <NodeGraph />
          `);
        });
      });
    });
  });
});
