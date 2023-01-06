import _ from 'lodash'
import {Domain, Event, Service} from "@eventcatalog/types";

export default class Catalog {
    private domains;
    private services;
    private events;

    constructor({domains = [], events = [], services = []}: any) {
        // @ts-ignore
        this.domains = domains.map(d => {
            // @ts-ignore
            const services = d.services.map(s => s.data);
            // @ts-ignore
            const events = d.events.map(s => s.data);
            return {
                ...d.data,
                services,
                events,
            };
        });
        // @ts-ignore
        this.services = services.map(s => s.data);
        // @ts-ignore
        this.events = events.map(s => s.data);
    }

    state() {
        // @ts-ignore
        let domains = this.domains;
        // @ts-ignore
        let services = this.services;
        // @ts-ignore
        let events = this.events;
        return {domains, services, events};
    }

    apply({domain, service, events}: { domain: Domain | undefined; service: Service; events: Event[] }) {
        if (domain) {
            domain.services = [service]
            domain.events = events
            this.domains = [...this.domains, domain]
        } else {
            this.services = [...this.services, service];
            this.events = [...this.services, ...events];
        }
    }
}
