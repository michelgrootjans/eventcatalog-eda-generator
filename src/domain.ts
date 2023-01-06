import _ from 'lodash'

export default class Catalog {
    private domains;
    private services;
    private events;

    constructor(data: any) {
        this.domains = data.domains;
        this.services = data.services;
        this.events = data.events;
    }

    state() {

        // @ts-ignore
        let domains = this.domains.map(s => s.data);
        // @ts-ignore
        let services = [...this.services, ..._.flatten(this.domains.map(d => d.services))].map(s => s.data);
        // @ts-ignore
        let events = [...this.events, ..._.flatten(this.domains.map(d => d.events))].map(e => e.data);
        return {domains, services, events};
    }
}
