import path from 'path';
import plugin from '../src';
import fs from 'fs-extra';
import {AsyncAPIPluginOptions} from "../src/types";
import application, {Catalog} from "../src/application";
import {EventCatalogConfig, LoadContext} from "@eventcatalog/types";

const TEST_OUTPUT = './tmp/catalogspec';

let readCatalog: () => Catalog;

beforeAll(async () => {
    try {
        await fs.rm(TEST_OUTPUT, {recursive: true, force: true})
    } catch {
    }
})

let catalogDirectory = TEST_OUTPUT;
beforeEach(() => {
    catalogDirectory = `${TEST_OUTPUT}/${expect.getState().currentTestName}`;
    ({readCatalog} = application(catalogDirectory));
});

it('only producer', async () => {
    await importSpecs(catalogDirectory, [
            './assets/users-service-1.0.0.yml',
        ],
        {}
    );
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
                externalLinks: [],
                badges: [],
            }
        ],
    })
});
it('only consumer', async () => {
    await importSpecs(catalogDirectory, [
            './assets/account-service-1.0.0.yml',
        ],
        {}
    );
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
                externalLinks: [],
                badges: [],
            }
        ],
    })
});
it('producer and consumer', async () => {
    await importSpecs(catalogDirectory, [
            './assets/users-service-1.0.0.yml',
            './assets/account-service-1.0.0.yml',
        ],
        {}
    );
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
                externalLinks: [],
                badges: [],
            }
        ],
    })
});
it('producer and consumer - reversed', async () => {
    await importSpecs(catalogDirectory, [
            './assets/account-service-1.0.0.yml',
            './assets/users-service-1.0.0.yml',
        ],
        {}
    );
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
                externalLinks: [],
                badges: [],
            }
        ],
    })
});

function context(overrides: Partial<EventCatalogConfig> = {}): LoadContext {
    return {
        eventCatalogConfig: {
            title: 'test configuration',
            organizationName: 'jest',
            ...overrides
        }
    };
}

const options = (catalogDirectory: string) => (pathToSpecs: string[], overrides: Partial<AsyncAPIPluginOptions> = {}) => ({
    pathToSpec: pathToSpecs
        .map(filePath => path.join(__dirname, filePath)),

    versionEvents: false,
    renderMermaidDiagram: false,
    renderNodeGraph: true,
    catalogDirectory,
    ...overrides,
});

function importSpecs(catalogDirectory: string, pathToSpecs: string[], overrides: Partial<AsyncAPIPluginOptions> = {}) {
    return plugin(context(), options(catalogDirectory)(pathToSpecs, overrides));
}
