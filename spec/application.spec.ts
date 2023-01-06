import path from 'path';
import {v4 as uuid} from 'uuid';
import plugin from '../src';
import fs from 'fs-extra';
import {glob} from 'glob';
import {AsyncAPIPluginOptions} from "../src/types";
import utils from "@eventcatalog/utils";
import {readCatalog} from "../src/application";
import exp = require("constants");

const TEST_OUTPUT = './tmp/catalogspec';

beforeAll(async () => {
    try {
        await fs.rm(TEST_OUTPUT, {recursive: true, force: true})
    } catch {
    }
})

let catalogDirectory = TEST_OUTPUT;
beforeEach(() => {
    catalogDirectory = `${TEST_OUTPUT}/${expect.getState().currentTestName}`;
});

it('only producer', async () => {
    await importSpecs(catalogDirectory, [
            './assets/users-service-1.0.0.yml',
        ],
        {}
    );
    const catalog = readCatalog(catalogDirectory);
    expect(catalog.state()).toMatchObject({
        services: [
            {name: 'UsersService'},
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
    const catalog = readCatalog(catalogDirectory);
    expect(catalog.state()).toMatchObject({
        services: [
            {name: 'AccountService'},
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
    const catalog = readCatalog(catalogDirectory);
    expect(catalog.state()).toMatchObject({
        services: [
            {name: 'AccountService'},
            {name: 'UsersService'},
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
    const catalog = readCatalog(catalogDirectory);
    expect(catalog.state()).toMatchObject({
        services: [
            {name: 'AccountService'},
            {name: 'UsersService'},
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

function importSpecs(catalogDirectory: string, pathToSpecs: string[], overrides: Partial<AsyncAPIPluginOptions> = {}) {
    const context = {
        eventCatalogConfig: {
            title: 'test configuration',
            organizationName: 'jest',
        }
    };
    const options: AsyncAPIPluginOptions = {
        pathToSpec: pathToSpecs
            .map(filePath => path.join(__dirname, filePath)),

        versionEvents: false,
        renderMermaidDiagram: false,
        renderNodeGraph: true,
        catalogDirectory,
        ...overrides,
    };
    return plugin(context, options);
}
