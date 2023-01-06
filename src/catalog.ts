class Catalog {
    public services = [
        {name: 'AccountService'}
    ]
    public events = [
        {
            name: 'UserSignedUp',
            producers: ['AccountService'],
            consumers: [],
            externalLinks: [],
            badges: [],
        }
    ]
}

export const readCatalog = (catalogDirectory: string): Catalog => {
    return new Catalog()
};

