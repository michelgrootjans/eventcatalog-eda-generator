import {Domain, Service, Event} from "@eventcatalog/types";

type RawDomain = { data: any; services: any[]; events: any[]; };

export default class Catalog {
    private domains: Domain[];
    private services: Service[];
    private events: Event[];

    constructor({domains = [], events = [], services = []}: any) {
        const dataFrom = (values: any[]) => values.map(s => s.data);

        this.domains = domains.map((d: RawDomain) => {
            return {
                ...d.data,
                services: dataFrom(d.services),
                events: dataFrom(d.events),
            };
        });
        this.services = dataFrom(services);
        this.events = dataFrom(events);
    }

    state() {
        let domains = this.domains;
        let services = this.services;
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
            this.events = [...this.events, ...events];
        }
    }
}
