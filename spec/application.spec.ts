import path from 'path';
import plugin from '../src';
import fs from 'fs-extra';
import {AsyncAPIPluginOptions} from "../src/types";
import application from "../src/application";
import {EventCatalogConfig, LoadContext, Domain, Service, Event} from "@eventcatalog/types";
import Catalog from "../src/domain";

const TEST_OUTPUT = './tmp/catalogspec';

let readCatalog: () => Catalog;
let writeCatalog: (catalog: Catalog, options: AsyncAPIPluginOptions) => void;

let options: (pathToSpecs: string[], overrides?: Partial<AsyncAPIPluginOptions>) => AsyncAPIPluginOptions;

beforeAll(async () => {
    try {
        await fs.rm(TEST_OUTPUT, {recursive: true, force: true})
    } catch {
    }
})

let catalogDirectory = TEST_OUTPUT;
beforeEach(() => {
    catalogDirectory = `${TEST_OUTPUT}/${expect.getState().currentTestName}`;
    options = buildOptions(catalogDirectory);
    ({readCatalog, writeCatalog} = application(catalogDirectory));
});

describe('create', () => {
    it('empty catalog', async () => {
        const catalog = readCatalog();
        expect(catalog.state()).toMatchObject({
            domains: [],
            services: [],
            events: [],
        })
    });
    it('one service', async () => {
        const catalog = new Catalog({});
        const domain = undefined;
        const service: Service = {
            name: 'UsersService',
            summary: 'This service is in charge of users',
        }
        const events: Event[] = []
        catalog.apply({domain, service, events});
        writeCatalog(catalog, options([]));

        expect(readCatalog().state()).toMatchObject({
            services: [
                {
                    name: 'UsersService',
                    summary: 'This service is in charge of users',
                },
            ],
            events: [],
        })
    });
});

describe('import', () => {
    it('producer', async () => {
        await plugin(context(), options([
            './assets/users-service-1.0.0.yml',
        ]));

        const catalog = readCatalog();
        expect(catalog.state()).toMatchObject({
            services: [
                {
                    name: 'UsersService',
                    summary: 'This service is in charge of users',
                },
            ],
            events: [
                {
                    name: 'UserSignedUp',
                    producers: ['UsersService'],
                    consumers: [],
                }
            ],
        })
    });
    it('consumer', async () => {
        await plugin(context(), options([
            './assets/account-service-1.0.0.yml',
        ]));

        const catalog = readCatalog();
        expect(catalog.state()).toMatchObject({
            services: [
                {
                    name: 'AccountService',
                    summary: 'This service is in charge of processing user signups',
                },
            ],
            events: [
                {
                    name: 'UserSignedUp',
                    producers: [],
                    consumers: ['AccountService'],
                }
            ],
        })
    });
    it('producer and consumer', async () => {
        await plugin(context(), options([
            './assets/users-service-1.0.0.yml',
            './assets/account-service-1.0.0.yml',
        ]));

        const catalog = readCatalog();
        expect(catalog.state()).toMatchObject({
            services: [
                {
                    name: 'AccountService',
                    summary: 'This service is in charge of processing user signups',
                },
                {
                    name: 'UsersService',
                    summary: 'This service is in charge of users',
                },
            ],
            events: [
                {
                    name: 'UserSignedUp',
                    producers: ['UsersService'],
                    consumers: ['AccountService'],
                }
            ],
        })
    });
    it('consumer and producer', async () => {
        await plugin(context(), options([
            './assets/account-service-1.0.0.yml',
            './assets/users-service-1.0.0.yml',
        ]));

        const catalog = readCatalog();
        expect(catalog.state()).toMatchObject({
            services: [
                {
                    name: 'AccountService',
                    summary: 'This service is in charge of processing user signups',
                },
                {
                    name: 'UsersService',
                    summary: 'This service is in charge of users',
                },
            ],
            events: [
                {
                    name: 'UserSignedUp',
                    producers: ['UsersService'],
                    consumers: ['AccountService'],
                }
            ],
        })
    });
    it('producer in domain', async () => {
        await plugin(context(), options([
            './assets/users-service-1.0.0.yml',
        ], {domainName: "Users", domainSummary: 'Everything related to users'}));

        const catalog = readCatalog();
        expect(catalog.state()).toMatchObject({
            domains: [
                {
                    name: 'Users',
                    summary: 'Everything related to users',
                }
            ],
            services: [
                {
                    name: 'UsersService',
                    summary: 'This service is in charge of users',
                },
            ],
            events: [
                {
                    name: 'UserSignedUp',
                    producers: ['UsersService'],
                    consumers: [],
                }
            ],
        })
    });
})

function context(overrides: Partial<EventCatalogConfig> = {}): LoadContext {
    return {
        eventCatalogConfig: {
            title: 'test configuration',
            organizationName: 'jest',
            ...overrides
        }
    };
}

const buildOptions = (catalogDirectory: string) => (pathToSpecs: string[], overrides: Partial<AsyncAPIPluginOptions> = {}) => ({
    pathToSpec: pathToSpecs
        .map(filePath => path.join(__dirname, filePath)),

    versionEvents: false,
    renderMermaidDiagram: false,
    renderNodeGraph: true,
    catalogDirectory,
    ...overrides,
});
