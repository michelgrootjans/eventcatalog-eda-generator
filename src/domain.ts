import {Domain, Service, Event} from "@eventcatalog/types";
import {AsyncApiDocument} from "./types";

type RawDomain = { data: any; services: any[]; events: any[]; };
const emptyCatalog = {domains: [], services: [], events: []};

export default class Catalog {
    private domains: Domain[];
    private services: Service[];
    private events: Event[];

    constructor({domains = [], events = [], services = []}: any = emptyCatalog) {
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
        return {
            domains: this.domains,
            services: this.services,
            events: this.events
        };
    }

    apply({domain, service, events}: AsyncApiDocument) {
        if (domain) {
            const newDomain: Domain = {
                ...domain,
                services: [service],
                events: events
            }
            this.domains = [...this.domains, newDomain]
        } else {
            this.services = [...this.services, service];
            this.events = [...this.events, ...events];
        }
    }
}
