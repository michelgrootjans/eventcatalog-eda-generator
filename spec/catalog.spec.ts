import Catalog from "../src/domain";

const emptyCatalog = {
    domains: [],
    services: [],
    events: [],
};

describe('an empty catalog', () => {
    let catalog: Catalog;
    beforeEach(() => catalog = new Catalog());

    it('is empty', () => {
        expect(catalog).toMatchObject(emptyCatalog)
    });

    it('should accept a service', () => {
        catalog.apply(({
            domain: undefined,
            service: {name: 'a new service', summary: 'summary'},
            events: []
        }))
        expect(catalog).toMatchObject({
            domains: [],
            services: [
                {name: 'a new service', summary: 'summary'}
            ],
            events: [],
        })
    });
});