import path from 'path';
import {v4 as uuid} from 'uuid';
import plugin from '../src';
import fs from 'fs-extra';
import {glob} from 'glob';
import {AsyncAPIPluginOptions} from "../src/types";
import utils from "@eventcatalog/utils";
import {readCatalog} from "../src/catalog";

const TEST_OUTPUT = './tmp/catalogspec';

beforeAll(async () => {
    try {
        await fs.rm(TEST_OUTPUT, {recursive: true, force: true})
    } catch {
    }
})

let catalogDirectory = TEST_OUTPUT;
beforeEach(() => {
    catalogDirectory = `${TEST_OUTPUT}/catalog-${uuid()}`;
});

it('should ', async () => {
    await importSpecs(catalogDirectory, [
            './assets/account-service-1.0.0.yml'
        ],
        {}
    );
    const catalog = readCatalog(catalogDirectory);
    expect(catalog).toMatchObject({
        services: [
            {name: 'AccountService'}
        ],
        events: [
            {
                name: 'UserSignedUp',
                producers: ['AccountService'],
                consumers: [],
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

        versionEvents: true,
        renderMermaidDiagram: false,
        renderNodeGraph: true,
        catalogDirectory,
        ...overrides,
    };
    return plugin(context, options);
}
