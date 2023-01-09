import {Domain, Event, Service} from "@eventcatalog/types";
import {AsyncApiDocument} from "./types";
import _ from 'lodash';

type RawDomain = { data: any; services: any[]; events: any[]; };
const emptyCatalog = {domains: [], services: [], events: []};

export default class Catalog {
    private domains: Domain[];
    private services: Service[];
    private events: Event[];
    private changedData: {
        domains: Domain[],
        services: Service[],
        events: Event[],
    }

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
        this.changedData = {
            domains: [],
            services: [],
            events: [],
        };
    }

    state() {
        return {
            domains: this.domains,
            services: this.services,
            events: this.events
        };
    }

    changes() {
        return this.changedData;
    }



    apply({domain, service, events}: AsyncApiDocument) {
        if (domain) {
            const newDomain: Domain = {
                ...domain,
                services: [service],
            }
            // @ts-ignore
            newDomain.events = events;
            this.domains = [...this.domains, newDomain]
        } else {
            this.services = [...this.services, service];
            for (const newEvent of events) {
                const existingChange = this.changedData.events.find(e => e.name === newEvent.name);
                const existingEvent = this.events.find(e => e.name === newEvent.name);
                if (existingChange) {
                    if (existingChange.version === newEvent.version) {
                        // @ts-ignore
                        existingChange.producers = _.uniq([...existingChange.producers, ...newEvent.producers]);
                        // @ts-ignore
                        existingChange.consumers = _.uniq([...existingChange.consumers, ...newEvent.consumers]);
                    } else {
                        newEvent.producers = _.uniq([...existingChange.producers, ...newEvent.producers]);
                        newEvent.consumers = _.uniq([...existingChange.consumers, ...newEvent.consumers]);
                        // @ts-ignore
                        this.changedData.events.push(newEvent);
                    }
                }
                else if (existingEvent) {
                    newEvent.producers = _.uniq([...existingEvent.producers, ...newEvent.producers]);
                    newEvent.consumers = _.uniq([...existingEvent.consumers, ...newEvent.consumers]);
                    // @ts-ignore
                    this.changedData.events.push(newEvent);
                } else {
                    // @ts-ignore
                    this.changedData.events.push(newEvent);
                }
            }
        }
    }
}
