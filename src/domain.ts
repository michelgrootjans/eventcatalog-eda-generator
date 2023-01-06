import _ from 'lodash'
import {Domain, Event, Service} from "@eventcatalog/types";

export default class Catalog {
    private domains;
    private services;
    private events;

    constructor({domains = [], events = [], services = []}: any) {
        this.domains = domains;
        // @ts-ignore
        this.services = services.map(s => s.data);
        this.events = events;
    }

    state() {
        // @ts-ignore
        let domains = this.domains.map(s => s.data);
        // @ts-ignore
        let services = [...this.services, ..._.flatten(this.domains.map(d => d.services)).map(s => s.data)];
        // @ts-ignore
        let events = [...this.events, ..._.flatten(this.domains.map(d => d.events))].map(e => e.data);
        return {domains, services, events};
    }

    apply({domain, service, events}: { domain: Domain | undefined; service: Service; events: Event[] }) {
        console.log({domain, service, events})
        if (domain) {
            return;
        } else {
            this.services = [...this.services, service];
        }
    }
}
