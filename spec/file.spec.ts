import path from 'path';
import {v4 as uuid} from 'uuid';
import plugin from '../src';
import fs from 'fs-extra';
import {glob} from 'glob';
import {AsyncAPIPluginOptions} from "../src/types";
import utils from "@eventcatalog/utils";

const TEST_OUTPUT = './tmp/filespec';

beforeAll(async () => {
    try {
        await fs.rm(TEST_OUTPUT, {recursive: true, force: true})
    } catch {
    }
})

let catalogDirectory = TEST_OUTPUT;
beforeEach(() => {
    catalogDirectory = `${TEST_OUTPUT}/catalog-${uuid()}`;
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'log').mockImplementation(() => {});
});

it('simple import', async () => {
    await importSpecs(catalogDirectory, [
        './assets/account-service-1.0.0.yml'
    ])
    expect(markdownFilesIn(catalogDirectory)).toMatchObject([
        '/events/UserSignedUp/index.md',
        '/services/AccountService/index.md',
    ])
});

it('new version', async () => {
    await importSpecs(catalogDirectory, [
        './assets/account-service-1.0.0.yml',
        './assets/account-service-2.0.0.yml',
    ])
    expect(markdownFilesIn(catalogDirectory)).toMatchObject([
        '/events/UserSignedUp/index.md',
        '/events/UserSignedUp/versioned/1.0.0/index.md',
        '/services/AccountService/index.md',
    ])
});

xit('double import with common event', async () => {
    await importSpecs(catalogDirectory, [
        './assets/account-service-1.0.0.yml',
        './assets/users-service-1.0.0.yml',
    ])
    expect(markdownFilesIn(catalogDirectory)).toMatchObject([
        '/events/UserSignedUp/index.md',
        '/services/AccountService/index.md',
        '/services/UsersService/index.md',
    ])
});

xit('double import with common event - reversed', async () => {
    await importSpecs(catalogDirectory, [
        './assets/users-service-1.0.0.yml',
        './assets/account-service-1.0.0.yml',
    ])
    expect(markdownFilesIn(catalogDirectory)).toMatchObject([
        '/events/UserSignedUp/index.md',
        '/services/AccountService/index.md',
        '/services/UsersService/index.md',
    ])
});

function importSpecs(catalogDirectory: string, pathToSpecs: string[]) {
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
    };
    return plugin(context, options);
}

function markdownFilesIn(catalog: string) {
    return glob.sync(`${catalog}/**/*.md`)
        .map(f => f.replace(catalog, ''));
}

